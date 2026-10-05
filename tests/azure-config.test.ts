import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// B-075: den delte udgave i Azure kræver login og invitation for hele appen.
const config = JSON.parse(
  readFileSync(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8'),
);

test('B-075/B-076: hele appen kræver rollen »medarbejder« eller »admin«; kun »Ingen adgang« er åben', () => {
  const routes: { route: string; allowedRoles?: string[]; statusCode?: number }[] = config.routes;
  const all = routes.findIndex((r) => r.route === '/*');
  assert.ok(all >= 0, 'mangler /*');
  assert.deepEqual(routes[all].allowedRoles, ['medarbejder', 'admin']);
  // Reglerne læses i rækkefølge; kun undtagelser må stå før /*.
  const before = routes.slice(0, all);
  assert.deepEqual(
    before.filter((r) => r.allowedRoles?.includes('anonymous')).map((r) => r.route),
    ['/ingen-adgang.html'],
  );
  assert.ok(routes.some((r) => r.route === '/.auth/login/github' && r.statusCode === 404));
  assert.equal(routes.length, all + 1, 'ingen regler efter /*');
});

test('B-075: ikke-logget-ind sendes til Microsoft-login; uden rolle vises »Ingen adgang«', () => {
  assert.equal(config.responseOverrides['401'].statusCode, 302);
  assert.match(config.responseOverrides['401'].redirect, /^\/\.auth\/login\/aad\b/);
  assert.equal(config.responseOverrides['403'].rewrite, '/ingen-adgang.html');
  // Appen bruger #-adresser; der må ikke være en navigationFallback, der gør ukendte stier til appen.
  assert.equal(config.navigationFallback, undefined);
  assert.equal(config.mimeTypes['.wasm'], 'application/wasm');
});

test('B-075: kun felter, som Azures skema tillader (ellers afvises udrulningen)', () => {
  const allowed = new Set([
    'routes',
    'navigationFallback',
    'responseOverrides',
    'globalHeaders',
    'mimeTypes',
    'auth',
    'networking',
    'forwardingGateway',
    'platform',
    'trailingSlash',
  ]);
  for (const key of Object.keys(config)) assert.ok(allowed.has(key), `ikke tilladt: ${key}`);
});
