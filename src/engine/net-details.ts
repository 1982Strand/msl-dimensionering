import { K_PHI, PHI_BASIS } from './data.ts';
import { er_oprundet, reduktion_for, tillaeg } from './afrunding.ts';
import { laengde, fortegn, normaliser } from './enhed.ts';
import { pythonFixed, pythonRound } from './python-numbers.ts';
import { constructionData } from './construction.ts';
import { beregn_alle_produkter, type ProductRow } from './products.ts';
import type { DimensioningInput, dimensioner } from './dimensionering.ts';

export type NetDetailsNode =
  | string
  | {
      tag: 'div' | 'span' | 'section' | 'strong';
      className?: string;
      title?: string;
      children: NetDetailsNode[];
    };
export interface NetDetailsModel {
  heading: NetDetailsNode | null;
  grid: NetDetailsNode | null;
  intervalNote: NetDetailsNode | null;
}
type Products = { one: ProductRow[]; two: ProductRow[] };
const node = (
  tag: Exclude<NetDetailsNode, string>['tag'],
  children: NetDetailsNode[],
  className?: string,
  title?: string,
): NetDetailsNode => ({
  tag,
  ...(className ? { className } : {}),
  ...(title ? { title } : {}),
  children,
});
const div = (cls: string, ...children: NetDetailsNode[]) => node('div', children, cls);
const pct = (v: number, decimals = 0) => `${pythonFixed(v, decimals).replace('.', ',')} %`;
const signedPct = (v: number, decimals = 0) =>
  `${v >= 0 ? '+' : '−'}${pct(Math.abs(v * 100), decimals)}`;

/** Original long form of _lagtillaeg_tekst; layers are recorded by afrunding, not recalculated. */
function layerAdditionText(p: ProductRow, unit: string): string | null {
  const layers = p.t_armeret_lagtillaeg_lag;
  if (!layers?.efter.length) return null;
  const before = new Map(layers.foer.map((l) => [l.navn, l.tykkelse_mm]));
  let text =
    layers.efter.map((l) => `${l.navn} ${laengde(l.tykkelse_mm, unit)}`).join(' + ') +
    ` = ${laengde(
      layers.efter.reduce((sum, l) => sum + l.tykkelse_mm, 0),
      unit,
    )}.`;
  for (const l of layers.efter.slice(1)) {
    const from = before.get(l.navn) ?? 0;
    if (l.tykkelse_mm > from + 0.5)
      text += ` ${l.navn} er øget fra ${laengde(from, unit)} til ${laengde(l.tykkelse_mm, unit)}, som er mindste lagtykkelse for lagtypen.`;
  }
  return text + ' Jf. Indstillinger, afsnit 4.';
}

export function netIntervalNote(result: ReturnType<typeof dimensioner>): NetDetailsNode | null {
  return result?.geonet?.korrektion_interval?.length
    ? div(
        'bg-produkt-interval-note',
        'Hovedresultatet bruger den konservative værdi; den optimale værdi vises som supplement.',
      )
    : null;
}

export function netDetails(
  input: DimensioningInput,
  result: ReturnType<typeof dimensioner>,
  suppliedProducts?: Products,
): NetDetailsModel {
  if (!result) return { heading: null, grid: null, intervalNote: null };
  const display = (input.indstillinger as { opbygning?: { enhed?: string } } | undefined)
    ?.opbygning;
  const unit = normaliser(display?.enhed);
  const length = (v: number | null) => laengde(v, unit);
  const common = {
    eu: result.eu,
    eo: result.eo!,
    phi: result.phi,
    afrunding: result.afrunding,
    skala: result.skala,
    t_basis_table: input.t_basis_table,
    klasse_for_anbefaling: result.valgt_klasse,
  };
  const products = suppliedProducts ?? {
    one: beregn_alle_produkter({ ...common, lag_mode: '1_lag' }),
    two: beregn_alle_produkter({ ...common, lag_mode: '2_lag' }),
  };
  // Reuse the optimal calculation already ported for construction, including the optimal φᵥ.
  const optimalNotes = constructionData(
    result,
    products,
    display,
    'fordeling' in result ? result.fordeling.netplacering : undefined,
  )
    .kolonner.slice(-2)
    .map((c) => c.best_case_note);
  const indexText = String(result.geonet?.effektindeks || '—');
  const parts = indexText
    .split(/[–—-]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const ends = parts.length === 2 ? parts : null;
  const index = ends?.[0] ?? indexText;

  function layer(label: string, p: ProductRow | undefined, optimalNote: string | null) {
    const children: NetDetailsNode[] = [div('rt-detaljer-lag-titel', label)];
    if (!p || p.fejl != null || p.t_armeret_mm == null) {
      children.push(div('rt-detaljer-tom', 'Ikke gyldigt for denne kombination.'));
      return node('section', children, 'rt-detaljer-lag');
    }
    const raw = p.t_uarmeret_mm ?? null;
    const rawExact = p.t_uarmeret_eksakt_mm ?? raw;
    const arm = p.t_armeret_mm;
    const armExact = p.t_armeret_eksakt_mm ?? arm;
    const basis = p.t_basis_arm_mm;
    const correction = p.korrektion || 0;
    const phiArm = p.phi ?? result!.phi;
    const phiCorrection = K_PHI * (phiArm - PHI_BASIS);
    const basisMm = rawExact != null && basis != null ? -pythonRound(rawExact - basis) : null;
    const netMm = basis != null ? pythonRound(basis * correction) : null;
    const phiMm = basis != null ? pythonRound(basis * phiCorrection) : null;
    const step = p.afrunding_trin_mm || result!.afrunding.trin_mm;
    const [rounding, minimum, layers] = tillaeg(arm, armExact, step, p.t_min_mm).map((v) =>
      pythonRound(v),
    );
    const [reduction, reductionPct] = reduktion_for(
      raw,
      arm,
      rawExact,
      armExact,
      result!.afrunding,
    );
    const row = (sign: string, title: string, value: string, explanation?: string) =>
      node(
        'div',
        [
          node('span', [sign], 'rt-detaljer-tegn'),
          node('span', [title]),
          node('span', [value], 'rt-detaljer-vaerdi'),
        ],
        `rt-detaljer-raekke${explanation ? ' rt-detaljer-hjaelp' : ''}`,
        explanation,
      );
    children.push(
      row('', 'Ustabiliseret bærelagstykkelse', length(rawExact)),
      row('−', 'Basisreduktion, referencenet', length(Math.abs(basisMm || 0))),
      row(
        (netMm || 0) < 0 ? '−' : '+',
        ends ? `Net-korrektion, konservativ · indeks ${index}` : `Net-korrektion, indeks ${index}`,
        length(Math.abs(netMm || 0)),
        ends
          ? `Effektindeks ${indexText}. Hovedresultatet tager udgangspunkt i den konservative ende, indeks ${index}, svarende til net-korrektionen ${signedPct(correction)}.`
          : undefined,
      ),
    );
    if (Math.abs(phiCorrection) > 0.0005)
      children.push(
        row(
          (phiMm || 0) < 0 ? '−' : '+',
          Math.abs(phiArm - result!.phi) >= 0.005
            ? `φᵥ-korrektion, opbygningens lag ${pythonFixed(phiArm, 1).replace('.', ',')}°, ${signedPct(phiCorrection, 1)}`
            : `φᵥ-korrektion, ${signedPct(phiCorrection, 1)}`,
          length(Math.abs(phiMm || 0)),
        ),
      );
    if (rounding > 0)
      children.push(
        row(
          '+',
          `Oprunding til nærmeste ${length(step)}`,
          length(rounding),
          `Beregnet tykkelse ${length(armExact)}. Lagtykkelsen oprundes til nærmeste ${length(step)}, jf. Indstillinger.`,
        ),
      );
    if (minimum > 0)
      children.push(
        row(
          '+',
          'Tillæg til minimumstykkelse',
          length(minimum),
          `Den samlede bærelagstykkelse sættes mindst til minimumstykkelsen ${length(p.t_min_mm || arm)} for klassen, jf. Indstillinger.`,
        ),
      );
    if (layers > 0)
      children.push(
        row(
          '+',
          'Tillæg for mindste lagtykkelse',
          length(layers),
          layerAdditionText(p, unit) ??
            'Lagtykkelsen øges, så de underliggende lag mindst har den mindste lagtykkelse efter Vejdirektoratets håndbog, Figur 6.5, jf. Indstillinger.',
        ),
      );
    let resultText = length(arm);
    if (result!.afrunding.vis_eksakt && er_oprundet(arm, p.t_armeret_eksakt_mm ?? null))
      resultText += ` (${length(p.t_armeret_eksakt_mm!)})`;
    children.push(
      div(
        'rt-detaljer-resultat',
        node('div', [node('strong', ['Stabiliseret bærelagstykkelse'])]),
        div('rt-detaljer-resultat-tal', resultText),
      ),
      div(
        'rt-detaljer-samlet',
        `Reduktion i alt ${fortegn(-(reduction == null ? 0 : pythonRound(reduction)), unit)} · ${pct((reductionPct || 0) * 100)}`,
      ),
    );
    const corrected = p.t_uarmeret_phi_kor_mm;
    const correctedExact = p.t_uarmeret_phi_kor_eksakt_mm ?? corrected ?? null;
    if (raw && arm && corrected && Math.abs(corrected - raw) >= 1) {
      const [, correctedPct] = reduktion_for(
        corrected,
        arm,
        correctedExact,
        armExact,
        result!.afrunding,
      );
      children.push(
        div(
          'rt-detaljer-optimal-note',
          `Regnestykket tager udgangspunkt i den ukorrigerede værdi på ${length(rawExact)}. Resultatkortet øverst måler reduktionen mod de φᵥ-korrigerede ${length(corrected)} og angiver derfor ${pct((correctedPct || 0) * 100)}.`,
        ),
      );
    }
    if (optimalNote && p.t_armeret_mm_min != null && p.korrektion_min != null) {
      children.push(
        node(
          'div',
          [
            node('span', [
              `Optimal ende · effektindeks ${ends?.[1] ?? indexText} · net-korrektion ${signedPct(p.korrektion_min)}`,
            ]),
            node('span', [length(p.t_armeret_mm_min)], 'rt-detaljer-optimal-tal'),
          ],
          'rt-detaljer-optimal',
          optimalNote,
        ),
        div(
          'rt-detaljer-optimal-note',
          `Hovedresultatet ovenfor er opgjort ved den konservative ende, indeks ${index}. Mellemregningen bag den optimale værdi vises ved resultatet.`,
        ),
      );
    }
    return node('section', children, 'rt-detaljer-lag');
  }
  return {
    heading: div(
      'bg-kort-hoved',
      div('bg-kort-titel', `Detaljer · ${result.geonet_navn}`),
      div('bg-kort-note', 'Mellemregninger for det valgte net'),
    ),
    grid: div(
      'rt-detaljer-grid',
      layer(
        '1 LAG GEONET',
        products.one.find((p) => p.navn === result.geonet_navn),
        optimalNotes[0],
      ),
      layer(
        '2 LAG GEONET',
        products.two.find((p) => p.navn === result.geonet_navn),
        optimalNotes[1],
      ),
    ),
    intervalNote: netIntervalNote(result),
  };
}
