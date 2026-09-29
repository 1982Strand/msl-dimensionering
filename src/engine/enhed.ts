import { pythonFixed } from './python-numbers.ts';
export const STANDARD_ENHED = 'mm';
export const normaliser = (enhed: unknown): 'mm' | 'cm' => (enhed === 'cm' ? 'cm' : 'mm');
export function tal(v_mm: number | null, enhed = 'mm', decimaler = 0): string {
  if (v_mm === null) return '—';
  let v = v_mm;
  if (normaliser(enhed) === 'cm') {
    v /= 10;
    decimaler++;
  }
  let [integer, decimal = ''] = pythonFixed(v, decimaler, true).split('.');
  if (normaliser(enhed) === 'cm') decimal = decimal.replace(/0+$/, '');
  let output = integer.replaceAll(',', '.') + (decimal ? ',' + decimal : '');
  if (output === '-0' || output === '−0') output = '0';
  return output.startsWith('-') ? '−' + output.slice(1) : output;
}
export const laengde = (v_mm: number | null, enhed = 'mm', decimaler = 0): string =>
  v_mm === null ? '—' : `${tal(v_mm, enhed, decimaler)} ${normaliser(enhed)}`;
export function fortegn(v_mm: number, enhed = 'mm', decimaler = 0): string {
  let s = tal(v_mm, enhed, decimaler);
  if (!s.startsWith('−') && s !== '0') s = '+' + s;
  return `${s} ${normaliser(enhed)}`;
}
export function konverter_tekst(tekst: string, enhed: string): string {
  if (normaliser(enhed) === 'mm' || !tekst) return tekst;
  return tekst.replace(
    /(?<![\d,.])(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))? mm\b/g,
    (_match, integer: string, decimal?: string) =>
      laengde(
        Number(integer.replaceAll('.', '') + (decimal ? '.' + decimal : '')),
        enhed,
        decimal?.length ?? 0,
      ),
  );
}
