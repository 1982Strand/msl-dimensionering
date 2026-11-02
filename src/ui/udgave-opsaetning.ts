import schema from '../engine/settings-ui.json' with { type: 'json' };
import builtIn from './opsaetning-offentlig.json' with { type: 'json' };
import { equalData, normaliser_indstillinger, standard_indstillinger } from '../engine/editing.ts';
import type { Access } from './udgaver.ts';

export interface OpsaetningOffentlig {
  format: 'msl-udgaveopsaetning';
  version: 1;
  udgave: 'offentlig';
  funktioner: {
    rapport: boolean;
    redigerOpslag: boolean;
    redigerMaterialer: boolean;
    diagramfiler: boolean;
  };
  kan_aendres: string[];
  indstillinger: Record<string, unknown>;
}

export interface Opsaetningsfelt {
  key: string;
  path: string[];
  label: string;
}

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function settingsFields(): Opsaetningsfelt[] {
  const fields: Opsaetningsfelt[] = [];
  for (const section of schema.sections) {
    for (const field of section.fields ?? [])
      fields.push({ key: field.key, path: field.path, label: field.label });
    if (section.minimumTable)
      fields.push({
        key: section.minimumTable.key,
        path: section.minimumTable.path,
        label: section.minimumTable.columns.at(-1) ?? section.minimumTable.key,
      });
  }
  return fields;
}

export const OPSAETNINGSFELTER = settingsFields();
export const OPSAETNINGSFELT_MAP = new Map(OPSAETNINGSFELTER.map((field) => [field.key, field]));
export const INDBYGGET_OPSAETNING = builtIn as OpsaetningOffentlig;

function assertKeys(value: RecordValue, allowed: string[], label: string) {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) throw new Error(`Ukendt felt i ${label}: ${unknown}.`);
}

function assertSettingsKeys(value: unknown, standard: unknown, path: string[] = []) {
  if (!isRecord(value)) return;
  if (!isRecord(standard))
    throw new Error(`Indstillingen ${path.join('.')} kan ikke være et objekt.`);
  for (const [key, child] of Object.entries(value)) {
    if (!Object.hasOwn(standard, key))
      throw new Error(`Ukendt indstilling: ${[...path, key].join('.')}.`);
    assertSettingsKeys(child, standard[key], [...path, key]);
  }
}

function mergeObjects(base: unknown, patch: unknown): unknown {
  if (!isRecord(patch)) return structuredClone(patch);
  const result: RecordValue = isRecord(base) ? structuredClone(base) : {};
  for (const [key, value] of Object.entries(patch))
    result[key] = isRecord(value) ? mergeObjects(result[key], value) : structuredClone(value);
  return result;
}

function savedSubset(saved: unknown, normalised: unknown): boolean {
  if (isRecord(saved) && isRecord(normalised))
    return Object.keys(saved).every(
      (key) => Object.hasOwn(normalised, key) && savedSubset(saved[key], normalised[key]),
    );
  return equalData(saved, normalised);
}

export function validerOpsaetning(
  value: unknown,
): { ok: true; value: OpsaetningOffentlig } | { ok: false; fejl: string } {
  try {
    if (!isRecord(value)) throw new Error('Opsætningen skal være et JSON-objekt.');
    assertKeys(
      value,
      ['format', 'version', 'udgave', 'funktioner', 'kan_aendres', 'indstillinger'],
      'opsætningen',
    );
    if (value.format !== 'msl-udgaveopsaetning')
      throw new Error('Opsætningens format er ugyldigt.');
    if (value.version !== 1) throw new Error('Opsætningens version skal være 1.');
    if (value.udgave !== 'offentlig')
      throw new Error('Opsætningen skal gælde den offentlige udgave.');
    if (!isRecord(value.funktioner)) throw new Error('Funktionerne skal være et objekt.');
    const funktioner = value.funktioner;
    const functionKeys = ['rapport', 'redigerOpslag', 'redigerMaterialer', 'diagramfiler'];
    assertKeys(value.funktioner, functionKeys, 'funktionerne');
    for (const key of functionKeys)
      if (typeof funktioner[key] !== 'boolean')
        throw new Error(`Funktionen ${key} skal være boolesk.`);
    if (
      !Array.isArray(value.kan_aendres) ||
      value.kan_aendres.some((key) => typeof key !== 'string')
    )
      throw new Error('kan_aendres skal være en liste af indstillingsnøgler.');
    const seen = new Set<string>();
    for (const key of value.kan_aendres as string[]) {
      if (!OPSAETNINGSFELT_MAP.has(key))
        throw new Error(`Ukendt indstillingsnøgle i kan_aendres: ${key}.`);
      if (seen.has(key))
        throw new Error(`Indstillingsnøglen står flere gange i kan_aendres: ${key}.`);
      seen.add(key);
    }
    if (!isRecord(value.indstillinger)) throw new Error('indstillinger skal være et objekt.');
    const standard = standard_indstillinger();
    assertSettingsKeys(value.indstillinger, standard);
    const merged = mergeObjects(standard, value.indstillinger);
    const normalised = normaliser_indstillinger(merged);
    if (!savedSubset(merged, normalised))
      throw new Error('En eller flere indstillinger ændres ved normalisering og kan ikke bruges.');
    return {
      ok: true,
      value: {
        format: 'msl-udgaveopsaetning',
        version: 1,
        udgave: 'offentlig',
        funktioner: Object.fromEntries(
          functionKeys.map((key) => [key, funktioner[key]]),
        ) as OpsaetningOffentlig['funktioner'],
        kan_aendres: [...value.kan_aendres] as string[],
        indstillinger: structuredClone(value.indstillinger),
      },
    };
  } catch (error) {
    return { ok: false, fejl: error instanceof Error ? error.message : 'Opsætningen er ugyldig.' };
  }
}

export const indlaesOpsaetning = (configuration: OpsaetningOffentlig) =>
  normaliser_indstillinger(mergeObjects(standard_indstillinger(), configuration.indstillinger));

export function adgangFraOpsaetning(
  configuration: OpsaetningOffentlig,
): Pick<Access, 'rapport' | 'redigerOpslag' | 'redigerMaterialer' | 'diagramfiler'> {
  return { ...configuration.funktioner };
}

function difference(value: unknown, standard: unknown): unknown {
  if (isRecord(value) && isRecord(standard)) {
    const result: RecordValue = {};
    for (const [key, child] of Object.entries(value)) {
      const changed = difference(child, standard[key]);
      if (changed !== undefined) result[key] = changed;
    }
    return Object.keys(result).length ? result : undefined;
  }
  return equalData(value, standard) ? undefined : structuredClone(value);
}

function changedLeaves(
  value: unknown,
  standard: unknown,
  path: string[] = [],
): { path: string[]; before: unknown; after: unknown }[] {
  if (isRecord(value) && isRecord(standard))
    return [...new Set([...Object.keys(value), ...Object.keys(standard)])].flatMap((key) =>
      changedLeaves(value[key], standard[key], [...path, key]),
    );
  return equalData(value, standard) ? [] : [{ path, before: standard, after: value }];
}

function shownValue(value: unknown) {
  return typeof value === 'string'
    ? value
    : typeof value === 'boolean'
      ? value
        ? 'ja'
        : 'nej'
      : JSON.stringify(value);
}

export function eksporterOpsaetning(
  indstillinger: unknown,
  base: OpsaetningOffentlig,
): OpsaetningOffentlig {
  const checked = validerOpsaetning(base);
  if (!checked.ok) throw new Error(checked.fejl);
  return {
    ...checked.value,
    indstillinger: (difference(normaliser_indstillinger(indstillinger), standard_indstillinger()) ??
      {}) as Record<string, unknown>,
  };
}

export function oversigtOpsaetning(value: unknown): string {
  const checked = validerOpsaetning(value);
  if (!checked.ok) throw new Error(checked.fejl);
  const config = checked.value;
  const lines = ['Funktioner:'];
  for (const [key, enabled] of Object.entries(config.funktioner))
    lines.push(`- ${key}: ${enabled ? 'ja' : 'nej'}`);
  lines.push('Kan ændres:');
  for (const key of config.kan_aendres) lines.push(`- ${OPSAETNINGSFELT_MAP.get(key)!.label}`);
  const standard = standard_indstillinger();
  const settings = indlaesOpsaetning(config);
  for (const change of changedLeaves(settings, standard)) {
    const field = OPSAETNINGSFELTER.filter(
      (candidate) =>
        candidate.path.length <= change.path.length &&
        candidate.path.every((part, index) => change.path[index] === part),
    ).sort((a, b) => b.path.length - a.path.length)[0];
    const label = field
      ? `${field.label}${change.path.length > field.path.length ? ` ${change.path.slice(field.path.length).join(' ')}` : ''}`
      : change.path.join('.');
    lines.push(`${label}: ${shownValue(change.before)} → ${shownValue(change.after)}`);
  }
  return lines.join('\n');
}
