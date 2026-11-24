import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Distinct from the guest suite: only disposable Auth/Firestore emulators,
// and only the loopback Vite dev server. No hosted sign-in or production data.
export default defineConfig({
  testDir: '.',
  testMatch: 'signed-in.ci.mjs',
  timeout: 95_000,
  expect: { timeout: 18_000 },
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3199',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'],
      launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    },
  }],
  webServer: {
    command: 'node server.ts',
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    url: 'http://127.0.0.1:3199/api/health',
    env: {
      NODE_ENV: 'development',
      PORT: '3199',
      DISABLE_HMR: 'true',
      GEMINI_API_KEY: '',
      GOOGLE_CLOUD_PROJECT: 'demo-aldervale-ci',
      FIRESTORE_DATABASE_ID: '(default)',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8088',
      VITE_ALDERVALE_CI_AUTH: 'demo-aldervale-ci',
    },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
