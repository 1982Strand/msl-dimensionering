"""Capture the legacy DOCX builder's *actual* context, using synthetic metadata.

Run with the legacy environment to reproduce that exact implementation. Neither
its calculations nor its formatting functions are reimplemented here.
"""
from copy import deepcopy
import io
import json
from pathlib import Path
import sys
import time
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from legacy_reference import legacy_source, COMMIT, write_json
from capture_core_reference import compare_or_record


def prepare(output: Path, record: bool = False):
    from docxtpl import DocxTemplate, InlineImage
    import plotly.graph_objects as go
    snapshots = {s['id']: s for s in json.loads((ROOT/'reference/ui-flows.json').read_text(encoding='utf-8'))['snapshots']}
    figures = json.loads((ROOT/'reference/figures.json').read_text(encoding='utf-8'))['figures']
    for folder in ('baseline', 'inputs', 'assets', 'typst'):
        (output/folder).mkdir(parents=True, exist_ok=True)
    with legacy_source(Path(r'C:\geonet_beregning')) as source:
        from core import rapport
        template = rapport.DOCX_SKABELON_PATH.read_bytes()
        with zipfile.ZipFile(io.BytesIO(template)) as z:
            # Retained brand assets are only used for comparing the original design.
            for path in z.namelist():
                if path.startswith('word/media/'):
                    (output/'assets'/Path(path).name).write_bytes(z.read(path))
        images = []
        for index, chart in enumerate(figures[0]['charts']):
            path = output/'assets'/f'standard-{index}.png'
            if not path.exists():
                path.write_bytes(go.Figure(chart).to_image(format='png', width=1000, height=420, scale=2))
            images.append(path)
        cases = [
            ('standard', 'UI-001', {}, {}, True),
            ('two-layers', 'UI-002', {}, {}, False),
            ('nx850', 'UI-003', {}, {}, False),
            ('traffic', 'UI-traffic-T4-10', {}, {}, False),
            ('custom-three', 'UI-010', {}, {}, False),
            ('manual-phi', 'UI-011', {}, {}, False),
            ('centimetres', 'UI-013', {'enhed':'cm'}, {}, False),
            ('empty-text', 'UI-001', {}, {k:'' for k in rapport.SECTION_KEYS}, False),
            ('no-basis', 'UI-001', {'grundlag_linjer':{k:False for k,_,_ in rapport.grundlag_linjer(snapshots['UI-001']['dimensioning'])}}, {}, False),
            ('long-text', 'UI-001', {}, {'oplyste_forudsaetninger': '\n\n'.join(['Syntetisk prøvesag. Underbund og materialer skal eftervises ved kontrol.']*18)}, False),
        ]
        index = []
        contexts = []
        original_render = DocxTemplate.render
        for name, snapshot, choices, texts, with_images in cases:
            data = {'metadata':{'projekt':f'MSL reference {name}', 'beskrivelse':'Syntetisk migrationskontrol', 'omfang':'Dimensionering af vejopbygning', 'udfoeres_for':'MSL prøveprojekt', 'sagsbehandler':'Testingeniør', 'sagsbehandler_mail':'test@example.invalid', 'kontrol':'Kontrolperson', 'dato':'2026-09-29'},
                    'dim':deepcopy(snapshots[snapshot]['dimensioning']), 'valg':choices, 'tekster':texts}
            if with_images:
                data['visualisering_png'] = images[0].read_bytes()
                data['designdiagram_png'] = images[1].read_bytes()
            captured = {}
            def capture(doc, context, *args, **kwargs):
                for key, value in context.items():
                    if isinstance(value, InlineImage):
                        asset = images[0 if key == 'visualisering' else 1]
                        captured[key] = {'image':f'assets/{asset.name}', 'width_cm':16}
                    else:
                        captured[key] = deepcopy(value)
                return original_render(doc, context, *args, **kwargs)
            started = time.perf_counter()
            with patch.object(DocxTemplate, 'render', capture):
                docx = rapport.byg_rapport_docx(data)
            elapsed = (time.perf_counter()-started)*1000
            (output/'baseline'/f'{name}.docx').write_bytes(docx)
            fixture = {'schema_version':1, 'source_commit':COMMIT, 'case':name, 'snapshot':snapshot,
                       'context':captured, 'sections':rapport.SECTION_TITLER,
                       'scope':'Report assembly only. Formatted strings from original Python; images reused from original UI fixtures, not a test of report image selection.'}
            write_json(output/'inputs'/f'{name}.json', fixture)
            contexts.append(fixture)
            index.append({'case':name, 'snapshot':snapshot, 'docx_ms':elapsed})
            print(name, flush=True)
        write_json(output/'baseline-timings.json', index)
        write_json(output/'case-index.json', {'source_commit':COMMIT, 'cases':[x['case'] for x in index]})
        compare_or_record(ROOT/'reference/report-contexts.json', {'source_commit':COMMIT, 'cases':contexts}, record)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--record', action='store_true')
    prepare(ROOT/'.local/report-prototype', parser.parse_args().record)
