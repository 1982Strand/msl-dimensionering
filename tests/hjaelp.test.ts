import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { mpa } from './enhed-mpa.ts';
import {
  laes_kapitler,
  helpViewModel,
  escapeHtml,
  formelHtml,
  formelLinjer,
  KILDEDOKUMENTER,
  HJAELP_ROUTES,
  HJAELP_STANDARD_KAPITEL,
  HJAELP_SIDEHOVED,
  HJAELP_UNDERTEKST,
  HJAELP_INTRO_TITEL,
  HJAELP_INTRO_NOTE,
  HJAELP_INTRO,
  HJAELP_TRIN_TITEL,
  HJAELP_TRIN,
  HJAELP_BEGREBER_TITEL,
  HJAELP_NOEGLEBEGREBER,
  tilpasHjaelpMarkdown,
} from '../src/engine/hjaelp.ts';
import { ACCESS } from '../src/ui/udgaver.ts';
import { hjaelpKontekst } from '../src/ui/hjaelp-kontekst.ts';
import { INDBYGGET_OPSAETNING } from '../src/ui/udgave-opsaetning.ts';
import settingsSchema from '../src/engine/settings-ui.json' with { type: 'json' };

const reference = mpa(
  JSON.parse(readFileSync(new URL('./cases/pages-cases.json', import.meta.url), 'utf8')),
).hjaelp;
const directory = new URL('../src/content/hjaelp/', import.meta.url);
const rawChapters = Object.fromEntries(
  readdirSync(directory)
    .filter((name) => name.endsWith('.md'))
    .map((name) => [name, readFileSync(new URL(name, directory), 'utf8')]),
);
const chapters = laes_kapitler(
  Object.fromEntries(
    Object.entries(rawChapters).map(([filename, raw]) => [
      filename,
      tilpasHjaelpMarkdown(raw, hjaelpKontekst(ACCESS.lokal), filename),
    ]),
  ),
);
type Event = { type: 'html' | 'markdown'; value: string } | { type: 'button'; label: string };

// Adapter kun i testen: visningsmodellens data sættes i originalens HTML-rammer.
// Dermed sammenlignes hele tekst-/knapstrømmen præcist uden et DOM eller CSS.
function originalContent(open: string[], routes: Readonly<Record<string, string>>): Event[] {
  const events: Event[] = [];
  const html = (value: string) => events.push({ type: 'html', value });
  const markdown = (value: string) => events.push({ type: 'markdown', value });
  const button = (label: string) => events.push({ type: 'button', label });
  html(`<div class="bg-sidehoved"><h1>${HJAELP_SIDEHOVED}</h1><p>${HJAELP_UNDERTEKST}</p></div>`);
  html(
    `<div class="bg-kort-hoved"><div class="bg-kort-titel">${HJAELP_INTRO_TITEL}</div><div class="bg-kort-note">${HJAELP_INTRO_NOTE}</div></div>`,
  );
  markdown(HJAELP_INTRO);
  html(
    '<div class="hj-trinblok">' +
      `<div class="hj-trinblok-hoved">${HJAELP_TRIN_TITEL}</div>` +
      HJAELP_TRIN.map(
        (step, i) => `<div class="hj-trin"><span>${i + 1}</span>${escapeHtml(step)}</div>`,
      ).join('') +
      `<div class="hj-fagudtryk-hoved">${HJAELP_BEGREBER_TITEL}</div><div class="hj-fagudtryk">` +
      HJAELP_NOEGLEBEGREBER.map(
        ([name, explanation]) =>
          `<div class="hj-udtryk-post" title="${escapeHtml(explanation)}">${formelHtml(name)}</div>`,
      ).join('') +
      '</div></div>',
  );
  for (const chapter of helpViewModel(chapters, open, routes)) {
    button(chapter.knaptekst);
    html(
      `<div class="hj-kap-hoved${chapter.aaben ? ' hj-kap-aaben' : ''}"><div class="hj-kap-nr">${chapter.nummer}</div><div class="hj-kap-titel">${escapeHtml(chapter.titel)}</div><div class="hj-kap-antal">${chapter.afsnitTal}</div><div class="hj-kap-chevron">▸</div><div class="hj-kap-resume">${escapeHtml(chapter.resume)}</div></div>`,
    );
    if (!chapter.aaben) continue;
    for (const section of chapter.afsnit) {
      html(
        `<div class="hj-afsnit-titel"><span>${escapeHtml(section.nummer)}</span>${escapeHtml(section.titel)}</div>`,
      );
      for (const part of section.indhold) {
        if (!part) continue;
        if (typeof part === 'string') markdown(part);
        else if (part._type === 'Formel') {
          const lines = formelLinjer(part);
          html(
            `<div class="hj-formel"><div class="hj-udtryk">${lines.udtryk.join('<br>')}</div>${lines.hvor.length ? `<div class="hj-hvor">hvor:<br>${lines.hvor.join('<br>')}</div>` : ''}</div>`,
          );
        } else if (part._type === 'Gaatil') button(part.tekst);
        else
          html(
            '<div class="hj-kilder">' +
              part.poster
                .map(
                  (doc) =>
                    `<a class="hj-kilde" href="${escapeHtml(doc.url)}" target="_blank" rel="noopener"><span class="hj-kilde-titel">${escapeHtml(doc.titel)}</span><span class="hj-kilde-note">${escapeHtml([doc.udgiver, doc.dato].filter(Boolean).join(' · '))}</span></a>`,
                )
                .join('') +
              '</div>',
          );
      }
      for (const figure of section.figurer) {
        html(`<div class="hj-figur-nr">${figure.nummerTekst}</div>`);
        markdown(figure.tabel);
        html(`<div class="hj-figur-tekst">${escapeHtml(figure.tekst)}</div>`);
      }
    }
  }
  return events;
}

test('S2: alle otte kapitler matcher parserreferencen præcist inklusive typenavne', () => {
  assert.equal(chapters.length, 8);
  assert.deepEqual(chapters, reference.chapters);
  assert.deepEqual(KILDEDOKUMENTER, reference.kildedokumenter);
});

test('Intro, beregningstrin og nøglebegreber er uændrede', () => {
  const hash = createHash('sha256')
    .update(
      JSON.stringify([
        HJAELP_INTRO_TITEL,
        HJAELP_INTRO_NOTE,
        HJAELP_INTRO,
        HJAELP_TRIN_TITEL,
        HJAELP_TRIN,
        HJAELP_BEGREBER_TITEL,
        HJAELP_NOEGLEBEGREBER,
      ]),
    )
    .digest('hex')
    .toUpperCase();
  assert.equal(hash, '1A84C90A7775FEBAF6592A4D70148E3433B16E114146D8D5593F6769919C3EA9');
});

test('Hjælpens lokale og interne markdown har de oprindelige SHA-256-kontrolsummer', () => {
  const expected: Record<string, string> = {
    '01-beregningsmetoden.md': '5E4C0DB782943E93B2EACB1B9C995314F65CBC31F2CDBF62C5331C4EC6BBE4CF',
    '02-trafikklasse-korrelationen.md':
      '8854D941B7ADD331D3394019114514D78D7B8394C65EF913BD81C5ACCFFC12FD',
    '03-designdiagrammerne.md': '7DC6F847720D1FBE6EDE5401143AEE895ECF6A80B3A26176C02C427416C08BB4',
    '04-materialer-og-friktionsvinkel.md':
      'C17E3B8FB636632A60590C58F5B75DADF30B4A1B3A276D06952817229B20B470',
    '05-geonet-og-effektindeks.md':
      '3CEC6B3520071F46E380A07B8A403A83BE7A2735932A5E7840CC9E10C148F2AE',
    '06-opbygningssoejlerne.md': '3C707135704411923C2671BC490A7B6C0DFF851E0F97F897768844C3D572EFEC',
    '07-datagrundlag-og-forbehold.md':
      '36868C3BD1086DD61695B09DB2FFACDD3B9D84B7ADF1CBA09EC0FD67B190E89D',
    '08-kildedokumenter.md': '917AFF96EA3185BC5E08936BFD52E2C8E6B0E04C174B045BDC29C7C19B9E0491',
  };
  for (const [filename, raw] of Object.entries(rawChapters)) {
    for (const udgave of ['lokal', 'intern'] as const) {
      const context = hjaelpKontekst({ ...ACCESS[udgave], udgave });
      const hash = createHash('sha256')
        .update(tilpasHjaelpMarkdown(raw, context, filename))
        .digest('hex')
        .toUpperCase();
      assert.equal(hash, expected[filename], `${udgave}: ${filename}`);
    }
  }
});

test('Offentlig hjælp følger den indbyggede opsætning og en alternativ opsætning', () => {
  const kapitel6 = (context: ReturnType<typeof hjaelpKontekst>) =>
    tilpasHjaelpMarkdown(
      rawChapters['06-opbygningssoejlerne.md'],
      context,
      '06-opbygningssoejlerne.md',
    );
  const publicText = kapitel6(hjaelpKontekst(ACCESS.offentlig));
  assert.doesNotMatch(
    publicText,
    /fire fordelinger|\*\*Proportionalt\.\*\*|Øverste lag fastholdt|standardtrinnet på 50 mm|Under Indstillinger/,
  );
  assert.match(publicText, /\| 5 \| 270 \|/);
  assert.match(publicText, /laveste af de to belastningsklasser/);
  assert.match(publicText, /oprundes til indbygningstrinnet på 10 mm/);
  assert.match(
    publicText,
    /Eksemplerne i resten af kapitlet er regnet med appens standardindstillinger/,
  );
  // Figur 6.4–6.5 om VD's mindste lagtykkelse er skjult; de følgende figurer nummereres om.
  assert.match(publicText, /Figur 6\.4 viser reglen for en indtastet opbygning/);
  assert.match(publicText, /Figur 6\.5 og Figur 6\.6 viser betydningen/);

  const opsaetning = structuredClone(INDBYGGET_OPSAETNING);
  opsaetning.indstillinger = {
    afrunding: { trin_mm: 50 },
    lagfordeling: { fordeling: 'fastholdt', restlag: 'vd', kraev_bundsikring: true },
  };
  const changed = kapitel6(hjaelpKontekst(ACCESS.offentlig, opsaetning));
  assert.match(changed, /Det øverste lag har præcis den indtastede tykkelse/);
  assert.match(changed, /\| Øverste lag fastholdt \| 300 \| 200 \|/);
  assert.doesNotMatch(changed, /\| Proportionalt \|/);
  assert.doesNotMatch(changed, /Eksemplerne i resten af kapitlet/);
  assert.match(changed, /Der kræves altid et bundsikringslag/);
  assert.match(changed, /Den mindste\nlagtykkelse fremgår af Figur 6\.4\./);
  assert.match(changed, /Figur 6\.5 viser reglen for en indtastet opbygning/);
});

/** Alle værdier for hver opmærket indstilling, én ad gangen, plus de kombinationer, hvor
 * betingelserne afhænger af hinanden. */
function hjaelpVarianter() {
  const keys = new Set<string>();
  for (const raw of Object.values(rawChapters))
    for (const match of raw.matchAll(/(?:valgbar|fast|valg)\s+([^\s>]+)/g))
      for (const condition of match[1].split('&')) keys.add(condition.split('=')[0]);
  const felter = new Map<
    string,
    { path: string[]; kind?: string; options?: { value: unknown }[] }
  >();
  for (const section of settingsSchema.sections)
    for (const field of section.fields ?? []) felter.set(field.key, field);
  const varianter: Record<string, unknown>[] = [];
  const saet = (target: Record<string, unknown>, path: string[], value: unknown) => {
    let node = target;
    for (const part of path.slice(0, -1)) node = (node[part] ??= {}) as Record<string, unknown>;
    node[path.at(-1)!] = value;
    return target;
  };
  for (const key of keys) {
    const field = felter.get(key);
    if (!field) continue;
    const values = field.options
      ? field.options.map((option) => option.value)
      : field.kind === 'checkbox'
        ? [true, false]
        : [];
    for (const value of values) varianter.push(saet({}, field.path, value));
  }
  const lf = (lagfordeling: Record<string, unknown>) => ({ lagfordeling });
  varianter.push(
    lf({ restlag: 'vd', kraev_bundsikring: true }),
    lf({ restlag: 'vd', kraev_bundsikring: false }),
    lf({ restlag: 'flet', fordeling: 'fastholdt' }),
    lf({ samlet_minimum: false, standard_under_minimum: 'stabilgrus' }),
    lf({ samlet_minimum: false, standard_under_minimum: 'loeft' }),
    lf({ samlet_minimum: false, standard_under_minimum: 'ubundet' }),
    lf({ standard_klassisk: true, netplacering: 'laggraense_min' }),
    { yderomraade: { tolerance_over_pct: 10, over_uden: 'vejdim', under_uden: 'laveste' } },
  );
  return varianter;
}

test('Offentlig hjælp er velformet for alle værdier af de opmærkede indstillinger', () => {
  const varianter = hjaelpVarianter();
  assert.ok(varianter.length > 40, String(varianter.length));
  for (const indstillinger of varianter) {
    const opsaetning = { ...structuredClone(INDBYGGET_OPSAETNING), indstillinger };
    const context = hjaelpKontekst(ACCESS.offentlig, opsaetning);
    for (const [filename, raw] of Object.entries(rawChapters)) {
      const navn = `${filename} ${JSON.stringify(indstillinger)}`;
      const tekst = tilpasHjaelpMarkdown(raw, context, filename);
      const fund = (regex: RegExp, text: string) => regex.exec(text)?.[0];
      assert.equal(fund(/\{\{|<!--|^:::(?:vis|slutvis)/m, tekst), undefined, navn);
      assert.equal(fund(/\n\n\n|[ \t]$/m, tekst), undefined, navn);
      // Formler, tabeller og kildelister har kolonner med flere mellemrum og symboler som
      // t_lav,armeret; de kontrolleres ikke som løbende tekst.
      const udenFormler = tekst.replace(/^:::\w+[^\n]*\n[\s\S]*?^:::$/gm, '');
      assert.equal(fund(/\S {2,}\S/, udenFormler), undefined, navn);
      // Komma direkte foran et ord; symboler som Eₒ,ækv er undtaget.
      assert.equal(fund(/[a-zæøå],[a-zæøåA-ZÆØÅ]/, udenFormler), undefined, navn);
      const figurer = (tekst.match(/^:::figur/gm) ?? []).length;
      const nummer = Number(filename.slice(0, 2));
      for (const match of tekst.matchAll(/Figur (\d+)\.(\d+)/g)) {
        // »Figur 6.5« i håndbogen er Vejdirektoratets nummer, ikke hjælpens.
        if (
          match.index &&
          /håndbog|Materialer i $/.test(tekst.slice(match.index - 40, match.index))
        )
          continue;
        assert.equal(Number(match[1]), nummer, `${navn}: ${match[0]}`);
        assert.ok(Number(match[2]) <= figurer, `${navn}: ${match[0]}`);
      }
    }
  }
});

test('Hjælpens opmærkning afviser ukendte nøgler og ubalancerede blokke', () => {
  const context = hjaelpKontekst(ACCESS.offentlig);
  assert.throws(
    () => tilpasHjaelpMarkdown(':::vis valgbar ukendt\nx\n:::slutvis', context, 'kapitel.md'),
    /kapitel\.md:1/,
  );
  assert.throws(
    () =>
      tilpasHjaelpMarkdown(
        ':::vis valg ind_lf_fordeling=ukendt\nx\n:::slutvis',
        context,
        'kapitel.md',
      ),
    /kapitel\.md:1/,
  );
  assert.throws(
    () =>
      tilpasHjaelpMarkdown('<!-- vis valgbar ukendt -->x<!-- slutvis -->', context, 'kapitel.md'),
    /kapitel\.md:1/,
  );
  assert.throws(
    () =>
      tilpasHjaelpMarkdown(
        ':::vis fast ind_lf_fordeling=ukendt\nx\n:::slutvis',
        context,
        'kapitel.md',
      ),
    /kapitel\.md:1/,
  );
  assert.throws(
    () => tilpasHjaelpMarkdown(':::vis valgbar ind_lf_fordeling\nx', context, 'kapitel.md'),
    /kapitel\.md:2/,
  );
});

test('Offentlig hjælp viser ingen valgsætninger for faste indstillinger', () => {
  const context = hjaelpKontekst(ACCESS.offentlig);
  const publicText = Object.entries(rawChapters)
    .map(([filename, raw]) => tilpasHjaelpMarkdown(raw, context, filename))
    .join('\n');
  const godkendteUndtagelser = [
    'Under Indstillinger, afsnittet Visualisering, kan påskriften og signaturforklaringen fravælges hver for sig.',
    'Både stregen og målet kan fravælges under Indstillinger, afsnittet Visualisering.',
    'Den beregnede lagtykkelse kan anføres i parentes efter den oprundede;',
  ];
  const fundne = [
    ...publicText.matchAll(
      /(?:[^.]*\bkan\b[^.]*\bIndstillinger\b[^.]*\.|[^.]*\bIndstillinger\b[^.]*\bkan\b[^.]*\.)/giu,
    ),
  ].map((match) => match[0].trim());
  for (const sentence of fundne) {
    const normaliseret = sentence.replace(/\s+/g, ' ');
    assert.ok(
      godkendteUndtagelser.some((approved) => normaliseret.includes(approved)),
      sentence,
    );
  }
  assert.equal(fundne.length, godkendteUndtagelser.length);
});

for (const [name, open] of [
  ['default', [HJAELP_STANDARD_KAPITEL]],
  ['all_open', chapters.map((chapter) => chapter.noegle)],
] as const) {
  test(`S2: ${name} matcher originalens viste tekster, HTML-formler, figurer og knapper i rækkefølge`, () => {
    const original = reference[name].filter((event: { type: string }) => event.type !== 'column');
    // Rapportsiden findes nu også i den nye app (R4/B-036).
    const originalRoutes = { ...HJAELP_ROUTES, rapport: '#rapport' };
    assert.deepEqual(originalContent([...open], originalRoutes), original);
    const hiddenLabels = new Set(
      chapters.flatMap((chapter) =>
        chapter.afsnit.flatMap((section) =>
          section.indhold.flatMap((part) =>
            typeof part !== 'string' && part._type === 'Gaatil' && !HJAELP_ROUTES[part.side]
              ? [part.tekst]
              : [],
          ),
        ),
      ),
    );
    assert.deepEqual(
      originalContent([...open], HJAELP_ROUTES),
      original.filter((event: Event) => event.type !== 'button' || !hiddenLabels.has(event.label)),
    );
  });
}

test('S2: eksisterende ruter og skjulte ukendte sider følger B-036', () => {
  const view = helpViewModel(
    chapters,
    chapters.map((chapter) => chapter.noegle),
  );
  const links = view.flatMap((chapter) =>
    chapter.afsnit.flatMap((section) =>
      section.indhold.flatMap((part) =>
        part && typeof part !== 'string' && part._type === 'Gaatil' ? [part] : [],
      ),
    ),
  );
  for (const link of links) assert.equal(link.href, HJAELP_ROUTES[link.side]);
  assert.ok(links.some((link) => link.href === '#vejdim'));
  assert.ok(links.some((link) => link.href === '#geonet-database'));
  // Originalens otte kapitler har ingen rapport-Gaatil; ruten findes som i originalens
  // sideliste, så en genvej til Rapport virker (B-036).
  assert.equal(HJAELP_ROUTES.rapport, '#rapport');
});
