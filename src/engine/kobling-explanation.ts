/** M1: original app.py::_render_kobling_sektion, expressed as data for React.
 * No captured HTML enters the app. Lookups, exact results and rounding reuse the engine.
 */
import { defaults, EO_KOLONNER, PHI_BASIS, K_PHI, T_BASIS_TABLE, eo_til_klasse } from './data.ts';
import { slaa_op_interp } from './calculator.ts';
import { eoSteps } from './table-explanation.ts';
import { VEJDIM_KOERSLER } from './traffic.ts';
import { phiTableData } from './phi-summary.ts';
import { afrund_phi, er_oprundet, normaliser, tillaeg } from './afrunding.ts';
import { pythonFixed, pythonRound } from './python-numbers.ts';
import { tal, laengde, normaliser as unitOf } from './enhed.ts';
import {
  beregn_grundlag,
  eo_til_naermeste_klasse,
  type DimensioningInput,
  type dimensioner,
} from './dimensionering.ts';
import type { CalculationResult } from './types.ts';
import {
  diagramFigure,
  koerslerFigure,
  type CouplingFigureModel,
  type CouplingPoint,
} from './kobling-figures.ts';

export type CouplingNode =
  | string
  | {
      tag: 'div' | 'span' | 'b' | 'sub' | 'br';
      className?: string;
      children: CouplingNode[];
    };
export interface CouplingStep {
  number: number;
  title: string;
  source: string;
  body: CouplingNode[];
  result: string;
  result_note: string;
  chip: string;
  green: boolean;
  monoNote: boolean;
  figure: { caption: string; legend: string[]; model: CouplingFigureModel | null } | null;
}
export interface CouplingExplanation {
  visible: boolean;
  title: string | null;
  expanded: false;
  steps: CouplingStep[];
  captions: string[];
  footer: string | null;
}
const node = (
  tag: Exclude<CouplingNode, string>['tag'],
  children: CouplingNode[],
  className?: string,
): CouplingNode => ({ tag, ...(className ? { className } : {}), children });
const div = (className: string, ...children: CouplingNode[]) => node('div', children, className);
const bold = (text: string) => node('b', [text]);
const weak = (text: string) => divSpan('kob-svag', `   (${text})`);
const divSpan = (className: string, text: string) => node('span', [text], className);
type Line = CouplingNode[];
const formula = (lines: Line[]) =>
  div('kob-formel', ...lines.flatMap((line, i) => (i ? ['\n', ...line] : line)));
const note = (...text: CouplingNode[]) => div('kob-note', ...text);
const left = (text: string, width: number) => text.padEnd(width);
const right = (text: string, width: number) => text.padStart(width);
const calc = (text: string, value: string, width = 33, valueWidth = 10) =>
  left(text, width) + right(value, valueWidth);
const finalLine = (text: string, value: string): Line => [left(text, 33), bold(right(value, 10))];
const num = (value: number, decimals = 0) => {
  const [integer, decimal] = pythonFixed(value, decimals, true).split('.');
  return (integer.replaceAll(',', '.') + (decimal ? `,${decimal}` : '')).replace(/^-/, '−');
};
const mpa = (value: number) => `${pythonFixed(value, 0, true).replaceAll(',', '.')} MPa`;
const exact = (r: CalculationResult, field: 't_armeret_mm' | 't_uarmeret_phi_kor_mm') =>
  (field === 't_armeret_mm' ? r.t_armeret_eksakt_mm : r.t_uarmeret_phi_kor_eksakt_mm) ??
  r[field] ??
  null;
const step = (
  number: number,
  title: string,
  source: string,
  body: CouplingNode[],
  result: string,
  result_note: string,
  extra: Partial<CouplingStep> = {},
): CouplingStep => ({
  number,
  title,
  source,
  body,
  result,
  result_note,
  chip: '',
  green: false,
  monoNote: false,
  figure: null,
  ...extra,
});

/** Plain text for exact reference checks; br has no text, as in the capture tool. */
export function couplingText(n: CouplingNode): string {
  return typeof n === 'string' ? n : n.children.map(couplingText).join('');
}

export function koblingExplanation(
  input: DimensioningInput,
  result: ReturnType<typeof dimensioner>,
): CouplingExplanation {
  const out: CouplingExplanation = {
    visible: false,
    title: null,
    expanded: false,
    steps: [],
    captions: [],
    footer: null,
  };
  const g = beregn_grundlag(input);
  if (g.eo === null) return out;
  const eu = input.eu,
    eo = g.eo;
  const traffic = g.type === 'trafikklasse';
  const unit = unitOf(
    (input.indstillinger as { opbygning?: { enhed?: string } } | undefined)?.opbygning?.enhed,
  );
  const lt = (v: number, dec = 0) => tal(v, unit, dec);
  const length = (v: number | null, dec = 0) => laengde(v, unit, dec);
  const table = input.t_basis_table ?? T_BASIS_TABLE;
  const runs = input.koersler ?? VEJDIM_KOERSLER;
  const lookup = (mode: string) => {
    const v = slaa_op_interp(eu, eo, mode, table);
    return v === null ? null : v * 10;
  };
  const requirement = lookup('uarmeret');
  const data = traffic ? eoSteps(g.t_klasse!, eu, runs, table) : null;
  out.visible = true;
  if (requirement === null || (traffic && data?.trin2.eo_aekv === undefined)) {
    out.title = 'Sådan er resultatet beregnet';
    if (traffic && ['under', 'over'].includes(g.zone ?? '')) {
      const y = g.yder ?? {};
      let reference = '';
      if (y.handling === 'vejdim')
        reference = `Den ustabiliserede tykkelse er ${g.zone === 'over' ? 'løftet' : 'sat ned'} til VejDims ${length(Number(y.t_vejdim_mm))}; geonettets reduktion er aflæst på kurven Eₒ = ${mpa(Number(y.eo_rand))}.`;
      if (y.handling === 'laveste')
        reference = `Der regnes med diagrammets laveste kurve, Eₒ = ${mpa(Number(y.eo_rand))}, på ${length(Number(y.t_rand_mm))}.`;
      out.captions = [
        `Driftspunktet ligger uden for designdiagrammernes kurver${y.afvigelse_pct != null ? `, ${pythonFixed(Number(y.afvigelse_pct), 1).replace('.', ',')} % ${g.zone === 'over' ? 'over' : 'under'} randkurven` : ''}. ${reference} Der er derfor ingen tilbageberegning mellem to kurver at vise trinvist. Fremgangsmåden er beskrevet i Hjælp, kapitel 2, afsnit 3.`,
      ];
    } else
      out.captions = [
        'Designdiagrammet indeholder ingen ustabiliseret kurve i dette punkt, og beregningen kan derfor ikke vises trinvist.',
      ];
    return out;
  }
  // The active original only calls the section when dimensioning has results.
  if (!result) return { ...out, visible: false };
  const r1 = result.res_1 as CalculationResult,
    r2 = result.res_2 as CalculationResult;
  const phi = result.phi,
    materials = result.materialer;
  const netCorrection = result.geonet?.korrektion || 0;
  const netName = result.geonet?.navn || 'referencenet';
  const unreinforced = exact(r1 || r2, 't_uarmeret_phi_kor_mm');
  const legend = [`${length(requirement)} krav`];
  const figurePoints: CouplingPoint[] = [
    { x: requirement, y: eu, role: 'ustab', hollow: true, name: 'krav' },
  ];
  if (unreinforced && Math.abs(unreinforced - requirement) >= 1) {
    legend.push(`${length(unreinforced)} φᵥ-korrigeret`);
    figurePoints.push({
      x: unreinforced,
      y: eu,
      role: 'ustab',
      hollow: false,
      name: 'φᵥ-korrigeret',
    });
  }
  for (const [r, label] of [
    [r1, '1 lag'],
    [r2, '2 lag'],
  ] as const) {
    const value = exact(r, 't_armeret_mm');
    if (value !== null) {
      legend.push(`${length(value)} · ${label}`);
      figurePoints.push({
        x: value,
        y: eu,
        role: label === '1 lag' ? 'lag1' : 'lag2',
        hollow: false,
        name: `${label} geonet`,
      });
    }
  }
  let bases: Record<string, { basis: number }> = {};
  if (traffic && data) {
    const t = g.t_klasse!;
    const tk = defaults.TRAFIKKLASSER[t as keyof typeof defaults.TRAFIKKLASSER];
    const annual = tk?.naae10_aar || '—',
      twenty = (tk?.naae10_mio_20aar || 0) * 1e6;
    out.steps.push(
      step(
        1,
        'Dimensioneringstrafik',
        `trafikklassetabellen, ${t} ${(tk?.beskrivelse || '').toLowerCase()}`,
        [
          formula([
            [`${t} = ${tk?.tunge_koeretoejer ?? '—'} tunge køretøjer pr. døgn, begge retninger`],
            [`    ${tk?.anvendelse ?? ''}`],
            [''],
            [calc('NÆ10 pr. år pr. vognbane  (tabelværdi)', annual)],
            finalLine(`NÆ10, 20 år = ${annual} × 20`, num(twenty)),
          ]),
          note(
            `Trafikklassen og Eᵤ = ${mpa(eu)} er indtastet i trin 1. Alt herunder følger af dem. NÆ10 er trafikbelastningen omregnet til ækvivalente 10-tons aksler pr. vognbane. Tallet dokumenterer trafikklassens belastning over 20 år; det er ikke en lagtykkelse og indgår ikke direkte i diagramopslaget.`,
          ),
        ],
        `${num(twenty)} NÆ10`,
        'over 20 år',
      ),
    );
    const a = data.trin1,
      b = data.trin2;
    const ub = a.ubundet_mm,
      ubDec = Math.abs(ub - pythonRound(ub)) < 0.05 ? 0 : 1;
    const known = a.kendte.join(', ');
    const body: CouplingNode[] = [];
    let chip = '';
    if (a.direkte) {
      const lines: Line[] = [[`kørsel ${t} · Eᵤ ${a.eu_punkt} MPa`]];
      if (a.sg != null)
        lines.push(
          [calc('  stabilgrus SG', length(a.sg))],
          [calc('  bundsikring BL', length(a.bl ?? 0))],
        );
      lines.push(finalLine('= ubundet i alt', length(ub)));
      body.push(
        formula(lines),
        note(
          `Eᵤ = ${mpa(eu)} er et kørt punkt, og lagtykkelsen aflæses direkte i kørselstabellen. Kørslerne for ${t} findes ved Eᵤ = ${known} MPa.`,
        ),
      );
    } else {
      body.push(
        div(
          'kob-kort-par',
          ...(
            [
              ['UNDER', a.lav!, a.t_lav!],
              ['OVER', a.hoej!, a.t_hoej!],
            ] as const
          ).map(([label, p, thickness]) => {
            const run = runs[t]?.[p],
              sg = typeof run === 'object' ? run.sg || 0 : 0,
              bl = typeof run === 'object' ? run.bl || 0 : 0;
            return div(
              'kob-kort',
              div('kob-kort-hoved', `NÆRMESTE KØRSEL ${label} · EU ${p} MPA`),
              div('kob-kort-linje', `SG ${length(sg)} + BL ${length(bl)}`),
              div('kob-kort-tal', `= ${length(thickness)}`),
            );
          }),
        ),
      );
      body.push(
        formula([
          [
            `f = ln(${num(eu)} / ${a.lav}) / ln(${a.hoej} / ${a.lav}) = ${num(Math.log(eu / a.lav!), 4)} / ${num(Math.log(a.hoej! / a.lav!), 4)} = `,
            bold(num(a.frac!, 3)),
          ],
          [
            `t = ${lt(a.t_lav!)} − ${num(a.frac!, 3)} × (${lt(a.t_lav!)} − ${lt(a.t_hoej!)}) = `,
            bold(length(ub, ubDec)),
          ],
        ]),
        note(
          `Interpolationen foretages i log(Eᵤ), ikke i Eᵤ: lagtykkelsen aftager tilnærmelsesvis retlinet med log(Eᵤ), og lineær interpolation ville give en for tynd opbygning. Er E-værdien et kørt punkt (${known} MPa), aflæses kørslen direkte.`,
        ),
      );
      chip = `Eᵤ ${num(eu)} er ikke kørt — interpoleres`;
    }
    const count = Object.values(runs)
      .flatMap(Object.values)
      .filter((v) => (typeof v === 'object' ? (v.sg || 0) + (v.bl || 0) : v || 0) > 0).length;
    out.steps.push(
      step(
        2,
        'VejDims ubundne krav',
        `${count} VejDim-kørsler, T1–T6 × Eᵤ 3–40 MPa`,
        body,
        length(ub, ubDec),
        'ubundet i alt, SG + BL',
        {
          chip,
          figure: {
            model: koerslerFigure(t, eu, ub, runs, unit, [
              'kørte punkter',
              `dit Eᵤ = ${num(eu)} MPa`,
            ]),
            caption: `${t}s VejDim-kørsler. E-værdien er afsat i log-skala — den skala, interpolationen foretages i.`,
            legend: ['kørte punkter', `dit Eᵤ = ${num(eu)} MPa`],
          },
        },
      ),
    );
    const low = b.eo_lav!,
      high = b.eo_hoej!,
      klLow = eo_til_klasse(low),
      klHigh = eo_til_klasse(high),
      f = num(b.frac!, 3);
    out.steps.push(
      step(
        3,
        'Ækvivalent Eₒ',
        'korrelationstabellen, tilbageberegnet i diagrammerne',
        [
          div(
            'kob-brod',
            `Kravet kædes sammen med den Eₒ-kurve i designdiagrammerne, der giver netop denne tykkelse uarmeret ved samme E-værdi. Opslaget foretages i diagrammets egen række for Eᵤ = ${mpa(eu)} - ikke ved at interpolere nabokørslernes ækvivalente Eₒ. Værdien er en indeksværdi, der peger på en kurve, og ikke et forventet overflademodul.`,
          ),
          formula([
            [`uarmeret kurve ved Eᵤ = ${num(eu)} MPa:`],
            [calc(`  Eₒ ${right(String(low), 3)} MPa  (klasse ${klLow})`, length(b.t_lav!))],
            [calc(`  Eₒ ${right(String(high), 3)} MPa  (klasse ${klHigh})`, length(b.t_hoej!))],
            [''],
            [
              `f = (${lt(ub, ubDec)} − ${lt(b.t_lav!)}) / (${lt(b.t_hoej!)} − ${lt(b.t_lav!)}) = `,
              bold(f),
            ],
            [
              `Eₒ,ækv = ${low} + ${f} × (${high} − ${low}) = ${num(b.eo_aekv!, 1)} → `,
              bold(`${num(eo)} MPa`),
            ],
          ]),
        ],
        `${num(eo)} MPa`,
        'kurven beregningen læses på',
        { green: true },
      ),
    );
    const cards = div(
      'kob-klasser',
      ...(
        [
          [`BELASTNINGSKLASSE ${klLow}`, `Eₒ ${low} MPa`, length(b.t_lav!), false],
          ['DIN KURVE', `Eₒ,ækv ${num(eo)} MPa`, length(ub, ubDec), true],
          [`BELASTNINGSKLASSE ${klHigh}`, `Eₒ ${high} MPa`, length(b.t_hoej!), false],
        ] as const
      ).map(([heading, sub, value, active]) =>
        div(
          active ? 'kob-klasse kob-din' : 'kob-klasse',
          div('kob-klasse-hoved', heading, node('br', []), sub),
          div('kob-klasse-tal', value),
        ),
      ),
    );
    const rows: [string, number, number, number, number][] = [
      ['ustabiliseret', b.t_lav!, b.t_hoej!, ub, ubDec],
    ];
    for (const [key, name] of [
      ['1_lag', '1 lag geonet'],
      ['2_lag', '2 lag geonet'],
    ]) {
      const d = data.trin3[key];
      if (d) rows.push([name, d.lav, d.hoej, d.basis, 1]);
    }
    const labelWidth = Math.max(...rows.map((r) => r[0].length)) + 2;
    const valueWidth = Math.max(...rows.flatMap((r) => [lt(r[1]).length, lt(r[2]).length]));
    const resultWidth = Math.max(...rows.map((r) => lt(r[3], r[4]).length));
    const hLow = `Eₒ ${low} MPa`,
      hHigh = `Eₒ ${high} MPa`,
      col = Math.max(valueWidth, hLow.length, hHigh.length) + 3;
    const lines: Line[] = [
      [`aflæsning i diagrammets række for Eᵤ = ${num(eu)} MPa   ·   f = ${f}  (jf. trin 3)`],
      [''],
      [
        left('', labelWidth) +
          right(hLow, col) +
          right(hHigh, col) +
          '     t_lav + f × (t_høj − t_lav)',
      ],
    ];
    for (const [name, a, h, v, dec] of rows)
      lines.push([
        left(name, labelWidth) +
          right(lt(a), col) +
          right(lt(h), col) +
          `     ${right(lt(a), valueWidth)} + ${f} × (${right(lt(h), valueWidth)} − ${right(lt(a), valueWidth)}) = `,
        bold(`${right(lt(v, dec), resultWidth)} ${unit}`),
      ]);
    const reductions = rows
      .slice(1)
      .map((r) => lt(ub - r[3]))
      .join(' og ');
    out.steps.push(
      step(
        4,
        'Hvor kurven ligger i designdiagrammet',
        `designdiagram ${klLow} og ${klHigh}, GS-GRID/Tensar-feltforsøg`,
        [
          cards,
          formula(lines),
          note(
            `Faktoren f angiver punktets placering mellem de to Eₒ-kolonner og er derfor den samme i alle tre rækker. Den er ikke en procentvis korrektion af tykkelsen; den bruges i differensleddet f × (t_høj − t_lav) ved interpolation af hver kurve. ${reductions ? `Forskellen mellem øverste og de armerede rækker — ${reductions} ${unit} — er basisreduktionen i trin 6. ` : ''}Da Eₒ,ækv per konstruktion er valgt, så den ustabiliserede kurve rammer VejDims krav, er reduktionen designdiagrammets egen, feltdokumenterede værdi. VejDim omfatter ikke geonet, og de to metoders kriterier sammenblandes ikke.`,
          ),
        ],
        `mellem klasse ${klLow} og ${klHigh}`,
        `nærmeste hele klasse: ${eo_til_naermeste_klasse(eo)}`,
        {
          figure: {
            caption: `De stiplede kurver er belastningsklasse ${klLow} og ${klHigh}; den fuldt optrukne er Eₒ,ækv. Ringen viser VejDims krav fra trin 2; et eventuelt sort punkt viser φᵥ-korrektionen i trin 5, og farvede punkter viser 1 og 2 lag geonet fra trin 6.`,
            legend,
            model: diagramFigure({
              eu,
              eo,
              neighbours: [low, high],
              table,
              phi,
              netCorrection,
              points: figurePoints,
              unit,
              legend,
            }),
          },
        },
      ),
    );
    bases = data.trin3;
    out.footer =
      'VejDim omfatter ikke geonet. Kørslerne fastlægger alene driftspunktet, mens reduktionen i trin 6 er designdiagrammets egen, feltdokumenterede værdi. Kørslerne står under Trafikklasse-korrelation. Metoden er beskrevet i Hjælp, kapitel 1, afsnit 3–6, og kapitel 2, afsnit 1–3.';
  } else {
    const klass = g.valgt_klasse!;
    const info =
      defaults.BELASTNINGSKLASSER[String(klass) as keyof typeof defaults.BELASTNINGSKLASSER];
    out.steps.push(
      step(
        1,
        'Belastningsklasse',
        `belastningsklassetabellen, klasse ${klass} ${(info?.belastning || '').split('(')[0].trim().toLowerCase()}`,
        [
          formula([
            [`klasse ${klass} = ${info?.belastning ?? ''}`],
            [`    ${info?.anvendelse ?? ''}`],
            [''],
            finalLine('Eₒ  (opslagsværdi)', `${num(eo)} MPa`),
          ]),
          note(
            `Belastningsklassen og Eᵤ = ${mpa(eu)} er indtastet i trin 1. Alt herunder følger af dem. Klassen svarer til én af designdiagrammernes seks kurver, og der foretages derfor ingen tilbageberegning af et driftspunkt.`,
          ),
        ],
        `${num(eo)} MPa`,
        'diagrammets kurve',
        { green: true },
      ),
    );
    const lines: Line[] = [
      [`aflæsning ved Eᵤ = ${num(eu)} MPa   ·   klasse ${klass}  (Eₒ ${num(eo)} MPa)`],
      [''],
    ];
    for (const [key, name] of [
      ['uarmeret', 'ustabiliseret'],
      ['1_lag', '1 lag geonet'],
      ['2_lag', '2 lag geonet'],
    ]) {
      const value = lookup(key);
      if (value !== null) {
        lines.push(finalLine(name, length(value)));
        if (key !== 'uarmeret') bases[key] = { basis: value };
      }
    }
    const i = EO_KOLONNER.indexOf(eo),
      neighbours = [EO_KOLONNER[i - 1], EO_KOLONNER[i + 1]]
        .filter((v) => v !== undefined)
        .map(eo_til_klasse)
        .join(' og ');
    out.steps.push(
      step(
        2,
        'Aflæsning i designdiagrammet',
        `designdiagram ${klass}, GS-GRID/Tensar-feltforsøg`,
        [
          formula(lines),
          note(
            `Eₒ = ${mpa(eo)} er en af diagrammernes egne kurver, og Eᵤ = ${mpa(eu)} en af tabellens rækker; beregningen foretager derfor ingen interpolation. Opmærksomheden henledes på, at tabellens værdier er bestemt ved lineær interpolation mellem kurvernes aflæste punkter, og at kun en del af dem er aflæst direkte. Rækkerne kan efterses under `,
            bold('Designdiagrammer'),
            ', hvor de aflæste værdier står med fed.',
          ),
        ],
        length(requirement),
        'ustabiliseret',
        {
          figure: {
            caption: `Den fuldt optrukne kurve er klasse ${klass}${neighbours ? `; de stiplede er klasse ${neighbours}` : ''}. Ringen viser den ustabiliserede aflæsning fra trin 2; udfyldte punkter viser de efterfølgende værdier fra trin 3 og 4.`,
            legend,
            model: diagramFigure({
              eu,
              eo,
              neighbours: [EO_KOLONNER[i - 1], EO_KOLONNER[i + 1]].filter((v) => v !== undefined),
              table,
              phi,
              netCorrection,
              points: figurePoints,
              unit,
              legend,
            }),
          },
        },
      ),
    );
    out.footer =
      'Designdiagrammerne hviler på feltforsøg fra GS-GRID og Tensar. Kurverne og deres gyldighedsområde er beskrevet i Hjælp, kapitel 3, afsnit 1–3, kapitel 4, afsnit 2, og kapitel 5, afsnit 1–3. Diagrammernes egne tabeller står under Designdiagrammer.';
  }
  let phiCorrection = K_PHI * (phi - PHI_BASIS);
  if (Math.abs(phiCorrection) < 1e-12) phiCorrection = 0;
  const entries: [string, Line][] = [];
  let source = 'materialetabellen';
  if (materials.length) {
    const d = phiTableData(materials);
    const terms = materials
      .map((m) => `${num((d.lag_mode_pct ? m.pct : m.tykkelse_mm) || 0)} × ${num(m.phi, 1)}`)
      .join(' + ');
    entries.push(
      [
        'Vægtet friktionsvinkel:',
        [`φᵥ = Σ(${d.symbol}ᵢ × φᵢ) / Σ${d.symbol}ᵢ = (${terms}) / ${num(d.total_v)}`],
      ],
      [
        '',
        [`  = ${num(d.total_bidrag)} / ${num(d.total_v)} = `, bold(`${num(d.phi_weighted, 2)}°`)],
      ],
    );
    const method = normaliser(input.indstillinger?.afrunding).phi_afrunding;
    if (
      Math.abs(phi - d.phi_weighted) >= 1e-9 &&
      Math.abs(afrund_phi(d.phi_weighted, method) - phi) < 1e-9
    ) {
      const labels: Record<string, string> = {
        ingen: 'ingen afrunding',
        ned: 'nedrunding til hel grad',
        naermeste: 'afrunding til nærmeste hele grad',
      };
      entries.push([
        'Afrundet:',
        [`φᵥ = ${num(phi)}°`, weak(`${labels[method]}, jf. Indstillinger`)],
      ]);
    }
    source = `materialetabellen, ${materials
      .map((m) => `${m.navn} ${num(m.phi, 1)}°`)
      .join(', ')
      .toLowerCase()}`;
  }
  entries.push([
    'Korrektionsfaktor:',
    [
      'k',
      node('sub', ['φ']),
      ` = ${num(K_PHI, 2)} × (${num(phi, 2)} − ${num(PHI_BASIS)}) = ${num(phiCorrection, 4)} = `,
      bold(`${num(phiCorrection * 100, 2)} %`),
    ],
  ]);
  const width = Math.max(...entries.map(([label]) => label.length)) + 2;
  out.steps.push(
    step(
      traffic ? 5 : 3,
      'φᵥ-korrektion for materialerne',
      source,
      [
        formula(entries.map(([label, line]) => [left(label, width), ...line])),
        note(
          Math.abs(phiCorrection) >= 1e-9
            ? `Diagrammerne er tegnet for et referencemateriale med φᵥ = ${num(PHI_BASIS)}°. De valgte lag afviger herfra, og kurven forskydes tilsvarende; den korrigerede tykkelse er det punkt, materialerne faktisk ligger på.`
            : `Diagrammerne er tegnet for et referencemateriale med φᵥ = ${num(PHI_BASIS)}°, og beregningen føres med samme værdi. Korrektionen er dermed nul, og diagrammets værdi anvendes uændret. Vælges andre materialer under Brugerdefineret, slår korrektionen igennem her.`,
        ),
      ],
      `${num(phiCorrection * 100, 2)} %`,
      'φᵥ-korrektionsfaktor',
    ),
  );

  const columns: CouplingNode[] = [],
    results: string[] = [],
    percentages: string[] = [];
  const index = result.geonet?.effektindeks;
  const netLabel = index ? `indeks ${index}` : `${num(netCorrection * 100)} %`;
  for (const [key, heading, className, r] of [
    ['1_lag', '1 LAG GEONET', 'kob-1lag', r1],
    ['2_lag', '2 LAG GEONET', 'kob-2lag', r2],
  ] as const) {
    const arm = exact(r, 't_armeret_mm'),
      end = r.t_armeret_mm ?? null;
    if (!bases[key] || arm === null) continue;
    const base = bases[key].basis,
      baseText = lt(base),
      rounded = er_oprundet(end, arm);
    const layerPhi = r.phi ?? phi,
      correction = K_PHI * (layerPhi - PHI_BASIS);
    const phiLabel =
      Math.abs(layerPhi - phi) >= 0.005 ? ` for opbygningens lag, φᵥ = ${num(layerPhi, 2)}°` : '';
    const lines: Line[] = [
      [calc('ustabiliseret bærelagstykkelse', length(requirement))],
      [
        calc('− basisreduktion, referencenet', length(requirement - base)),
        weak(`${lt(requirement)} − ${baseText}, jf. trin ${traffic ? 4 : 2}`),
      ],
    ];
    if (Math.abs(netCorrection) >= 0.005)
      lines.push([
        calc(
          `${netCorrection > 0 ? '+' : '−'} net-korrektion, ${netLabel}`,
          length(Math.abs(base * netCorrection)),
        ),
        weak(`${baseText} × ${num(Math.abs(netCorrection) * 100, 1)} %`),
      ]);
    if (Math.abs(correction) >= 1e-9)
      lines.push([
        calc(
          `${correction > 0 ? '+' : '−'} φᵥ-korrektion${phiLabel}`,
          length(Math.abs(base * correction)),
        ),
        weak(`${baseText} × ${num(Math.abs(correction) * 100, 2)} %`),
      ]);
    lines.push([
      calc('− samlet reduktion', length(requirement - arm)),
      weak('basisreduktion + net-korrektion + φᵥ-korrektion'),
    ]);
    if (rounded) {
      const roundStep = r.afrunding_trin_mm || normaliser(input.indstillinger?.afrunding).trin_mm;
      const [op, min, layer] = tillaeg(end, arm, roundStep, r.t_min_mm);
      if (pythonRound(op) > 0)
        lines.push([
          calc(`+ oprunding til nærmeste ${length(roundStep)}`, length(op)),
          weak(`beregnet ${length(arm)}, jf. Indstillinger`),
        ]);
      if (pythonRound(min) > 0)
        lines.push([
          calc('+ tillæg til minimumstykkelse', length(min)),
          weak(`mindst ${length(end! - layer)}, jf. Indstillinger`),
        ]);
      if (pythonRound(layer) > 0) {
        const layers = r.t_armeret_lagtillaeg_lag;
        let text = 'underliggende lag efter VD, jf. Indstillinger';
        if (layers?.efter.length) {
          const before = Object.fromEntries(layers.foer.map((l) => [l.navn, l.tykkelse_mm]));
          const increased = layers.efter
            .slice(1)
            .filter((l) => l.tykkelse_mm > (before[l.navn] || 0) + 0.5);
          text =
            layers.efter.map((l) => lt(l.tykkelse_mm)).join(' + ') +
            ` ${unit}` +
            (increased.length
              ? '; ' +
                increased.map((l) => `${l.navn} øget fra ${length(before[l.navn] || 0)}`).join(', ')
              : '') +
            ', jf. Indstillinger';
        }
        lines.push([calc('+ tillæg for mindste lagtykkelse', length(layer)), weak(text)]);
      }
    }
    const pct = requirement ? ((requirement - arm) / requirement) * 100 : null;
    const unShown = r.t_uarmeret_phi_kor_mm || unreinforced;
    let tail = pct === null ? '' : `−${num(pct)} % af ${lt(requirement)}`;
    if (
      pct !== null &&
      r.reduktion_pct != null &&
      unShown &&
      (Math.abs(unShown - requirement) >= 1 || rounded)
    )
      tail += ` · −${num(r.reduktion_pct * 100)} % af ${lt(unShown)}`;
    lines.push([
      div(
        'kob-slutlinje',
        ...finalLine('Stabiliseret bærelagstykkelse =', length(end)),
        ...(tail ? [weak(tail)] : []),
      ),
    ]);
    columns.push(node('div', [div(`kob-lag-hoved ${className}`, heading), formula(lines)]));
    results.push(tal(end, unit));
    if (pct !== null) percentages.push(`−${num(pct)} %`);
  }
  if (columns.length) {
    const shown = r1.t_uarmeret_phi_kor_mm || unreinforced;
    const anyRounded =
      [r1, r2].some((r) => er_oprundet(r.t_armeret_mm ?? null, exact(r, 't_armeret_mm'))) ||
      er_oprundet(shown, unreinforced);
    const roundNote = anyRounded
      ? ` Lagtykkelserne oprundes til nærmeste ${length(r1.afrunding_trin_mm || normaliser(input.indstillinger?.afrunding).trin_mm)}, jf. Indstillinger; regnestykket er ført med de beregnede værdier, og oprundingen står som sidste led.`
      : '';
    const common =
      'Basisreduktionen gælder referencenettet i punktet, og net-korrektionen er det valgte nets afvigelse herfra.';
    const explanation =
      shown && (Math.abs(shown - requirement) >= 1 || anyRounded)
        ? note(
            common + ' ',
            bold('To referencer for procenterne:'),
            ` regnestykket her tager udgangspunkt i den ukorrigerede værdi på ${traffic ? 'VejDims' : 'den ustabiliserede aflæsning på'} ${length(requirement)}, så leddene summerer til resultatet, mens resultatkortet øverst måler reduktionen mod de φᵥ-korrigerede ${length(shown)}, hvor begge sider hviler på de valgte materialer. Begge er angivet, så de to sæt procenter ikke fremstår som en uoverensstemmelse.${roundNote}`,
          )
        : note(common + roundNote);
    out.steps.push(
      step(
        traffic ? 6 : 4,
        'Reduktion med geonet',
        `geonet-databasen, ${netName}`,
        [div('kob-lag', ...columns), explanation],
        results.join(' / ') + ` ${unit}`,
        percentages.join(' / ') + ` af ${lt(requirement)}`,
        { green: true, monoNote: true },
      ),
    );
  }
  out.title = `**Sådan er resultatet beregnet** · fra ${traffic ? `trafikklasse ${g.t_klasse}` : `belastningsklasse ${g.valgt_klasse}`}${r1.t_armeret_mm != null ? ` til ${length(r1.t_armeret_mm)} bærelag` : ''}`;
  return out;
}
