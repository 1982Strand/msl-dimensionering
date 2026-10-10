import { beregn } from './calculator.ts';
import { beregn_alle_produkter, type ProductGroup, type ProductRow } from './products.ts';
import {
  check_geonet_placement,
  placement_requirements,
  overlap_krav_mm,
  type Placement,
} from './placement.ts';
import { valider_input } from './validators.ts';
import {
  lag_til_fordeling,
  lagspec,
  type DimensioningInput,
  type dimensioner,
} from './dimensionering.ts';
import { fordel_lag } from './afrunding.ts';
import { fordel_soejle, normaliser as distributionSettings } from './lagfordeling.ts';
import { laengde, tal, konverter_tekst } from './enhed.ts';
import { pythonFixed, pythonRound } from './python-numbers.ts';
import type { CalculationInput, CalculationResult, Product, Layer } from './types.ts';

export type CheckNode =
  | string
  | {
      tag: 'div' | 'span' | 'b';
      className?: string;
      style?: string;
      title?: string;
      ariaLabel?: string;
      children: CheckNode[];
    };
export type CheckElement =
  | { type: 'html'; nodes: CheckNode[] }
  | { type: 'markdown'; body: string; element_type: 'NATIVE' }
  | { type: 'caption'; body: string; element_type: 'CAPTION' }
  | { type: 'warning'; body: string };
export interface CheckExpander {
  block: 'expander';
  label: string;
  expanded: false;
  children: CheckElement[];
}
export interface ResultChecksModel {
  expanders: CheckExpander[];
  status: CheckElement | null;
  outsideMessages: CheckElement[];
}
type CheckResult = Omit<CalculationResult, 't_basis_arm_mm'> &
  Partial<Placement> & { t_basis_arm_mm?: number | null };
const placementFields = [
  'placering_ok',
  'geonet_placeringer_mm_fra_top',
  'geonet_y_fracs',
  'topdaeklag_mm',
  'afstande_mellem_geonet_mm',
  'placeringsadvarsler',
  't_min_placering_mm',
  't_dimensionerende_mm',
  'min_top_cover_mm',
  'min_spacing_mm',
  'max_spacing_mm',
  'placeringsbasis',
] as const;
const exactFields = [
  't_armeret_eksakt_mm',
  't_uarmeret_eksakt_mm',
  't_uarmeret_phi_kor_eksakt_mm',
  'reduktion_mm_eksakt',
  'reduktion_pct_eksakt',
  'afrunding_trin_mm',
  't_min_mm',
  't_armeret_til_minimum',
  't_uarmeret_til_minimum',
  't_uarmeret_phi_kor_til_minimum',
  't_armeret_til_lagminimum',
  't_uarmeret_phi_kor_til_lagminimum',
  't_armeret_lagtillaeg_lag',
  'phi',
  'phi_uarmeret',
  'phi_indtastet',
  'phi_regel',
] as const;
const referenceName = 'Referencenet (SX160 / T6 / TX160)';
const referenceChoice = 'Referencenet (TX160 / SX160 / T6)';
const referenceClasses = [3, 4, 5, 6];
const node = (
  tag: Exclude<CheckNode, string>['tag'],
  children: CheckNode[],
  attrs: Omit<Exclude<CheckNode, string>, 'tag' | 'children'> = {},
): CheckNode => ({ tag, ...attrs, children });
const bold = (text: string) => node('b', [text]);

const markdown = (body: string, element_type: 'NATIVE' | 'CAPTION' = 'NATIVE'): CheckElement =>
  element_type === 'CAPTION'
    ? { type: 'caption', body, element_type }
    : { type: 'markdown', body, element_type };
const html = (...nodes: CheckNode[]): CheckElement => ({ type: 'html', nodes });

/** _reduktion_fra_res: the fallback applies only to older results without reduction fields. */
function reduction(res: CheckResult): [number | null, number | null] {
  if ('reduktion_pct' in res) return [res.reduktion_mm ?? null, res.reduktion_pct ?? null];
  const arm = res.t_armeret_mm,
    ref = res.t_uarmeret_phi_kor_mm || res.t_uarmeret_mm;
  if (arm == null || !ref) return [null, null];
  return [ref - arm, (ref - arm) / ref];
}
function exactOr(value: number | null | undefined, fallback: number | null, digits: number) {
  const v = value ?? fallback;
  return v === null ? null : pythonRound(v, digits);
}

/** _resultat_til_gruppe. In particular, interval fields are not copied in Standard. */
export function resultatTilGruppe(
  res: CheckResult,
  geonet: Product,
  valgtKlasse: number | null,
): ProductGroup | null {
  if (res.fejl || res.t_armeret_mm == null) return null;
  const t = res.t_armeret_mm,
    [redMm, redPct] = reduction(res);
  const product: ProductRow = {
    navn: geonet.navn,
    serie: geonet.serie ?? null,
    korrektion: geonet.korrektion!,
    t_armeret_mm: t,
    t_uarmeret_mm: res.t_uarmeret_mm ?? null,
    t_uarmeret_phi_kor_mm: res.t_uarmeret_phi_kor_mm ?? null,
    t_basis_arm_mm: res.t_basis_arm_mm ?? null,
    reduktion_mm: redMm,
    reduktion_pct: redPct,
    klasse_ok: valgtKlasse !== null && geonet.klasser!.includes(valgtKlasse),
    klasser: [...geonet.klasser!],
    min_daklag: geonet.min_daklag ?? null,
    max_korn: geonet.max_korn ?? null,
    fejl: null,
  };
  for (const key of [...placementFields, ...exactFields])
    if (key in res) Object.assign(product, { [key]: res[key] });
  return {
    t_armeret_mm: pythonRound(t, 0),
    t_armeret_eksakt_mm: exactOr(res.t_armeret_eksakt_mm, pythonRound(t, 0), 0),
    reduktion_pct: redPct === null ? null : pythonRound(redPct, 4),
    reduktion_pct_eksakt: exactOr(res.reduktion_pct_eksakt, redPct, 4),
    t_basis_arm_mm: res.t_basis_arm_mm ?? null,
    produkter: [product],
    placering_ok: product.placering_ok ?? true,
    har_fejl: false,
    fejl_besked: null,
  };
}
/** _reference_resultat_til_gruppe. */
export function referenceResultatTilGruppe(
  res: CheckResult,
  valgtKlasse: number | null,
): ProductGroup | null {
  if (res.fejl || res.t_armeret_mm == null) return null;
  const placed =
    'placering_ok' in res
      ? res
      : {
          ...res,
          ...check_geonet_placement({ lag_mode: res.lag_mode ?? '', total_mm: res.t_armeret_mm }),
        };
  return resultatTilGruppe(
    placed,
    {
      navn: referenceName,
      serie: 'Reference',
      korrektion: 0,
      klasser: referenceClasses,
      min_daklag: null,
      max_korn: null,
    },
    valgtKlasse,
  );
}
/** _beregn_referencegrupper; receives the active rounding/minimum from dimensioner. */
export function beregnReferencegrupper(
  common: Omit<CalculationInput, 'lag_mode' | 'net_korrektion'>,
  valgtKlasse: number | null,
): [ProductGroup | null, ProductGroup | null, string | null, string | null] {
  const one = beregn({ ...common, lag_mode: '1_lag', net_korrektion: 0 });
  const two = beregn({ ...common, lag_mode: '2_lag', net_korrektion: 0 });
  return [
    referenceResultatTilGruppe(one, valgtKlasse),
    referenceResultatTilGruppe(two, valgtKlasse),
    one.fejl,
    two.fejl,
  ];
}
export function navneKort(group: ProductGroup): string {
  return group.produkter[0].navn + (group.produkter.length === 1 ? '' : ' m.fl.');
}
export function sammeProdukter(one: ProductGroup | null, two: ProductGroup | null): boolean {
  if (!one || !two) return false;
  const a = new Set(one.produkter.map((p) => p.navn)),
    b = new Set(two.produkter.map((p) => p.navn));
  return a.size === b.size && [...a].every((n) => b.has(n));
}
export function advarselMedLagtekst(text: string, mode: string): string {
  const context = mode === '1_lag' ? 'ved 1 lag geonet' : 'ved 2 lag geonet';
  if (
    [context, '1 lag geonet', '2 lag geonet', 'dæklag', 'minimumsdæklag', 'under oversiden'].some(
      (s) => text.includes(s),
    )
  )
    return text;
  if (text.includes('minimumtykkelse') && text.includes(' mm). '))
    return text.replace(' mm). ', ` mm) ${context}. `);
  return text.endsWith('.') ? `${text.slice(0, -1)} ${context}.` : `${text} ${context}`;
}
/** _krav_for_gruppe: grain sizes stay in mm even with cm display. */
export function kravForGruppe(group: ProductGroup, unit = 'mm'): [string, string, string, string] {
  const ps = group.produkter;
  const sorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);
  const covers = sorted(
    ps.map((p) => p.min_top_cover_mm ?? Math.max(200, Number(p.min_daklag) * 10)),
  );
  const cover =
    covers.length === 1
      ? laengde(covers[0], unit)
      : `${tal(covers[0], unit)}–${laengde(covers.at(-1)!, unit)} (varierer pr. produkt)`;
  const grains = sorted(ps.flatMap((p) => (p.max_korn == null ? [] : [p.max_korn])));
  const missing = ps.some((p) => p.max_korn == null);
  let grain: string;
  if (!grains.length) grain = 'ikke specificeret (kontakt leverandør)';
  else if (grains.length === 1 && !missing) grain = `${grains[0]} mm`;
  else {
    const range = grains.length > 1 ? `${grains[0]}–${grains.at(-1)}` : String(grains[0]);
    grain = `${range} mm (${missing ? 'visse produkter ikke specificeret' : 'varierer pr. produkt'})`;
  }
  const min = sorted(ps.map((p) => p.min_spacing_mm ?? 200)),
    max = sorted(ps.map((p) => p.max_spacing_mm ?? 400));
  const distance = `${tal(min[0], unit)}–${laengde(max.at(-1)!, unit)}${min.length === 1 && max.length === 1 ? '' : ' (varierer pr. produkt)'}`;
  return [ps.map((p) => p.navn).join(', '), cover, grain, distance];
}

/** ui.besked's wrapper is represented structurally, including its original styles for reference QA. */
function message(kind: 'advarsel' | 'info', body: CheckNode[]): CheckElement {
  const colors =
    kind === 'advarsel' ? ['#FCF5E8', '#F0E2C6', '#A8600B'] : ['#F4F6F4', '#DCE1DD', '#7A857D'];
  return html(
    node(
      'div',
      [
        node('div', body, {
          style: "font:400 11.5px/1.55 'IBM Plex Sans',system-ui,sans-serif;color:#4A554E",
        }),
      ],
      {
        style: `background:${colors[0]};border:1px solid ${colors[1]};border-left:3px solid ${colors[2]};border-radius:4px;padding:10px 12px;margin:2px 0`,
      },
    ),
  );
}
function deduplicate(perLayer: [string, string][], unit: string): string[] {
  const layers = new Map<string, Set<string>>();
  for (const [text, mode] of perLayer) {
    if (!layers.has(text)) layers.set(text, new Set());
    layers.get(text)!.add(mode);
  }
  const seen = new Set<string>(),
    output: string[] = [];
  for (const [text, mode] of perLayer) {
    const contextual = layers.get(text)!.size === 1 ? advarselMedLagtekst(text, mode) : text;
    if (!seen.has(contextual)) {
      seen.add(contextual);
      output.push(konverter_tekst(contextual, unit));
    }
  }
  return output;
}

export function resultChecks(
  input: DimensioningInput,
  result: ReturnType<typeof dimensioner>,
  unit = 'mm',
  suppliedProducts?: { one: ProductRow[]; two: ProductRow[] },
): ResultChecksModel {
  if (!result) return { expanders: [], status: null, outsideMessages: [] };
  const common = {
    eu: result.eu,
    eo: result.eo!,
    phi: result.phi,
    skala: result.skala,
    t_basis_table: input.t_basis_table,
    afrunding: result.afrunding,
  };
  const products = suppliedProducts ?? {
    one: beregn_alle_produkter({
      ...common,
      lag_mode: '1_lag',
      klasse_for_anbefaling: result.valgt_klasse,
    }),
    two: beregn_alle_produkter({
      ...common,
      lag_mode: '2_lag',
      klasse_for_anbefaling: result.valgt_klasse,
    }),
  };
  const refs = beregnReferencegrupper(common, result.valgt_klasse).slice(
    0,
    2,
  ) as (ProductGroup | null)[];
  const groups = [result.res_1, result.res_2].map((res) =>
    result.geonet
      ? resultatTilGruppe(res, result.geonet, result.valgt_klasse)
      : referenceResultatTilGruppe(res, result.valgt_klasse),
  );
  // render_brugerdefineret enriches its single-product group with the best endpoint;
  // render_standard copies only _PLACERING_FELTER + _EKSAKT_FELTER.
  if (input.tilstand === 'Brugerdefineret')
    groups.forEach((group, i) => {
      const product = (i === 0 ? products.one : products.two).find(
        (p) => p.navn === result.geonet_navn,
      );
      if (!group || product?.t_armeret_mm_min == null) return;
      for (const key of [
        'korrektion_min',
        'korrektion_max',
        't_armeret_mm_min',
        't_armeret_mm_max',
        't_armeret_eksakt_mm_min',
        'phi_min',
        'reduktion_mm_min',
        'reduktion_mm_max',
        'reduktion_pct_min',
        'reduktion_pct_max',
      ] as const)
        if (key in product) Object.assign(group.produkter[0], { [key]: product[key] });
      if (product.placering_best) {
        // The original interval enrichment copies only _PLACERING_FELTER here.
        const best: Partial<Placement> = {};
        for (const key of placementFields)
          if (key in product.placering_best)
            Object.assign(best, { [key]: product.placering_best[key] });
        group.produkter[0].placering_best = best as Placement;
      }
    });
  const materialer = result.materialer;
  const tUarm = refs.find((r) => r?.produkter.length)?.produkter[0].t_uarmeret_phi_kor_mm ?? null;
  const split = 'standard_opdeling' in result ? result.standard_opdeling : null;
  const distribution = 'fordeling' in result ? result.fordeling : null;
  const placement = distributionSettings(input.indstillinger?.lagfordeling).netplacering;
  function subFor(total: number): Layer[] | null {
    let sub: Layer[];
    if (!materialer.length && split) {
      if (
        !split.spec ||
        (split.under_minimum === 'ubundet' &&
          split.stabilgrus_mm &&
          total < split.stabilgrus_mm - 0.5)
      )
        return null;
      sub = fordel_soejle(split.spec, total, result!.afrunding.trin_mm);
    } else {
      const spec = distribution ? lagspec(materialer, distribution) : null;
      sub = spec
        ? fordel_soejle(spec, total, result!.afrunding.trin_mm, tUarm)
        : fordel_lag(lag_til_fordeling(materialer), total, result!.afrunding.trin_mm);
    }
    return sub.length >= 2 ? sub : null;
  }
  const warnings: [string, string][] = [],
    placementRecommendations: [string, string][] = [];
  for (const [i, mode] of ['1_lag', '2_lag'].entries()) {
    const validation = valider_input({
      ...common,
      lag_mode: mode,
      geonet: result.geonet,
      materialer,
      t_armeret_mm: groups[i]?.t_armeret_mm ?? null,
      tillad_interpoleret_eo: result.grundlag_type === 'trafikklasse',
    });
    for (const text of validation.advarsler) warnings.push([text, mode]);
    const reference = result.geonet_navn === referenceChoice;
    const p = (i === 0 ? products.one : products.two).find(
      (p) => p.navn === result.geonet_navn && !p.fejl,
    );
    const total = reference ? refs[i]?.t_armeret_mm : p?.t_armeret_mm;
    if (total == null) continue;
    for (const text of check_geonet_placement({
      lag_mode: mode,
      total_mm: total,
      geonet: reference ? null : result.geonet,
      sub_lag: subFor(total),
      placering: placement,
    }).placeringsadvarsler) {
      const target = text.includes('Anbefalingen for bedst effekt')
        ? placementRecommendations
        : warnings;
      target.push([`${result.geonet_navn}: ${text}`, mode]);
    }
  }
  const uniqueWarnings = deduplicate(warnings, unit);
  const recommendations: CheckNode[][] = deduplicate(placementRecommendations, unit).map((text) => [
    text,
  ]);
  const [one, two] = groups,
    t1 = one?.t_armeret_mm ?? null,
    t2 = two?.t_armeret_mm ?? null;
  const total = materialer.reduce((sum, m) => sum + (m.tykkelse_mm ?? 0), 0);
  const under1 = t1 !== null && total < t1,
    under2 = t2 !== null && total < t2;
  if (materialer.length && total > 0 && (under1 || under2)) {
    let text: string;
    if (t2 !== null && under1 && !under2)
      text = `Den samlede foreslåede opbygning (${laengde(total, unit)}) er mindre end minimumtykkelsen ved 1 lag geonet (${laengde(t1, unit)}), men tilstrækkelig ved 2 lag geonet (${laengde(t2, unit)}). Anvend 2 lag geonet for denne opbygning.`;
    else if (t1 !== null && t2 !== null)
      text = `Den samlede foreslåede opbygning (${laengde(total, unit)}) er mindre end den beregnede minimumtykkelse ved både 1 lag (${laengde(t1, unit)}) og 2 lag geonet (${laengde(t2, unit)}). Øg den samlede materialetykkelse, eller anvend materialer med højere friktionsvinkel.`;
    else
      text = `Den samlede foreslåede opbygning (${laengde(total, unit)}) er mindre end minimumtykkelsen ved ${t1 !== null ? '1 lag' : '2 lag'} geonet (${laengde(t1 ?? t2, unit)}). Øg den samlede materialetykkelse, eller anvend materialer med højere friktionsvinkel.`;
    if (!uniqueWarnings.includes(text)) uniqueWarnings.unshift(text);
  }
  if (one && t1! > 500) {
    const body: CheckNode[] = [
      'Mindst mulige bærelagstykkelse med 1 lag geonet er ',
      bold(laengde(t1, unit)),
    ];
    const best1 = one.produkter.find((p) => p.t_armeret_mm_min != null)?.t_armeret_mm_min;
    if (best1 != null)
      body.push(
        ', og under optimale forhold helt ned til ',
        bold(laengde(pythonRound(best1), unit)),
      );
    body.push(
      ` (${navneKort(one)}). Ved opbygninger over ${laengde(500, unit)} kan der med fordel anvendes 2 lag net for yderligere reduktion`,
    );
    if (two) {
      body.push(' — her: ', bold(laengde(t2, unit)));
      const best2 = two.produkter.find((p) => p.t_armeret_mm_min != null)?.t_armeret_mm_min;
      if (best2 != null)
        body.push(', og under optimale forhold ', bold(laengde(pythonRound(best2), unit)));
      body.push(` (${navneKort(two)}).`);
    } else body.push(' (ikke gyldigt for denne kombination).');
    recommendations.push(body);
  }
  if (two && t2! < 400) {
    const body: CheckNode[] = [
      'Mindst mulige tykkelse med 2 lag geonet er kun ',
      bold(laengde(t2, unit)),
      '. 1 lag geonet er sandsynligvis tilstrækkeligt for denne belastning',
    ];
    if (one) body.push(' (1 lag giver ', bold(laengde(t1, unit)), ').');
    else body.push('.');
    recommendations.push(body);
  }
  const counts: [number, string, string, string, string][] = [
    [uniqueWarnings.length, 'kontrolpunkt', 'kontrolpunkter', 'Kontrolpunkter', 'adv'],
    [recommendations.length, 'anbefaling', 'anbefalinger', 'Anbefalinger', 'info'],
  ];
  const nonzero = counts.filter(([n]) => n > 0);
  const label =
    'Kontrolpunkter og anbefalinger' +
    (nonzero.length
      ? ' · ' +
        nonzero.map(([n, singular, plural]) => `${n} ${n === 1 ? singular : plural}`).join(' · ')
      : '');
  const status = nonzero.length
    ? html(
        node(
          'div',
          nonzero.map(([n, singular, plural, ariaLabel, cls]) => {
            const word = n === 1 ? singular : plural;
            return node('span', [`${cls === 'adv' ? '⚠' : 'ⓘ'} `, bold(String(n)), ` ${word}`], {
              className: `bg-resultat-status-item bg-resultat-status-${cls}`,
              title: `Der er ${n} ${word}. Fold 'Kontrolpunkter og anbefalinger' ud længere nede på siden for at se detaljerne.`,
              ariaLabel,
            });
          }),
          { className: 'bg-resultat-status' },
        ),
      )
    : null;
  const checkChildren: CheckElement[] = [];
  if (!nonzero.length)
    checkChildren.push(
      markdown('Ingen kontrolpunkter for den valgte Eᵤ og belastning.', 'CAPTION'),
    );
  if (uniqueWarnings.length)
    checkChildren.push(
      markdown('**Kontrolpunkter**'),
      ...uniqueWarnings.map((text) => message('advarsel', [text])),
    );
  if (recommendations.length)
    checkChildren.push(
      markdown('**Anbefalinger**'),
      ...recommendations.map((body) => message('info', body)),
    );
  const requirements: CheckElement[] = [
    markdown('**Generelle krav ved udførelse med geonet:**'),
    markdown(
      `- Underbund jævnes og planeres — ingen skarpe fremspring eller huller\n- Komprimering i lag på maksimalt ${tal(200, unit)}–${laengde(300, unit)}\n- Direkte kørsel på udlagt geonet er **ikke tilladt**\n- Overlæg ved samlinger udføres efter kravene for det valgte produkt\n- Geonettet udlægges stramt uden folder eller bølger`,
    ),
  ];
  if (result.geonet) {
    const net = result.geonet,
      req = placement_requirements(net),
      [overlap, condition] = overlap_krav_mm(req, result.eu);
    const grain =
      net.max_korn != null
        ? `**${net.max_korn} mm**`
        : '**ikke specificeret** — kontakt leverandør';
    requirements.push(
      markdown(
        `**Krav for ${result.geonet_navn || net.navn}:**\n- Minimum dæklag over geonet: **${laengde(req.min_top_cover_mm, unit)}**\n- Afstand mellem geonetlag: **${tal(req.min_spacing_mm, unit)}–${laengde(req.max_spacing_mm, unit)}**\n- Minimum overlæg ved samlinger: **${laengde(overlap, unit)}** (${condition})\n- Max kornstørrelse i kontakt med geonet: ${grain}`,
      ),
    );
  } else {
    function groupRequirements(title: string, group: ProductGroup) {
      const [names, cover, grain, distance] = kravForGruppe(group, unit);
      requirements.push(
        markdown(
          `**${title}** (${names})\n- Minimum dæklag over geonet: **${cover}**\n- Afstand mellem geonetlag: **${distance}**\n- Max kornstørrelse i kontakt med geonet: **${grain}**`,
        ),
      );
    }
    if (sammeProdukter(one, two) && one) groupRequirements('Krav for produkt', one);
    else {
      if (one) groupRequirements('Krav for bedste 1-lag-produkt', one);
      if (two) groupRequirements('Krav for bedste 2-lag-produkt', two);
    }
    requirements.push(
      markdown(
        !one && !two
          ? 'Ingen produkt-specifikke krav at vise — ingen gyldige beregninger for den valgte kombination.'
          : "Bemærk: kravene ovenfor gælder det bedst reducerende net. Andre produkter kan have andre krav til dæklag og kornstørrelse — se datablad eller skift til 'Vælg specifikt produkt' for individuelle værdier.",
        'CAPTION',
      ),
    );
  }
  const unreinforcedResults: CheckResult[] =
    input.tilstand === 'Standard'
      ? [...products.one, ...products.two]
      : [result.res_1, result.res_2].filter((r) => !r.fejl);
  const hasUnreinforced = unreinforcedResults.some(
    (r) => (r.t_uarmeret_phi_kor_mm || r.t_uarmeret_mm) != null,
  );
  const outsideMessages: CheckElement[] = hasUnreinforced
    ? []
    : [
        {
          type: 'warning',
          body: `Der er ikke defineret nogen ustabiliseret bærelagstykkelse for det valgte Eᵤ/Eₒ (${pythonFixed(result.eu, 0, true).replaceAll(',', '.')} MPa / ${pythonFixed(result.eo!, 0, true).replaceAll(',', '.')} MPa). Stabiliserede resultater vises stadig, hvor designdiagrammet har data.`,
        },
      ];
  return {
    expanders: [
      { block: 'expander', label, expanded: false, children: checkChildren },
      { block: 'expander', label: 'Udførelseskrav', expanded: false, children: requirements },
    ],
    status,
    outsideMessages,
  };
}
