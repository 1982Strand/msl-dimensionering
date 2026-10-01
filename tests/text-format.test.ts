import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseReportText,
  parseTextPieces,
  formatTextSelection,
} from '../src/report/text-format.ts';
import { STANDARD_TEKSTER, SECTION_KEYS } from '../src/report/report-data.ts';

const plain = (text: string) => ({ text, bold: false, italic: false });

test('B-046: punkter og underpunkter med •, - og standardens o', () => {
  const source =
    '- Første\n  • Underpunkt\n    - Tredje niveau\n  o Underpunkt igen\n- Sidste\no Bogstaveligt\n  o Under sidste';
  const lines = parseReportText(source).paragraphs[0].lines;
  assert.deepEqual(
    lines.map((l) => [l.kind, l.depth, l.indent, l.marker]),
    [
      ['bullet', 0, '', '-'],
      ['bullet', 1, '  ', '•'],
      ['bullet', 2, '    ', '-'],
      ['bullet', 1, '  ', 'o'],
      ['bullet', 0, '', '-'],
      ['line', 0, '', null],
      ['bullet', 1, '  ', 'o'],
    ],
  );
  assert.equal(parseReportText('  o Ikke under et punkt').paragraphs[0].lines[0].kind, 'line');
  assert.equal(parseReportText('-uden mellemrum').paragraphs[0].lines[0].kind, 'line');
});

test('B-046: lange punktlinjer forbliver ét punkt med tekststykker til hængende indrykning', () => {
  const long = 'Lang punkttekst '.repeat(40);
  const line = parseReportText(`• ${long}**fed** og *kursiv*`).paragraphs[0].lines[0];
  assert.equal(line.kind, 'bullet');
  assert.deepEqual(line.pieces, [
    plain(long),
    { text: 'fed', bold: true, italic: false },
    plain(' og '),
    { text: 'kursiv', bold: false, italic: true },
  ]);
  assert.deepEqual(parseTextPieces('**fed med *kursiv* indeni**'), [
    { text: 'fed med ', bold: true, italic: false },
    { text: 'kursiv', bold: true, italic: true },
    { text: ' indeni', bold: true, italic: false },
  ]);
});

test('B-046: uafsluttet/ugyldig opmærkning og Typst-specialtegn vises bogstaveligt', () => {
  for (const source of [
    '*åben',
    '**åben',
    '***ugyldig***',
    '****',
    '**forkert *par**',
    '# $ [ ] \\ @ < > #panic("nej")',
  ])
    assert.deepEqual(parseTextPieces(source), [plain(source)]);
  assert.deepEqual(parseTextPieces('**fed** og *åben'), [
    { text: 'fed', bold: true, italic: false },
    plain(' og *åben'),
  ]);
});

test('B-046: standardtekster beholder deres indhold; oplyste forudsætninger har fire punkter og o-underpunkt', () => {
  for (const key of SECTION_KEYS) {
    const formatted = parseReportText(STANDARD_TEKSTER[key]);
    const reconstructed = formatted.paragraphs
      .map((p) =>
        p.lines
          .map(
            (l) =>
              l.indent + (l.marker ? `${l.marker} ` : '') + l.pieces.map((p) => p.text).join(''),
          )
          .join('\n'),
      )
      .join('\n\n');
    assert.equal(reconstructed, STANDARD_TEKSTER[key]);
  }
  const lines = parseReportText(STANDARD_TEKSTER.oplyste_forudsaetninger).paragraphs[0].lines;
  assert.deepEqual(
    lines.map((l) => [l.kind, l.depth]),
    [
      ['bullet', 0],
      ['bullet', 0],
      ['bullet', 0],
      ['bullet', 0],
      ['bullet', 1],
    ],
  );
  assert.equal(lines[4].pieces[0].text, 'Genbrugsstabil');
});

test('B-046: tekst uden opmærkning bevarer præcis tidligere linjer, tomme linjer og indrykning', () => {
  for (const source of [
    'Tekst\n  To mellemrum\n\tTab\n\nNyt afsnit\n\n\nSlut\n',
    '\n',
    '\n\n',
    '  ',
    '  o Almindelig linje',
  ]) {
    const formatted = parseReportText(source);
    assert.equal(
      formatted.paragraphs
        .map((p) => p.lines.map((l) => l.indent + l.pieces.map((p) => p.text).join('')).join('\n'))
        .join('\n\n'),
      source,
    );
    assert.ok(formatted.paragraphs.every((p) => p.lines.every((l) => l.kind === 'line')));
  }
  assert.deepEqual(parseReportText(''), { paragraphs: [] });
});

test('B-046: værktøjer bevarer valgt tekst og indrykning; tom markering placeres inde i opmærkningen', () => {
  assert.deepEqual(formatTextSelection('før valgt efter', 4, 9, 'bold'), {
    value: 'før **valgt** efter',
    start: 6,
    end: 11,
  });
  assert.deepEqual(formatTextSelection('tekst', 2, 2, 'italic'), {
    value: 'te**kst',
    start: 3,
    end: 3,
  });
  assert.deepEqual(formatTextSelection('  a\nb\nc', 2, 6, 'bullet'), {
    value: '  • a\n• b\nc',
    start: 4,
    end: 10,
  });
  assert.deepEqual(formatTextSelection('\na', 0, 0, 'bullet'), {
    value: '• \na',
    start: 2,
    end: 2,
  });
});

test('B-052: Indrykning indsætter et tabulatortegn forrest i de markerede linjer', () => {
  assert.deepEqual(formatTextSelection('• a\n• b\nc', 4, 7, 'indent'), {
    value: '• a\n\t• b\nc',
    start: 5,
    end: 8,
  });
  assert.deepEqual(formatTextSelection('a\nb', 0, 3, 'indent'), {
    value: '\ta\n\tb',
    start: 1,
    end: 5,
  });
  // Et indrykket punkt under et punkt bliver et underpunkt (B-046).
  const lines = parseReportText('• a\n\t• b').paragraphs[0].lines;
  assert.deepEqual(
    lines.map((l) => [l.kind, l.depth]),
    [
      ['bullet', 0],
      ['bullet', 1],
    ],
  );
});
