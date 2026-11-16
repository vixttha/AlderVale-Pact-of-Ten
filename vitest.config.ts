import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'firestore.rules.test.ts'],
    reporters: process.env.CI ? ['verbose'] : ['default'],
    // Standalone Agent SDK packages use their own Node test runner.
    exclude: [...configDefaults.exclude, 'agents/**'],
  },
});
