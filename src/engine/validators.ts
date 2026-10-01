import {
  defaults,
  EO_MIN,
  EO_MAX,
  EO_KOLONNER,
  PHI_BASIS,
  eo_til_klasse,
  format_klasse_interval,
} from './data.ts';
import { beregn, aktive_eu_raekker, slaa_op, slaa_op_interp } from './calculator.ts';
import { pythonFixed } from './python-numbers.ts';
import type { BasisTable, Product } from './types.ts';
export interface Material {
  navn?: string | null;
  max_korn?: number | null;
  lagtype?: string | null;
  krav_maskestoerrelse_mm?: number | null;
}
export interface ValidationInput {
  eu: number;
  eo: number;
  phi: number;
  lag_mode: string;
  geonet: Product | null;
  materialer: Material[] | null;
  t_armeret_mm?: number | null;
  t_basis_table?: BasisTable | null;
  tillad_interpoleret_eo?: boolean;
}
export function valider_input(input: ValidationInput) {
  const {
    eu,
    eo,
    phi,
    lag_mode,
    geonet,
    materialer,
    t_basis_table = null,
    tillad_interpoleret_eo = false,
  } = input;
  let { t_armeret_mm = null } = input;
  const fejl: string[] = [],
    advarsler: string[] = [],
    anbefalinger: string[] = [];
  const output = { fejl, advarsler, anbefalinger },
    mat = materialer || [];
  const { EU_MIN, EU_MAX, PHI_MIN, PHI_MAX } = defaults;
  if (eu < EU_MIN) fejl.push(`Eᵤ=${eu} MPa er for lavt. Minimum er ${EU_MIN.toFixed(1)} MPa. `);
  else if (eu > EU_MAX)
    fejl.push(
      `Eᵤ=${eu} MPa er for højt. Maximum er ${EU_MAX.toFixed(1)} MPa. Ved Eᵤ > ${EU_MAX.toFixed(1)} MPa reduceres effekten af stabilisering med geonet.`,
    );
  if (eo < EO_MIN) fejl.push(`Eₒ=${eo} MPa er for lavt. Minimum er ${EO_MIN.toFixed(1)} MPa.`);
  else if (eo > EO_MAX)
    fejl.push(
      `Eₒ=${eo} MPa er for højt. Maximum er ${EO_MAX.toFixed(1)} MPa (svarer til klasse 6 — meget tung trafik).`,
    );
  if (!tillad_interpoleret_eo && EO_MIN <= eo && eo <= EO_MAX && !EO_KOLONNER.includes(eo))
    fejl.push(
      `Eₒ=${eo} MPa svarer ikke til en belastningsklasse. Gyldige Eₒ-værdier: [${EO_KOLONNER.join(', ')}] MPa. Vælg en gyldig belastningsklasse.`,
    );
  if (!['1_lag', '2_lag'].includes(lag_mode))
    fejl.push(`Ukendt lag-tilstand: '${lag_mode}'. Skal være '1_lag' eller '2_lag'.`);
  if (!fejl.length && ['1_lag', '2_lag'].includes(lag_mode)) {
    const lookup = tillad_interpoleret_eo ? slaa_op_interp : slaa_op;
    if (aktive_eu_raekker(t_basis_table).includes(eu)) {
      if (lookup(eu, eo, lag_mode, t_basis_table) === null)
        fejl.push(
          `Kombinationen Eᵤ=${eu} MPa / Eₒ=${eo} MPa / ${lag_mode.replaceAll('_', ' ')} er uden for opslagstabellens gyldige område ("—"). `,
        );
      if (lookup(eu, eo, 'uarmeret', t_basis_table) === null)
        advarsler.push(
          `Der er ikke defineret nogen ustabiliseret bærelagstykkelse for Eᵤ=${eu} MPa / Eₒ=${eo} MPa.`,
        );
    }
  }
  if (fejl.length) return output;
  let t_uarmeret_mm: number | null;
  if (t_armeret_mm === null) {
    const result = beregn({
      eu,
      eo,
      phi,
      net_korrektion: geonet?.korrektion ?? 0,
      lag_mode,
      t_basis_table,
    });
    if (result.fejl) {
      fejl.push(result.fejl);
      return output;
    }
    t_armeret_mm = result.t_armeret_mm!;
    t_uarmeret_mm = result.t_uarmeret_mm ?? null;
  } else {
    const result = beregn({ eu, eo, phi: PHI_BASIS, net_korrektion: 0, lag_mode, t_basis_table });
    t_uarmeret_mm = 't_uarmeret_mm' in result ? (result.t_uarmeret_mm ?? null) : 0;
  }
  if (phi < PHI_MIN)
    advarsler.push(
      `Friktionsvinklen φᵥ=${phi}° er under standardværdien på ${pythonFixed(PHI_MIN)}°. φᵥ-korrektionen vil øge den beregnede tykkelse. `,
    );
  if (phi > PHI_MAX)
    advarsler.push(
      `Friktionsvinklen φᵥ=${phi}° er over den anbefalede øvre grænse på ${pythonFixed(PHI_MAX)}°.`,
    );
  if (eu >= 35)
    advarsler.push(
      `Eᵤ=${eu} MPa er i den øvre del af opslagstabellen. Den ustabiliserede tykkelse er meget lille, og den relative besparelse ved stabilisering er begrænset. `,
    );
  if (geonet !== null && geonet.navn !== 'Anden armering (manuel)') {
    const klasse = eo_til_klasse(eo);
    if (klasse !== null && !geonet.klasser!.includes(klasse))
      advarsler.push(
        `Produktet '${geonet.navn}' er anbefalet til belastningsklasse ${format_klasse_interval(geonet.klasser!)}, men der er valgt belastningsklasse ${klasse}.`,
      );
  }
  if (geonet !== null) {
    const cover = Number(geonet.min_daklag) * 10;
    if (t_armeret_mm < cover)
      advarsler.push(
        `Den beregnede stabiliserede tykkelse (${pythonFixed(t_armeret_mm)} mm) er mindre end '${geonet.navn}' sit minimumsdæklag (${pythonFixed(cover)} mm). Geonettets funktion og effektivitet kan ikke garanteres. `,
      );
  }
  if (geonet != null && geonet.max_korn != null)
    for (const [i, layer] of mat.entries()) {
      if (layer.max_korn != null && layer.max_korn > geonet.max_korn)
        advarsler.push(
          `Lag ${i + 1} (${layer.navn ?? 'ukendt'}) har en maksimal kornstørrelse på ${layer.max_korn} mm, som overskrider '${geonet.navn}' sit maximum på ${geonet.max_korn} mm. `,
        );
    }
  for (let i = 0; i < mat.length - 1; i++)
    if (mat[i].lagtype === 'Bundsikring' && mat[i + 1].lagtype === 'Bærelag')
      advarsler.push(
        `Rækkefølge-advarsel: Lag ${i + 1} er angivet som Bundsikring (${mat[i].navn ?? '?'}), men Lag ${i + 2} er Bærelag (${mat[i + 1].navn ?? '?'}). Bærelag placeres normalt over bundsikringen.`,
      );
  if (geonet !== null && geonet.navn !== 'Anden armering (manuel)' && geonet.korrektion! >= 0.15)
    advarsler.push(
      `'${geonet.navn}' har en korrektionsfaktor på +${pythonFixed(geonet.korrektion! * 100)}%, hvilket indikerer lavere effektivitet end referenceproduktet. Overvej et mere effektivt produkt til belastningsklassen.`,
    );
  if (geonet !== null && geonet.max_korn != null)
    for (const [i, layer] of mat.entries()) {
      if (layer.max_korn == null && layer.navn != null && layer.navn !== '') {
        advarsler.push(
          `Lag ${i + 1} (${layer.navn}) har ingen specificeret kornstørrelse. Det kan ikke automatisk kontrolleres om den er forenelig med '${geonet.navn}' (max ${geonet.max_korn} mm). `,
        );
        break;
      }
    }
  if (geonet !== null && geonet.type === 'Biaxialt' && geonet.maskestoerrelse_mm != null)
    for (const [i, layer] of mat.entries()) {
      if (
        layer.krav_maskestoerrelse_mm != null &&
        layer.krav_maskestoerrelse_mm > geonet.maskestoerrelse_mm
      )
        advarsler.push(
          `Lag ${i + 1} (${layer.navn ?? 'ukendt'}) kræver et biaksialt geonet med maskestørrelse ≥ ${layer.krav_maskestoerrelse_mm} mm, men '${geonet.navn}' har ${geonet.maskestoerrelse_mm} mm. Vælg et net med større maskestørrelse.`,
        );
    }
  if (lag_mode === '2_lag' && t_uarmeret_mm !== null && t_uarmeret_mm < 600)
    advarsler.push(
      `2 lag geonet er valgt, men den ustabiliserede referenctykkelse er kun ${pythonFixed(t_uarmeret_mm)} mm. 2 lag giver sjældent ekstra fordel ved relativt tynde opbygninger. Overvej om 1 lag er tilstrækkeligt.`,
    );
  if (lag_mode === '1_lag' && t_armeret_mm > 500)
    anbefalinger.push(
      `Den stabiliserede tykkelse er ${pythonFixed(t_armeret_mm)} mm med 1 lag geonet. Med 2 lag geonet kan tykkelsen typisk reduceres yderligere. Skift til '2 lag' og sammenlign resultatet.`,
    );
  if (lag_mode === '2_lag' && t_armeret_mm < 400)
    anbefalinger.push(
      `Den stabiliserede tykkelse er ${pythonFixed(t_armeret_mm)} mm med 2 lag geonet. 1 lag geonet er sandsynligvis tilstrækkeligt for denne belastning. Skift til '1 lag' og sammenlign resultatet.`,
    );
  return output;
}
