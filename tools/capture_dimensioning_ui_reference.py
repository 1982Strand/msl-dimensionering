"""Capture dimensioning widgets from the approved, isolated legacy archive.

The reference cases are observations and must never be rewritten to fit the
new UI. Run with --record only when the cases file does not yet exist.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import gc
import json
from pathlib import Path

from capture_core_reference import compare_or_record
from legacy_reference import ROOT, legacy_source, source_manifest, write_json


KINDS = ("button_group", "selectbox", "radio", "slider", "number_input", "checkbox")


def widget_snapshot(at, geonet_names, class_numbers):
    widgets = []
    for kind in KINDS:
        for element in at.get(kind):
            key = element.key
            if not key or not (key == "tilstand" or key.startswith(("std_", "bd_"))):
                continue
            proto = element.proto
            widget = {
                "key": key,
                "kind": {"button_group": "segmented", "selectbox": "select",
                         "number_input": "number"}.get(kind, kind),
                "label": element.label,
                "value": element.value,
                "disabled": bool(getattr(proto, "disabled", False)),
                "help": getattr(proto, "help", "") or None,
            }
            if hasattr(element, "options"):
                widget["optionLabels"] = list(element.options)
                if key in ("std_geonet", "bd_geonet"):
                    values = [next((name for name in sorted(geonet_names, key=len, reverse=True)
                                    if label == name or label.startswith(name + " ")), None)
                              for label in widget["optionLabels"]]
                    if None in values or len(set(values)) != len(values):
                        raise AssertionError((key, values))
                elif key in ("std_valgt_klasse", "bd_valgt_klasse"):
                    values = class_numbers
                else:
                    values = widget["optionLabels"]
                if len(values) != len(widget["optionLabels"]):
                    raise AssertionError((key, values, widget["optionLabels"]))
                widget["optionValues"] = list(values)
            if kind in ("slider", "number_input"):
                widget.update({
                    "min": getattr(proto, "min", None),
                    "max": getattr(proto, "max", None),
                    "step": getattr(proto, "step", None),
                })
                if kind == "number_input":
                    widget["min"] = proto.min if proto.has_min else None
                    widget["max"] = proto.max if proto.has_max else None
                    widget["format"] = proto.format
            widgets.append(widget)
    return widgets


def capture(source: Path):
    from streamlit.testing.v1 import AppTest
    from core.data import BELASTNINGSKLASSER, GEONET_DB

    geonet_names = [g["navn"] for g in GEONET_DB
                    if g["navn"] != "Anden armering (manuel)"]
    class_numbers = list(BELASTNINGSKLASSER)

    at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()
    snapshots = []

    def record(id_, action):
        if at.exception:
            raise AssertionError((id_, [e.message for e in at.exception]))
        state = at.session_state.filtered_state
        widgets = widget_snapshot(at, geonet_names, class_numbers)
        snapshots.append({
            "id": id_, "action": action,
            "mode": state["tilstand"],
            "widgets": widgets,
            "selectedMaterials": {w["key"]: w["value"] for w in widgets
                                  if w["key"].startswith("bd_mat_")},
            "session": {key: deepcopy(value) for key, value in state.items()
                        if key == "tilstand" or key.startswith(("std_", "bd_"))},
        })

    def state(key, value):
        # Streamlit AppTest exposes segmented controls through session state.
        at.session_state[key] = value
        at.run()

    record("standard-default", "Fresh app, built-in defaults")
    state("std_eu_mode", "Cv — vingestyrke")
    record("standard-cv", "Choose Cv instead of Eᵤ")
    state("std_grundlag", "Trafikklasse")
    record("standard-cv-traffic", "Choose traffic class with Cv")
    state("std_eu_mode", "Eᵤ — E-modul")
    record("standard-traffic", "Choose traffic class with Eᵤ")
    state("tilstand", "Brugerdefineret")
    record("custom-default", "Switch to Custom, built-in two material layers")
    at.number_input(key="bd_antal_lag").set_value(3).run()
    at.selectbox(key="bd_mat_2").select("Manuel indtastning").run()
    record("custom-three-layers-manual-material", "Third layer with manual material properties")
    at.checkbox(key="bd_phi_override").check().run()
    record("custom-manual-phi", "Enable manual weighted-friction-angle override")
    state("bd_grundlag", "Trafikklasse")
    record("custom-traffic", "Choose traffic class in Custom mode")
    # All product options are observed in the default selectbox. A different
    # selection reveals whether choosing a named geonet exposes more fields.
    at.selectbox(key="bd_geonet").select("GS-GRID SX160").run()
    record("custom-geonet", "Choose a different named geonet")

    fields = {}
    for snapshot in snapshots:
        for widget in snapshot["widgets"]:
            key = widget["key"]
            if key not in fields:
                fields[key] = {**widget, "defaultValue": widget["value"],
                               "visibleIn": []}
                fields[key].pop("value")
                if "optionValues" in widget:
                    fields[key]["options"] = [
                        {"value": value, "label": label}
                        for value, label in zip(widget["optionValues"], widget["optionLabels"])
                    ]
            fields[key]["visibleIn"].append(snapshot["id"])
    schema = {
        "title": "Dimensionering",
        "scope": "Controls observed in the original dimensioning page; results and styling are outside this schema.",
        "fields": list(fields.values()),
        "limitations": [
            "Segmented controls were changed through AppTest session state, not browser clicks.",
            "The active UI enters material thicknesses in mm; percentage entry belongs to unused legacy code.",
            "Manual reinforcement is not offered by the active geonet chooser.",
        ],
    }
    cases = {"source": source_manifest(source), "snapshots": snapshots}
    del at
    gc.collect()
    return schema, cases


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    parser.add_argument("--record", action="store_true", help="Create missing reference once; refuse to overwrite")
    args = parser.parse_args()
    with legacy_source(args.legacy_repo) as source:
        schema, cases = capture(source)
    write_json(ROOT / "src" / "engine" / "dimensioning-ui.json", schema)
    compare_or_record(ROOT / "reference" / "dimensioning-ui-cases.json", cases, args.record)
    print(json.dumps({"fields": len(schema["fields"]), "snapshots": len(cases["snapshots"])}))
