"""Export approved built-in constants only; never use local user JSON."""
import argparse
import json
from pathlib import Path
from legacy_reference import ROOT, legacy_source, write_json, source_manifest


def export(repository):
    with legacy_source(repository) as source:
        from core import data as d
        frozen = json.loads((ROOT/'reference/core-cases.json').read_text(encoding='utf-8'))
        names = [name for name in frozen['defaults'] if name.isupper()]
        values = {name: getattr(d, name) for name in names}
        wire = json.loads(json.dumps(values, ensure_ascii=False, allow_nan=False))
        assert wire == {name: frozen['defaults'][name] for name in names}, 'Defaults differ from approved reference'
        values.update({name:getattr(d,name) for name in ['EO_MIN','EO_MAX','PHI_MIN','PHI_MAX']})
        return {'source':source_manifest(source),'values':values}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--legacy-repo',type=Path,default=Path(r'C:\geonet_beregning'))
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    result = json.loads(json.dumps(export(args.legacy_repo),ensure_ascii=False))
    target = ROOT/'src/engine/defaults.json'
    if args.check:
        assert result == json.loads(target.read_text(encoding='utf-8')), 'Exported defaults changed'
    elif target.exists():
        raise SystemExit('Refusing to overwrite existing defaults; use --check')
    else:
        write_json(target,result)
    print('Built-in engine data verified against approved source and frozen reference')
