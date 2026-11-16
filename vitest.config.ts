import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Standalone Agent SDK packages use their own Node test runner.
    exclude: [...configDefaults.exclude, 'agents/**'],
  },
});
