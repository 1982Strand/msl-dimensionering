"""Capture the Geonet-database and Hjælp pages from the approved legacy app (S1/S2, B-036).

Runs only from an isolated archive of a330cfd with the legacy .venv. Records the
rendered main area in order (HTML bodies, markdown, buttons, the dataframe with
its column help), the help parser's output and the chapter file checksums.
`--record` creates reference/pages-cases.json exclusively; without it a fresh
capture is compared with the file.
"""
from __future__ import annotations

import argparse
import dataclasses
import hashlib
import json
import math
from pathlib import Path
import sys

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record


def cell(value):
    """JSON-safe cell value without changing its meaning."""
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def walk(node, out, started):
    """Main-area elements in render order, from the page header onwards."""
    kids = getattr(node, "children", None)
    kind = getattr(node, "type", type(node).__name__)
    if isinstance(kids, dict) and kids:
        for key in sorted(kids):
            walk(kids[key], out, started)
        return
    if kind == "html":
        body = node.proto.body
        if "bg-sidehoved" in body:
            started[0] = True
        if started[0]:
            out.append({"type": "html", "value": body})
    elif not started[0]:
        return
    elif kind == "markdown":
        out.append({"type": "markdown", "value": node.value})
    elif kind == "button":
        out.append({"type": "button", "label": node.label})
    elif kind == "dataframe":
        frame = node.value
        out.append({
            "type": "dataframe",
            "columns": [str(c) for c in frame.columns],
            "rows": [[cell(v) for v in row] for row in frame.itertuples(index=False)],
            "column_config": json.loads(node.proto.columns or "{}"),
        })
    else:
        out.append({"type": kind})


def page(at):
    if at.exception:
        raise AssertionError([e.message for e in at.exception])
    out, started = [], [False]
    walk(at.main, out, started)
    return out


def tagged(value):
    """Dataclasses with their type name, so Formel/Gaatil/Kilder stay distinguishable."""
    if dataclasses.is_dataclass(value):
        return {"_type": type(value).__name__,
                **{f.name: tagged(getattr(value, f.name)) for f in dataclasses.fields(value)}}
    if isinstance(value, list):
        return [tagged(v) for v in value]
    if isinstance(value, dict):
        return {k: tagged(v) for k, v in value.items()}
    return value


def capture(source):
    from streamlit.testing.v1 import AppTest

    at = AppTest.from_file(str(source / "app.py"), default_timeout=40).run()
    at.session_state["aktiv_side"] = "geonet_database"
    at.run()
    geonet = page(at)

    sys.path.insert(0, str(source))
    try:
        from core import hjaelp  # noqa: E402  (isolated archive)
        from core.data import KILDEDOKUMENTER  # noqa: E402
        chapters = hjaelp.laes_kapitler()
    finally:
        sys.path.remove(str(source))

    at.session_state["aktiv_side"] = "hjaelp"
    at.run()
    help_default = page(at)
    at.session_state["hjaelp_aabne"] = {c.noegle for c in chapters}
    at.run()
    help_all_open = page(at)

    folder = source / "Dokumenter og data" / "hjaelp"
    files = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.glob("*.md"))}
    return {
        "source": source_manifest(source),
        "scope": "Rendered main area after the page header; style sheet and top navigation are excluded.",
        "geonet_database": geonet,
        "hjaelp": {
            "default": help_default,
            "all_open": help_all_open,
            "chapters": tagged(chapters),
            "kildedokumenter": tagged(KILDEDOKUMENTER),
            "files": files,
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    if Path(sys.executable).resolve() != (args.legacy_repo / ".venv/Scripts/python.exe").resolve():
        raise RuntimeError("Use the approved legacy .venv/Scripts/python.exe")
    target = ROOT / "reference/pages-cases.json"
    if args.record and target.exists():
        raise FileExistsError(f"Refusing to overwrite {target}")
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    if args.record:
        with target.open("x", encoding="utf-8", newline="\n") as output:
            output.write(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
        print("Recorded Geonet-database and Hjælp.")
    else:
        compare_or_record(target, result, False)
        print("Geonet-database and Hjælp match exactly.")
