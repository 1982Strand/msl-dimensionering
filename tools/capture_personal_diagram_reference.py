"""Observe the approved original's personal Plotly chart and its exact inputs."""
from __future__ import annotations

import argparse
from copy import deepcopy
import json
from pathlib import Path

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record


def capture(source):
    from streamlit.testing.v1 import AppTest
    from core import diagram, data

    calls = []
    original = diagram.byg_designdiagram

    def observe(**kwargs):
        calls.append(deepcopy(kwargs))
        return original(**kwargs)

    diagram.byg_designdiagram = observe
    cases = []
    try:
        at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()

        def record(case_id):
            if at.exception:
                raise AssertionError([x.message for x in at.exception])
            if not calls:
                raise AssertionError(f"No personal chart for {case_id}")
            spec = json.loads(at.get("plotly_chart")[-1].proto.spec)
            if spec["layout"]["height"] != 380:
                raise AssertionError("Expected personal chart, not construction")
            state = at.session_state.filtered_state
            dim = state["sidste_dim"]
            prefix = "std" if state["tilstand"] == "Standard" else "bd"
            cases.append({
                "id": case_id,
                "inputs": {
                    "mode": state["tilstand"], "eu": dim["eu"],
                    "basis": state[f"{prefix}_grundlag"],
                    "class": state.get(f"{prefix}_valgt_klasse", 4),
                    "traffic": state.get(f"{prefix}_valgt_tklasse", "T4"),
                    "selected_product": dim["geonet_navn"],
                    "settings": deepcopy(state["indstillinger"]),
                    "materials": deepcopy(dim.get("materialer", [])),
                    "phi_manual": state.get("bd_phi_man") if state.get("bd_phi_override") else None,
                    "show_input": state.get("bd_dd_vis_din_prik", True),
                    "show_endpoints": state.get("bd_dd_vis_lag_prikker", True),
                },
                "kwargs": calls[-1], "expected": spec,
            })
            calls.clear()
            print(case_id, len(spec["data"]), flush=True)

        record("FIG-001-standard-default")
        at.slider(key="std_eu_slider").set_value(5).run()
        at.selectbox(key="std_geonet").select("Tensar InterAx NX850").run()
        record("FIG-002-standard-interval")
        at.session_state["tilstand"] = "Brugerdefineret"
        at.run()
        at.slider(key="bd_eu_slider").set_value(5).run()
        at.selectbox(key="bd_geonet").select("Tensar InterAx NX850").run()
        record("FIG-003-custom-interval")
        at.button(key="_nav_indstillinger").click().run()
        at.radio(key="ind_opb_enhed").set_value("cm").run()
        at.button(key="_nav_dimensionering").click().run()
        record("FIG-004-custom-cm")
        at.checkbox(key="bd_dd_vis_din_prik").set_value(False).run()
        at.checkbox(key="bd_dd_vis_lag_prikker").set_value(False).run()
        record("M5-custom-hidden-points")
        at.checkbox(key="bd_dd_vis_din_prik").set_value(True).run()
        at.checkbox(key="bd_dd_vis_lag_prikker").set_value(True).run()
        at.checkbox(key="bd_phi_override").set_value(True).run()
        at.number_input(key="bd_phi_man").set_value(40).run()
        record("M5-custom-manual-phi40")
        at.checkbox(key="bd_phi_override").set_value(False).run()
        at.session_state["bd_grundlag"] = "Trafikklasse"
        at.run()
        at.slider(key="bd_eu_slider").set_value(7).run()
        record("M5-custom-traffic-t4-eu7")
        at.session_state["tilstand"] = "Standard"
        at.run()
        at.session_state["std_grundlag"] = "Trafikklasse"
        at.run()
        at.slider(key="std_eu_slider").set_value(10).run()
        record("M5-standard-traffic-t4-eu10")

        # Direct original calls isolate edge cases not selectable in current UI.
        for case_id, extra in [
            ("M5-scaled-boundary", {"skala": 0.8}),
            ("M5-per-curve-phi", {"phi_kurver": {"uarmeret": 35, "1_lag": 40, "2_lag": 42}}),
            ("M5-empty-table", {"t_basis_table": {}}),
        ]:
            kwargs = {"eu": 5, "eo": 80, "phi": 37,
                      "geonet": next(p for p in data.GEONET_DB if p["navn"] == "Tensar InterAx NX850"),
                      "t_indtastet_mm": 700, "t_basis_table": data.T_BASIS_TABLE,
                      "t_1_lag_mm": None, "t_2_lag_mm": None, **extra}
            try:
                spec = json.loads(original(**kwargs).to_json())
                cases.append({"id": case_id, "kwargs": deepcopy(kwargs), "expected": spec})
                print(case_id, len(spec["data"]), flush=True)
            except ValueError as exc:
                cases.append({"id": case_id, "kwargs": deepcopy(kwargs), "expected_error": str(exc)})
                print(case_id, str(exc), flush=True)
    finally:
        diagram.byg_designdiagram = original
    return {"source": source_manifest(source),
            "method": "Observed original byg_designdiagram arguments and full Plotly specifications; direct original edge cases",
            "cases": cases}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    target = ROOT / "reference" / "personal-diagram-cases.json"
    if args.record and target.exists():
        raise FileExistsError(f"Refusing to overwrite {target}")
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    compare_or_record(target, result, args.record)
