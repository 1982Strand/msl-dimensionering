import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  changeProfileField,
  defaultProfileState,
  exportCompanyProfile,
  importCompanyProfile,
  logoDataUrl,
  MAX_LOGO_BYTES,
  mergeCompanyProfile,
  PROFILE_LIMITS,
  validateLogo,
  type ProfileLogo,
} from '../src/report/company-profile.ts';
import { DEFAULT_COMPANY_PROFILE } from '../src/report/profile-defaults.ts';
import {
  CompanyProfileStorage,
  PROFILE_STORAGE_KEY,
  type LogoStorage,
} from '../src/report/profile-storage.ts';

const png: ProfileLogo = {
  mime: 'image/png',
  bytes: new Uint8Array(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
      'base64',
    ),
  ),
};
const svg: ProfileLogo = {
  mime: 'image/svg+xml',
  bytes: new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="green"/></svg>',
  ),
};
const jpeg: ProfileLogo = {
  mime: 'image/jpeg',
  bytes: new Uint8Array(
    readFileSync(new URL('../public/report/logo/byggros_logo.jpeg', import.meta.url)),
  ),
};

test('R5 alle talgrænser: yderværdier tillades; fejl beholder den sidst gyldige værdi', () => {
  for (const [field, [min, max]] of Object.entries(PROFILE_LIMITS)) {
    let profile = defaultProfileState().profile;
    for (const value of [min, max, (min + max) / 2]) {
      const result = changeProfileField(profile, field, value);
      assert.equal(result.error, null);
      profile = result.profile;
    }
    for (const value of [min - 0.01, max + 0.01, NaN, Infinity, '', null, String(min)]) {
      const result = changeProfileField(profile, field, value);
      assert.ok(result.error);
      assert.equal(result.profile, profile);
    }
  }
});
test('R5 farver, fonte, sidetal, booleske felter og teksttyper', () => {
  const profile = defaultProfileState().profile;
  for (const [field, valid, invalid] of [
    ['farve', '#aBc012', 'green'],
    ['sidefod_tekstfarve', '#ffffff', '#fff'],
    ['skrift.broedtekst', 'Liberation Sans', 'Arial'],
    ['skrift.sidehoved', 'Carlito', 'Calibri'],
    ['sidetal', 'side-af', 'sider'],
    ['logo_paa_alle_sider', false, 'false'],
    ['overskrifter_i_farve', true, 1],
    ['titel', '', 123],
    ['by', 'Århus', null],
  ] as const) {
    assert.equal(changeProfileField(profile, field, valid).error, null);
    assert.ok(changeProfileField(profile, field, invalid).error);
  }
  assert.ok(changeProfileField(profile, '__proto__', {}).error);
});
test('R5 fletning bevarer standarder, tomme overskrifter, nøgler og rækkefølge', () => {
  const before = JSON.stringify(DEFAULT_COMPANY_PROFILE);
  const last = DEFAULT_COMPANY_PROFILE.afsluttende_afsnit.at(-1)!;
  const profile = mergeCompanyProfile({
    slogan: '',
    margener_mm: { top: 40 },
    afsluttende_afsnit: [{ noegle: last.noegle, titel: '' }],
  });
  assert.equal(profile.slogan, '');
  assert.equal(profile.margener_mm.top, 40);
  assert.equal(profile.margener_mm.bund, DEFAULT_COMPANY_PROFILE.margener_mm.bund);
  assert.deepEqual(profile.afsluttende_afsnit[0], { noegle: last.noegle, titel: '' });
  assert.equal(new Set(profile.afsluttende_afsnit.map((s) => s.noegle)).size, 5);
  assert.throws(() => mergeCompanyProfile({ ukendt: 'x' }), /Ukendt felt/);
  assert.throws(() => mergeCompanyProfile({ skrift: { ukendt: 'x' } }), /Ukendt felt/);
  assert.throws(() => mergeCompanyProfile({ logo_top_mm: 123 }), /fast layoutfelt/);
  assert.throws(() => mergeCompanyProfile(JSON.parse('{"__proto__":{}}')), /Ukendt felt/);
  assert.throws(
    () => mergeCompanyProfile({ afsluttende_afsnit: [{ noegle: 'ukendt', titel: '' }] }),
    /afsnitsnøgle/,
  );
  assert.throws(() => mergeCompanyProfile({ afsluttende_afsnit: [last, last] }), /afsnitsnøgle/);
  assert.deepEqual(mergeCompanyProfile({}), DEFAULT_COMPANY_PROFILE);
  assert.equal(JSON.stringify(DEFAULT_COMPANY_PROFILE), before);
  profile.afsluttende_afsnit[1].titel = 'Isoleret kopi';
  assert.equal(JSON.stringify(DEFAULT_COMPANY_PROFILE), before);
});
test('R5 eksport/import rundtur med PNG, SVG, JPEG og indlejret standardlogo', () => {
  for (const logo of [png, svg, jpeg]) {
    const state = {
      profile: mergeCompanyProfile({ farve: '#123456', margener_mm: { top: 40 } }),
      logo,
    };
    const json = exportCompanyProfile(state);
    assert.ok(json.includes('base64,'));
    assert.deepEqual(importCompanyProfile(json), state);
  }
  const standard = defaultProfileState();
  const exported = exportCompanyProfile(standard, jpeg);
  assert.equal(JSON.parse(exported).logo, logoDataUrl(jpeg));
  assert.deepEqual(importCompanyProfile(exported, jpeg), standard);
  assert.throws(() => importCompanyProfile(exported, png), /standardlogo/);
  assert.equal(standard.profile.overskrifter_i_farve, false);
  assert.equal(standard.profile.sidetal, 'klammer');
  assert.deepEqual(standard.profile, DEFAULT_COMPANY_PROFILE);
});
test('R5 ugyldig import afvises samlet uden mutation af den aktive profil', () => {
  const active = { profile: defaultProfileState().profile, logo: png };
  const before = exportCompanyProfile(active);
  const modify = (fn: (p: ReturnType<typeof JSON.parse>) => void) => {
    const raw = JSON.parse(before);
    fn(raw);
    assert.throws(() => importCompanyProfile(JSON.stringify(raw)), /Firmaprofilen er ugyldig/);
    assert.equal(exportCompanyProfile(active), before);
  };
  modify((p) => {
    p.version = 2;
  });
  modify((p) => {
    p.extra = '';
  });
  modify((p) => {
    p.profile.margener_mm.top = 14;
  });
  modify((p) => {
    p.profile.margener_mm = [];
  });
  modify((p) => {
    p.profile.farve = '#123';
  });
  modify((p) => {
    p.profile.skrift.broedtekst = 'Calibri';
  });
  modify((p) => {
    p.profile.afsluttende_afsnit.pop();
  });
  modify((p) => {
    p.profile.afsluttende_afsnit[0].noegle = 'tekst_oplyste_forudsaetninger';
  });
  modify((p) => {
    p.profile.afsluttende_afsnit[0].extra = '';
  });
  modify((p) => {
    delete p.profile.by;
  });
  for (const logo of [
    'data:image/gif;base64,R0lG',
    'data:image/png;base64,AAAA',
    'data:image/png;base64,***=',
    'data:image/png;base64,AAB=',
    'https://example.org/logo.png',
  ])
    modify((p) => {
      p.logo = logo;
    });
  assert.throws(() => importCompanyProfile('{'), /JSON/);
});
test('R5 logoformat, tomme/afbrudte filer, eksterne SVG-aktiver og størrelsesgrænse', () => {
  for (const logo of [png, svg, jpeg]) assert.doesNotThrow(() => validateLogo(logo));
  assert.doesNotThrow(() =>
    validateLogo({
      ...svg,
      bytes: new TextEncoder().encode(
        `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill='url("#g")'/></svg>`,
      ),
    }),
  );
  assert.throws(() => validateLogo({ ...png, bytes: new Uint8Array() }), /tomt/);
  assert.throws(() => validateLogo({ ...png, bytes: png.bytes.subarray(0, 30) }), /PNG/);
  const corrupt = { ...png, bytes: png.bytes.slice() };
  corrupt.bytes[52] ^= 1;
  assert.throws(() => validateLogo(corrupt), /kontrolsum/);
  assert.throws(() => validateLogo({ ...png, bytes: new Uint8Array(MAX_LOGO_BYTES + 1) }), /2 MB/);
  assert.throws(() => validateLogo({ ...jpeg, bytes: png.bytes }), /JPEG/);
  for (const content of [
    '<svg><image href="https://example.org/a.png"/></svg>',
    '<svg><script>alert(1)</script></svg>',
    '<svg><path style="fill:url(https://example.org)"/></svg>',
  ])
    assert.throws(
      () => validateLogo({ ...svg, bytes: new TextEncoder().encode(content) }),
      /eksterne aktiver/,
    );
  const wrapper = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  const padded = wrapper.replace('</svg>', ' '.repeat(MAX_LOGO_BYTES - wrapper.length) + '</svg>');
  const exact = { ...svg, bytes: new TextEncoder().encode(padded) };
  assert.equal(exact.bytes.length, MAX_LOGO_BYTES);
  assert.doesNotThrow(() => validateLogo(exact));
});

function stores() {
  const values = new Map<string, string>();
  const logos = new Map<string, ProfileLogo>();
  let valuesFail = false,
    logoFail = false;
  const valueStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (valuesFail) throw new Error('quota');
      values.set(key, value);
    },
  };
  const logoStorage: LogoStorage = {
    get: async (r) => logos.get(r),
    put: async (r, l) => {
      if (logoFail) throw new Error('IDB');
      logos.set(r, l);
    },
  };
  return {
    values,
    logos,
    valueStorage,
    logoStorage,
    failValues: () => {
      valuesFail = true;
    },
    failLogo: () => {
      logoFail = true;
    },
  };
}
test('R5 lager: logo bytes ligger alene i IDB; genåbning/import/nulstil er konsistente', async () => {
  const s = stores(),
    storage = new CompanyProfileStorage(s.valueStorage, s.logoStorage);
  const standard = defaultProfileState();
  const state = { profile: mergeCompanyProfile({ by: 'Århus' }), logo: png };
  await storage.save(state);
  assert.ok(!s.values.get(PROFILE_STORAGE_KEY)!.includes('base64'));
  assert.deepEqual(
    (await new CompanyProfileStorage(s.valueStorage, s.logoStorage).load()).state,
    state,
  );
  await storage.save({ ...state, profile: mergeCompanyProfile({ by: 'Aalborg' }) });
  assert.equal(s.logos.size, 1); // Små feltændringer skriver ikke logoet igen.
  await storage.save(importCompanyProfile(exportCompanyProfile(state)));
  await storage.save(standard);
  assert.deepEqual(
    (await new CompanyProfileStorage(s.valueStorage, s.logoStorage).load()).state,
    standard,
  );
});
test('R5 gemmefejl publicerer aldrig profil med manglende logo', async () => {
  for (const kind of ['values', 'logo']) {
    const s = stores(),
      storage = new CompanyProfileStorage(s.valueStorage, s.logoStorage);
    const previous = { profile: mergeCompanyProfile({ by: 'Århus' }), logo: png };
    await storage.save(previous);
    const before = s.values.get(PROFILE_STORAGE_KEY);
    if (kind === 'values') s.failValues();
    else s.failLogo();
    await assert.rejects(
      storage.save({ profile: mergeCompanyProfile({ by: 'København' }), logo: svg }),
      /sidst konsistente/,
    );
    assert.deepEqual(storage.consistent, previous);
    assert.equal(s.values.get(PROFILE_STORAGE_KEY), before);
    assert.deepEqual(
      (await new CompanyProfileStorage(s.valueStorage, s.logoStorage).load()).state,
      previous,
    );
  }
});
test('R5 mistet logorevision genåbner sidste konsistente profil og viser fejl', async () => {
  const s = stores(),
    storage = new CompanyProfileStorage(s.valueStorage, s.logoStorage);
  const previous = { profile: mergeCompanyProfile({ by: 'Århus' }), logo: png };
  await storage.save(previous);
  await storage.save({ profile: mergeCompanyProfile({ by: 'København' }), logo: svg });
  const raw = JSON.parse(s.values.get(PROFILE_STORAGE_KEY)!);
  s.logos.delete(raw.current.logoRevision);
  const reopened = await new CompanyProfileStorage(s.valueStorage, s.logoStorage).load();
  assert.deepEqual(reopened.state, previous);
  assert.match(reopened.error!, /sidst konsistente/);
  s.values.set(PROFILE_STORAGE_KEY, '{');
  const broken = await new CompanyProfileStorage(s.valueStorage, s.logoStorage).load();
  assert.deepEqual(broken.state, defaultProfileState());
  assert.ok(broken.error);
});
