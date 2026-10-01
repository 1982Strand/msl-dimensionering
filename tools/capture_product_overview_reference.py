"""Capture the seven-column product overview from the approved legacy app.

The app runs only from an isolated archive of the approved commit. The captured
HTML is the renderer's actual Streamlit output, including ordering and dashes.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import html as html_module
from html.parser import HTMLParser
import json
from pathlib import Path
import re

from legacy_reference import ROOT, legacy_source, source_manifest, write_json
from capture_core_reference import compare_or_record


class Rows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.depth = 0
        self.cell_depth = 0
        self.cell = None

    def handle_starttag(self, tag, attrs):
        classes = dict(attrs).get("class", "").split()
        if tag == "div" and "rt-alle-raekke" in classes:
            self.rows.append({"selected": "rt-alle-valgt" in classes, "cells": []})
            self.depth = 1
        elif self.depth:
            self.depth += 1
            if self.depth == 2:
                self.cell = ""
                self.cell_depth = self.depth

    def handle_endtag(self, tag):
        if tag != "div" or not self.depth:
            return
        if self.depth == self.cell_depth:
            self.rows[-1]["cells"].append(self.cell)
            self.cell = None
            self.cell_depth = 0
        self.depth -= 1

    def handle_data(self, data):
        if self.cell is not None:
            self.cell += data


def capture(source):
    from streamlit.testing.v1 import AppTest

    at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()
    cases = []

    def snapshot(case_id, action):
        exceptions = [item.message for item in at.exception]
        if exceptions:
            raise AssertionError(f"{case_id}: {exceptions}")
        html = [item.value for item in at.markdown
                if '<div class="rt-alle-tabel">' in item.value]
        if len(html) != 1:
            raise AssertionError(f"{case_id}: expected one overview, found {len(html)}")
        parsed = Rows()
        parsed.feed(html[0])
        if not parsed.rows or any(len(row["cells"]) != 7 for row in parsed.rows):
            raise AssertionError(f"{case_id}: malformed overview rows")
        headers = [item.label for item in at.button
                   if item.key and item.key.startswith("rt_sort_")]
        state = at.session_state.filtered_state
        dimensioning = state.get("sidste_dim") or {}
        caption = re.search(r'<div class="rt-caption">(.*?)</div>', html[0])
        prefix = "bd" if state["tilstand"] == "Brugerdefineret" else "std"
        controls = {}
        for kind in ("selectbox", "radio", "slider", "number_input", "checkbox", "button_group"):
            for widget in at.get(kind):
                if widget.key and widget.key.startswith(prefix + "_"):
                    controls[widget.key] = widget.value
        basis = state.get(f"{prefix}_grundlag")
        cases.append({"id": case_id, "action": action,
                      "inputs": {"mode": state["tilstand"],
                                 "eu": state.get(f"{prefix}_eu_slider"),
                                 "basis": basis,
                                 "traffic": state.get(f"{prefix}_valgt_tklasse") if basis == "Trafikklasse" else None,
                                 "class": state.get(f"{prefix}_valgt_klasse") if basis == "Belastningsklasse" else None,
                                 "selected_product": state.get(f"{prefix}_geonet"),
                                 "unit": state["indstillinger"]["opbygning"]["enhed"],
                                 "custom_layers": state.get("bd_antal_lag") if prefix == "bd" else None,
                                 "controls": controls,
                                 "settings": deepcopy(state["indstillinger"]),
                                 "available_materials": deepcopy(state["materialer"]),
                                 "construction_materials": deepcopy(dimensioning.get("materialer", []))},
                      "calculation": {key: dimensioning.get(key) for key in
                                      ("eu", "eo", "phi", "valgt_klasse", "grundlag_type", "t_klasse", "skala")},
                      "raw_selected": {key: dimensioning.get(key) for key in ("res_1", "res_2")},
                      "headers": headers, "rows": parsed.rows,
                      "caption": html_module.unescape(caption.group(1)) if caption else None,
                      "html": html[0]})
        print(f"{case_id}: {len(parsed.rows)} rows", flush=True)

    snapshot("standard-eu10", "Fresh Standard, Eu 10 MPa, built-in defaults")
    at.slider(key="std_eu_slider").set_value(5).run()
    at.selectbox(key="std_geonet").select("Tensar InterAx NX850").run()
    snapshot("standard-eu5-nx850", "Eu 5 MPa with interval product NX850 selected")
    at.session_state["std_grundlag"] = "Trafikklasse"
    at.session_state["std_valgt_tklasse"] = "T4"
    at.slider(key="std_eu_slider").set_value(10).run()
    snapshot("traffic-t4-eu10", "Traffic class T4, Eu 10 MPa")

    at.button(key="_nav_indstillinger").click().run()
    at.radio(key="ind_opb_enhed").set_value("cm").run()
    at.button(key="_nav_dimensionering").click().run()
    snapshot("traffic-t4-eu10-cm", "Same traffic case displayed in cm")

    at.session_state["tilstand"] = "Brugerdefineret"
    at.run()
    snapshot("custom-default-cm", "Custom mode with default two-layer construction")
    at.number_input(key="bd_antal_lag").set_value(3).run()
    snapshot("custom-three-layers-cm", "Custom mode with three material layers")
    return {"source": source_manifest(source), "method": "Streamlit AppTest on isolated approved commit; actual rendered HTML", "cases": cases}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--enrich-inputs", action="store_true",
                        help="Correct metadata only after checking every old rendered output")
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    target = ROOT / "reference" / "product-overview-cases.json"
    if args.enrich_inputs:
        if args.record:
            parser.error("--record and --enrich-inputs are mutually exclusive")
        old = json.loads(target.read_text(encoding="utf-8"))
        if old["source"] != result["source"] or old["method"] != result["method"]:
            raise AssertionError("Source metadata changed; refusing input enrichment")
        if len(old["cases"]) != len(result["cases"]):
            raise AssertionError("Case count changed; refusing input enrichment")
        for previous, fresh in zip(old["cases"], result["cases"]):
            previous_output = {key: value for key, value in previous.items() if key != "inputs"}
            fresh_output = {key: value for key, value in fresh.items() if key != "inputs"}
            if previous_output != fresh_output:
                raise AssertionError(f"Rendered output changed for {previous['id']}; refusing input enrichment")
            previous["inputs"] = fresh["inputs"]
        write_json(target, old)
        print("Input metadata enriched; every prior rendered output matched.")
    else:
        compare_or_record(target, result, args.record)
