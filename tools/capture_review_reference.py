"""Freeze original diagram difference markers before extending them for R-002."""
import argparse
from copy import deepcopy
from pathlib import Path
from capture_editing_reference import FUNCTIONS, helpers
from capture_core_reference import compare_or_record
from legacy_reference import ROOT, legacy_source, source_manifest

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--record',action='store_true');args=p.parse_args()
    FUNCTIONS.append('_diagram_afvigelser')
    with legacy_source(Path(r'C:\geonet_beregning')) as source:
        ns,d=helpers(source);cases=[]
        standard=deepcopy(d.DESIGNDIAGRAM_RAW_TABLES[3])
        def add(diagram):
            out=ns['_diagram_afvigelser'](deepcopy(diagram))
            expected={'celler':sorted(out['celler']),'nye':sorted(out['nye']),'fjernede':out['fjernede']}
            cases.append({'id':f'review-{len(cases)+1:03d}','input':diagram,'expected':expected})
        add(standard)
        for value in [None,0,80,65.0000001,65.000001]:
            diagram=deepcopy(standard);next(r for r in diagram['rows'] if r['eu']==10)['t_1_lag_cm']=value;add(diagram)
        diagram=deepcopy(standard);diagram['rows'].pop();add(diagram)
        diagram=deepcopy(standard);diagram['rows'].append({'eu':99,'t_1_lag_cm':10});add(diagram)
        result={'source':source_manifest(source),'cases':cases}
    compare_or_record(ROOT/'reference/review-cases.json',result,args.record)
    print(f'Matched/recorded {len(cases)} original marker cases')
