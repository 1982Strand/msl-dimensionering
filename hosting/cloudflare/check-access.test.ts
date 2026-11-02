import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requiresCloudflareAccess } from './check-access.ts';

const response = (status: number, location?: string) =>
  new Response(null, { status, headers: location ? { location } : undefined });

test('Access-kontrol godkender 302 og 303 til Cloudflare Access', async () => {
  for (const status of [302, 303])
    assert.equal(
      await requiresCloudflareAccess(async () =>
        response(status, 'https://account.cloudflareaccess.com/cdn-cgi/access/login'),
      ),
      true,
    );
});

test('Access-kontrol afviser 200 og viderestilling til andet værtsnavn', async () => {
  assert.equal(await requiresCloudflareAccess(async () => response(200)), false);
  assert.equal(
    await requiresCloudflareAccess(async () => response(302, 'https://login.example.com/')),
    false,
  );
});

test('Access-kontrol regner en netværksfejl som ikke beskyttet', async () => {
  assert.equal(
    await requiresCloudflareAccess(async () => {
      throw new Error('Netværksfejl');
    }),
    false,
  );
});
