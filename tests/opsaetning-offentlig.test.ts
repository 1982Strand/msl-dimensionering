import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adgangFraOpsaetning,
  eksporterOpsaetning,
  indlaesOpsaetning,
  INDBYGGET_OPSAETNING,
  oversigtOpsaetning,
  validerOpsaetning,
} from '../src/ui/udgave-opsaetning.ts';
import { standard_indstillinger } from '../src/engine/editing.ts';
import { ACCESS } from '../src/ui/udgaver.ts';

const setup = () => structuredClone(INDBYGGET_OPSAETNING);

test('den indbyggede opsætning er gyldig og giver de nuværende funktioner', () => {
  assert.deepEqual(validerOpsaetning(INDBYGGET_OPSAETNING), {
    ok: true,
    value: INDBYGGET_OPSAETNING,
  });
  assert.deepEqual(adgangFraOpsaetning(INDBYGGET_OPSAETNING), {
    rapport: ACCESS.offentlig.rapport,
    redigerOpslag: ACCESS.offentlig.redigerOpslag,
    redigerMaterialer: ACCESS.offentlig.redigerMaterialer,
    diagramfiler: ACCESS.offentlig.diagramfiler,
  });
});

test('kontrollen afviser forkert format, version og udgave', () => {
  for (const [key, value] of [
    ['format', 'forkert'],
    ['version', 2],
    ['udgave', 'intern'],
  ] as const) {
    const candidate = setup();
    (candidate as unknown as Record<string, unknown>)[key] = value;
    assert.equal(validerOpsaetning(candidate).ok, false, key);
  }
});

test('kontrollen afviser ukendte felter på opsætningens niveauer', () => {
  const top = { ...setup(), ekstra: true };
  const feature = setup() as unknown as Record<string, unknown>;
  feature.funktioner = { ...setup().funktioner, ekstra: true };
  const setting = setup();
  setting.indstillinger = { afrunding: { ukendt: 1 } };
  for (const candidate of [top, feature, setting])
    assert.equal(validerOpsaetning(candidate).ok, false);
});

test('kontrollen afviser manglende og ikke-booleske funktioner', () => {
  const candidate = setup();
  (candidate.funktioner as unknown as Record<string, unknown>).rapport = 'ja';
  assert.equal(validerOpsaetning(candidate).ok, false);
  const missing = setup();
  delete (missing.funktioner as Partial<typeof missing.funktioner>).rapport;
  assert.equal(validerOpsaetning(missing).ok, false);
});

test('kontrollen afviser ukendte og gentagne nøgler i kan_aendres', () => {
  const unknown = setup();
  unknown.kan_aendres = ['ukendt'];
  assert.equal(validerOpsaetning(unknown).ok, false);
  const duplicate = setup();
  duplicate.kan_aendres.push(duplicate.kan_aendres[0]);
  assert.equal(validerOpsaetning(duplicate).ok, false);
});

test('kontrollen afviser ukendte og ikke-normaliserbare indstillinger', () => {
  const unknown = setup();
  unknown.indstillinger = { ekstra: 1 };
  assert.equal(validerOpsaetning(unknown).ok, false);
  const invalid = setup();
  invalid.indstillinger = { opbygning: { enhed: 'meter' } };
  assert.equal(validerOpsaetning(invalid).ok, false);
});

test('ACCESS.offentlig følger funktionerne i den indbyggede opsætning', () => {
  for (const key of ['rapport', 'redigerOpslag', 'redigerMaterialer', 'diagramfiler'] as const)
    assert.equal(ACCESS.offentlig[key], INDBYGGET_OPSAETNING.funktioner[key]);
});

test('eksport af standarden er tom og en afvigende eksport kan indlæses igen', () => {
  assert.deepEqual(eksporterOpsaetning(standard_indstillinger(), setup()).indstillinger, {});
  const current = standard_indstillinger();
  current.afrunding.trin_mm = 10;
  current.opbygning.enhed = 'cm';
  const exported = eksporterOpsaetning(current, setup());
  const checked = validerOpsaetning(exported);
  assert.equal(checked.ok, true);
  if (checked.ok) assert.deepEqual(indlaesOpsaetning(checked.value), current);
});

test('kommandoens logik viser funktioner, felter, afvigelser og fejl uden filskrivning', async () => {
  const { forberedOpsaetning } = await import('../tools/opsaetning-offentlig.ts');
  const candidate = setup();
  candidate.indstillinger = {
    afrunding: { trin_mm: 10 },
    lagfordeling: { minimum_mm: { '1': 205 } },
  };
  const result = forberedOpsaetning(JSON.stringify(candidate));
  assert.match(result.oversigt, /rapport: nej/);
  assert.match(result.oversigt, /Enhed for lagtykkelser/);
  assert.match(result.oversigt, /Oprundingstrin: 50 → 10/);
  assert.match(result.oversigt, /Minimumstykkelse \[mm\] 1: 200 → 205/);
  assert.equal(result.json.endsWith('\n'), true);
  assert.throws(() => forberedOpsaetning('{'), /Filen er ikke gyldig JSON/);
  assert.throws(
    () => forberedOpsaetning(JSON.stringify({ ...candidate, version: 3 })),
    /version skal være 1/,
  );
});
