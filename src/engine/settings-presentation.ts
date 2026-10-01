import { defaults } from './data.ts';
import { koersler_fra_raekker, type RunRow } from './editing.ts';
import { korrelation_opslag } from './correlation.ts';
import { pythonFixed } from './python-numbers.ts';
import type { BasisTable } from './types.ts';
import schema from './settings-ui.json' with { type: 'json' };
import { normaliser_indstillinger } from './editing.ts';
import { rund_op, er_oprundet } from './afrunding.ts';

export interface SettingsField {
  key: string;
  path: string[];
  label: string;
  kind: 'select' | 'radio' | 'checkbox' | 'number';
  options?: { value: string | number | boolean; label: string }[];
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  inline?: boolean;
}
export interface MinimumTable {
  min: number;
  max: number;
  step: number;
  columns: string[];
  resetLabel: string;
  rows: { klasse: number; eo: number; belastning: string }[];
}
export type SettingsPageItem =
  | { kind: 'field'; field: SettingsField }
  | { kind: 'prose' | 'caption' | 'warning' | 'info'; text: string }
  | { kind: 'columns'; columns: SettingsPageItem[][] }
  | { kind: 'minimumTable'; table: MinimumTable }
  | { kind: 'example'; label: string; text: string }
  | {
      kind: 'deviations';
      label: string;
      text: string;
      cells: ReturnType<typeof outsideDetails>['cells'];
    };

/** Original _gaelder. Applies to modes, independently of the currently open mode. */
export function settingsApplies({
  standard = false,
  brugerdefineret = false,
  standard_forudsaetning,
  ignorer_klassisk = false,
  klassisk = false,
}: {
  standard?: boolean;
  brugerdefineret?: boolean;
  standard_forudsaetning?: string;
  ignorer_klassisk?: boolean;
  klassisk?: boolean;
}): string {
  klassisk = klassisk && !ignorer_klassisk;
  const modes = [];
  if (standard && !klassisk)
    modes.push(standard_forudsaetning ? `Standard (${standard_forudsaetning})` : 'Standard');
  if (brugerdefineret) modes.push('Brugerdefineret');
  return (
    (modes.length ? `Gælder: ${modes.join(' og ')}` : 'Gælder: ingen tilstand') +
    (standard && klassisk
      ? ' · gælder ikke Standard, da klassisk standardberegning er valgt i afsnit 6'
      : '')
  );
}

const standardExample = `Belastningsklasse 4, Eᵤ = 33 MPa, 1 lag referencenet. Designdiagrammet giver
343 mm uden geonet og 200 mm med 1 lag geonet. Oprundet til 50 mm bliver
tykkelserne 350 mm og 200 mm. Stabilgrusminimum er 250 mm.

Er fluebenet for samlet minimum i afsnit 3 sat, øges opbygningen med geonet
til 250 mm stabilgrus, og reduktionen er 100 mm. Er fluebenet fjernet, er
opbygningen med geonet 200 mm, altså tyndere end stabilgrusminimum:

| Valg | Opbygning med 1 lag geonet | Reduktion |
| --- | --- | ---: |
| Hele tykkelsen vises som stabilgrus | 200 mm stabilgrus | 150 mm |
| Tykkelsen øges til stabilgrusminimum | 250 mm stabilgrus | 100 mm |
| Ét samlet ubundet lag | 200 mm ubunden opbygning | 150 mm |

Den ustabiliserede opbygning er i alle tilfælde 350 mm, fordelt med 250 mm
stabilgrus og 100 mm bundsikring.`;

/** Ordered content from render_indstillinger and its helpers (a330cfd).
 * The UI renders this order; widgets/storage/calculation rules are unchanged.
 */
export function settingsPage(value: unknown, outside: ReturnType<typeof outsideDetails>) {
  const {
    afrunding: afr,
    opbygning: opb,
    lagfordeling: lf,
    yderomraade: yder,
  } = normaliser_indstillinger(value);
  const join = (parts: string[]) => parts.join(' · ');
  const whole = (n: number) => pythonFixed(n, 0);
  const pct = (n: number) => `${pythonFixed(n, 1).replace('.', ',')} %`;
  const rounding = [
    afr.trin_mm <= 1 ? '1 mm (ingen oprunding)' : `${afr.trin_mm} mm`,
    afr.reduktion_eksakt ? 'reduktion af beregnede tykkelser' : 'reduktion af oprundede tykkelser',
  ];
  if (afr.vis_eksakt) rounding.push('beregnet værdi i parentes');
  if (afr.phi_afrunding !== 'ingen')
    rounding.push(afr.phi_afrunding === 'ned' ? 'φᵥ nedrundet' : 'φᵥ afrundet');
  const visual = [
    `lagtykkelser i ${opb.enhed}`,
    opb.geonet_paaskrift
      ? 'navn ud for geonetlinjerne'
      : opb.signatur
        ? 'navn alene i signaturen'
        : 'uden geonettets navn',
    opb.maal_streg && opb.maal_tal
      ? 'målsætning med streg og mål'
      : opb.maal_streg
        ? 'målsætningsstreg uden mål'
        : opb.maal_tal
          ? 'mål uden målsætningsstreg'
          : 'ingen målsætning',
  ];
  if (!opb.signatur) visual.push('uden signaturforklaring');
  const distribution = [
    {
      proportional: 'proportional fordeling',
      minimum: 'øverste lag mindst minimumstykkelsen',
      fastholdt: 'øverste lag fastholdt',
    }[lf.fordeling]!,
  ];
  if (lf.samlet_minimum) distribution.push('samlet tykkelse mindst minimum');
  distribution.push(
    `${Object.entries(lf.minimum_mm)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, mm]) => whole(mm))
      .join('/')} mm`,
  );
  const rest =
    lf.restlag === 'flet'
      ? `lag under ${whole(lf.restlag_graense_mm)} mm lægges til laget ovenover`
      : lf.restlag === 'vd'
        ? `VD's mindste lagtykkelse · bærelag ${whole(lf.vd_minimum_mm.Bærelag)} mm · bundsikring ${whole(lf.vd_minimum_mm.Bundsikring)} mm${lf.kraev_bundsikring ? ' · bundsikringslag kræves' : ''}`
        : 'lagene vises som fordelt';
  const action: Record<string, string> = {
    afvis: 'afvis',
    laveste: 'diagrammets laveste kurve',
    vejdim: 'vejdims tykkelse',
  };
  const summaries = [
    join(rounding),
    join(visual),
    join(distribution),
    rest,
    {
      indtastet: 'φᵥ for den indtastede opbygning',
      laveste: 'laveste φᵥ pr. opbygning',
      soejle: 'φᵥ for opbygningens egne lag',
    }[lf.phi_regel]!,
    lf.standard_klassisk
      ? 'klassisk standardberegning'
      : lf.standard_opdeling
        ? 'opdeling i stabilgrus og bundsikring'
        : 'ét samlet ubundet lag',
    {
      laggraense: 'ved laggrænsen',
      daeklag: 'ved mindste dæklag',
      laggraense_min: 'ved laggrænsen, dog mindst dæklaget',
    }[lf.netplacering]!,
    `over ${pct(yder.tolerance_over_pct)} · under ${pct(yder.tolerance_under_pct)} · uden for: over ${action[yder.over_uden]}, under ${action[yder.under_uden]}`,
  ];
  const caption = (text: string): SettingsPageItem => ({ kind: 'caption', text });
  const both = (ignore = false, split = false) =>
    caption(
      settingsApplies({
        standard: true,
        brugerdefineret: true,
        klassisk: lf.standard_klassisk,
        ignorer_klassisk: ignore,
        standard_forudsaetning: split ? 'når opbygningen opdeles' : undefined,
      }),
    );
  const bd = () => caption(settingsApplies({ brugerdefineret: true }));
  const columns = (...columns: SettingsPageItem[][]): SettingsPageItem => ({
    kind: 'columns',
    columns,
  });
  const sections = schema.sections.map((section, index) => {
    const fields = section.fields as SettingsField[];
    const field = (i: number): SettingsPageItem => ({ kind: 'field', field: fields[i] });
    const texts = section.texts;
    const content: SettingsPageItem[] = [{ kind: 'prose', text: texts[0] }];
    switch (index) {
      case 0: {
        const rounded = rund_op(532, afr.trin_mm);
        content.push(
          both(true),
          columns([field(0)], [field(1)]),
          field(2),
          field(3),
          caption(
            er_oprundet(rounded, 532)
              ? `Eksempel: en beregnet lagtykkelse på 532 mm angives som ${rounded} mm${afr.vis_eksakt ? ' (532 mm)' : ''}.`
              : 'Eksempel: en beregnet lagtykkelse på 532 mm angives uændret.',
          ),
        );
        break;
      }
      case 1:
        content.push(both(true), ...fields.map((_, i) => field(i)));
        break;
      case 2: {
        content.push(
          field(0),
          bd(),
          field(1),
          both(),
          columns(
            [{ kind: 'minimumTable', table: section.minimumTable as MinimumTable }],
            [caption(texts[1]), both(), caption(texts[2]), caption(texts[3])],
          ),
        );
        const rounded = Object.entries(lf.minimum_mm).filter(
          ([, mm]) => afr.trin_mm > 1 && Math.abs(rund_op(mm, afr.trin_mm) - mm) >= 0.5,
        );
        if (rounded.length)
          content.push({
            kind: 'warning',
            text: `Minimumstykkelser, der ikke går op i oprundingstrinnet på ${afr.trin_mm} mm. De oprundes til trinnet ved beregningen: ${rounded.map(([klasse, mm]) => `klasse ${klasse}: ${whole(mm)} mm anvendes som ${rund_op(mm, afr.trin_mm)} mm`).join(', ')}. Tabellen kan tilpasses trinnet, eller trinnet kan ændres i afsnit 1.`,
          });
        break;
      }
      case 3:
        content.push(
          field(0),
          both(false, true),
          columns([field(1)], [field(2)], [field(3)]),
          field(4),
          caption(texts[1]),
        );
        break;
      case 4:
        content.push(field(0), bd(), caption(texts[1]));
        break;
      case 5:
        content.push(
          caption(settingsApplies({ standard: true, ignorer_klassisk: true })),
          field(0),
        );
        if (lf.standard_klassisk)
          content.push({
            kind: 'info',
            text: 'Klassisk standardberegning er valgt. Minimumstykkelsen i afsnit 3, reglerne for underliggende lag i afsnit 4 og placeringen af geonet i afsnit 7 gælder ikke Standard. De gælder fortsat Brugerdefineret. Reglerne for trafikklasser uden for diagrammet i afsnit 8 gælder begge tilstande.',
          });
        content.push(field(1), field(2), caption(texts[1]), {
          kind: 'example',
          label: 'Eksempel',
          text: standardExample,
        });
        break;
      case 6:
        content.push(field(0), both(false, true), caption(texts[1]));
        break;
      case 7:
        content.push(
          both(),
          caption('Gælder dimensionering efter trafikklasse.'),
          columns(
            [field(0), caption(outside.captions[0]), field(1), caption(outside.captions[1])],
            [
              field(2),
              field(3),
              caption(outside.captions[2]),
              field(4),
              caption(outside.captions[3]),
            ],
          ),
          caption(texts[1]),
          {
            kind: 'deviations',
            label: 'Målte afvigelser i korrelationen',
            text: texts[2],
            cells: outside.cells,
          },
        );
        break;
    }
    return {
      id: section.id,
      number: index + 1,
      title: section.title,
      summary: summaries[index],
      content,
    };
  });
  return { title: schema.title, intro: schema.intro, sections };
}

/** Original _yder_omfang and _yder_afvigelsestabel, applied to active data. */
export function outsideDetails(
  rows: RunRow[],
  table: BasisTable | null = null,
  rules: unknown = null,
) {
  const lookup = korrelation_opslag(koersler_fra_raekker(rows), table, rules);
  const classes = Object.keys(defaults.TRAFIKKLASSER);
  const points = [...new Set(defaults.VEJDIM_KOERSLER_STANDARD_RAEKKER.map((r) => r.eu))].sort(
    (a, b) => a - b,
  );
  const dk = (n: number) => pythonFixed(n, 1).replace('.', ',').replace('-', '−');
  const scope = (zone: string, inside: boolean) => {
    const values = classes
      .flatMap((t) =>
        points.flatMap((eu) => {
          const c = lookup[t]?.[eu];
          return c &&
            'afvigelse_pct' in c &&
            c.zone === zone &&
            c.afvigelse_pct !== null &&
            Boolean(c.inden_tolerance) === inside
            ? [c.afvigelse_pct]
            : [];
        }),
      )
      .sort((a, b) => a - b);
    const prefix = inside ? 'Inden for tolerancen' : 'Uden for tolerancen';
    if (!values.length) return `${prefix}: ingen af de kørte punkter.`;
    if (values.length === 1) return `${prefix}: 1 kørt punkt, ${dk(values[0])} %.`;
    const range =
      values[0] === values.at(-1)
        ? `${dk(values[0])} %`
        : `${dk(values[0])}–${dk(values.at(-1)!)} %`;
    return `${prefix}: ${values.length} kørte punkter, ${range}.`;
  };
  const cells = Object.fromEntries(
    classes.map((t) => [
      t,
      Object.fromEntries(
        points.map((eu) => {
          const c = lookup[t]?.[eu];
          if (
            !c ||
            !('afvigelse_pct' in c) ||
            c.afvigelse_pct === null ||
            !['under', 'over'].includes(c.zone)
          )
            return [`Eᵤ ${eu}`, ''];
          const signed = (c.zone === 'under' ? -1 : 1) * c.afvigelse_pct;
          const percent = `${signed >= 0 ? '+' : ''}${dk(signed)} %`;
          const action =
            c.eo === null
              ? 'afvist'
              : (c.handling === 'laveste' ? 'laveste kurve' : 'VejDim') +
                (c.inden_tolerance ? '*' : '†');
          return [`Eᵤ ${eu}`, `${percent} · ${action}`];
        }),
      ),
    ]),
  );
  return {
    captions: [
      scope('over', true),
      scope('over', false),
      scope('under', true),
      scope('under', false),
    ],
    cells,
  };
}
