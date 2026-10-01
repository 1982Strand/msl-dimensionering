import { defineConfig, devices } from '@playwright/test';

// Egen port pr. worktree (PW_PORT) forhindrer, at parallelle arbejdsmapper tester hinandens app.
// En kørende server genbruges kun med PW_REUSE=1, så en gammel forhåndsvisning ikke testes ved en fejl.
const port = Number(process.env.PW_PORT ?? 5174);
const url = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  retries: 0,
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
