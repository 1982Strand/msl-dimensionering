"""Capture the approved legacy Settings UI from an isolated Git archive.

The JSON schema is presentation metadata; reference/settings-ui-cases.json
contains observed widget states and must not be edited to fit a new UI.
"""
from __future__ import annotations

import argparse
import ast
from copy import deepcopy
import gc
import json
from pathlib import Path

from legacy_reference import ROOT, legacy_source, source_manifest, write_json
from capture_core_reference import compare_or_record


FUNCTIONS = [
    "render_indstillinger", "_render_indstilling_lagfordeling",
    "_render_indstilling_restlag", "_render_indstilling_phi",
    "_render_indstilling_standard", "_render_indstilling_netplacering",
    "_render_indstilling_yderomraade",
]
SECTIONS = [
    ("afrunding", "Afrunding", FUNCTIONS[0], [
        ("ind_afr_trin", ["afrunding", "trin_mm"], [1, 10, 50, 100]),
        ("ind_afr_reduktion", ["afrunding", "reduktion_eksakt"], [False, True]),
        ("ind_afr_vis_eksakt", ["afrunding", "vis_eksakt"], None),
        ("ind_afr_phi", ["afrunding", "phi_afrunding"], ["ingen", "ned", "naermeste"]),
    ]),
    ("visualisering", "Visualisering", FUNCTIONS[0], [
        ("ind_opb_enhed", ["opbygning", "enhed"], ["mm", "cm"]),
        ("ind_opb_paaskrift", ["opbygning", "geonet_paaskrift"], None),
        ("ind_opb_maal_streg", ["opbygning", "maal_streg"], None),
        ("ind_opb_maal_tal", ["opbygning", "maal_tal"], None),
        ("ind_opb_signatur", ["opbygning", "signatur"], None),
    ]),
    ("oeverste-baerelag", "Øverste bærelag", FUNCTIONS[1], [
        ("ind_lf_fordeling", ["lagfordeling", "fordeling"], ["proportional", "minimum", "fastholdt"]),
        ("ind_lf_samlet", ["lagfordeling", "samlet_minimum"], None),
    ]),
    ("underliggende-lag", "Underliggende lag", FUNCTIONS[2], [
        ("ind_lf_restlag", ["lagfordeling", "restlag"], ["vis", "flet", "vd"]),
        ("ind_lf_restlag_graense", ["lagfordeling", "restlag_graense_mm"], None),
        ("ind_lf_vd_baerelag", ["lagfordeling", "vd_minimum_mm", "Bærelag"], None),
        ("ind_lf_vd_bundsikring", ["lagfordeling", "vd_minimum_mm", "Bundsikring"], None),
        ("ind_lf_kraev_bundsikring", ["lagfordeling", "kraev_bundsikring"], None),
    ]),
    ("friktionsvinkel", "Friktionsvinkel i opbygningerne", FUNCTIONS[3], [
        ("ind_lf_phi_regel", ["lagfordeling", "phi_regel"], ["indtastet", "laveste", "soejle"]),
    ]),
    ("standard", "Standard-beregning", FUNCTIONS[4], [
        ("ind_std_klassisk", ["lagfordeling", "standard_klassisk"], None),
        ("ind_std_opdeling", ["lagfordeling", "standard_opdeling"], None),
        ("ind_std_under_minimum", ["lagfordeling", "standard_under_minimum"], ["stabilgrus", "loeft", "ubundet"]),
    ]),
    ("geonet-2-lag", "Geonet ved 2 lag", FUNCTIONS[5], [
        ("ind_lf_netplacering", ["lagfordeling", "netplacering"], ["laggraense", "daeklag", "laggraense_min"]),
    ]),
    ("trafikklasse-yderomraade", "Trafikklasse uden for diagrammet", FUNCTIONS[6], [
        ("ind_yder_tol_over", ["yderomraade", "tolerance_over_pct"], None),
        ("ind_yder_over_uden", ["yderomraade", "over_uden"], ["afvis", "vejdim"]),
        ("ind_yder_tol_under", ["yderomraade", "tolerance_under_pct"], None),
        ("ind_yder_under_inden", ["yderomraade", "under_inden"], ["laveste", "vejdim"]),
        ("ind_yder_under_uden", ["yderomraade", "under_uden"], ["afvis", "laveste", "vejdim"]),
    ]),
]


def literal_text(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left, right = literal_text(node.left), literal_text(node.right)
        return left + right if left is not None and right is not None else None
    return None


def source_texts(source: Path) -> dict[str, list[str]]:
    tree = ast.parse((source / "app.py").read_text(encoding="utf-8"))
    result = {}
    for node in tree.body:
        if not isinstance(node, ast.FunctionDef) or node.name not in FUNCTIONS:
            continue
        texts = []
        for call in ast.walk(node):
            if not isinstance(call, ast.Call) or not isinstance(call.func, ast.Attribute):
                continue
            if call.func.attr not in ("markdown", "caption") or not call.args:
                continue
            value = literal_text(call.args[0])
            if value and not value.startswith("Gælder:") and len(value) > 90:
                texts.append(value)
        result[node.name] = texts
    return result


def widget_snapshot(at):
    out = {}
    for kind in ("selectbox", "radio", "checkbox", "number_input"):
        for w in at.get(kind):
            if not w.key or not w.key.startswith("ind_"):
                continue
            proto = w.proto
            item = {"key": w.key, "kind": {"selectbox": "select", "number_input": "number"}.get(kind, kind),
                    "label": w.label, "value": w.value, "disabled": bool(proto.disabled),
                    "help": proto.help or None}
            if kind in ("selectbox", "radio"):
                item["optionLabels"] = list(w.options)
            if kind == "number_input":
                item.update({"min": proto.min if proto.has_min else None,
                             "max": proto.max if proto.has_max else None,
                             "step": proto.step, "format": proto.format})
            out[w.key] = item
    return out


def capture(source: Path):
    from streamlit.testing.v1 import AppTest
    from core.data import BELASTNINGSKLASSER

    texts = source_texts(source)
    at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()
    at.button(key="_nav_indstillinger").click().run()
    if at.exception:
        raise AssertionError([e.message for e in at.exception])
    defaults = deepcopy(at.session_state["indstillinger"])
    widgets = widget_snapshot(at)
    schema = {"title": "Indstillinger",
              "intro": "Værktøjets faste indstillinger. Ændringer gemmes straks og gælder alle sider, også ved næste start af værktøjet.",
              "sections": []}
    for section_id, title, function_name, specifications in SECTIONS:
        section = {"id": section_id, "title": title,
                   "texts": texts[function_name] if section_id != "visualisering" else texts[function_name][1:],
                   "fields": []}
        if section_id == "afrunding":
            section["texts"] = texts[function_name][:1]
        for key, path, values in specifications:
            observed = widgets[key]
            field = {"key": key, "path": path, "label": observed["label"],
                     "kind": observed["kind"], "defaultValue": observed["value"]}
            if observed["help"]:
                field["help"] = observed["help"]
            if values is not None:
                labels = observed["optionLabels"]
                if len(values) != len(labels):
                    raise AssertionError((key, values, labels))
                field["options"] = [{"value": v, "label": label} for v, label in zip(values, labels)]
            if observed["kind"] == "number":
                field.update({k: observed[k] for k in ("min", "max", "step")})
            section["fields"].append(field)
        schema["sections"].append(section)
    # Column limits and reset are distinct from scalar fields.
    schema["sections"][2]["minimumTable"] = {
        "key": "ind_lf_minimum", "resetKey": "ind_lf_nulstil",
        "resetLabel": "Nulstil minimumstykkelser",
        "columns": ["Belastningsklasse", "Eₒ [MPa]", "Belastning", "Minimumstykkelse [mm]"],
        "path": ["lagfordeling", "minimum_mm"], "min": 100, "max": 1000,
        "step": 5, "defaultValue": defaults["lagfordeling"]["minimum_mm"],
        "rows": [
            {"klasse": klasse, "eo": BELASTNINGSKLASSER[klasse]["eo"],
             "belastning": BELASTNINGSKLASSER[klasse]["belastning"]}
            for klasse in sorted(BELASTNINGSKLASSER)
        ],
    }
    cases = {"source": source_manifest(source), "defaults": defaults,
             "snapshots": [{"id": "settings-default", "widgets": list(widgets.values())}]}
    # Release Streamlit test objects before temporary source directory closes.
    del at
    gc.collect()
    return schema, cases


def capture_effects(source: Path):
    """A few interactions that reveal conditional controls and §8 captions."""
    from streamlit.testing.v1 import AppTest

    at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()
    at.button(key="_nav_indstillinger").click().run()
    keys = ("ind_lf_restlag_graense", "ind_lf_vd_baerelag",
            "ind_lf_vd_bundsikring", "ind_lf_kraev_bundsikring",
            "ind_std_opdeling", "ind_std_under_minimum")
    snapshots = []

    def record(name):
        if at.exception:
            raise AssertionError((name, [e.message for e in at.exception]))
        widgets = widget_snapshot(at)
        section8 = [c.value for c in at.caption
                    if isinstance(c.value, str) and
                    ("tolerancen:" in c.value or "kørte punkter" in c.value)]
        frames = []
        for element in at.dataframe:
            frame = element.value
            if hasattr(frame, "to_dict") and getattr(frame.index, "name", None) == "Trafikklasse":
                frames.append(frame.to_dict(orient="index"))
        snapshots.append({"id": name,
                          "settings": deepcopy(at.session_state["indstillinger"]),
                          "controls": {key: {"value": widgets[key]["value"],
                                             "disabled": widgets[key]["disabled"]}
                                       for key in keys},
                          "outerRangeCaptions": section8,
                          "outerRangeTables": frames})

    record("defaults")
    at.radio(key="ind_lf_restlag").set_value("flet").run()
    record("merge-underlying-layer")
    at.radio(key="ind_lf_restlag").set_value("vd").run()
    record("vd-minimum-underlying-layer")
    at.checkbox(key="ind_std_klassisk").check().run()
    record("classic-standard")
    at.checkbox(key="ind_std_klassisk").uncheck().run()
    at.checkbox(key="ind_lf_samlet").uncheck().run()
    record("standard-below-minimum-enabled")
    at.number_input(key="ind_yder_tol_over").set_value(0.0).run()
    at.number_input(key="ind_yder_tol_under").set_value(0.0).run()
    record("zero-outer-range-tolerances")
    del at
    gc.collect()
    return {"source": source_manifest(source), "snapshots": snapshots,
            "sourceHelpers": {"outerRangeTable": "app.py:10426 _yder_afvigelsestabel",
                              "outerRangeScope": "app.py:10454 _yder_omfang"}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    parser.add_argument("--record", action="store_true", help="Create missing references once; refuses to overwrite")
    args = parser.parse_args()
    with legacy_source(args.legacy_repo) as source:
        schema, cases = capture(source)
    write_json(ROOT / "src" / "engine" / "settings-ui.json", schema)
    compare_or_record(ROOT / "reference" / "settings-ui-cases.json", cases, args.record)
    with legacy_source(args.legacy_repo) as source:
        effects = capture_effects(source)
    compare_or_record(ROOT / "reference" / "settings-effects-cases.json", effects, args.record)
    print(json.dumps({"sections": len(schema["sections"]),
                      "fields": sum(len(s["fields"]) for s in schema["sections"]),
                      "snapshots": len(cases["snapshots"]),
                      "effectSnapshots": len(effects["snapshots"])}))
