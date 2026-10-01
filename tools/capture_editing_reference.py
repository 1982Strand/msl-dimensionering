"""Execute unchanged legacy data helpers; file IO is confined to the temporary archive.

Only selected AST nodes are compiled to avoid running Streamlit at import. Their
bodies/constants are not rewritten. Core helpers are imported from the same archive.
"""
import argparse
import ast
from copy import deepcopy
import json
import math
import os
from pathlib import Path
from types import SimpleNamespace
import unicodedata

from capture_core_reference import compare_or_record
from legacy_reference import ROOT, legacy_source, source_manifest, write_json

FUNCTIONS = '''_standard_materialer _er_tom_vaerdi _normaliser_materiale
_normaliser_materialer _duplikerede_materialenavne _backfill_fra_standard
indlaes_materialer gem_materialer slet_json_og_nulstil
_normaliser_opbygning _standard_indstillinger _normaliser_indstillinger
indlaes_indstillinger gem_indstillinger
_standard_designdiagrammer _diagramtal _normaliser_diagram_rows
_normaliser_designdiagrammer indlaes_designdiagrammer gem_designdiagrammer
slet_designdiagrammer_json_og_nulstil generer_t_basis_table_fra_diagrammer
_standard_koersel_raekker _normaliser_koersel_raekker indlaes_koersel_raekker
gem_koersel_raekker slet_koersler_json_og_nulstil _diagrammer_har_aktuel_schema'''.split()
CONSTANTS = ['_OPBYGNING_STANDARD', '_KOERSEL_FELTER', '_KOERSEL_TEKSTFELTER', '_KOERSEL_TEKST_STANDARD']


def helpers(source):
    from core import data, afrunding, lagfordeling, enhed
    ns = {**vars(data), 'json': json, 'math': math, 'os': os,
          'afrunding_mod': afrunding, 'lagfordeling_mod': lagfordeling, 'enhed_mod': enhed}
    ui = {}
    node = next(n for n in ast.parse((source/'ui.py').read_text(encoding='utf-8-sig')).body
                if isinstance(n, ast.FunctionDef) and n.name == 'mpa')
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(source/'ui.py'), 'exec'), ui)
    ns['ui'] = SimpleNamespace(mpa=ui['mpa'])
    nodes = []
    for n in ast.parse((source/'app.py').read_text(encoding='utf-8-sig')).body:
        if isinstance(n, ast.FunctionDef) and n.name in FUNCTIONS:
            nodes.append(n)
        elif isinstance(n, (ast.Assign, ast.AnnAssign)):
            targets = n.targets if isinstance(n, ast.Assign) else [n.target]
            if any(isinstance(t, ast.Name) and t.id in CONSTANTS for t in targets): nodes.append(n)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source/'app.py'), 'exec'), ns)
    assert all(name in ns for name in FUNCTIONS + CONSTANTS)
    return ns, data


def wire(value):
    if isinstance(value, float) and not math.isfinite(value):
        return {'$float': 'nan' if math.isnan(value) else 'inf' if value > 0 else '-inf'}
    if isinstance(value, dict): return {str(k): wire(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)): return [wire(v) for v in value]
    return value


def capture(source):
    ns, data = helpers(source)
    cases = []
    def add(fn, args, call=None):
        frozen = deepcopy(args)
        try:
            result = {'value': wire((call or ns[fn])(*deepcopy(args)))}
        except Exception as error:
            result = {'error': type(error).__name__}
        cases.append({'id': f'edit-{len(cases)+1:04d}', 'function': fn,
                      'args': wire(frozen), 'expected': result})

    for v in [None, '', ' ', '37.5', '38.5', '0x20', '1_000', '37,5', True, False, 0, -1, 99, [], {}]:
        add('_normaliser_materiale', [{'navn': '  Prøve  ', 'phi': v, 'max_korn': v,
            'krav_maskestoerrelse_mm': v, 'lagtype': 'ukendt', 'anvendelse': ' note '}])
    for raw in [{}, {'navn':' '}, {'navn':False}, {'navn':True}, {'navn':123},
                {'navn':'Sand','phi':20,'lagtype':'Bundsikring'}, {'navn':'SG','phi':'inf'}]:
        add('_normaliser_materiale', [raw])
    add('_normaliser_materialer', [[{'navn':'a'}, {}, {'navn':'b','phi':38.5}]])
    for names in [['SG','sg','SG'], ['Grus','GRUS','grus'], ['Straße','STRASSE'], ['Σ','ς','σ'], ['ÆØÅ','æøå'], ['A','Ａ']]:
        add('_duplikerede_materialenavne', [[{'navn':n} for n in names]])
    add('_standard_materialer', [])
    for materials in [[{'navn':data.MATERIAL_DB[0]['navn']}],
                      [{'navn':data.MATERIAL_DB[0]['navn'],'krav_maskestoerrelse_mm':99}],
                      [{'navn':'Eget materiale','krav_maskestoerrelse_mm':None}]]:
        add('_backfill_fra_standard', [materials])
    for v in [None, {}, [], {'opbygning':{'enhed':'cm','signatur':False,'maal_tal':0}},
              {'afrunding':{'trin_mm':10,'phi_afrunding':'ned'},'lagfordeling':{'samlet_minimum':False}},
              {'yderomraade':{'under_uden':'vejdim','tolerance_over_pct':75}},
              {'opbygning':{'enhed':'CM','geonet_paaskrift':True}}, {'ukendt':True}]:
        add('_normaliser_indstillinger', [v])
    add('_standard_indstillinger', [])
    for rows in [[],[{}],[{'t_1_lag_cm':30}],
                 [{'eu':10,'t_1_lag_cm':0,'t_2_lag_cm':-5}],
                 [{'eu':10,'t_1_lag_cm':70},{'eu':5,'t_1_lag_cm':100}],
                 [{'eu':'10','t_1_lag_cm':70},{'eu':10,'t_2_lag_cm':80}],
                 [{'Eᵤ (MPa)':'2.5','Ustabiliseret tykkelse (cm)':'85.5','1 lag tykkelse (cm)':'60'}],
                 [{'eu':None,'Eᵤ (MPa)':10,'1 lag tykkelse (cm)':30}],
                 [{'eu':'1_0','t_1_lag_cm':'12,5'}], [{'eu':True,'t_1_lag_cm':False}]]:
        add('_normaliser_diagram_rows', [rows])
    for diagrams in [[], [{'diagram_nr':1,'rows':[]}],
                     [{'diagram_nr':1,'eo':999,'rows':[{'eu':5,'t_1_lag_cm':'77.5'}]}],
                     [{'diagram_nr':1,'rows':[{'eu':5},{'eu':5}]}],
                     [{'diagram_nr':99,'rows':[{'eu':5}]}]]:
        add('_normaliser_designdiagrammer', [diagrams])
    for diagrams in [[], data.DESIGNDIAGRAM_RAW_TABLES,
                     [{'eo':80,'rows':[{'eu':10,'t_1_lag_cm':55.5},{'eu':5,'t_2_lag_cm':80}]}],
                     [{'eo':80,'rows':[{'eu':10,'t_1_lag_cm':55},{'eu':10,'t_1_lag_cm':65}]}]]:
        add('generer_t_basis_table_fra_diagrammer', [diagrams])
    for points in [[], [(30,5)],[(80,1),(40,5)],[(80.05,1),(60.05,3)],[(30,5),(80,1)]]:
        for eu in [0,1,2,3,5,6]: add('_interpoler_kurve',[points,eu],data._interpoler_kurve)
    for rows in [None,{},[],[None,{},'x'],
                 [{'T':' T4 ','eu':'10.9','t_SG_mm':'300','t_BL_mm':'400'}],
                 [{'T':'T4','eu':10,'t_SG_mm':-1,'t_BL_mm':300}],
                 [{'T':'T4','eu':10,'t_SG_mm':0,'t_BL_mm':0,'bundsikring':''}],
                 [{'T':'T4','eu':10,'t_SG_mm':300,'t_BL_mm':400}, {'T':'T4','eu':10,'t_SG_mm':350,'t_BL_mm':500}],
                 [{'T':'T9','eu':0,'t_SG_mm':1,'t_BL_mm':2,'t_slid_mm':'bad','extra':42}]]:
        add('_normaliser_koersel_raekker', [rows])
    for rows in [[],data.VEJDIM_KOERSLER_STANDARD_RAEKKER,
                 [{'T':' T4 ','eu':'10.9','t_SG_mm':300,'t_BL_mm':400,'t_slid_mm':40,'t_bindelag_mm':20,'t_bundet_mm':100,'t_ubundet_total_mm':999}],
                 [{'T':'T4','eu':10,'t_SG_mm':1,'t_BL_mm':2},{'T':'T4','eu':10,'t_SG_mm':3,'t_BL_mm':4}]]:
        add('berig_koersel_raekker',[rows],data.berig_koersel_raekker)
        add('koersler_fra_raekker',[rows],data.koersler_fra_raekker)
    for diagrams in [[],[{'rows':[{'eu':3}]}],[{'rows':[{'Eᵤ (MPa)':3}]}]]:
        add('_diagrammer_har_aktuel_schema',[diagrams])

    # Exercise original JSON loaders/savers and migration fallback using temporary files.
    config = [('materialer','MATERIALER_JSON'),('designdiagrammer','DESIGNDIAGRAMMER_JSON'),
              ('indstillinger','INDSTILLINGER_JSON'),('koersel_raekker','KORRELATION_JSON')]
    texts = [None,'{bad','null','[]','{}','\ufeff[]']
    texts_by_type = {
        'materialer': texts + [json.dumps([{'navn':'a','phi':38.5}]), json.dumps([{'navn':'a'},{'navn':'A'}]),json.dumps([{'navn':data.MATERIAL_DB[0]['navn']}])],
        'designdiagrammer':texts+[json.dumps([{'diagram_nr':1,'rows':[]}]),json.dumps([{'diagram_nr':1,'rows':[{'eu':5},{'eu':5}]}])],
        'indstillinger':texts+[json.dumps({'opbygning':{'enhed':'cm'}})],
        'koersel_raekker':texts+[json.dumps([{'T':'T4','eu':10,'t_SG_mm':300,'t_BL_mm':400}])],
    }
    for kind,key in config:
        path=source/f'fixture_{kind}.json'; ns[key]=str(path)
        def load(text, path=path, kind=kind):
            path.unlink(missing_ok=True)
            if text is not None: path.write_text(text,encoding='utf-8')
            return ns[f'indlaes_{kind}']()
        for text in texts_by_type[kind]: add(f'indlaes_{kind}',[text],load)
        standard = ns[f'_standard_{kind}']()
        for value in [standard, [] if kind!='indstillinger' else {'opbygning':{'enhed':'cm'}}]:
            def save(value,path=path,kind=kind):
                path.write_text('{}',encoding='utf-8')
                ns[f'gem_{kind}'](value)
                return {'kind':'write','data':json.loads(path.read_text(encoding='utf-8'))} if path.exists() else {'kind':'delete'}
            add(f'gem_{kind}',[value],save)
    return {'source':source_manifest(source),'method':'Unchanged AST function bodies plus original core imports; isolated original file IO', 'cases':cases}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--record',action='store_true');args=p.parse_args()
    with legacy_source(Path(r'C:\geonet_beregning')) as source: result=capture(source)
    compare_or_record(ROOT/'reference/editing-cases.json',result,args.record)
    print(f"Matched/recorded {len(result['cases'])} editing expectations")
    mapping={chr(i):chr(i).casefold() for i in range(0x110000) if chr(i).casefold()!=chr(i)}
    casefold={'unicode_version':unicodedata.unidata_version,'mapping':mapping}
    target=ROOT/'src/engine/python-casefold.json'
    if args.record and not target.exists(): write_json(target,casefold)
    else: assert json.loads(target.read_text(encoding='utf-8'))==casefold
