"""F-06.4: find and record coupled-φ cases where the original never stabilises.

core.calculator._beregn_med_soejle_phi repeats the lookup up to 12 times. If φᵥ for the
columns does not become stable, the original uses the lowest φᵥ met for each column
(the thickest construction). This tool searches the original code from an isolated
archive of the reference commit for such inputs and records them as a NEW reference
file. Existing reference files are never overwritten.

Usage: python tools/capture_coupled_phi_oscillation.py --repository C:/geonet_beregning [--record]
"""
from __future__ import annotations
import argparse
from copy import deepcopy
import itertools
import json
import random
from pathlib import Path

from legacy_reference import ROOT, legacy_source, source_manifest, write_json

TARGET = ROOT / "reference" / "coupled-phi-oscillation-cases.json"


def search(limit: int, seed: int):
    from core import afrunding as a, calculator as c, data as d, lagfordeling as l

    calls = {"n": 0}
    original = c._beregn_opslag

    def counting(*args, **kwargs):
        calls["n"] += 1
        return original(*args, **kwargs)

    c._beregn_opslag = counting
    try:
        materials = [m for m in d.MATERIAL_DB if m.get("phi") is not None]
        rng = random.Random(seed)
        options = {
            "eu": list(d.EU_RAEKKER),
            "eo": list(d.EO_KOLONNER),
            "mode": ["1_lag", "2_lag"],
            "korrektion": [-0.3, -0.2, -0.15, -0.1, -0.05, 0.0, 0.05, 0.1, 0.2],
            "fordeling": list(l.FORDELING_VALG),
            "restlag": list(l.RESTLAG_VALG),
            "phi_regel": [r for r in l.PHI_VALG if r in (c.PHI_LAVESTE, c.PHI_SOEJLE)],
            "trin": list(a.TRIN_VALG),
        }
        found, seen = [], set()
        for attempt in range(limit):
            layer_count = rng.choice([2, 3])
            chosen = rng.sample(materials, layer_count)
            thicknesses = [rng.choice(range(200, 1001, 50)) for _ in chosen]
            total = sum(thicknesses)
            layers = [
                {"navn": m["navn"], "andel": t / total, "phi": m["phi"], "lagtype": m["lagtype"]}
                for m, t in zip(chosen, thicknesses)
            ]
            phi_in = sum(m["phi"] * t for m, t in zip(chosen, thicknesses)) / total
            eu, eo = rng.choice(options["eu"]), rng.choice(options["eo"])
            klasse = d.EO_KOLONNER.index(eo) + 1
            t_min = l.STANDARD_MINIMUM_MM[klasse] if hasattr(l, "STANDARD_MINIMUM_MM") else 275
            spec = {
                "lag": layers,
                "fordeling": rng.choice(options["fordeling"]),
                "min_mm": t_min,
                "oeverst_ref_mm": thicknesses[0],
                "restlag": rng.choice(options["restlag"]),
                "restlag_graense_mm": 100,
                "vd_minimum_mm": l.STANDARD_VD_MINIMUM_MM,
                "phi_regel": rng.choice(options["phi_regel"]),
            }
            kwargs = dict(
                eu=eu, eo=eo, phi=phi_in, net_korrektion=rng.choice(options["korrektion"]),
                lag_mode=rng.choice(options["mode"]),
                afrunding={**a.normaliser(None), "trin_mm": rng.choice(options["trin"]),
                           "t_min_mm": t_min, "lagopbygning": spec},
            )
            calls["n"] = 0
            result = c.beregn(**deepcopy(kwargs))
            # 1 first lookup + 12 loop lookups + 1 conservative final lookup = never stable.
            if result.get("fejl") is None and calls["n"] == 14:
                key = (spec["phi_regel"], kwargs["lag_mode"], spec["restlag"], spec["fordeling"])
                if key in seen:
                    continue
                seen.add(key)
                found.append((kwargs, result, calls["n"], attempt))
                print(f"fundet {len(found)} efter {attempt + 1} forsøg: {key}")
                if len(found) >= 8:
                    break
        return found
    finally:
        c._beregn_opslag = original


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=40000)
    parser.add_argument("--seed", type=int, default=6)
    parser.add_argument("--record", action="store_true")
    args = parser.parse_args()
    with legacy_source(args.repository) as source:
        found = search(args.limit, args.seed)
        manifest = source_manifest(source)
    cases = [
        {
            "id": f"coupled-phi-oscillation-{i + 1:04d}",
            "group": "coupled-phi-oscillation",
            "function": "core.calculator.beregn",
            "input": kwargs,
            "expected": result,
            "lookups": lookups,
            "stable": False,
        }
        for i, (kwargs, result, lookups, _) in enumerate(found)
    ]
    print(f"{len(cases)} ustabile tilfælde fundet")
    if not args.record:
        return
    if TARGET.exists():
        raise SystemExit(f"{TARGET} findes allerede; referencer overskrives ikke")
    write_json(TARGET, {
        "source": manifest,
        "description": "F-06.4: koblet φ uden stabil tilstand efter 12 gentagelser; originalen bruger "
                       "laveste mødte φᵥ for hver opbygning. lookups = antal opslag i designdiagrammet.",
        "cases": cases,
    })
    print(f"skrevet {TARGET}")


if __name__ == "__main__":
    main()
