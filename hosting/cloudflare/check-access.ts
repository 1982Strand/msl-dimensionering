import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const INTERNAL_URL = 'https://msl-dimensionering.msl-dimensionering.workers.dev/';

export async function requiresCloudflareAccess(
  fetcher: typeof fetch = fetch,
  address = INTERNAL_URL,
): Promise<boolean> {
  // En netværksfejl tæller som »ikke beskyttet«: så bygges den interne udgave uden kartotek.
  let response: Response;
  try {
    response = await fetcher(address, { redirect: 'manual' });
  } catch {
    return false;
  }
  if (response.status !== 302 && response.status !== 303) return false;
  const location = response.headers.get('location');
  if (!location) return false;
  try {
    return new URL(location, address).hostname.toLowerCase().endsWith('.cloudflareaccess.com');
  } catch {
    return false;
  }
}

async function main() {
  const enabled = await requiresCloudflareAccess();
  const output = process.env.GITHUB_OUTPUT;
  if (output) await appendFile(output, `enabled=${enabled}\n`);
  else console.log(String(enabled));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
