import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAGRAM_FILE_FORMAT,
  diagram_file_id,
  diagram_file_name,
  diagram_file_text,
  read_diagram_file,
} from '../src/engine/diagram-file.ts';
import { standard_designdiagrammer } from '../src/engine/editing.ts';

const diagrams = standard_designdiagrammer();
const d4 = diagrams.find((d) => d.diagram_nr === 4)!,
  d5 = diagrams.find((d) => d.diagram_nr === 5)!;
const file = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ ...JSON.parse(diagram_file_text(d4)), ...overrides });
const error = (text: string, target = d4) => {
  const result = read_diagram_file(text, target);
  assert.equal(result.ok, false);
  return (result as { error: string }).error;
};

test('saved diagram file carries a fixed id per diagram and round-trips exactly', () => {
  assert.deepEqual(diagrams.map(diagram_file_id), [
    'msl-designdiagram-1-eo30-klasse1',
    'msl-designdiagram-2-eo45-klasse2',
    'msl-designdiagram-3-eo60-klasse3',
    'msl-designdiagram-4-eo80-klasse4',
    'msl-designdiagram-5-eo120-klasse5',
    'msl-designdiagram-6-eo150-klasse6',
  ]);
  assert.equal(diagram_file_name(d4), 'designdiagram-4.json');
  const saved = JSON.parse(diagram_file_text(d4));
  assert.deepEqual(Object.keys(saved), [
    'format',
    'version',
    'diagram_id',
    'diagram_nr',
    'eo',
    'klasse',
    'rows',
  ]);
  assert.equal(saved.format, DIAGRAM_FILE_FORMAT);
  assert.equal(saved.version, 1);
  for (const d of diagrams)
    assert.deepEqual(read_diagram_file(diagram_file_text(d), d), { ok: true, rows: d.rows });
});

test('edited values, including an extended 2-layer curve, are read back and sorted by Eᵤ', () => {
  const rows = d4.rows.map((r) => (r.eu === 9 ? { ...r, t_2_lag_cm: 55.4 } : { ...r }));
  const result = read_diagram_file(
    '﻿' + file({ rows: [rows[8], ...rows.slice(0, 8), ...rows.slice(9)] }),
    d4,
  );
  assert.deepEqual(result, { ok: true, rows });
});

test('a file from another diagram is rejected', () => {
  assert.equal(
    error(diagram_file_text(d4), d5),
    'Filen er gemt fra diagram 4 og kan kun indlæses i diagram 4. Diagram 5 er valgt.',
  );
  assert.equal(
    error(file({ diagram_id: 'msl-designdiagram-4-eo99-klasse4' })),
    'Filens diagram-id svarer ikke til det valgte diagram. Diagram 4 er valgt.',
  );
  assert.equal(
    error(file({ eo: 120 })),
    'Filens diagramnummer, Eₒ og belastningsklasse svarer ikke til dens id.',
  );
});

test('invalid files are rejected without coercion', () => {
  const row = (r: Record<string, unknown>) => file({ rows: [{ ...d4.rows[0], ...r }] });
  assert.equal(error('{'), 'Filen er ikke gyldig JSON.');
  assert.equal(
    error(JSON.stringify(diagrams)),
    'Filen er ikke en gemt designdiagramfil fra MSL Dimensionering.',
  );
  assert.equal(error(file({ version: 2 })), 'Filens formatversion (2) understøttes ikke.');
  assert.equal(error(file({ rows: [] })), 'Filen indeholder ingen diagramrækker.');
  assert.equal(error(file({ rows: [5] })), 'Række 1 er ugyldig.');
  assert.equal(error(row({ note: 'x' })), 'Række 1 har ukendte felter: note.');
  assert.equal(error(row({ eu: null })), 'Række 1 mangler en gyldig Eᵤ.');
  assert.equal(
    error(row({ t_2_lag_cm: '55.4' })),
    'Række 1 har en ugyldig 2 lag tykkelse. Angiv et tal fra 0 eller null.',
  );
  assert.equal(
    error(row({ t_1_lag_cm: -1 })),
    'Række 1 har en ugyldig 1 lag tykkelse. Angiv et tal fra 0 eller null.',
  );
  assert.equal(error(file({ rows: [d4.rows[0], d4.rows[0]] })), 'Eᵤ 1 MPa findes flere gange.');
});
