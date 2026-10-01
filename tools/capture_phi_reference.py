"""Capture active M6 UI and unchanged original layer-table helper, before porting."""
from __future__ import annotations

import argparse
import ast
from copy import deepcopy
from pathlib import Path

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record


def capture(source):
    from streamlit.testing.v1 import AppTest
    from core import data

    tree = ast.parse((source / 'app.py').read_text(encoding='utf-8-sig'))
    names = ['_phi_tabel_data', '_dk_num']
    ns = dict(vars(data))
    nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source / 'app.py'), 'exec'), ns)
    # Call-site audit: obsolete helpers must not become new UI by accident.
    audited = ['_vis_beregnings_breakdown', '_input_materialelag',
               '_vis_phi_opsummeringsboks', '_input_materialelag_med_korrektioner']
    sites = {name: [n.lineno for n in ast.walk(tree)
                   if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
                   and n.func.id == name] for name in audited}
    assert sites['_vis_beregnings_breakdown'] == []
    assert sites['_input_materialelag'] == []

    at = AppTest.from_file(str(source / 'app.py'), default_timeout=40).run()
    settings = deepcopy(at.session_state['indstillinger'])
    cases = []
    definitions = [
        ('FIG-001-standard-default', 'Standard', 10, 'Belastningsklasse', 'mm', None, 'ingen', 'indtastet', None),
        ('FIG-003-custom-interval', 'Brugerdefineret', 5, 'Belastningsklasse', 'mm', None, 'ingen', 'indtastet', None),
        ('FIG-004-custom-cm', 'Brugerdefineret', 5, 'Belastningsklasse', 'cm', None, 'ingen', 'indtastet', None),
        ('TR2-custom-traffic', 'Brugerdefineret', 7, 'Trafikklasse', 'cm', None, 'ingen', 'indtastet', None),
        ('PH1-manual40', 'Brugerdefineret', 5, 'Belastningsklasse', 'mm', 40., 'ingen', 'indtastet', None),
        ('PH2-column', 'Brugerdefineret', 5, 'Belastningsklasse', 'mm', None, 'ingen', 'soejle', None),
        ('M6-round-down', 'Brugerdefineret', 5, 'Belastningsklasse', 'mm', None, 'ned', 'indtastet', None),
        ('M6-round-nearest', 'Brugerdefineret', 5, 'Belastningsklasse', 'cm', 40.5, 'naermeste', 'indtastet', None),
        ('M6-three-layers', 'Brugerdefineret', 5, 'Belastningsklasse', 'mm', None, 'ingen', 'indtastet', 3),
        ('OUT1-rejected', 'Brugerdefineret', 10, 'Trafikklasse', 'mm', None, 'ingen', 'indtastet', None),
        ('OUT2-vejdim', 'Brugerdefineret', 10, 'Trafikklasse', 'cm', None, 'ingen', 'indtastet', None),
    ]
    for case_id, mode, eu, basis, unit, manual, rounding, rule, count in definitions:
        ind = deepcopy(settings)
        ind['opbygning']['enhed'] = unit
        ind['afrunding']['phi_afrunding'] = rounding
        ind['lagfordeling']['phi_regel'] = rule
        if case_id == 'OUT2-vejdim':
            ind['yderomraade']['under_uden'] = 'vejdim'
            ind['yderomraade']['under_inden'] = 'vejdim'
        at.session_state['indstillinger'] = ind
        at.session_state['tilstand'] = mode
        prefix = 'std' if mode == 'Standard' else 'bd'
        at.session_state[f'{prefix}_eu_slider'] = eu
        at.session_state[f'{prefix}_grundlag'] = basis
        at.session_state[f'{prefix}_valgt_tklasse'] = 'T1' if case_id.startswith('OUT') else 'T4'
        at.session_state[f'{prefix}_valgt_klasse'] = 4
        at.session_state[f'{prefix}_geonet'] = 'Tensar InterAx NX850'
        at.session_state['bd_phi_override'] = manual is not None
        if manual is not None: at.session_state['bd_phi_man'] = manual
        at.session_state['bd_antal_lag'] = count or 2
        at.run()
        if at.exception: raise AssertionError([e.message for e in at.exception])
        state = at.session_state.filtered_state
        dim = state.get('sidste_dim')
        codes = [e.value for e in at.code if e.value.startswith('φᵥ = Σ(tᵢ × φᵢ)')]
        factors = [e.proto.body for e in at.get('html')
                   if e.proto.body.startswith('<div class="kob-formel">k<sub>φ</sub>')]
        visible = bool(codes)
        assert visible == bool(factors)
        materials = deepcopy(dim['materialer']) if visible else []
        cases.append({'id': case_id, 'inputs': {
            'mode': mode, 'eu': eu, 'basis': basis, 'unit': unit,
            'settings': deepcopy(state['indstillinger']), 'materials': materials,
            'phi_manual': manual, 'selected_product': dim['geonet_navn'] if dim else None,
            'traffic': state.get(f'{prefix}_valgt_tklasse'),
        }, 'expected': {'visible': visible, 'code': codes[0] if codes else None,
                        'factor_html': factors[0] if factors else None,
                        'table': ns['_phi_tabel_data'](materials) if visible else None,
                        'phi': dim['phi'] if visible else None}})
        print(case_id, visible, flush=True)

    helper_cases = []
    for case_id, materials in [
        ('empty', []),
        ('zero', [{'navn': 'Prøve', 'phi': 38.5, 'tykkelse_mm': 0}]),
        ('percent', [{'navn': 'Øverst', 'phi': 40., 'pct': 42.5},
                     {'navn': 'Nederst', 'phi': 37., 'pct': 57.5}]),
        ('mixed-percent', [{'navn': 'Andel', 'phi': 37., 'pct': 60},
                           {'navn': 'Tykkelse', 'phi': 40., 'tykkelse_mm': 300}]),
    ]:
        helper_cases.append({'id': case_id, 'materials': materials,
                             'expected': ns['_phi_tabel_data'](materials)})
    return {'source': source_manifest(source), 'call_sites': sites,
            'method': 'Original AppTest active code/html preserved verbatim; original AST table helper, unchanged bodies. No HTML/text whitespace normalization.',
            'cases': cases, 'helper_cases': helper_cases}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--record', action='store_true')
    parser.add_argument('--legacy-repo', type=Path, default=Path(r'C:\geonet_beregning'))
    args = parser.parse_args()
    target = ROOT / 'reference' / 'phi-summary.json'
    if args.record and target.exists(): raise FileExistsError(f'Refusing to overwrite {target}')
    with legacy_source(args.legacy_repo) as source: result = capture(source)
    compare_or_record(target, result, args.record)
