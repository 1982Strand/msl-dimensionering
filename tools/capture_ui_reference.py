"""Replay application flows in an isolated snapshot, using built-in defaults."""
from __future__ import annotations
import argparse
from copy import deepcopy
import json
from pathlib import Path

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record


def capture(source):
    from streamlit.testing.v1 import AppTest
    from core import data, rapport
    at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()
    snapshots = []

    def record(name, action):
        exceptions = [e.message for e in at.exception]
        if exceptions:
            raise AssertionError(f"{name}: {exceptions}")
        state = at.session_state.filtered_state
        widgets = []
        for kind in ("selectbox", "radio", "slider", "number_input", "checkbox", "button_group"):
            for element in at.get(kind):
                widgets.append({"type": kind, "key": element.key, "label": element.label,
                                "value": element.value, "options": list(element.options) if hasattr(element, "options") else None,
                                "disabled": bool(element.proto.disabled)})
        dim = deepcopy(state.get("sidste_dim"))
        snapshots.append({"id": name, "action": action, "page": state["aktiv_side"],
                          "widgets": widgets, "dimensioning": dim,
                          "settings": deepcopy(state["indstillinger"]),
                          "messages": {kind: [e.value for e in at.get(kind)] for kind in ("error", "warning", "info", "success")},
                          "report_text": {
                              "basis": rapport.formatér_dimensioneringsgrundlag(dim),
                              "results": rapport.formatér_dimensioneringsresultat(dim),
                          } if dim else None})
        print(name, flush=True)

    def nav(key):
        at.button(key=f"_nav_{key}").click().run()

    def state(key, value):
        # Segmented controls are exposed as button_group by this AppTest version.
        # State injection runs the actual application but is NOT a browser-click test.
        at.session_state[key] = value
        at.run()

    state0 = at.session_state.filtered_state
    defaults = deepcopy({key: state0[key] for key in (
        "indstillinger", "materialer", "designdiagrammer", "vejdim_koersel_raekker", "aktiv_t_basis_table")})
    assert defaults["aktiv_t_basis_table"] == data.T_BASIS_TABLE, "UI and core default tables differ"
    record("UI-001", "Fresh app with built-in defaults")
    at.slider(key="std_eu_slider").set_value(5).run()
    record("UI-002", "Set Standard Eu to 5 MPa through slider")
    at.selectbox(key="std_geonet").select("Tensar InterAx NX850").run()
    record("UI-003", "Select interval product NX850")
    nav("materialer")
    record("UI-004", "Open Materialer")
    nav("dimensionering")
    record("UI-005", "Return to dimensioning; check retained inputs")
    assert at.slider(key="std_eu_slider").value == 5
    # Do not impose intended behaviour on the old app: the selected product
    # is observed in both snapshots. Any navigation reset is a separate finding.
    state("std_grundlag", "Trafikklasse")
    record("UI-006", "Set Standard basis to traffic class through session state")
    for traffic, eu in (("T1", 3), ("T6", 45), ("T4", 10)):
        state("std_valgt_tklasse", traffic)
        at.slider(key="std_eu_slider").set_value(eu).run()
        record(f"UI-traffic-{traffic}-{eu}", "Traffic boundary/normal flow; state-driven class and slider-driven Eu")
    state("std_eu_mode", "Cv — vingestyrke")
    at.slider(key="std_cv_slider").set_value(60).run()
    record("UI-007", "Switch to Cv input, 60 kN/m2")
    at.button(key="bg_nulstil").click().run()
    record("UI-008", "Reset dimensioning using the actual reset button")
    assert at.session_state["sidste_dim"]["eu"] == 10
    assert at.session_state["sidste_dim"]["grundlag_type"] == "belastningsklasse"

    state("tilstand", "Brugerdefineret")
    record("UI-009", "Switch to Custom, original default two-layer construction")
    at.number_input(key="bd_antal_lag").set_value(3).run()
    at.selectbox(key="bd_mat_2").select("Manuel indtastning").run()
    record("UI-010", "Add third layer and choose manual material")
    at.checkbox(key="bd_phi_override").check().run()
    at.number_input(key="bd_phi_man").set_value(38.5).run()
    record("UI-011", "Manual phi override at 38.5 degrees")
    # The manual reinforcement entry may not be exposed by the current chooser;
    # the inventory records this separately rather than forcing a new UI option.
    nav("indstillinger")
    record("UI-012", "Open settings with default values")
    at.radio(key="ind_opb_enhed").set_value("cm").run()
    nav("dimensionering")
    record("UI-013", "Change displayed length unit to cm and return")
    assert snapshots[-1]["dimensioning"] == snapshots[-3]["dimensioning"], "Display unit changed calculation data"
    nav("indstillinger")
    at.selectbox(key="ind_afr_trin").select(100).run()
    nav("dimensionering")
    record("UI-014", "Change rounding step to 100 mm and return")
    nav("indstillinger")
    at.checkbox(key="ind_std_klassisk").check().run()
    nav("dimensionering")
    state("tilstand", "Standard")
    record("UI-015", "Enable classic Standard and switch back to Standard")
    assert snapshots[-1]["dimensioning"]["standard_opdeling"]["klassisk"] is True

    for page in ("geonet_database", "designdiagrammer", "trafikklasse_korrelation", "hjaelp"):
        nav(page)
        record(f"UI-page-{page}", f"Open {page}")
    nav("dimensionering")
    state("std_grundlag", "Trafikklasse")
    state("std_valgt_tklasse", "T1")
    at.slider(key="std_eu_slider").set_value(3).run()
    assert "sidste_dim" not in at.session_state.filtered_state, "Blocked calculation retained stale report data"
    nav("rapport")
    record("UI-016", "Open report after blocked dimensioning; no stale calculation may remain")
    # Fresh session in SAME temporary source confirms persisted settings only.
    at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()
    record("UI-017", "New session reloads saved settings")
    assert at.session_state["indstillinger"]["opbygning"]["enhed"] == "cm"
    assert at.session_state["indstillinger"]["afrunding"]["trin_mm"] == 100
    return {"source": source_manifest(source), "defaults": defaults,
            "limitations": ["Segmented controls use session-state injection, not browser clicks.",
                            "No pixel comparison, download verification, or valid report file generation.",
                            "Data editor mutation and corrupted saved JSON remain to be exercised."],
            "snapshots": snapshots}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    parser.add_argument("--record", action="store_true")
    args = parser.parse_args()
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    compare_or_record(ROOT / "reference" / "ui-flows.json", result, args.record)
    print(json.dumps({"status": "recorded" if args.record else "matched", "snapshots": len(result["snapshots"])}))
