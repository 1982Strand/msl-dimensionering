"""Capture the complete rendered dimensioning page from the approved legacy app (M3, M4, M7, M8, M9).

Runs only from an isolated archive of a330cfd with the legacy .venv. Each case
records the main area as a tree in render order: blocks (columns, expanders,
popovers, tabs, containers) with their own settings, and elements with their
complete protobuf content. Only the following are reduced, and each reduction
is marked in the output:

- HTML bodies containing ``<svg`` are stored as sha256 and length; figures are
  checked exactly by their own references (B-025, M1, M5).
- Plotly charts are stored by type and position only; their specification
  carries per-run ids and is checked by its own references (B-025, M5).
- Dataframes are stored as columns, rows and column configuration.
- Widgets are stored as type, key, label, value, options, disabled and help.

The sidebar and the page style sheet (markdown starting with ``<style>``) are
excluded. ``--record`` creates
reference/dimensioning-page-cases.json exclusively; without it a fresh capture
is compared with the file.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import hashlib
import json
import math
from pathlib import Path
import sys

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record

WIDGETS = {
    "button", "button_group", "checkbox", "color_picker", "date_input", "download_button",
    "multiselect", "number_input", "radio", "select_slider", "selectbox", "slider",
    "text_area", "text_input", "time_input", "toggle",
}


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def cell(value):
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def jsonable(value):
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, (list, tuple)):
        return [jsonable(v) for v in value]
    if isinstance(value, dict):
        return {str(k): jsonable(v) for k, v in value.items()}
    return repr(value)


def proto_dict(proto) -> dict:
    from google.protobuf.json_format import MessageToDict
    data = MessageToDict(proto, preserving_proto_field_name=True)
    data.pop("id", None)
    return data


def element(node) -> dict:
    kind = getattr(node, "type", type(node).__name__)
    proto = getattr(node, "proto", None)
    if kind == "html":
        body = proto.body
        if "<svg" in body:
            return {"type": "html", "svg_sha256": sha(body), "length": len(body)}
        return {"type": "html", "value": body}
    if kind in ("dataframe", "arrow_data_frame", "table"):
        frame = node.value
        return {
            "type": kind,
            "columns": [str(c) for c in frame.columns],
            "index": [cell(v) for v in frame.index],
            "rows": [[cell(v) for v in row] for row in frame.itertuples(index=False)],
            "column_config": json.loads(getattr(proto, "columns", "") or "{}"),
        }
    if kind == "plotly_chart":
        # Plotly assigns fresh ids per run, so only the chart's place is recorded.
        return {"type": kind}
    if kind in WIDGETS:
        out = {"type": kind, "key": getattr(node, "key", None), "label": getattr(node, "label", None)}
        for attr in ("value", "options"):
            try:
                out[attr] = jsonable(getattr(node, attr))
            except Exception:  # noqa: BLE001 - not every widget has every attribute
                pass
        out["disabled"] = bool(getattr(proto, "disabled", False))
        out["help"] = getattr(proto, "help", "") or None
        return out
    if proto is not None:
        return {"type": kind, **proto_dict(proto)}
    return {"type": kind}


def walk(node) -> list:
    kids = getattr(node, "children", None)
    if isinstance(kids, dict):
        out = []
        for key in sorted(kids):
            child = kids[key]
            grand = getattr(child, "children", None)
            if isinstance(grand, dict):
                block = {"block": getattr(child, "type", type(child).__name__)}
                proto = getattr(child, "proto", None)
                if proto is not None:
                    block.update(proto_dict(proto))
                block["children"] = walk(child)
                out.append(block)
            else:
                item = element(child)
                if item.get("type") == "markdown" and item.get("body", "").startswith("<style>"):
                    continue  # the page style sheet is not page content
                out.append(item)
        return out
    return [element(node)]


CASES = [
    # id, tilstand, Eu, grundlag, klasse/T-klasse, enhed, net, variant
    ("FIG-001", "Standard", 10, "Belastningsklasse", 4, "mm", "Tensar TriAx TX160", None),
    ("FIG-001-EKSAKT", "Standard", 10, "Belastningsklasse", 4, "mm", "Tensar TriAx TX160", "vis_eksakt"),
    ("FIG-002", "Standard", 5, "Belastningsklasse", 4, "mm", "Tensar InterAx NX850", None),
    ("FIG-002-EKSAKT", "Standard", 5, "Belastningsklasse", 4, "mm", "Tensar InterAx NX850", "vis_eksakt"),
    ("FIG-003", "Brugerdefineret", 5, "Belastningsklasse", 4, "mm", "Tensar InterAx NX850", None),
    ("FIG-003-DAEKLAG", "Brugerdefineret", 5, "Belastningsklasse", 4, "mm", "Tensar InterAx NX850", "daeklag"),
    ("FIG-004", "Brugerdefineret", 5, "Belastningsklasse", 4, "cm", "Tensar InterAx NX850", None),
    ("TR-1", "Standard", 10, "Trafikklasse", "T4", "mm", "Tensar TriAx TX160", None),
    ("TR-1-SG", "Standard", 10, "Trafikklasse", "T4", "mm", "Tensar TriAx TX160", "sg"),
    ("TR-2", "Brugerdefineret", 7, "Trafikklasse", "T4", "cm", "Tensar InterAx NX850", None),
    ("OUT-1", "Standard", 10, "Trafikklasse", "T1", "mm", "Tensar TriAx TX160", None),
    ("OUT-2", "Standard", 10, "Trafikklasse", "T1", "mm", "Tensar TriAx TX160", "vejdim"),
    ("PH-1", "Brugerdefineret", 5, "Belastningsklasse", 4, "mm", "Tensar InterAx NX850", "phi40"),
    ("PH-2", "Brugerdefineret", 5, "Belastningsklasse", 4, "mm", "Tensar InterAx NX850", "soejle"),
]

# Supplerende tilfælde for grene, de første 14 ikke dækker (M4): tillæg for mindste
# lagtykkelse pr. lagtype (`lagfordeling.restlag = vd`) og samlet minimumstykkelse.
EXTRA_CASES = [
    ("LT-1", "Brugerdefineret", 15, "Belastningsklasse", 3, "mm", "Tensar TriAx TX160", "restlag_vd"),
    ("LT-2", "Brugerdefineret", 15, "Belastningsklasse", 3, "cm", "Tensar InterAx NX850", "restlag_vd"),
    ("MIN-1", "Brugerdefineret", 30, "Belastningsklasse", 4, "mm", "Tensar InterAx NX850", None),
]


def capture(source, only=None, case_list=CASES):
    from streamlit.testing.v1 import AppTest

    at = AppTest.from_file(str(source / "app.py"), default_timeout=60).run()
    if at.exception:
        raise AssertionError([e.message for e in at.exception])
    settings = deepcopy(at.session_state["indstillinger"])
    rows_standard = deepcopy(at.session_state["vejdim_koersel_raekker"])
    cases = []
    for case_id, mode, eu, basis, klasse, unit, net, variant in case_list:
        if only and case_id not in only:
            continue
        ind = deepcopy(settings)
        ind["opbygning"]["enhed"] = unit
        rows = deepcopy(rows_standard)
        if variant == "vis_eksakt":
            ind["afrunding"]["vis_eksakt"] = True
        elif variant == "daeklag":
            ind["lagfordeling"]["netplacering"] = "daeklag"
        elif variant == "vejdim":
            ind["yderomraade"]["under_uden"] = "vejdim"
            ind["yderomraade"]["under_inden"] = "vejdim"
        elif variant == "restlag_vd":
            ind["lagfordeling"]["restlag"] = "vd"
        elif variant == "soejle":
            ind["lagfordeling"]["phi_regel"] = "soejle"
        elif variant == "sg":
            changed = [r for r in rows if r.get("T") == "T4" and r.get("eu") == 10]
            assert len(changed) == 1, rows[:2]
            changed[0]["t_SG_mm"] = changed[0]["t_SG_mm"] + 50
        prefix = "std" if mode == "Standard" else "bd"
        values = {
            "indstillinger": ind, "tilstand": mode, f"{prefix}_eu_slider": eu,
            f"{prefix}_grundlag": basis, f"{prefix}_geonet": net,
            "bd_phi_override": variant == "phi40", "bd_antal_lag": 2,
            "vejdim_koersel_raekker": rows,
        }
        if basis == "Trafikklasse":
            values[f"{prefix}_valgt_tklasse"] = klasse
        else:
            values[f"{prefix}_valgt_klasse"] = klasse
        if variant == "phi40":
            values["bd_phi_man"] = 40
        for key, value in values.items():
            at.session_state[key] = value
        at.run()
        if at.exception:
            raise AssertionError([e.message for e in at.exception])
        state = at.session_state.filtered_state
        cases.append({
            "id": case_id,
            "input": {
                "tilstand": mode, "eu": eu, "grundlag": basis, "klasse": klasse,
                "enhed": unit, "geonet_navn": net, "variant": variant,
                "indstillinger": deepcopy(state["indstillinger"]),
                "vejdim_koersel_raekker": rows if variant == "sg" else None,
                "materialer": deepcopy((state.get("sidste_dim") or {}).get("materialer", [])),
            },
            "page": walk(at.main),
        })
        print(case_id, flush=True)
    return {
        "source": source_manifest(source),
        "scope": "Complete main area of the dimensioning page in render order; sidebar excluded.",
        "normalization": __doc__.split("Only the following are reduced, and each reduction\nis marked in the output:")[1].split("The sidebar")[0].strip(),
        "cases": cases,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--dry-run", type=Path, help="write a fresh capture here without comparing")
    parser.add_argument("--only", nargs="*")
    parser.add_argument("--extra", action="store_true",
                        help="the supplementary cases in reference/dimensioning-page-extra-cases.json")
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    if Path(sys.executable).resolve() != (args.legacy_repo / ".venv/Scripts/python.exe").resolve():
        raise RuntimeError("Use the approved legacy .venv/Scripts/python.exe")
    target = ROOT / ("reference/dimensioning-page-extra-cases.json" if args.extra
                     else "reference/dimensioning-page-cases.json")
    if args.record and target.exists():
        raise FileExistsError(f"Refusing to overwrite {target}")
    with legacy_source(args.legacy_repo) as source:
        result = capture(source, args.only, EXTRA_CASES if args.extra else CASES)
    text = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if args.dry_run:
        args.dry_run.write_text(text, encoding="utf-8", newline="\n")
        print(f"Wrote {len(result['cases'])} cases to {args.dry_run}.")
    elif args.record:
        with target.open("x", encoding="utf-8", newline="\n") as output:
            output.write(text)
        print(f"Recorded {len(result['cases'])} dimensioning page cases.")
    else:
        compare_or_record(target, result, False)
        print(f"{len(result['cases'])} dimensioning page cases match exactly.")
