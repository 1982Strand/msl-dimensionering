import { defineConfig, devices } from '@playwright/test';

// Egen port pr. worktree (PW_PORT) forhindrer, at parallelle arbejdsmapper tester hinandens app.
// En kørende server genbruges kun med PW_REUSE=1, så en gammel forhåndsvisning ikke testes ved en fejl.
// Standardporten er ikke den lokale apps 5174: startfilen ville ellers åbne testenes server, der
// lukker, når testene er færdige, hvorefter appen i browseren ikke kan hente billeder og filer.
const port = Number(process.env.PW_PORT ?? 5184);
const url = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  // GitHub-kontrollen (CI) prøver én gang til ved enkeltstående netværksfejl på runneren, fx
  // ERR_NO_BUFFER_SPACE; forløb, der kun består ved gentagelse, rapporteres som »flaky«.
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: url,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 1050 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run preview -- --port ${port}`,
    url,
    reuseExistingServer: process.env.PW_REUSE === '1',
  },
});
