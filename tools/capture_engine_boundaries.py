"""Additional independent Python expectations for the first TypeScript port."""
import argparse
from copy import deepcopy
import math
from pathlib import Path
from capture_core_reference import compare_or_record
from legacy_reference import ROOT, legacy_source, source_manifest


def capture(source):
    from core import afrunding as a, enhed as e, calculator as c, lagfordeling as l, data as d
    cases=[]
    def add(function,input,expected):
        cases.append({'id':f'boundary-{len(cases)+1:04d}','function':function,'input':deepcopy(input),'expected':expected})
    for value in [-1038.55,-2.675,-1.5,-0.5,-0.0,0.0,0.5,1.5,2.5,2.675,1.005,2.685,550.0000000001,1e-308,1e20]:
        for digits in [0,1,2,4,-1]:
            add('pythonRound',{'value':value,'digits':digits},round(value,digits))
        for digits in [0,1,2,4]:
            add('pythonFixed',{'value':value,'digits':digits},f'{value:,.{digits}f}')
        for unit in ['mm','cm']:
            for digits in [0,1,2]:
                add('enhed.tal',{'v_mm':value,'enhed':unit,'decimaler':digits},e.tal(value,unit,digits))
    for value in [None,{}, {'trin_mm':True}, {'trin_mm':10.9,'vis_eksakt':1}, {'t_min_mm':True}, {'t_min_mm':275,'phi_afrunding':'ned'}, {'lagopbygning':{'lag':[]}}]:
        add('afrunding.normaliser',{'indstilling':value},a.normaliser(deepcopy(value)))
    for value in [None,{}, {'minimum_mm':{'4':5,'5':1200,'bad':300},'restlag_graense_mm':-5,'samlet_minimum':0}, {'vd_minimum_mm':{'Bærelag':True,'Bundsikring':50},'standard_klassisk':True}]:
        add('lagfordeling.normaliser',{'indstilling':value},l.normaliser(deepcopy(value)))
    for eo in [None,29.999999,30,30.000002,70,150,151]:
        add('lagfordeling.klasse_for_eo',{'eo':eo},l.klasse_for_eo(eo))
    for options in [{}, {'restlag':'flet'}, {'restlag':'vd','kraev_bundsikring':True}]:
        add('lagfordeling.standard_spec',{'indstilling':options,'minimum':275},l.standard_spec(options,275))
    # Custom tables exercise missing rows/columns, interpolation, scaling and no unreinforced reference.
    for table in [{}, {10:{80:{'uarmeret':None,'1_lag':60.5,'2_lag':None}}}, {10:{60:{'uarmeret':80.5,'1_lag':55.5},80:{'uarmeret':90.5,'1_lag':60.5}}}]:
        for eo in [60,70,80]:
            kwargs={'eu':10,'eo':eo,'phi':37.5,'net_korrektion':-0.2,'lag_mode':'1_lag','t_basis_table':table,'skala':1.05,'afrunding':a.normaliser(None)}
            add('calculator.beregn',kwargs,c.beregn(**deepcopy(kwargs)))
    return {'source':source_manifest(source),'comparison':'exact; no migration tolerance','cases':cases}


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--record',action='store_true')
    args=parser.parse_args()
    with legacy_source(Path(r'C:\geonet_beregning')) as source:
        result=capture(source)
    compare_or_record(ROOT/'reference/engine-boundaries.json',result,args.record)
    print(f"{'Recorded' if args.record else 'Matched'} {len(result['cases'])} additional Python boundary expectations")
