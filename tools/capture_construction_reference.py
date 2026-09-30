"""Record arguments handed to the original construction cross-section drawing.

The approved app runs from an isolated Git archive. Wrappers observe ui.snit
and core.diagram.byg_snit, then call their unchanged original implementations.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
from pathlib import Path

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record


def capture(source):
    from streamlit.testing.v1 import AppTest
    import ui
    from core import diagram

    ui_calls = []
    diagram_calls = []
    original_ui_snit = ui.snit
    original_byg_snit = diagram.byg_snit

    def observe_ui_snit(*args, **kwargs):
        ui_calls.append({"columns": deepcopy(args[0]), "kwargs": deepcopy(kwargs)})
        return original_ui_snit(*args, **kwargs)

    def observe_byg_snit(*args, **kwargs):
        diagram_calls.append({"columns": deepcopy(args[0]), "kwargs": deepcopy(kwargs)})
        return original_byg_snit(*args, **kwargs)

    ui.snit = observe_ui_snit
    diagram.byg_snit = observe_byg_snit
    cases = []
    try:
        at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()

        def record(case_id, action):
            exceptions = [item.message for item in at.exception]
            if exceptions:
                raise AssertionError(f"{case_id}: {exceptions}")
            if len(ui_calls) != 1 or len(diagram_calls) != 1:
                raise AssertionError(f"{case_id}: expected one ui.snit and one byg_snit call, got {len(ui_calls)}, {len(diagram_calls)}")
            state = at.session_state.filtered_state
            dim = state.get("sidste_dim") or {}
            prefix = "bd" if state["tilstand"] == "Brugerdefineret" else "std"
            cases.append({
                "id": case_id, "action": action,
                "inputs": {
                    "mode": state["tilstand"],
                    "eu": state.get(f"{prefix}_eu_slider"),
                    "basis": state.get(f"{prefix}_grundlag"),
                    "class": state.get(f"{prefix}_valgt_klasse"),
                    "traffic": state.get(f"{prefix}_valgt_tklasse"),
                    "selected_product": state.get(f"{prefix}_geonet"),
                    "custom_layers": state.get("bd_antal_lag") if prefix == "bd" else None,
                    "settings": deepcopy(state["indstillinger"]),
                    "materials": deepcopy(dim.get("materialer", [])),
                },
                "calculation": {key: deepcopy(dim.get(key)) for key in
                                ("eu", "eo", "phi", "valgt_klasse", "grundlag_type", "t_klasse", "res_1", "res_2", "standard_opdeling")},
                "ui_snit": ui_calls.pop(),
                "byg_snit": diagram_calls.pop(),
            })
            print(case_id, len(cases[-1]["byg_snit"]["columns"]), flush=True)

        record("standard-eu10-bk4-mm", "Standard default; invalid 2-layer column")
        at.slider(key="std_eu_slider").set_value(5).run()
        ui_calls.clear(); diagram_calls.clear()
        at.selectbox(key="std_geonet").select("Tensar InterAx NX850").run()
        record("standard-eu5-bk4-nx850-mm", "Standard interval product; valid 1- and 2-layer columns")

        at.button(key="_nav_indstillinger").click().run()
        at.radio(key="ind_opb_enhed").set_value("cm").run()
        ui_calls.clear(); diagram_calls.clear()
        at.button(key="_nav_dimensionering").click().run()
        record("standard-eu5-bk4-cm", "Standard cross-section after cm setting")

        ui_calls.clear(); diagram_calls.clear()
        at.session_state["tilstand"] = "Brugerdefineret"
        at.run()
        record("custom-eu10-bk4-cm", "Default two material layers; invalid 2-layer column")
        ui_calls.clear(); diagram_calls.clear()
        at.slider(key="bd_eu_slider").set_value(5).run()
        ui_calls.clear(); diagram_calls.clear()
        at.selectbox(key="bd_geonet").select("Tensar InterAx NX850").run()
        record("custom-eu5-bk4-nx850-cm", "Custom two material layers and interval product")
        ui_calls.clear(); diagram_calls.clear()
        at.number_input(key="bd_antal_lag").set_value(3).run()
        record("custom-eu5-bk4-nx850-three-layers-cm", "Custom three material layers")
    finally:
        ui.snit = original_ui_snit
        diagram.byg_snit = original_byg_snit

    return {"source": source_manifest(source),
            "method": "Observed unchanged ui.snit and core.diagram.byg_snit calls in AppTest of isolated approved commit",
            "cases": cases}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    compare_or_record(ROOT / "reference" / "construction-cases.json", result, args.record)
