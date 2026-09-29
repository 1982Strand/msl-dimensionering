"""Reference for edited data entering calculations and traffic table presentation."""
import argparse
from copy import deepcopy
from pathlib import Path
from capture_editing_reference import helpers, wire
from capture_core_reference import compare_or_record
from legacy_reference import ROOT, legacy_source, source_manifest


def capture(source):
    ns,d=helpers(source)
    from core import calculator as c
    cases=[]
    def add(fn,args,call):
        try: expected={'value':wire(call(*deepcopy(args)))}
        except Exception as e: expected={'error':type(e).__name__}
        cases.append({'id':f'dataflow-{len(cases)+1:04d}','function':fn,'args':wire(args),'expected':expected})
    runs=[{},d.VEJDIM_KOERSLER,{'T4':{5:800,10:{'sg':300,'bl':400},15:0,20:3000}}]
    for r in runs:
        for rules in [None,{'under_uden':'vejdim','over_uden':'vejdim'},{'tolerance_over_pct':0,'tolerance_under_pct':0}]:
            for fn in ['korrelation_fra_koersler','korrelation_opslag']:
                add(fn,[r,None,rules],getattr(d,fn))
        for t in ['T1','T4','ukendt']:add('trafik_eu_interval',[t,r],d.trafik_eu_interval)
    for t in ['T1','T2','T3','T4','T5','T6','ukendt']:
        add('format_trafikklasse',[t],d.format_trafikklasse)
        add('trafikklasse_noegletal',[t],d.trafikklasse_noegletal)
        for eu in [3,10,45]:add('trafik_eo_aekv',[t,eu],d.trafik_eo_aekv)
    for names in [[],['T3','T4','T5'],['T6','T2','T2','T4'],['x','T1'],['T0','T1'],['Tbad']]:
        add('format_trafikklasse_interval',[names],d.format_trafikklasse_interval)
    for ks in [[],[1,2],[3,4,5,6]]:
        for eu in [3,10,30,45]:add('trafikklasser_for_belastningsklasser',[ks,eu],d.trafikklasser_for_belastningsklasser)
    # Independent composition of original helpers; checks the boundary between editing and core.
    def edited_flow(inputs):
        diagrams,errors=ns['_normaliser_designdiagrammer'](inputs['diagrammer'])
        table=ns['generer_t_basis_table_fra_diagrammer'](diagrams)
        settings=ns['_normaliser_indstillinger'](inputs['indstillinger'])
        rows=ns['_normaliser_koersel_raekker'](inputs['koersler'])
        runs=d.koersler_fra_raekker(rows)
        lookup=d.trafik_opslag('T4',10,runs,table,settings['yderomraade'])
        result=c.beregn(eu=10,eo=80,phi=38.5,net_korrektion=-0.15,lag_mode='1_lag',
                        t_basis_table=table,afrunding=settings['afrunding'])
        return {'diagramfejl':errors,'resultat':result,'trafik':lookup,
                'korrelation':d.korrelation_fra_koersler(runs,table,settings['yderomraade'])}
    for diagrammer in [[],[{'diagram_nr':4,'rows':[{'eu':10,'t_uarmeret_cm':95,'t_1_lag_cm':65,'t_2_lag_cm':None}]}],
                        [{'diagram_nr':4,'rows':[]}]]:
        for afr in [{},{'trin_mm':10,'phi_afrunding':'ned'}]:
            add('edited_flow',[{'diagrammer':diagrammer,'indstillinger':{'afrunding':afr},'koersler':[
                {'T':'T4','eu':10,'t_SG_mm':300,'t_BL_mm':600}]}],edited_flow)
    return {'source':source_manifest(source),'cases':cases}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--record',action='store_true');args=p.parse_args()
    with legacy_source(Path(r'C:\geonet_beregning')) as source:r=capture(source)
    compare_or_record(ROOT/'reference/data-flow-cases.json',r,args.record)
    print(f"Matched/recorded {len(r['cases'])} data flow expectations")
