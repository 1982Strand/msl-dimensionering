"""Record/check outputs of the approved Python code; this is not a new engine."""
from __future__ import annotations
import argparse
from collections import Counter
from copy import deepcopy
import itertools
import json
from pathlib import Path

from legacy_reference import ROOT, legacy_source, source_manifest, write_json


def capture(source):
    from core import afrunding as a, calculator as c, data as d, enhed as e, lagfordeling as l, placement as p, validators as v
    cases = []

    def add(group, function, **kwargs):
        # Deep copies guard against a reference function mutating another case.
        expected = function(**deepcopy(kwargs))
        cases.append({"id": f"{group}-{sum(x['group'] == group for x in cases) + 1:04d}",
                      "group": group, "function": f"{function.__module__}.{function.__name__}",
                      "input": deepcopy(kwargs), "expected": expected})
        return expected

    defaults = {name: getattr(d, name) for name in (
        "EU_MIN", "EU_MAX", "EU_RAEKKER", "EO_KOLONNER", "PHI_BASIS", "K_PHI",
        "GEONET_DB", "MATERIAL_DB", "CV_TIL_EU", "BELASTNINGSKLASSER", "TRAFIKKLASSER",
        "T_BASIS_TABLE", "DESIGNDIAGRAM_RAW_TABLES", "VEJDIM_KOERSLER_STANDARD_RAEKKER",
        "STANDARD_YDER_REGLER",
    )}
    defaults["afrunding"] = a.normaliser(None)
    defaults["lagfordeling"] = l.normaliser(None)
    defaults["enhed"] = e.STANDARD_ENHED

    for eu, eo, mode in itertools.product(d.EU_RAEKKER, d.EO_KOLONNER, ("1_lag", "2_lag")):
        add("diagram-grid", c.beregn, eu=eu, eo=eo, phi=d.PHI_BASIS,
            net_korrektion=0.0, lag_mode=mode, afrunding=a.normaliser(None))

    for eu, eo, mode in [(2, 80, "1_lag"), (46, 80, "1_lag"), (10.5, 80, "1_lag"),
                         (10, 29, "1_lag"), (10, 151, "1_lag"), (10, 70, "1_lag"), (10, 80, "invalid")]:
        add("invalid-calculation", c.beregn, eu=eu, eo=eo, phi=37, net_korrektion=0, lag_mode=mode)

    for phi, correction, mode in itertools.product((20, 35, 36.5, 37, 37.5, 45, 50, 60), (-0.3, -0.2, 0, 0.2), ("1_lag", "2_lag")):
        add("correction", c.beregn, eu=5, eo=120, phi=phi, net_korrektion=correction,
            lag_mode=mode, afrunding=a.normaliser(None))

    rule_sets = [None, d.STRENGE_YDER_REGLER]
    rule_sets.extend({**d.STANDARD_YDER_REGLER, "under_inden": inside,
                      "over_uden": over, "under_uden": under}
                     for inside, over, under in itertools.product(d.UNDER_INDEN_VALG, d.OVER_UDEN_VALG, d.UNDER_UDEN_VALG))
    for traffic, eu in itertools.product(d.TRAFIKKLASSER, d.EU_RAEKKER):
        add("traffic-default", d.trafik_opslag, t_klasse=traffic, eu=eu)
    for rules, traffic, eu in itertools.product(rule_sets, d.TRAFIKKLASSER, (3, 5, 10, 20, 40, 45)):
        add("traffic-rules", d.trafik_opslag, t_klasse=traffic, eu=eu, yder_regler=rules)
    for eo in (d.EO_KOLONNER[0], d.EO_KOLONNER[-1]):
        edge = c._slaa_op(10, eo, "uarmeret") * 10
        for factor in (0.8, 0.94999999, 0.95, 0.95000001, 1, 1.04999999, 1.05, 1.05000001, 1.2):
            add("traffic-boundary", d._opslag_for_tykkelse, eu=10, tykkelse=edge * factor,
                t_basis_table=None, yder_regler=None)

    for step, value in itertools.product(a.TRIN_VALG, (None, 0, 0.5, 1, 199.9999, 200, 200.00000001, 200.001, 249.9999, 250, 250.0001, 617, 1038)):
        add("round-up", a.rund_op, vaerdi=value, trin=step)
    for method, phi in itertools.product(a.PHI_AFRUNDING_VALG, (None, 35, 36.499999, 36.5, 36.500001, 37.5, 50)):
        add("round-phi", a.afrund_phi, phi=phi, metode=method)
    for step, exact, phi_method in itertools.product(a.TRIN_VALG, (False, True), a.PHI_AFRUNDING_VALG):
        add("round-calculation", c.beregn, eu=5, eo=120, phi=37.5, net_korrektion=-0.1,
            lag_mode="2_lag", afrunding={"trin_mm": step, "reduktion_eksakt": exact, "phi_afrunding": phi_method})

    layers = [{"navn": "Reference baerelag", "andel": 3 / 7, "phi": 40, "lagtype": "Bærelag"},
              {"navn": "Reference bundsikring", "andel": 4 / 7, "phi": 35, "lagtype": "Bundsikring"}]
    for distribution, rest, phi_rule in itertools.product(l.FORDELING_VALG, l.RESTLAG_VALG, l.PHI_VALG):
        spec = {"lag": layers, "fordeling": distribution, "min_mm": 275,
                "oeverst_ref_mm": 300, "restlag": rest, "restlag_graense_mm": 100,
                "vd_minimum_mm": l.STANDARD_VD_MINIMUM_MM, "phi_regel": phi_rule}
        for total in (200, 300, 450, 700):
            add("layer-distribution", l.fordel_soejle, spec=spec, total_mm=total, trin=50, t_uarm_mm=900)
        add("coupled-phi", c.beregn, eu=5, eo=120, phi=260 / 7, net_korrektion=-0.1, lag_mode="2_lag",
            afrunding={**a.normaliser(None), "t_min_mm": 275, "lagopbygning": spec})

    for product, mode, total in itertools.product(d.GEONET_DB, ("1_lag", "2_lag"), (199, 200, 399, 400, 600, 701)):
        add("placement", p.check_geonet_placement, lag_mode=mode, total_mm=total, geonet=product)
    for where, top in itertools.product(p.PLACERING_VALG, (100, 200, 300)):
        add("layer-placement", p.check_geonet_placement, lag_mode="2_lag", total_mm=600,
            sub_lag=[{"navn": "Top", "tykkelse_mm": top}, {"navn": "Bottom", "tykkelse_mm": 600-top}], placering=where)
    for eu in (None, 4.9999, 5, 5.0001):
        add("overlap", p.overlap_krav_mm, krav=p.placement_requirements(), eu=eu)

    for eu, eo, mode in itertools.product((3, 10, 45), (30, 80, 150), ("1_lag", "2_lag")):
        products = add("products", c.beregn_alle_produkter, eu=eu, eo=eo, lag_mode=mode, afrunding=a.normaliser(None))
        add("product-groups", c.grupper_produkter, produkter=products, tolerance_mm=5.0)
    for cv in (-1, 0, 180, 181, *range(5, 180, 5)):
        add("cv-conversion", d.cv_til_eu, cv=cv)
    for unit, value in itertools.product(("mm", "cm", "invalid"), (None, 0, -0.1, 0.5, 1.5, 648, 650, 1038, -375)):
        add("display-length", e.laengde, v_mm=value, enhed=unit)

    for eu, eo, mode in [(2, 80, "1_lag"), (46, 80, "1_lag"), (10, 29, "1_lag"), (10, 151, "1_lag"),
                         (10, 70, "1_lag"), (10.5, 80, "1_lag"), (10, 80, "invalid"),
                         (5, 120, "1_lag"), (5, 120, "2_lag"), (45, 30, "2_lag")]:
        for phi in (20, 37, 60):
            add("validation", v.valider_input, eu=eu, eo=eo, phi=phi, lag_mode=mode, geonet=None, materialer=None)
    for product in d.GEONET_DB:
        add("product-validation", v.valider_input, eu=5, eo=120, phi=37, lag_mode="1_lag", geonet=product,
            materialer=[{"navn": "Synthetic material", "max_korn": 150, "lagtype": "Bundsikring", "krav_maskestoerrelse_mm": 100},
                        {"navn": "Synthetic base", "max_korn": None, "lagtype": "Bærelag"}])
    for function in (a.normaliser, l.normaliser, d.normaliser_yder_regler):
        argument = next(iter(__import__("inspect").signature(function).parameters))
        for value in (None, {}, {"trin_mm": -1, "fordeling": "invalid", "tolerance_over_pct": 99}):
            add("normalize", function, **{argument: value})
    return {"source": source_manifest(source), "comparison": "exact; no migration tolerance approved",
            "defaults": defaults, "counts": dict(sorted(Counter(x["group"] for x in cases).items())), "cases": cases}


def compare_or_record(path, actual, record):
    # A JSON roundtrip fixes the cross-language wire format (numeric dict keys become strings).
    actual = json.loads(json.dumps(actual, ensure_ascii=False, allow_nan=False))
    if record:
        if path.exists():
            raise SystemExit(f"Refusing to overwrite frozen reference: {path}")
        write_json(path, actual)
    else:
        expected = json.loads(path.read_text(encoding="utf-8"))
        if json.dumps(actual, sort_keys=True, ensure_ascii=False) != json.dumps(expected, sort_keys=True, ensure_ascii=False):
            raise SystemExit("Reference mismatch; frozen data was NOT overwritten.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-repo", type=Path, default=Path(r"C:\geonet_beregning"))
    parser.add_argument("--record", action="store_true", help="Create once; refuses to overwrite")
    args = parser.parse_args()
    with legacy_source(args.legacy_repo) as source:
        result = capture(source)
    compare_or_record(ROOT / "reference" / "core-cases.json", result, args.record)
    print(json.dumps({"status": "recorded" if args.record else "matched", "total": len(result["cases"]), "groups": result["counts"]}))
