/** B-049: ukendte telefonnotationer bevares som indtastet. */
export function formatPhone(value: string): string {
  const compact = value.replaceAll(' ', '');
  if (!/^\+?[0-9]*$/.test(compact)) return value;
  const prefix = compact.startsWith('+') ? '+' : '';
  const digits = prefix ? compact.slice(1) : compact;
  return prefix + (digits.match(/.{1,2}/g)?.join(' ') ?? '');
}
