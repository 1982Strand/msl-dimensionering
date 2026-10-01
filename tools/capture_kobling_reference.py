"""Observe M1 in an isolated archive of a330cfd, with unchanged function bodies.

Run with C:\\geonet_beregning\\.venv\\Scripts\\python.exe. Only Streamlit's
outer HTML/column/figure wrappers are separated; entities are decoded in plain
text fields. HTML bodies, spaces, newlines, numbers and SVG remain verbatim.
"""
from __future__ import annotations

import argparse
import contextlib
from copy import deepcopy
import html
import json
import os
from pathlib import Path
import re
import sys

from legacy_reference import ROOT, legacy_source, source_manifest
from capture_core_reference import compare_or_record


@contextlib.contextmanager
def trusted_archive(repository):
    """Trust only the named reference repository for this process, not globally."""
    count = int(os.environ.get('GIT_CONFIG_COUNT', '0'))
    changes = {'GIT_CONFIG_COUNT': str(count + 1),
               f'GIT_CONFIG_KEY_{count}': 'safe.directory',
               f'GIT_CONFIG_VALUE_{count}': repository.resolve().as_posix()}
    previous = {key: os.environ.get(key) for key in changes}
    os.environ.update(changes)
    try:
        with legacy_source(repository) as source:
            yield source
    finally:
        for key, value in previous.items():
            if value is None: os.environ.pop(key, None)
            else: os.environ[key] = value


OBSERVER = r'''
_m1_original_trin = _kob_trin
_m1_original_ramme = _kob_figurramme
_m1_original_render = _render_kobling_sektion
def _m1_plain(s):
    return html.unescape(re.sub(r'<[^>]*>', '', s))
def _m1_ramme(svg, signatur, tekst):
    out = _m1_original_ramme(svg, signatur, tekst)
    st.session_state['_m1_pending'] = {'html': out, 'caption': _m1_plain(tekst),
                                     'legend': [_m1_plain(s) for s in signatur]}
    return out
def _m1_trin(nr, titel, kilde, krop, **kwargs):
    original_body = krop
    figure = st.session_state.pop('_m1_pending', None)
    if figure and figure['html']:
        # Separate only the presentation column and complete figure wrapper.
        assert krop.startswith('<div class="kob-kol"><div class="kob-venstre">')
        krop = krop[len('<div class="kob-kol"><div class="kob-venstre">'):]
        suffix = '</div>' + figure['html'] + '</div>'
        assert krop.endswith(suffix)
        krop = krop[:-len(suffix)]
    else:
        figure = None
    st.session_state['_m1_steps'].append({
        'number': nr, 'title': _m1_plain(titel), 'source': _m1_plain(kilde),
        'original_body_html': original_body,
        'body_html': krop,
        'formulae': [_m1_plain(s).split('\n') for s in re.findall(
            r'<div class="kob-formel">(.*?)</div>(?:</div>|<div class="kob-note"|$)',
            krop, re.S)],
        'explanations': [_m1_plain(s) for s in re.findall(
            r'<div class="kob-(?:note|brod)">(.*?)</div>', krop, re.S)],
        'result': _m1_plain(kwargs.get('resultat', '')),
        'result_note': _m1_plain(kwargs.get('resultat_note', '')),
        'chip': _m1_plain(kwargs.get('chip', '')),
        'figure': {'caption': figure['caption'], 'legend': figure['legend']} if figure else None,
    })
    return _m1_original_trin(nr, titel, kilde, original_body, **kwargs)
def _m1_figure(name, fn):
    def observed(*args, **kwargs):
        out = fn(*args, **kwargs)
        st.session_state['_m1_figures'].append({'function': name, 'args': args,
                                               'kwargs': kwargs, 'svg': out})
        return out
    return observed
def _m1_render(*args, **kwargs):
    st.session_state['_m1_steps'] = []
    st.session_state['_m1_figures'] = []
    st.session_state.pop('_m1_pending', None)
    return _m1_original_render(*args, **kwargs)
_kob_trin = _m1_trin
_kob_figurramme = _m1_ramme
_kob_figur_koersler = _m1_figure('_kob_figur_koersler', _kob_figur_koersler)
_kob_figur_diagram = _m1_figure('_kob_figur_diagram', _kob_figur_diagram)
_render_kobling_sektion = _m1_render
'''


def capture(source):
    from streamlit.testing.v1 import AppTest
    original = (source / 'app.py').read_text(encoding='utf-8-sig')
    manifest = source_manifest(source)
    marker = '# Bevar input på tværs af sidenavigation — SKAL køre før nogen widget oprettes.'
    assert original.count(marker) == 1
    (source / 'app.py').write_text(original.replace(marker, OBSERVER + '\n' + marker), encoding='utf-8')
    at = AppTest.from_file(str(source / 'app.py'), default_timeout=40).run()
    if at.exception: raise AssertionError([e.message for e in at.exception])
    settings = deepcopy(at.session_state['indstillinger'])
    cases = []
    for case_id, mode, eu, basis, unit, net, rule in [
        ('FIG-001', 'Standard', 10, 'Belastningsklasse', 'mm', 'Tensar TriAx TX160', 'indtastet'),
        ('FIG-002', 'Standard', 5, 'Belastningsklasse', 'mm', 'Tensar InterAx NX850', 'indtastet'),
        ('FIG-004', 'Brugerdefineret', 5, 'Belastningsklasse', 'cm', 'Tensar InterAx NX850', 'indtastet'),
        ('TR-1', 'Standard', 10, 'Trafikklasse', 'mm', 'Tensar TriAx TX160', 'indtastet'),
        ('TR-2', 'Brugerdefineret', 7, 'Trafikklasse', 'cm', 'Tensar InterAx NX850', 'indtastet'),
        ('OUT-1', 'Standard', 10, 'Trafikklasse', 'mm', 'Tensar TriAx TX160', 'indtastet'),
        ('OUT-2', 'Standard', 10, 'Trafikklasse', 'mm', 'Tensar TriAx TX160', 'indtastet'),
        ('PH-2', 'Brugerdefineret', 5, 'Belastningsklasse', 'mm', 'Tensar InterAx NX850', 'soejle'),
    ]:
        ind = deepcopy(settings)
        ind['opbygning']['enhed'] = unit
        ind['lagfordeling']['phi_regel'] = rule
        if case_id == 'OUT-2':
            ind['yderomraade']['under_uden'] = 'vejdim'
            ind['yderomraade']['under_inden'] = 'vejdim'
        prefix = 'std' if mode == 'Standard' else 'bd'
        for key, value in {
            'indstillinger': ind, 'tilstand': mode, f'{prefix}_eu_slider': eu,
            f'{prefix}_grundlag': basis, f'{prefix}_valgt_klasse': 4,
            f'{prefix}_valgt_tklasse': 'T1' if case_id.startswith('OUT') else 'T4',
            f'{prefix}_geonet': net, 'bd_phi_override': False, 'bd_antal_lag': 2,
            '_m1_steps': [], '_m1_figures': [],
        }.items(): at.session_state[key] = value
        at.run()
        if at.exception: raise AssertionError([e.message for e in at.exception])
        state = at.session_state.filtered_state
        dim = state.get('sidste_dim')
        expanders = [e for e in at.expander if e.label.startswith(('**Sådan er resultatet beregnet**', 'Sådan er resultatet beregnet'))]
        assert len(expanders) <= 1
        expander = expanders[0] if expanders else None
        bodies = [e.proto.body for e in expander.get('html')] if expander else []
        captions = [e.value for e in expander.caption] if expander else []
        footer = re.search(r'<div class="kob-fod">(.*?)</div>', bodies[0], re.S) if bodies else None
        cases.append({'id': case_id, 'input': {
            'tilstand': mode, 'eu': eu,
            'grundlag': {'type': 'trafikklasse', 't_klasse': state[f'{prefix}_valgt_tklasse']} if basis == 'Trafikklasse'
                        else {'type': 'belastningsklasse', 'klasse': 4},
            'geonet_navn': net, 'materialer': deepcopy(dim.get('materialer', [])) if dim else [],
            'indstillinger': deepcopy(state['indstillinger']),
        }, 'expected': {
            'visible': expander is not None, 'title': expander.label if expander else None,
            'expanded': expander.proto.expanded if expander else False,
            'steps': deepcopy(state['_m1_steps']), 'captions': captions,
            'footer': html.unescape(footer.group(1)) if footer else None,
        }, 'figures': deepcopy(state['_m1_figures']), 'original_html': bodies})
        print(case_id, len(state['_m1_steps']), flush=True)
    return {'source': manifest,
            'normalization': 'Only Streamlit outer HTML/column/figure wrappers are separated. Plain fields strip presentation tags and decode HTML entities; HTML bodies, whitespace, newlines, numbers and SVG are unchanged.',
            'cases': cases}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--record', action='store_true')
    parser.add_argument('--legacy-repo', type=Path, default=Path(r'C:\geonet_beregning'))
    args = parser.parse_args()
    if Path(sys.executable).resolve() != (args.legacy_repo / '.venv/Scripts/python.exe').resolve():
        raise RuntimeError('Use the approved legacy .venv/Scripts/python.exe')
    target = ROOT / 'reference/kobling-cases.json'
    if args.record and target.exists(): raise FileExistsError(f'Refusing to overwrite {target}')
    with trusted_archive(args.legacy_repo) as source: result = capture(source)
    if args.record:
        # Exclusive create also prevents a second recorder winning the race.
        with target.open('x', encoding='utf-8', newline='\n') as output:
            output.write(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + '\n')
    else:
        compare_or_record(target, result, False)
    print('Recorded eight M1 cases.' if args.record else 'Eight M1 cases match exactly.')
