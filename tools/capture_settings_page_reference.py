"""Capture the complete rendered settings page from the approved legacy app.

Runs only from an isolated archive of a330cfd with the legacy .venv. Each case
starts a fresh app, sets the active settings in session state, opens the
settings page through the original navigation button and records the main area
with the same tree format and reductions as capture_dimensioning_page_reference.py.
Covers the dynamic section summaries and all »Gælder« markings.

``--record`` creates reference/settings-page-cases.json exclusively; without it a
fresh capture is compared with the file.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import json
from pathlib import Path
import sys

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record
from capture_dimensioning_page_reference import walk


def changed(ind):
    """All sections away from the defaults, with values from the original's options."""
    ind["afrunding"].update({"trin_mm": 10, "reduktion_eksakt": True, "vis_eksakt": True})
    ind["opbygning"].update({"enhed": "cm", "signatur": False, "maal_tal": False})
    ind["lagfordeling"].update({"fordeling": "fastholdt", "samlet_minimum": False,
                                "restlag": "vd", "phi_regel": "soejle",
                                "kraev_bundsikring": True, "netplacering": "daeklag"})
    ind["yderomraade"].update({"tolerance_over_pct": 10.0, "under_inden": "vejdim",
                               "under_uden": "vejdim"})


CASES = [
    # id, tilstand, settings change
    ("IND-STD", "Standard", None),
    ("IND-BD", "Brugerdefineret", None),
    ("IND-AENDRET", "Brugerdefineret", changed),
    ("IND-KLASSISK", "Standard", lambda ind: ind["lagfordeling"].update({"standard_klassisk": True})),
]


def capture(source):
    from streamlit.testing.v1 import AppTest

    cases = []
    for case_id, mode, change in CASES:
        at = AppTest.from_file(str(source / "app.py"), default_timeout=60).run()
        if at.exception:
            raise AssertionError([e.message for e in at.exception])
        ind = deepcopy(at.session_state["indstillinger"])
        if change:
            change(ind)
        at.session_state["indstillinger"] = ind
        at.session_state["tilstand"] = mode
        at.run()
        at.button(key="_nav_indstillinger").click().run()
        if at.exception:
            raise AssertionError([e.message for e in at.exception])
        state = at.session_state.filtered_state
        cases.append({
            "id": case_id,
            "input": {"tilstand": mode, "indstillinger": deepcopy(state["indstillinger"])},
            "page": walk(at.main),
        })
        print(case_id, flush=True)
    return {
        "source": source_manifest(source),
        "scope": "Complete main area of the settings page in render order; sidebar excluded. Same tree format and reductions as reference/dimensioning-page-cases.json.",
        "cases": cases,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    if Path(sys.executable).resolve() != (args.legacy_repo / ".venv/Scripts/python.exe").resolve():
        raise RuntimeError("Use the approved legacy .venv/Scripts/python.exe")
    target = ROOT / "reference/settings-page-cases.json"
    if args.record and target.exists():
        raise FileExistsError(f"Refusing to overwrite {target}")
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    if args.record:
        with target.open("x", encoding="utf-8", newline="\n") as output:
            output.write(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
        print(f"Recorded {len(result['cases'])} settings page cases.")
    else:
        compare_or_record(target, result, False)
        print(f"{len(result['cases'])} settings page cases match exactly.")
