"""Generate a static function/widget/state catalogue, not a coverage claim."""
import argparse
import ast
from pathlib import Path

from legacy_reference import ROOT, legacy_source, source_manifest, write_json

WIDGETS = {
    "button", "download_button", "checkbox", "toggle", "radio", "selectbox",
    "multiselect", "slider", "number_input", "text_input", "text_area",
    "date_input", "data_editor", "file_uploader", "segmented_control", "pills",
    "form_submit_button", "color_picker",
}


def catalogue(source):
    result = {"source": source_manifest(source), "limitations": [
        "Static call sites include conditional and nested code; not all are visible together.",
        "Dynamic values and wrappers need runtime review; AST extraction is not functional verification.",
    ], "files": []}
    for relative in result["source"]["files"]:
        text = (source / relative).read_text(encoding="utf-8-sig")
        tree = ast.parse(text)
        functions = [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
        functions.sort(key=lambda n: n.lineno)
        records = []
        for node in functions:
            records.append({"name": node.name, "line": node.lineno, "end_line": node.end_lineno,
                            "signature": ast.unparse(node.args), "doc": ast.get_docstring(node)})
        widgets, states = [], []
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr in WIDGETS:
                owner = [f for f in functions if f.lineno <= node.lineno <= f.end_lineno]
                widgets.append({"line": node.lineno, "owner": owner[-1].name if owner else "<module>",
                                "call": ast.unparse(node)})
            if isinstance(node, ast.Subscript) and ast.unparse(node.value) == "st.session_state":
                states.append({"line": node.lineno, "key": ast.unparse(node.slice), "access": type(node.ctx).__name__})
        result["files"].append({"path": relative, "lines": len(text.splitlines()), "functions": records,
                                "widgets": sorted(widgets, key=lambda x: x["line"]), "state_accesses": states})
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    with legacy_source(args.legacy_repo) as source:
        result = catalogue(source)
    write_json(ROOT / "reference" / "inventory.json", result)
    for file in result["files"]:
        print(f"{file['path']}: {len(file['functions'])} functions, {len(file['widgets'])} widget calls")
