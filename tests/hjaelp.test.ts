import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
} from '../src/engine/hjaelp.ts';

const reference = JSON.parse(
  readFileSync(new URL('../reference/pages-cases.json', import.meta.url), 'utf8'),
).hjaelp;
const directory = new URL('../src/content/hjaelp/', import.meta.url);
const chapters = laes_kapitler(
  Object.fromEntries(
    readdirSync(directory)
      .filter((name) => name.endsWith('.md'))
      .map((name) => [name, readFileSync(new URL(name, directory), 'utf8')]),
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

for (const [name, open] of [
  ['default', [HJAELP_STANDARD_KAPITEL]],
  ['all_open', chapters.map((chapter) => chapter.noegle)],
] as const) {
  test(`S2: ${name} matcher originalens viste tekster, HTML-formler, figurer og knapper i rækkefølge`, () => {
    const original = reference[name].filter((event: { type: string }) => event.type !== 'column');
    // Rapportsiden findes i originalen, men afventer implementation i den nye app.
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
  assert.ok(!links.some((link) => link.side === 'rapport'));
});
