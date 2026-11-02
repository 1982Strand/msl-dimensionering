import { defineConfig, devices } from '@playwright/test';

// Egen port pr. worktree (PW_PORT) forhindrer, at parallelle arbejdsmapper tester hinandens app.
// Hver udgave bruger sin egen port fra PW_PORT og op, så parallelle arbejdsmapper skal have
// mindst 3 porte imellem sig.
// En kørende server genbruges kun med PW_REUSE=1, så en gammel forhåndsvisning ikke testes ved en fejl.
// Standardporten er ikke den lokale apps 5174: startfilen ville ellers åbne testenes server, der
// lukker, når testene er færdige, hvorefter appen i browseren ikke kan hente billeder og filer.
const port = Number(process.env.PW_PORT ?? 5184);

// Den lokale udgave bygges af `npm run build` til dist; de to andre af `npm run build:udgaver`.
// Udgavernes egne tests følger navnet udgave-<udgave>-*.spec.ts.
const udgaver = [
  { name: 'lokal', dir: 'dist', port },
  { name: 'intern', dir: 'dist-intern', port: port + 1 },
  { name: 'offentlig', dir: 'dist-offentlig', port: port + 2 },
];
const url = (port: number) => `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  // GitHub-kontrollen (CI) prøver én gang til ved enkeltstående netværksfejl på runneren, fx
  // ERR_NO_BUFFER_SPACE; forløb, der kun består ved gentagelse, rapporteres som »flaky«.
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 1050 },
    trace: 'retain-on-failure',
  },
  projects: udgaver.map((udgave) => ({
    name: udgave.name,
    use: { baseURL: url(udgave.port) },
    ...(udgave.name === 'lokal'
      ? { testIgnore: /udgave-[^/\\]+\.spec\.ts$/ }
      : { testMatch: new RegExp(`udgave-${udgave.name}(-[^/\\\\]+)?\\.spec\\.ts$`) }),
  })),
  webServer: udgaver.map((udgave) => ({
    command: `npm run preview -- --outDir ${udgave.dir} --port ${udgave.port}`,
    url: url(udgave.port),
    reuseExistingServer: process.env.PW_REUSE === '1',
  })),
});
