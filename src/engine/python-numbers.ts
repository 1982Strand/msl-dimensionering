/** Python round/fixed formatting use ties-to-even on the actual binary float.
 * Scaling with Math.round changes edge cases such as 2.675 and -0.5.
 */
function decimalInteger(value: number, digits: number): bigint {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, Math.abs(value));
  const bits = view.getBigUint64(0);
  const exponent = Number((bits >> 52n) & 0x7ffn);
  let numerator = bits & ((1n << 52n) - 1n);
  if (exponent !== 0) numerator += 1n << 52n;
  const power = (exponent === 0 ? -1022 : exponent - 1023) - 52;
  let denominator = 1n;
  if (power >= 0) numerator <<= BigInt(power);
  else denominator <<= BigInt(-power);
  if (digits >= 0) numerator *= 10n ** BigInt(digits);
  else denominator *= 10n ** BigInt(-digits);
  let integer = numerator / denominator;
  const rest = numerator % denominator;
  if (rest * 2n > denominator || (rest * 2n === denominator && integer % 2n !== 0n)) integer++;
  return integer;
}

export function pythonRound(value: number, digits = 0): number {
  if (!Number.isInteger(digits)) throw new TypeError('digits must be an integer');
  if (!Number.isFinite(value) || digits > 323) return value;
  if (digits < -308) return value < 0 ? -0 : 0;
  const rounded = Number(`${decimalInteger(value, digits)}e${-digits}`);
  return value < 0 || Object.is(value, -0) ? -rounded : rounded;
}

export function pythonFixed(value: number, digits = 0, grouping = false): string {
  if (!Number.isFinite(value)) return String(value).toLowerCase();
  if (!Number.isInteger(digits) || digits < 0 || digits > 323)
    throw new RangeError('Invalid precision');
  const raw = decimalInteger(value, digits)
    .toString()
    .padStart(digits + 1, '0');
  let integer = digits ? raw.slice(0, -digits) : raw;
  if (grouping) integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (
    (value < 0 || Object.is(value, -0) ? '-' : '') +
    integer +
    (digits ? '.' + raw.slice(-digits) : '')
  );
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const pythonNumber = (value: unknown): value is number | boolean =>
  typeof value === 'number' || typeof value === 'boolean';
