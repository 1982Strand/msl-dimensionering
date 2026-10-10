import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  geonetDatabaseRows,
  geonetDatabaseColumns,
  geonetDatabaseNotes,
  geonetDatabaseTitle,
  geonetDatabaseSubtitle,
  geonetDatabaseCaption,
  geonetDatabaseNotesTitle,
} from '../src/engine/geonet-database.ts';
import { defaults } from '../src/engine/data.ts';

const reference = JSON.parse(
  readFileSync(new URL('./cases/pages-cases.json', import.meta.url), 'utf8'),
).geonet_database;
const table = reference.find((event: { type: string }) => event.type === 'dataframe');

// Eneste testnormalisering: pandas-tal og JS-tal/tekst sammenlignes som String.
// Ingen whitespace-, tegn-, procent-, decimal- eller rækkefølgenormalisering.
const normalizeCells = (rows: (string | number)[][]) => rows.map((row) => row.map(String));
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');

test('S1: alle 25 kolonnenavne inkl. linjeskift, 500 celler og hjælpetekster matcher de godkendte forventninger', () => {
  assert.deepEqual(
    geonetDatabaseColumns.map((column) => column.label),
    table.columns,
  );
  assert.equal(geonetDatabaseRows().length, 20);
  assert.deepEqual(normalizeCells(geonetDatabaseRows()), normalizeCells(table.rows));
  assert.deepEqual(
    {
      ...Object.fromEntries(
        geonetDatabaseColumns.map((column) => [column.label, { help: column.help }]),
      ),
      _index: { hidden: true },
    },
    table.column_config,
  );
});

test('S1: sidehoved, produktkort, notehoved og alle fem noters titler/markdown matcher i original rækkefølge', () => {
  // markdown er implementeret i motorens visningsadapter, ikke i denne test.
  const actual = [
    {
      type: 'html',
      value: `<div class="bg-sidehoved"><h1>${geonetDatabaseTitle}</h1><p>${geonetDatabaseSubtitle}</p></div>`,
    },
    {
      type: 'html',
      value: `<div class="bg-kort-hoved"><div class="bg-kort-titel">Produkter</div><div class="bg-kort-note">${geonetDatabaseCaption}</div></div>`,
    },
    {
      type: 'html',
      value: `<div class="bg-underhoved bg-underhoved-skillelinje"><div class="t">${geonetDatabaseNotesTitle}</div><div class="n">${geonetDatabaseNotes.length} noter</div></div>`,
    },
    ...geonetDatabaseNotes.flatMap((note, index) => [
      {
        type: 'html',
        value: `<div class="bg-note-hoved"><div class="bg-note-nr">Note ${index + 1}</div><div class="bg-note-titel">${escapeHtml(note.titel)}</div></div>`,
      },
      { type: 'markdown', value: note.tekst },
    ]),
  ];
  assert.deepEqual(
    actual,
    reference.filter((event: { type: string }) => event.type !== 'dataframe'),
  );
  assert.equal(defaults.GEONET_NOTER[2].tekst, geonetDatabaseNotes[2].tekst + ' ');
});
