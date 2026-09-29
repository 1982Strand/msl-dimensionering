"""Compare PDF content to the captured context; record layout facts, not approval."""
import hashlib
import json
from pathlib import Path
import re
from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT/'.local/report-prototype'


def normalize(value):
    return re.sub(r'\s+', '', value).replace('\u00ad', '')


def inspect(engine, name, context):
    path = WORK/engine/f'{name}.pdf'
    reader = PdfReader(path)
    text = '\n'.join(p.extract_text() or '' for p in reader.pages)
    footer = normalize('BG Byggros A/S | Østbirkvej 2 | 5240 Odense NV | Tlf. 5948 9000 | www.byggros.com')
    # Repeated page furniture interrupts paragraphs that flow across pages.
    # Remove only these exact known strings; preserve all report body content.
    normalized = ''.join(normalize(p.extract_text() or '').replace(footer, '').replace(f'[{i}]','').replace('Skabersikreløsninger','') for i,p in enumerate(reader.pages,1))
    missing = []
    for key, value in context.items():
        strings = [value] if isinstance(value, str) else ([x[k] for x in value for k in ('label','vaerdi')] if isinstance(value, list) else [])
        for index, string in enumerate(strings):
            if string and normalize(string) not in normalized:
                missing.append({'field':key, 'row_value_index':index, 'expected':string})
    fonts = set()
    for page in reader.pages:
        for font in page['/Resources'].get_object().get('/Font', {}).get_object().values():
            fonts.add(str(font.get_object().get('/BaseFont')))
    expected_pixels = []
    for key in ('visualisering','designdiagram'):
        picture = context[key]
        if picture:
            with Image.open(WORK/picture['image']) as im:
                expected_pixels.append(hashlib.sha256(im.convert('RGB').tobytes()).hexdigest())
    embedded_pixels = []
    for page in reader.pages:
        for picture in page.images:
            embedded_pixels.append(hashlib.sha256(picture.image.convert('RGB').tobytes()).hexdigest())
    return {'pages':len(reader.pages), 'bytes':path.stat().st_size, 'missing':missing,
            'expected_figure_pixels_present':all(h in embedded_pixels for h in expected_pixels),
            'expected_figures':len(expected_pixels),
            'basis_heading': 'Grundlagforberegning:' in normalized,
            'page_sizes':[[float(v) for v in p.mediabox] for p in reader.pages],
            'fonts':sorted(fonts), 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}


if __name__ == '__main__':
    results = []
    for name in json.loads((WORK/'case-index.json').read_text())['cases']:
        context = json.loads((WORK/'inputs'/f'{name}.json').read_text(encoding='utf-8'))['context']
        engines = {engine:inspect(engine, name, context) for engine in ('baseline-pdf','typst')}
        if name == 'no-basis':
            assert not any(x['basis_heading'] for x in engines.values())
        results.append({'case':name, **engines})
        print(name, {k:{'pages':v['pages'],'missing':len(v['missing'])} for k,v in engines.items()})
    (WORK/'pdf-checks.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    if any(r['typst']['missing'] for r in results):
        raise SystemExit('Typst lost expected text; see pdf-checks.json')
    if any(not r['typst']['expected_figure_pixels_present'] for r in results):
        raise SystemExit('Typst changed or lost embedded figure pixels')
