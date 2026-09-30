"""Capture report-owned figure calls, independent of dimensioning screen calls.

The original report preview assembles its own Snit list. Original renderers and
geometry execute unchanged; only Chrome setup/raster serialization are stubbed.
No PDF/DOCX is authored, and the original checkout remains read-only.
"""
from __future__ import annotations
import argparse
import base64
from copy import deepcopy
from dataclasses import asdict, is_dataclass
import inspect
from pathlib import Path
from unittest.mock import patch

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record

PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1sAAAAASUVORK5CYII=")


def plain(value):
    if is_dataclass(value):
        return plain(asdict(value))
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain(v) for v in value]
    return value


def capture(source):
    from streamlit.testing.v1 import AppTest
    from core import rapport, diagram
    import plotly.graph_objects as go
    calls, exports, cases = [], [], []

    def wrapper(name, function):
        def observe(**kwargs):
            bound = inspect.signature(function).bind(**kwargs)
            bound.apply_defaults()
            calls.append({"function": name, "kwargs": plain(deepcopy(bound.arguments))})
            return function(**kwargs)
        return observe

    def raster(figure, *args, **kwargs):
        exports.append({"kwargs": plain(kwargs), "layout": plain(figure.to_plotly_json()["layout"])})
        return PNG

    with patch.object(rapport, "render_opbygning_png", wrapper("render_opbygning_png", rapport.render_opbygning_png)), \
         patch.object(rapport, "render_personligt_designdiagram_png", wrapper("render_personligt_designdiagram_png", rapport.render_personligt_designdiagram_png)), \
         patch.object(rapport, "_sikr_chrome", lambda: None), patch.object(go.Figure, "to_image", raster):
        at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()

        def record(name):
            if at.exception:
                raise AssertionError([x.message for x in at.exception])
            state = at.session_state.filtered_state
            cases.append({"id": name, "dimensioning": deepcopy(state["sidste_dim"]),
                          "settings": deepcopy(state["indstillinger"]),
                          "choices": {k: plain(v) for k, v in state.items() if k.startswith("rap_vis_") or k.startswith("rap_dd_")},
                          "calls": deepcopy(calls), "exports": deepcopy(exports)})
            calls.clear(); exports.clear()
            print(name, len(cases[-1]["calls"]), flush=True)

        at.button(key="_nav_rapport").click().run()
        record("RFIG-standard-default")
        at.checkbox(key="rap_vis_uarm").set_value(False).run()
        record("RFIG-standard-only-one")
        at.checkbox(key="rap_vis_1lag").set_value(False).run()
        record("RFIG-standard-no-snit")
        at.button(key="_nav_dimensionering").click().run()
        at.slider(key="std_eu_slider").set_value(5).run()
        at.selectbox(key="std_geonet").select("Tensar InterAx NX850").run()
        at.button(key="_nav_rapport").click().run()
        at.checkbox(key="rap_vis_uarm").set_value(True).run()
        at.checkbox(key="rap_vis_1lag").set_value(True).run()
        at.checkbox(key="rap_vis_2lag").set_value(True).run()
        calls.clear(); exports.clear(); at.run()
        record("RFIG-standard-interval-all")
        at.checkbox(key="rap_vis_uarm").set_value(False).run()
        at.checkbox(key="rap_vis_1lag").set_value(False).run()
        calls.clear(); exports.clear(); at.run()
        record("RFIG-standard-only-two")
        at.button(key="_nav_dimensionering").click().run()
        at.session_state["tilstand"] = "Brugerdefineret"
        at.run()
        at.slider(key="bd_eu_slider").set_value(5).run()
        at.selectbox(key="bd_geonet").select("Tensar InterAx NX850").run()
        at.button(key="_nav_rapport").click().run()
        at.checkbox(key="rap_vis_indtastet").set_value(True).run()
        at.checkbox(key="rap_vis_2lag").set_value(False).run()
        calls.clear(); exports.clear(); at.run()
        record("RFIG-custom-input-only")
        at.button(key="_nav_indstillinger").click().run()
        at.radio(key="ind_opb_enhed").set_value("cm").run()
        at.checkbox(key="ind_opb_signatur").set_value(False).run()
        calls.clear(); exports.clear()
        at.button(key="_nav_rapport").click().run()
        record("RFIG-custom-cm-no-signature")
    return {"source": source_manifest(source),
            "method": "Actual original report calls with all effective defaults; unchanged geometry, only raster/Chrome stubbed",
            "cases": cases}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    target = ROOT / "reference" / "report-figure-cases.json"
    if args.record and target.exists():
        raise FileExistsError(f"Refusing to overwrite {target}")
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    compare_or_record(target, result, args.record)
