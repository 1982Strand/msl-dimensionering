import { defaults, PHI_BASIS, K_PHI } from './data.ts';
import {
  beregn_grundlag,
  phi_fra_materialer,
  type DimensioningInput,
  type dimensioner,
} from './dimensionering.ts';
import { afrund_phi, normaliser as roundingOf, er_oprundet, eksakt_navn } from './afrunding.ts';
import { normaliser as distributionOf } from './lagfordeling.ts';
import { laengde, tal, fortegn, normaliser as unitOf } from './enhed.ts';
import { pythonFixed } from './python-numbers.ts';
import { format_trafikklasse, trafikklasse_noegletal, trafik_eu_interval } from './correlation.ts';
import type { CalculationResult } from './types.ts';
import type { ProductRow } from './products.ts';

export type PageDisplayNode =
  | string
  | { text: string; entity: string }
  | {
      tag: 'div' | 'span' | 'b' | 'sub' | 'table' | 'tr' | 'td' | 'h1' | 'p';
      className?: string;
      attributes?: Record<string, string>;
      children: PageDisplayNode[];
    };
export interface PageDisplayElement {
  slot: string;
  type: 'html' | 'markdown' | 'caption';
  content: PageDisplayNode[];
}
export interface PageResultCard {
  label: string;
  value: string;
  unit: string;
  calculated: string | null;
  note: string | null;
  delta: string | null;
  deltaNote: string | null;
  highlighted: boolean;
}
export interface DimensioningPage {
  elements: PageDisplayElement[];
  cards: PageResultCard[];
  productExpander: { label: string; expanded: false } | null;
  messageKind: 'info' | 'warning' | null;
}
const n = (
  tag: Exclude<PageDisplayNode, string | { text: string; entity: string }>['tag'],
  children: PageDisplayNode[],
  className?: string,
  attributes?: Record<string, string>,
): PageDisplayNode => ({
  tag,
  ...(className ? { className } : {}),
  ...(attributes ? { attributes } : {}),
  children,
});
const d = (className: string, ...children: PageDisplayNode[]) => n('div', children, className);
const s = (className: string, text: string) => n('span', [text], className);
const style = (value: string, ...children: PageDisplayNode[]) =>
  n('div', children, undefined, { style: value });
const b = (text: string) => n('b', [text]);
const dk = (v: number, digits = 1) => pythonFixed(v, digits).replace('.', ',').replace('-', '−');
const mpa = (v: number | null) =>
  v === null ? '—' : `${pythonFixed(v, 0, true).replaceAll(',', '.')} MPa`;
const degrees = (v: number) => `${dk(v)}°`;
const pct = (v: number) => `${dk(v)} %`;
const signedPct = (v: number) => `${v >= 0 ? '+' : ''}${dk(v * 100)} %`;
const mono = "'IBM Plex Mono',ui-monospace,monospace";
const sans = "'IBM Plex Sans',system-ui,sans-serif";
export const pageIntroduction =
  "Bærelagstykkelse med og uden geonetarmering. Grundlaget er BG Byggros' designmanualer til Tensar og GS-GRID samt interne forsøgsdata.";
export const thinnestTitle =
  'Dette er det tyndeste gyldige alternativ blandt de viste opbygninger.';

function cardNodes(cards: PageResultCard[]): PageDisplayNode {
  return style(
    `display:grid;grid-template-columns:1.15fr${' 1fr'.repeat(cards.length - 1)};gap:1px;background:#DCE1DD;border:1px solid #DCE1DD;border-radius:5px;overflow:hidden`,
    ...cards.flatMap((c, i): PageDisplayNode[] => {
      const badge = c.highlighted
        ? n('div', ['TYNDEST'], undefined, {
            title: thinnestTitle,
            style: `font:600 9px/1 ${mono};letter-spacing:.08em;color:#fff;background:#1B6B34;padding:4px 7px;border-radius:3px`,
          })
        : '';
      const calculated = c.calculated
        ? style(
            `font:400 11.5px/1 ${sans};color:#7A857D;margin-left:4px;white-space:nowrap`,
            `(${c.calculated})`,
          )
        : '';
      const delta =
        c.delta !== null
          ? style(
              'display:flex;align-items:center;gap:7px;margin-top:9px',
              style(`font:600 11.5px/1 ${mono};color:#1B6B34`, c.delta),
              style(`font:400 11.5px/1 ${sans};color:#4A554E`, c.deltaNote ?? ''),
            )
          : c.note
            ? style(`font:400 11.5px/1.5 ${sans};color:#7A857D;margin-top:9px`, c.note)
            : '';
      return [
        '\n            ',
        style(
          `background:${c.highlighted ? '#F7FBF8' : '#FFFFFF'};padding:18px 20px 17px;${c.highlighted ? 'box-shadow:inset 3px 0 0 #1B6B34;' : ''}`,
          '\n              ',
          style(
            'display:flex;align-items:center;justify-content:space-between;margin-bottom:11px',
            '\n                ',
            style(
              `font:600 9.5px/1 ${mono};letter-spacing:.1em;color:${c.highlighted ? '#1B6B34' : '#7A857D'}`,
              `\n                  ${c.label.toUpperCase()}`,
            ),
            badge,
            '\n              ',
          ),
          '\n              ',
          style(
            'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap',
            '\n                ',
            style(
              `font:600 40px/1 ${mono};color:${c.highlighted ? '#12401F' : '#15211A'};\n                            font-variant-numeric:tabular-nums;letter-spacing:-.02em`,
              c.value,
            ),
            '\n                ',
            style(`font:500 15px/1 ${sans};color:#4A554E`, c.unit),
            calculated,
            '\n              ',
          ),
          '\n              ',
          delta,
          '\n            ',
        ),
        i === cards.length - 1 ? '\n            ' : '\n',
      ];
    }),
  );
}

export function dimensioningPage(
  input: DimensioningInput,
  result: ReturnType<typeof dimensioner>,
  products: { one: ProductRow[]; two: ProductRow[] },
): DimensioningPage {
  const g = beregn_grundlag(input),
    standard = input.tilstand === 'Standard';
  const unit = unitOf(
    (input.indstillinger as { opbygning?: { enhed?: unknown } } | undefined)?.opbygning?.enhed,
  );
  const distribution = distributionOf(input.indstillinger?.lagfordeling);
  const rounding = roundingOf(input.indstillinger?.afrunding);
  const materials = input.materialer ?? [];
  const total = materials.reduce((v, m) => v + (m.tykkelse_mm || 0), 0) || null;
  const weighted = phi_fra_materialer(materials);
  const phi = standard
    ? PHI_BASIS
    : afrund_phi(input.phi_manuel ?? weighted, rounding.phi_afrunding);
  const elements: PageDisplayElement[] = [];
  const add = (slot: string, node: PageDisplayNode, type: PageDisplayElement['type'] = 'html') =>
    elements.push({ slot, type, content: [node] });
  const eyebrow = (slot: string, text: string) => add(slot, d('bg-eyebrow', text));
  const step = (slot: string, number: number, title: string, summary: PageDisplayNode[]) =>
    add(
      slot,
      d(
        'bg-trin-hoved',
        d('bg-trin-nr', String(number)),
        d('bg-trin-titel', title),
        d('bg-trin-opsum', ...summary),
      ),
    );
  add(
    'pageHeading',
    d(
      'bg-sidehoved',
      n('h1', ['Dimensionering']),
      n('p', [{ text: pageIntroduction, entity: pageIntroduction }]),
    ),
    'markdown',
  );
  let summary = `Eᵤ ${pythonFixed(input.eu, 0)} MPa · ${g.type === 'trafikklasse' ? g.t_klasse : `Klasse ${g.valgt_klasse}`}`;
  if (g.type === 'belastningsklasse') summary += ` · Eₒ ${pythonFixed(g.eo!, 0)} MPa`;
  else {
    if (g.eo_aekv !== null) summary += ` · Eₒ,ækv ${pythonFixed(g.eo_aekv, 0)} MPa`;
    if (g.yder)
      summary += ` · ${g.eo === null ? 'afvist' : g.yder.handling === 'laveste' ? 'laveste kurve' : 'VejDims tykkelse'} (${g.zone} ${pct(Number(g.yder.afvigelse_pct))})`;
  }
  step('step1', 1, 'Underbund og dimensioneringsgrundlag', [summary]);
  eyebrow('subgradeLabel', 'UNDERBUNDENS STYRKE');
  eyebrow('basisLabel', 'DIMENSIONERINGSGRUNDLAG');
  let messageKind: DimensioningPage['messageKind'] = null;
  const message = (children: PageDisplayNode[], info = false) => {
    messageKind = info ? 'info' : 'warning';
    add(
      'basisMessage',
      style(
        `background:${info ? '#F4F6F4' : '#FCF5E8'};border:1px solid ${info ? '#DCE1DD' : '#F0E2C6'};border-left:3px solid ${info ? '#7A857D' : '#A8600B'};border-radius:4px;padding:10px 12px;margin:2px 0`,
        style(`font:400 11.5px/1.55 ${sans};color:#4A554E`, ...children),
      ),
    );
  };
  if (g.yder) {
    const y = g.yder,
      direction =
        g.zone === 'over' ? 'over diagrammets øverste kurve' : 'under diagrammets laveste kurve';
    const head = `${g.t_klasse} · Eᵤ = ${mpa(input.eu)} ligger ${pct(Number(y.afvigelse_pct))} ${direction}, ${y.inden_tolerance ? 'inden for' : 'uden for'} tolerancen på ${pct(Number(y.tolerance_pct))}.`;
    const figures = ` VejDim kræver ${laengde(Number(y.t_vejdim_mm), unit)} ubundet mod ${laengde(Number(y.t_rand_mm), unit)} for kurven Eₒ = ${mpa(Number(y.eo_rand))}.`;
    if (g.eo === null)
      message([
        b(head),
        figures +
          ' Beregningen afvises efter Indstillinger, afsnit 8, og opbygningen kræver en konkret vurdering. Der kan i stedet dimensioneres efter ',
        b('Belastningsklasse'),
        '-grundlaget, eller reglerne kan ændres under Indstillinger.',
      ]);
    else {
      const reference =
        y.handling === 'laveste'
          ? `Der regnes med diagrammets laveste kurve, Eₒ = ${mpa(Number(y.eo_rand))}, på ${laengde(Number(y.t_rand_mm), unit)}.`
          : `Den ustabiliserede tykkelse er ${g.zone === 'over' ? 'løftet' : 'sat ned'} til VejDims ${laengde(Number(y.t_vejdim_mm), unit)}; geonettets reduktion er aflæst på kurven Eₒ = ${mpa(Number(y.eo_rand))}.`;
      const reservation = y.inden_tolerance
        ? ''
        : y.handling === 'vejdim'
          ? ' Der gøres opmærksom på, at reduktionen er aflæst på randkurven og dermed ekstrapoleret; den er ikke bestemt i driftspunktet.'
          : ' Der gøres opmærksom på, at kurven ligger væsentligt over VejDims krav, og at resultatet derfor er konservativt.';
      message([b(head), figures + ' ' + reference + reservation], !!y.inden_tolerance);
    }
  } else if (g.type === 'trafikklasse' && g.zone !== 'ok') {
    const interval = trafik_eu_interval(g.t_klasse!, input.koersler);
    message([
      b(
        `Eᵤ = ${mpa(input.eu)} er uden for de kørte punkter for ${g.t_klasse} (${interval ? `${interval[0]}–${interval[1]} MPa` : 'ingen kørsler endnu'}).`,
      ),
      ' Vælg et Eᵤ i intervallet, udfyld kørslen under ',
      b('Trafikklasse-korrelation'),
      ', eller brug ',
      b('Belastningsklasse'),
      '-grundlaget.',
    ]);
  }
  let title: string, note: string, rows: [string, string, string?][];
  if (g.type === 'trafikklasse') {
    const figures = Object.fromEntries(trafikklasse_noegletal(g.t_klasse!));
    title = format_trafikklasse(g.t_klasse!);
    note = figures['Typisk anvendelse'] ?? '';
    rows = [
      [
        'Tunge køretøjer pr. døgn, begge retninger',
        (figures['Tunge køretøjer pr. døgn, begge retninger'] ?? '—').replace(' til ', '–'),
      ],
      [
        'Dimensionerende trafikbelastning',
        (figures['Dimensionsgivende trafikbelastning'] ?? '—').replace(
          ' pr. år pr. vognbane',
          '/år',
        ),
      ],
      ['Svarende til 20 år', figures['Svarende til 20 år'] ?? '—'],
    ];
    if (g.eo_aekv !== null)
      rows.push([
        `Ækvivalent Eₒ-kurve ved Eᵤ = ${mpa(input.eu)}`,
        mpa(g.eo_aekv),
        'Den designdiagram-kurve, opslaget sker i: den kurve, hvis lagtykkelse uden geonet svarer til VejDims krav. Et opslagspunkt, ikke et forventet E-modul for opbygningen.',
      ]);
  } else {
    const info =
      defaults.BELASTNINGSKLASSER[
        String(g.valgt_klasse) as keyof typeof defaults.BELASTNINGSKLASSER
      ];
    title = `Klasse ${g.valgt_klasse}`;
    note = info.anvendelse;
    rows = [
      ['Belastning', info.belastning],
      ['Eₒ-kurve', mpa(g.eo)],
    ];
  }
  const reset = 'border:none;background:none;';
  add(
    'keyFigures',
    d(
      'bg-noegletal',
      d('bg-noegletal-hoved', s('t', title), s('n', note)),
      n(
        'table',
        rows.map(([label, value, help]) =>
          n(
            'tr',
            [
              n(
                'td',
                [
                  help
                    ? n('span', [label], undefined, {
                        title: help,
                        style: 'cursor:help;border-bottom:1px dotted #A8A79E',
                      })
                    : label,
                  ':',
                ],
                undefined,
                { style: `padding:2px 16px 2px 0;vertical-align:top;${reset}color:#555;` },
              ),
              n('td', [value], undefined, {
                style: `padding:2px 0;font-weight:700;vertical-align:top;${reset}`,
              }),
            ],
            undefined,
            { style: reset },
          ),
        ),
        undefined,
        { style: `border-collapse:collapse;width:100%;${reset}font-size:0.82rem;` },
      ),
    ),
    'markdown',
  );
  if (standard) {
    const mode = distribution.standard_klassisk
      ? 'klassisk standardberegning'
      : distribution.standard_opdeling
        ? 'stabilgrus og bundsikring'
        : 'ét samlet bærelag';
    step('step2', 2, 'Forudsætninger', [
      `φᵥ ${degrees(PHI_BASIS)} · ingen φᵥ-korrektion · ${mode}`,
    ]);
    eyebrow('fixedLabel', 'FASTE FORUDSÆTNINGER');
    add(
      'assumptions',
      `I standardberegningen regnes med designdiagrammernes referencemateriale, φᵥ = ${PHI_BASIS}°. Der kan derfor ikke vælges forskellige materialelag. Reduktion i bærelagstykkelser korrigeres for de forskellige geonets effektindeks, som er virkningsgraden set i forhold til referencenettene, med indeks 100.` +
        (distribution.standard_klassisk
          ? ' Der regnes med klassisk standardberegning: opbygningen vises som ét samlet bærelag uden minimumstykkelse, jf. Indstillinger, afsnit 6.'
          : distribution.standard_opdeling
            ? ' Opbygningen vises som stabilgrus og bundsikring, hvor stabilgruset er minimumstykkelsen for klassen, jf. Indstillinger, afsnit 6.'
            : ' Opbygningen vises som ét samlet bærelag.'),
      'markdown',
    );
  } else if (g.eo !== null) {
    step('step2', 2, 'Opbygning', [
      `${materials.length} lag · ${laengde(total, unit)} · vægtet φᵥ ${degrees(phi)} · k`,
      n('sub', ['φ']),
      ` ${signedPct(K_PHI * (phi - PHI_BASIS))}`,
    ]);
    eyebrow('materialsLabel', 'MATERIALELAG');
    add(
      'materialsHead',
      d(
        'bg-lagtabel-hoved',
        n('span', ['#']),
        n('span', ['Materiale']),
        s('num', 'Tykkelse'),
        n('span', [{ text: 'φ', entity: '&#966;' }], 'num'),
      ),
    );
    materials.forEach((m, i) => {
      add(`layerNumber${i}`, d('bg-lagtabel-nr', String(i + 1)));
      if (m.navn !== 'Manuel indtastning') {
        add(`layerPhi${i}`, d('bg-lagtabel-phi', degrees(m.phi)));
        add(
          `layerNote${i}`,
          d(
            'bg-lagtabel-note',
            `${m.lagtype} · maks. korn ${m.max_korn} mm${m.krav_maskestoerrelse_mm != null ? ` · krav til geonet maskestørrelse ${m.krav_maskestoerrelse_mm} mm` : ''}`,
          ),
        );
      }
    });
    add(
      'materialsSum',
      d(
        'bg-lagtabel-sum',
        n('span', []),
        n('span', ['Samlet']),
        s('num', laengde(total, 'mm')),
        s('num', degrees(weighted)),
      ),
    );
    add('materialsHelp', 'Mindste lagtykkelse der kan indtastes er 100 mm.', 'caption');
  }
  const cards: PageResultCard[] = [];
  let productExpander: DimensioningPage['productExpander'] = null;
  if (result) {
    const basis =
      g.type === 'trafikklasse'
        ? `trafikklasse ${g.t_klasse}`
        : `belastningsklasse ${g.valgt_klasse}`;
    add(
      'resultHeading',
      d(
        'bg-trin-hoved',
        d('bg-trin-nr', '3'),
        d('bg-trin-titel', 'Resultat'),
        d(
          'bg-resultat-note',
          `Bærelagstykkelse over underbund med Eᵤ = ${mpa(input.eu)}, ${basis}`,
        ),
      ),
    );
    add(
      'netHeading',
      d(
        'bg-underhoved',
        d('t', 'Vælg geonet'),
        d(
          'n',
          'Resultat, opbygning og mellemregninger opdateres med det valgte net',
          ...(g.type === 'trafikklasse'
            ? [
                s(
                  'bg-underhoved-forbehold',
                  'Beregningen tager ikke højde for minimumskrav til koblingshøjde pga frostfarlighed, jf. Vejdirektoratets dimensioneringshåndbog',
                ),
              ]
            : []),
        ),
      ),
    );
    const res1 = result.res_1 as CalculationResult,
      res2 = result.res_2 as CalculationResult;
    const references = standard
      ? [...products.one, ...products.two]
      : [res1, res2].filter((r) => !r.fejl);
    const ref = references.find((r) => (r.t_uarmeret_phi_kor_mm || r.t_uarmeret_mm) != null);
    const unreinforced = ref?.t_uarmeret_phi_kor_mm || ref?.t_uarmeret_mm || null;
    const calculated = (
      r: CalculationResult | null,
      field: 't_armeret_mm' | 't_uarmeret_phi_kor_mm' | 't_uarmeret_mm',
      t: number,
    ): string | null => {
      const exact = r?.[eksakt_navn(field) as keyof CalculationResult] as number | null | undefined;
      return rounding.vis_eksakt && r && er_oprundet(t, exact ?? null)
        ? `beregnet ${laengde(exact!, unit)}`
        : null;
    };
    if (unreinforced !== null) {
      let unreinforcedNote = standard
        ? `Ubunden opbygning${g.type === 'trafikklasse' ? ' · interpoleret mellem Eₒ-kurverne' : ''}`
        : `Ustabiliseret opbygning${g.type === 'trafikklasse' ? ' · interpoleret' : ''}${Math.abs(phi - PHI_BASIS) > 0.05 ? ' · φᵥ-korrigeret' : ''}`;
      if (ref?.t_uarmeret_mm != null && Math.abs(ref.t_uarmeret_mm - unreinforced) >= 1)
        unreinforcedNote += ` (${laengde(ref.t_uarmeret_mm, unit)} ukorrigeret)`;
      const resUarm = !res1.fejl ? res1 : !res2.fejl ? res2 : null;
      cards.push({
        label: 'Nødvendig uden geonet',
        value: tal(unreinforced, unit),
        unit,
        calculated:
          calculated(resUarm, 't_uarmeret_phi_kor_mm', unreinforced) ??
          (resUarm?.t_uarmeret_phi_kor_mm == null
            ? calculated(resUarm, 't_uarmeret_mm', unreinforced)
            : null),
        note: unreinforcedNote,
        delta: null,
        deltaNote: null,
        highlighted: false,
      });
      const alternatives = [res1, res2].map((r) => (!r.fejl ? (r.t_armeret_mm ?? null) : null));
      // Original prioritises 2 layers; the badge is not a new recommendation rule.
      const holds = (t: number | null) => t !== null && (standard || total === null || total >= t);
      const highlighted = holds(alternatives[1]) ? 1 : holds(alternatives[0]) ? 0 : -1;
      alternatives.forEach((t, i) => {
        if (t === null) return;
        const r = [res1, res2][i];
        const red = r.reduktion_mm ?? unreinforced - t;
        const redPct =
          r.reduktion_mm == null ? (unreinforced - t) / unreinforced : (r.reduktion_pct ?? 0);
        cards.push({
          label: `${i + 1} lag geonet`,
          value: tal(t, unit),
          unit,
          calculated: calculated(r, 't_armeret_mm', t),
          note: null,
          delta: fortegn(-red, unit),
          deltaNote: `${dk(redPct * 100, 0)} % tyndere${highlighted === i && !standard && total !== null ? ` · holder ved ${laengde(total, unit)}` : ''}`,
          highlighted: highlighted === i,
        });
      });
      add('cards', cardNodes(cards));
    }
    const constructionNote =
      'Snit i samme lodrette skala' +
      (!standard && total
        ? ` · stiplet linje = indtastet ${laengde(total, unit)}`
        : 'standard_opdeling' in result && result.standard_opdeling?.spec
          ? ' · stabilgrus og bundsikring viser en typisk opbygning; beregningen er ført med referencematerialet φ = 37°'
          : ' · uden materialelag vises kravet som ét ubundet lag');
    add(
      'constructionHeading',
      d('bg-kort-hoved', d('bg-kort-titel', 'Opbygning'), d('bg-kort-note', constructionNote)),
    );
    add(
      'diagramHeading',
      d(
        'bg-underhoved bg-underhoved-skillelinje',
        d('t', 'Designdiagram'),
        d(
          'n',
          `Eₒ = ${mpa(g.eo)} · ${basis}${!standard ? ` · φᵥ = ${degrees(phi)}` : ''} · ${result.geonet_navn}`,
        ),
      ),
    );
    productExpander = {
      label: `Alle produkter · ${new Set([...products.one, ...products.two].map((p) => p.navn)).size} produkter`,
      expanded: false,
    };
  }
  return { elements, cards, productExpander, messageKind };
}
