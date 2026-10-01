"""Read-only audit of the old report template for the TypeScript evaluation."""
import argparse
import hashlib
import io
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

from legacy_reference import ROOT, legacy_source, write_json, COMMIT

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def audit(source):
    from core.rapport import DOCX_SKABELON_PATH, SECTION_KEYS
    raw = DOCX_SKABELON_PATH.read_bytes()
    result = {"source_commit": COMMIT, "template": "assets/rapport_skabelon.docx",
              "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
              "report_sections": list(SECTION_KEYS), "parts": [], "placeholders": [], "tables": [],
              "page_setup": [], "fonts": [], "limitations": ["Structural inspection only; no rendering or performance measurement"]}
    fonts = set()
    with zipfile.ZipFile(io.BytesIO(raw)) as bundle:
        for item in sorted(bundle.namelist()):
            content = bundle.read(item)
            result["parts"].append({"name": item, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
            if not item.endswith(".xml"):
                continue
            root = ET.fromstring(content)
            for node in root.iter(W + "rFonts"):
                fonts.update(value for key, value in node.attrib.items() if key in (W+"ascii", W+"hAnsi", W+"eastAsia", W+"cs"))
            for paragraph in root.iter(W + "p"):
                text = "".join(n.text or "" for n in paragraph.iter(W+"t"))
                for tag in re.findall(r"\{\{.*?\}\}|\{%.*?%\}", text):
                    result["placeholders"].append({"part": item, "tag": tag})
            if item == "word/document.xml":
                for section in root.iter(W+"sectPr"):
                    result["page_setup"].append({n.tag.removeprefix(W): {k.removeprefix(W): v for k, v in n.attrib.items()} for n in section if n.tag in (W+"pgSz", W+"pgMar", W+"cols")})
                for table in root.iter(W+"tbl"):
                    texts = ["".join(n.text or "" for n in row.iter(W+"t")) for row in table.findall(W+"tr")]
                    result["tables"].append({"rows": len(texts), "dynamic_rows": [t for t in texts if "{{" in t or "{%" in t]})
    result["fonts"] = sorted(fonts)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    args = parser.parse_args()
    with legacy_source(args.legacy_repo) as source:
        result = audit(source)
    write_json(ROOT / "reference" / "report-template-audit.json", result)
    print({"parts": len(result["parts"]), "tags": len(result["placeholders"]), "tables": len(result["tables"]), "fonts": result["fonts"]})
