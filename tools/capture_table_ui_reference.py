"""Freeze original chart specs, CSV values and table labels without running Streamlit."""
import argparse
import ast
from copy import deepcopy
from pathlib import Path

import pandas as pd

from legacy_reference import legacy_source, source_manifest, ROOT
from capture_core_reference import compare_or_record
from capture_editing_reference import helpers, FUNCTIONS

parser = argparse.ArgumentParser()
parser.add_argument('--record', action='store_true')
parser.add_argument('--legacy-repo', type=Path, default=Path('C:/geonet_beregning'))
args = parser.parse_args()
FUNCTIONS.extend([
    '_dk_num', '_afvigelse_tekst', '_korrelation_pivot_rows',
    '_asfaltpakke_rows', '_tykkelse_interval', '_diagram_daekning',
])

with legacy_source(args.legacy_repo) as source:
    ns, d = helpers(source)
    from core.diagram import byg_raadiagram

    charts = []
    inputs = d.DESIGNDIAGRAM_RAW_TABLES + [
        {'diagram_nr': 1, 'rows': []},
        {'diagram_nr': 1, 'rows': [
            {'eu': 10, 't_uarmeret_cm': None, 't_1_lag_cm': 0, 't_2_lag_cm': 30},
        ]},
    ]
    for diagram in inputs:
        fig = byg_raadiagram(diagram, hoejde_px=290)
        spec = None if fig is None else fig.to_plotly_json()
        if spec:
            spec['layout'].pop('template', None)
        charts.append({'input': diagram, 'expected': spec})

    tree = ast.parse((source / 'app.py').read_text(encoding='utf-8-sig'))
    fn = next(n for n in tree.body
              if isinstance(n, ast.FunctionDef) and n.name == 'render_trafikklasse_korrelation')
    assign = next(n for n in ast.walk(fn) if isinstance(n, ast.Assign)
                  and any(isinstance(t, ast.Name) and t.id == 'editor_rows' for t in n.targets))
    csv, presentation = [], []
    for edit in [False, True]:
        rows = deepcopy(d.VEJDIM_KOERSLER_STANDARD_RAEKKER)
        if edit:
            rows[0]['t_SG_mm'] = 330
            rows[0]['bemaerkning'] = 'Note; med "citat"\nog ny linje'
            rows[1]['levetid_styrende_aar'] = 12.3
            rows = ns['_normaliser_koersel_raekker'](rows)
        ns['raekker'] = d.berig_koersel_raekker(rows)
        exec(compile(ast.Module(body=[assign], type_ignores=[]), str(source / 'app.py'), 'exec'), ns)
        # Canonical LF permits content comparison independently of the host OS.
        csv.append({'input': rows, 'expected': pd.DataFrame(ns['editor_rows']).to_csv(
            index=False, sep=';', lineterminator='\n')})
        runs = d.koersler_fra_raekker(rows)
        lookup = d.korrelation_opslag(runs)
        korr = d.korrelation_fra_koersler(runs)
        presentation.append({'input': rows, 'expected': ns['_korrelation_pivot_rows'](korr, lookup),
                             'asfalt': ns['_asfaltpakke_rows'](rows)})
    data = {
        'source': source_manifest(source), 'charts': charts, 'csv': csv, 'presentation': presentation,
        'coverage': [{'input': x, 'expected': ns['_diagram_daekning'](x)}
                     for x in d.DESIGNDIAGRAM_RAW_TABLES],
        'read_points': {str(k): sorted(v) for k, v in d.DESIGNDIAGRAM_AFLAESTE_CELLER.items()},
    }
    compare_or_record(ROOT / 'reference/table-ui-cases.json', data, args.record)

    assets = ROOT / 'public/diagrambilleder'
    assets.mkdir(parents=True, exist_ok=True)
    for diagram in d.DESIGNDIAGRAM_RAW_TABLES:
        name = diagram['image_name']
        target = assets / name
        original = (source / 'diagrambilleder' / name).read_bytes()
        if target.exists():
            assert target.read_bytes() == original, name
        else:
            target.write_bytes(original)
    print('Original chart/CSV/table references and six scans verified.')
