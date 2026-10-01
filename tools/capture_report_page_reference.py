"""Capture the complete rendered report page from the approved legacy app (R4).

Runs only from an isolated archive of a330cfd with the legacy .venv. Each case sets
up a dimensioning as in capture_dimensioning_page_reference.py, opens the report
page through the original navigation button and records the main area with the
same tree format and reductions (see that module). The report date is fixed to
29.09.2026 before the page is first shown, because the original starts on the
local date. No report is generated or downloaded.

``--record`` creates reference/report-page-cases.json exclusively; without it a
fresh capture is compared with the file.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import date
import json
from pathlib import Path
import sys

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record
from capture_dimensioning_page_reference import walk

CASES = [
    # id, tilstand, Eu, grundlag, klasse/T-klasse, enhed, net
    ("RP-STD", "Standard", 10, "Belastningsklasse", 4, "mm", "Tensar TriAx TX160"),
    ("RP-STD-NX850", "Standard", 5, "Belastningsklasse", 4, "mm", "Tensar InterAx NX850"),
    ("RP-BD", "Brugerdefineret", 5, "Belastningsklasse", 4, "mm", "Tensar InterAx NX850"),
    ("RP-TR", "Brugerdefineret", 7, "Trafikklasse", "T4", "cm", "Tensar InterAx NX850"),
    ("RP-AFVIST", "Standard", 10, "Trafikklasse", "T1", "mm", "Tensar TriAx TX160"),
]


def capture(source):
    from streamlit.testing.v1 import AppTest

    cases = []
    for case_id, mode, eu, basis, klasse, unit, net in CASES:
        # A fresh app per case, so report fields and choices start from the original defaults.
        at = AppTest.from_file(str(source / "app.py"), default_timeout=60).run()
        if at.exception:
            raise AssertionError([e.message for e in at.exception])
        ind = deepcopy(at.session_state["indstillinger"])
        ind["opbygning"]["enhed"] = unit
        prefix = "std" if mode == "Standard" else "bd"
        values = {
            "indstillinger": ind, "tilstand": mode, f"{prefix}_eu_slider": eu,
            f"{prefix}_grundlag": basis, f"{prefix}_geonet": net, "bd_antal_lag": 2,
            "rap_dato": date(2026, 9, 29),
        }
        values[f"{prefix}_valgt_tklasse" if basis == "Trafikklasse" else f"{prefix}_valgt_klasse"] = klasse
        for key, value in values.items():
            at.session_state[key] = value
        at.run()
        at.button(key="_nav_rapport").click().run()
        if at.exception:
            raise AssertionError([e.message for e in at.exception])
        state = at.session_state.filtered_state
        cases.append({
            "id": case_id,
            "input": {"tilstand": mode, "eu": eu, "grundlag": basis, "klasse": klasse,
                      "enhed": unit, "geonet_navn": net, "rap_dato": "2026-09-29",
                      "indstillinger": deepcopy(state["indstillinger"])},
            "choices": {k: v for k, v in state.items()
                        if k.startswith("rap_") and isinstance(v, (bool, str, int, float))},
            "page": walk(at.main),
        })
        print(case_id, flush=True)
    return {
        "source": source_manifest(source),
        "scope": "Complete main area of the report page in render order; sidebar excluded. Same tree format and reductions as reference/dimensioning-page-cases.json.",
        "cases": cases,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    if Path(sys.executable).resolve() != (args.legacy_repo / ".venv/Scripts/python.exe").resolve():
        raise RuntimeError("Use the approved legacy .venv/Scripts/python.exe")
    target = ROOT / "reference/report-page-cases.json"
    if args.record and target.exists():
        raise FileExistsError(f"Refusing to overwrite {target}")
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    if args.record:
        with target.open("x", encoding="utf-8", newline="\n") as output:
            output.write(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
        print(f"Recorded {len(result['cases'])} report page cases.")
    else:
        compare_or_record(target, result, False)
        print(f"{len(result['cases'])} report page cases match exactly.")
