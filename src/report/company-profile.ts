import { DEFAULT_COMPANY_PROFILE, type CompanyProfile } from './profile-defaults.ts';
export type { CompanyProfile } from './profile-defaults.ts';

export const MAX_LOGO_BYTES = 2_000_000;
export const PROFILE_LIMITS: Readonly<Record<string, readonly [number, number]>> = {
  logo_bredde_mm: [15, 90],
  'skrift.stoerrelse_pt': [9, 13],
  'margener_mm.top': [15, 60],
  'margener_mm.bund': [20, 60],
  'margener_mm.venstre': [10, 40],
  'margener_mm.hoejre': [10, 40],
};
export interface ProfileLogo {
  mime: 'image/png' | 'image/jpeg' | 'image/svg+xml';
  bytes: Uint8Array;
}
export interface ProfileState {
  profile: CompanyProfile;
  logo: ProfileLogo | null;
}
export function defaultProfileState(): ProfileState {
  return { profile: structuredClone(DEFAULT_COMPANY_PROFILE), logo: null };
}
export function profileValue(profile: CompanyProfile, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], profile);
}
const editable = new Set([
  ...Object.keys(PROFILE_LIMITS),
  'logo_paa_alle_sider',
  'slogan',
  'sidefod',
  'farve',
  'sidefod_tekstfarve',
  'overskrifter_i_farve',
  'skrift.broedtekst',
  'skrift.sidehoved',
  'sidetal',
  'titel',
  'by',
]);
export function validateProfileField(path: string, value: unknown): string | null {
  if (!editable.has(path)) return 'Feltet kan ikke ændres i firmaprofilen.';
  const range = PROFILE_LIMITS[path];
  if (range)
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= range[0] &&
      value <= range[1]
      ? null
      : `Angiv en værdi mellem ${range[0]} og ${range[1]}.`;
  if (path === 'farve' || path === 'sidefod_tekstfarve')
    return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
      ? null
      : 'Angiv farven som #RRGGBB.';
  if (path === 'skrift.broedtekst' || path === 'skrift.sidehoved')
    return value === 'Carlito' || value === 'Liberation Sans'
      ? null
      : 'Vælg Carlito eller Liberation Sans.';
  if (path === 'sidetal')
    return value === 'klammer' || value === 'side-af' ? null : 'Vælg [1] eller Side 1 af 3.';
  const standard = profileValue(DEFAULT_COMPANY_PROFILE, path);
  return typeof value === typeof standard
    ? null
    : typeof standard === 'boolean'
      ? 'Vælg til eller fra.'
      : 'Angiv en tekst.';
}
export function changeProfileField(profile: CompanyProfile, path: string, value: unknown) {
  const error = validateProfileField(path, value);
  if (error) return { profile, error };
  const next = structuredClone(profile);
  const parts = path.split('.');
  const last = parts.pop()!;
  const parent = parts.reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], next);
  (parent as Record<string, unknown>)[last] = value;
  return { profile: next, error: null };
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function fail(message: string): never {
  throw new Error(`Firmaprofilen er ugyldig: ${message}`);
}
function keys(value: Record<string, unknown>, allowed: string[], full = false) {
  for (const k of Object.keys(value)) if (!allowed.includes(k)) fail(`Ukendt felt »${k}«.`);
  if (full) for (const k of allowed) if (!Object.hasOwn(value, k)) fail(`Feltet »${k}« mangler.`);
}
/** Delvise gemte profiler flettes i originalstandarden; faste layoutmål kan ikke ændres. */
export function mergeCompanyProfile(saved: unknown, full = false): CompanyProfile {
  if (!object(saved)) fail('Forventede et JSON-objekt.');
  const next = structuredClone(DEFAULT_COMPANY_PROFILE);
  function merge(base: Record<string, unknown>, patch: Record<string, unknown>, prefix = '') {
    keys(patch, Object.keys(base), full);
    for (const [k, value] of Object.entries(patch)) {
      const path = prefix + k;
      if (path === 'afsluttende_afsnit') {
        if (!Array.isArray(value)) fail('Afslutningen skal være en liste.');
        const standard = DEFAULT_COMPANY_PROFILE.afsluttende_afsnit;
        const seen = new Set<string>();
        const sections = value.map((section) => {
          if (!object(section)) fail('Et afsluttende afsnit skal være et objekt.');
          keys(section, ['noegle', 'titel'], true);
          const found = standard.find((s) => s.noegle === section.noegle);
          if (!found || seen.has(found.noegle))
            fail('Afslutningen har en ukendt eller gentaget afsnitsnøgle.');
          if (typeof section.titel !== 'string') fail('Afsnitsoverskriften skal være tekst.');
          seen.add(found.noegle);
          return { noegle: found.noegle, titel: section.titel };
        });
        if (full && sections.length !== standard.length)
          fail('Alle fem afsluttende afsnit skal findes.');
        base[k] = [
          ...sections,
          ...standard.filter((s) => !seen.has(s.noegle)).map((s) => ({ ...s })),
        ];
      } else if (object(base[k])) {
        if (!object(value)) fail(`»${path}« skal være et objekt.`);
        merge(base[k], value, path + '.');
      } else if (editable.has(path)) {
        const error = validateProfileField(path, value);
        if (error) fail(`»${path}«: ${error}`);
        base[k] = value;
      } else if (value !== base[k]) fail(`»${path}« er et fast layoutfelt.`);
    }
  }
  merge(next as unknown as Record<string, unknown>, saved);
  return next;
}

export function validateLogo(logo: ProfileLogo): void {
  const { bytes, mime } = logo;
  if (!(bytes instanceof Uint8Array) || !bytes.length) fail('Logoet er tomt.');
  if (bytes.length > MAX_LOGO_BYTES) fail('Logoet må højst fylde 2 MB.');
  if (mime === 'image/png') {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((b, i) => bytes[i] === b)) fail('Logoet er ikke en PNG-fil.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8,
      header = false,
      data = false,
      end = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      if (offset + length + 12 > bytes.length) fail('PNG-logoet er beskadiget.');
      let crc = 0xffffffff;
      for (const byte of bytes.subarray(offset + 4, offset + 8 + length)) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      if ((crc ^ 0xffffffff) >>> 0 !== view.getUint32(offset + length + 8))
        fail('PNG-logoets kontrolsum er ugyldig.');
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (offset === 8) {
        if (
          type !== 'IHDR' ||
          length !== 13 ||
          !view.getUint32(offset + 8) ||
          !view.getUint32(offset + 12)
        )
          fail('PNG-logoets billedmål mangler.');
        header = true;
      }
      if (type === 'IDAT') data = true;
      offset += length + 12;
      if (type === 'IEND') {
        end = length === 0 && offset === bytes.length;
        break;
      }
    }
    if (!header || !data || !end) fail('PNG-logoet er beskadiget.');
  } else if (mime === 'image/jpeg') {
    if (
      bytes.length < 4 ||
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes[bytes.length - 2] !== 255 ||
      bytes[bytes.length - 1] !== 217
    )
      fail('Logoet er ikke en JPEG-fil.');
    let offset = 2,
      frame = false,
      scan = false;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) fail('JPEG-logoet er beskadiget.');
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      const length = (bytes[offset] << 8) + bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) fail('JPEG-logoet er beskadiget.');
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      ) {
        if (
          length < 8 ||
          !((bytes[offset + 3] << 8) + bytes[offset + 4]) ||
          !((bytes[offset + 5] << 8) + bytes[offset + 6])
        )
          fail('JPEG-logoets billedmål mangler.');
        frame = true;
      }
      if (marker === 0xda) {
        scan = true;
        break;
      }
      offset += length;
    }
    if (!frame || !scan) fail('JPEG-logoets billeddata mangler.');
  } else if (mime === 'image/svg+xml') {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return fail('SVG-logoet skal være gyldig UTF-8.');
    }
    if (
      !/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b[^>]*(?:\/>\s*$|>[\s\S]*<\/svg>\s*$)/i.test(
        text,
      )
    )
      fail('Logoet er ikke en SVG-fil.');
    // Logoer skal være selvstændige: compiler og forhåndsvisning må ikke hente eksterne aktiver.
    const references = [
      ...Array.from(text.matchAll(/(?:href|src)\s*=\s*(["'])(.*?)\1/gi), (m) => m[2]),
      ...Array.from(text.matchAll(/url\(\s*([^)]*)\)/gi), (m) =>
        m[1].trim().replace(/^["']|["']$/g, ''),
      ),
    ];
    if (
      /<(?:script|foreignObject|!DOCTYPE|!ENTITY)\b|\bon\w+\s*=|@import\b/i.test(text) ||
      references.some(
        (reference) => !reference.startsWith('#') && !reference.startsWith('data:image/'),
      )
    )
      fail('SVG-logoet skal være uden scripts og eksterne aktiver.');
    for (const reference of references)
      if (reference.startsWith('data:image/')) parseLogoDataUrl(reference);
    if (
      typeof DOMParser !== 'undefined' &&
      new DOMParser().parseFromString(text, mime).querySelector('parsererror')
    )
      fail('SVG-logoet er beskadiget.');
  } else fail('Vælg et PNG-, JPEG- eller SVG-logo.');
}
export function logoExtension(logo: ProfileLogo): 'png' | 'jpeg' | 'svg' {
  return logo.mime === 'image/png' ? 'png' : logo.mime === 'image/jpeg' ? 'jpeg' : 'svg';
}
export function logoDataUrl(logo: ProfileLogo): string {
  let binary = '';
  for (const byte of logo.bytes) binary += String.fromCharCode(byte);
  return `data:${logo.mime};base64,${btoa(binary)}`;
}
export function parseLogoDataUrl(value: unknown): ProfileLogo {
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_LOGO_BYTES / 3) * 4 + 64)
    fail('Logoet må højst fylde 2 MB.');
  const match = /^data:(image\/(?:png|jpeg|svg\+xml));base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
  if (!match || match[2].length % 4)
    fail('Logoet skal være PNG, JPEG eller SVG med gyldig base64.');
  let binary: string;
  try {
    binary = atob(match[2]);
  } catch {
    return fail('Logoets base64 kunne ikke læses.');
  }
  if (btoa(binary) !== match[2]) fail('Logoets base64 er ugyldig.');
  const logo = {
    mime: match[1] as ProfileLogo['mime'],
    bytes: Uint8Array.from(binary, (c) => c.charCodeAt(0)),
  };
  validateLogo(logo);
  return logo;
}
/** Standardlogoets bytes leveres af aktiverne, så også standardeksporten er én komplet fil. */
export function exportCompanyProfile(state: ProfileState, standardLogo?: ProfileLogo): string {
  const logo = state.logo ?? standardLogo;
  if (!logo) fail('Standardlogoet er endnu ikke indlæst.');
  validateLogo(logo);
  return JSON.stringify(
    {
      version: 1,
      profile: mergeCompanyProfile(state.profile, true),
      logo: logoDataUrl(logo),
      standardLogo: state.logo === null,
    },
    null,
    2,
  );
}
export function importCompanyProfile(json: string, standardLogo?: ProfileLogo): ProfileState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fail('Filen kunne ikke læses som JSON.');
  }
  if (!object(parsed)) fail('Forventede et JSON-objekt.');
  keys(parsed, ['version', 'profile', 'logo', 'standardLogo'], true);
  if (parsed.version !== 1 || typeof parsed.standardLogo !== 'boolean')
    fail('Filens profilversion eller logooplysning er ugyldig.');
  const profile = mergeCompanyProfile(parsed.profile, true);
  const logo = parseLogoDataUrl(parsed.logo);
  if (
    parsed.standardLogo &&
    (!standardLogo ||
      standardLogo.mime !== logo.mime ||
      standardLogo.bytes.length !== logo.bytes.length ||
      !standardLogo.bytes.every((b, i) => b === logo.bytes[i]))
  )
    fail('Filens standardlogo svarer ikke til appens standardlogo.');
  return { profile, logo: parsed.standardLogo ? null : logo };
}
