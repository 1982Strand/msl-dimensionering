"""Capture figures produced by the actual old UI; no reimplementation of geometry."""
import argparse
import json
from pathlib import Path

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record


def capture(source):
    from streamlit.testing.v1 import AppTest
    at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()
    figures = []

    def record(name):
        if at.exception:
            raise AssertionError([x.message for x in at.exception])
        charts = [json.loads(element.proto.spec) for element in at.get("plotly_chart")]
        if not charts:
            raise AssertionError(f"No figure produced for {name}")
        figures.append({"id": name, "charts": charts})
        print(name, len(charts), flush=True)

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
    return {"source": source_manifest(source), "scope": "Original UI Plotly specifications, including shapes and annotations; not a pixel comparison or approved new design", "figures": figures}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    parser.add_argument("--record", action="store_true")
    args = parser.parse_args()
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    compare_or_record(ROOT / "reference" / "figures.json", result, args.record)
    print(json.dumps({"status": "recorded" if args.record else "matched", "scenarios": len(result["figures"])}))
