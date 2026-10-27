/** Save and load one design diagram as a JSON file. The browser session is unaffected. */
import type { DesignDiagram, DiagramRow } from './editing.ts';
import { normaliser_diagram_rows } from './editing.ts';
import { isRecord } from './python-numbers.ts';

export const DIAGRAM_FILE_FORMAT = 'msl-dimensionering/designdiagram';
export const DIAGRAM_FILE_VERSION = 1;
const ROW_FIELDS = ['eu', 't_uarmeret_cm', 't_1_lag_cm', 't_2_lag_cm'] as const;
const FIELD_LABELS = {
  eu: 'Eᵤ',
  t_uarmeret_cm: 'ustabiliseret tykkelse',
  t_1_lag_cm: '1 lag tykkelse',
  t_2_lag_cm: '2 lag tykkelse',
};

type DiagramIdentity = Pick<DesignDiagram, 'diagram_nr' | 'eo' | 'klasse'>;
/** Fixed per diagram, so a file only fits the diagram it was saved from. */
export const diagram_file_id = (d: DiagramIdentity) =>
  `msl-designdiagram-${d.diagram_nr}-eo${d.eo}-klasse${d.klasse}`;
export const diagram_file_name = (d: DiagramIdentity) => `designdiagram-${d.diagram_nr}.json`;

export function diagram_file_text(d: DesignDiagram): string {
  const file = {
    format: DIAGRAM_FILE_FORMAT,
    version: DIAGRAM_FILE_VERSION,
    diagram_id: diagram_file_id(d),
    diagram_nr: d.diagram_nr,
    eo: d.eo,
    klasse: d.klasse,
    rows: d.rows.map((r) => Object.fromEntries(ROW_FIELDS.map((k) => [k, r[k]]))),
  };
  return JSON.stringify(file, null, 2) + '\n';
}

export type DiagramFileResult = { ok: true; rows: DiagramRow[] } | { ok: false; error: string };
const fail = (error: string): DiagramFileResult => ({ ok: false, error });

/** Strict reading: any deviation rejects the whole file, and nothing is coerced. */
export function read_diagram_file(text: string, target: DiagramIdentity): DiagramFileResult {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return fail('Filen er ikke gyldig JSON.');
  }
  if (!isRecord(value) || value.format !== DIAGRAM_FILE_FORMAT)
    return fail('Filen er ikke en gemt designdiagramfil fra MSL Dimensionering.');
  if (value.version !== DIAGRAM_FILE_VERSION)
    return fail(`Filens formatversion (${String(value.version)}) understøttes ikke.`);
  const id = diagram_file_id(target);
  if (value.diagram_id !== id) {
    const from =
      typeof value.diagram_nr === 'number' && value.diagram_nr !== target.diagram_nr
        ? `Filen er gemt fra diagram ${value.diagram_nr} og kan kun indlæses i diagram ${value.diagram_nr}.`
        : 'Filens diagram-id svarer ikke til det valgte diagram.';
    return fail(`${from} Diagram ${target.diagram_nr} er valgt.`);
  }
  if (
    value.diagram_nr !== target.diagram_nr ||
    value.eo !== target.eo ||
    value.klasse !== target.klasse
  )
    return fail('Filens diagramnummer, Eₒ og belastningsklasse svarer ikke til dens id.');
  if (!Array.isArray(value.rows) || !value.rows.length)
    return fail('Filen indeholder ingen diagramrækker.');
  for (const [i, row] of value.rows.entries()) {
    const where = `Række ${i + 1}`;
    if (!isRecord(row)) return fail(`${where} er ugyldig.`);
    const unknown = Object.keys(row).filter((k) => !(ROW_FIELDS as readonly string[]).includes(k));
    if (unknown.length) return fail(`${where} har ukendte felter: ${unknown.join(', ')}.`);
    for (const field of ROW_FIELDS) {
      const v = row[field];
      if (v === null && field !== 'eu') continue;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
        return fail(
          field === 'eu'
            ? `${where} mangler en gyldig Eᵤ.`
            : `${where} har en ugyldig ${FIELD_LABELS[field]}. Angiv et tal fra 0 eller null.`,
        );
    }
  }
  const [rows, errors] = normaliser_diagram_rows(value.rows);
  if (errors.length) return fail(errors.join(' '));
  return { ok: true, rows };
}
