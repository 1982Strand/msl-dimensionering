"""Freeze unchanged legacy explanation helpers before porting their presentation."""
import argparse
from copy import deepcopy
from pathlib import Path

from capture_core_reference import compare_or_record
from capture_editing_reference import helpers, FUNCTIONS, CONSTANTS
from legacy_reference import ROOT, legacy_source, source_manifest

parser = argparse.ArgumentParser()
parser.add_argument('--record', action='store_true')
parser.add_argument('--legacy-repo', type=Path, default=Path('C:/geonet_beregning'))
args = parser.parse_args()
FUNCTIONS.extend(['_eo_aekv_trin_tal', '_korr_eksempel_celle', '_yder_regel_linje', '_pct', '_dk_num'])
CONSTANTS.extend(['_KORR_TRIN', '_KORR_FORUDSAETNINGER', '_KORR_EKSEMPEL', '_YDER_HANDLING_TEKST'])

with legacy_source(args.legacy_repo) as source:
    from core.calculator import _slaa_op_interp
    ns, d = helpers(source)
    ns['_slaa_op_interp'] = _slaa_op_interp
    cases = []
    for edited in [False, True]:
        rows = deepcopy(d.VEJDIM_KOERSLER_STANDARD_RAEKKER)
        if edited:
            for r in rows:
                if r['T'] == 'T3':
                    r['t_SG_mm'] = 0
                    r['t_BL_mm'] = 0
        runs = d.koersler_fra_raekker(rows)
        ns['_aktiv_koersler'] = lambda: runs
        samples = []
        for t in d.TRAFIKKLASSER:
            for eu in [3, 4, 5, 7.5, 10, 15, 20, 30, 40]:
                samples.append({'traffic': t, 'eu': eu,
                    'expected': ns['_eo_aekv_trin_tal'](t, eu, d.T_BASIS_TABLE)})
        korr = d.korrelation_fra_koersler(runs, d.T_BASIS_TABLE, d.STRENGE_YDER_REGLER)
        cases.append({'rows': rows, 'samples': samples, 'selected': ns['_korr_eksempel_celle'](korr)})
    data = {'source': source_manifest(source), 'cases': cases,
        'guidance': {'steps': ns['_KORR_TRIN'], 'assumptions': ns['_KORR_FORUDSAETNINGER'],
                     'actions': ns['_YDER_HANDLING_TEKST']},
        'rules': [{'input': r, 'expected': ns['_yder_regel_linje'](r)}
            for r in [d.STANDARD_YDER_REGLER, d.STRENGE_YDER_REGLER]]}
    compare_or_record(ROOT/'reference/table-explanation-cases.json', data, args.record)
