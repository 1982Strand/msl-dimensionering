import { PHI_BASIS, K_PHI } from './data.ts';
import { afrund_phi, normaliser } from './afrunding.ts';
import { beregn_grundlag, type DimensioningInput, type Material } from './dimensionering.ts';
import { pythonFixed } from './python-numbers.ts';

const dk = (n: number, digits: number, signed = false) => {
  const text = pythonFixed(n, digits).replace('.', ',').replace(/^-/, '−');
  return signed && !text.startsWith('−') ? '+' + text : text;
};
const roundingLabels: Record<string, string> = {
  ingen: 'ingen afrunding',
  ned: 'nedrunding til hel grad',
  naermeste: 'afrunding til nærmeste hele grad',
};

export function phiTableData(materials: Material[]) {
  if (!materials.length)
    return {
      tabel_md: '',
      total_v: 0,
      total_bidrag: 0,
      phi_weighted: PHI_BASIS,
      lag_mode_pct: false,
      symbol: 't',
      enhed: 'mm',
    };
  const pct = materials.some((m) => m.pct != null);
  const unit = pct ? '%' : 'mm',
    symbol = pct ? 'p' : 't';
  let total = 0,
    contribution = 0;
  const rows = materials.map((m, i) => {
    const value = (pct ? m.pct : m.tykkelse_mm) || 0;
    const weighted = value * m.phi;
    total += value;
    contribution += weighted;
    return `| ${i + 1} | ${m.navn} | ${pythonFixed(value, 0)} ${unit} | ${dk(m.phi, 1)} | ${dk(weighted, 0)} |`;
  });
  return {
    tabel_md: [
      `| Lag | Materiale | ${pct ? 'Andel' : 'Tykkelse'} | φᵢ (°) | Vægtet bidrag |`,
      '|---|---|---:|---:|---:|',
      ...rows,
    ].join('\n'),
    total_v: total,
    total_bidrag: contribution,
    phi_weighted: total > 0 ? contribution / total : PHI_BASIS,
    lag_mode_pct: pct,
    symbol,
    enhed: unit,
  };
}

export function phiSummary(input: DimensioningInput) {
  const visible = input.tilstand === 'Brugerdefineret' && beregn_grundlag(input).eo !== null;
  if (!visible) return { visible, code: null, factor_html: null, table: null, phi: null };
  const table = phiTableData(input.materialer ?? []);
  const method = normaliser(input.indstillinger?.afrunding).phi_afrunding;
  const before = input.phi_manuel ?? table.phi_weighted;
  const phi = afrund_phi(before, method);
  const correction = K_PHI * (phi - PHI_BASIS);
  const code =
    `φᵥ = Σ(tᵢ × φᵢ) / Σ(tᵢ)\n  = ${dk(table.total_bidrag, 0)} / ${dk(table.total_v, 0)} = ${dk(table.phi_weighted, 2)}°` +
    (Math.abs(phi - before) >= 1e-9 ? `\n  ≈ ${dk(phi, 0)}° (${roundingLabels[method]})` : '');
  // Only generated numbers and fixed markup; material names never enter this HTML.
  const factor_html = `<div class="kob-formel">k<sub>φ</sub> = ${dk(K_PHI, 2)} × (φᵥ − ${PHI_BASIS}°)\n    = ${dk(K_PHI, 2)} × (${dk(phi, 2)} − ${PHI_BASIS})\n    = ${dk(correction, 4, true)} = ${dk(correction * 100, 2, true)} %</div>`;
  return { visible, code, factor_html, table, phi };
}
