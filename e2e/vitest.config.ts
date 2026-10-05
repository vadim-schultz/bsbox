import { defineConfig } from 'vitest/config';

// Playwright owns tests/*.spec.ts; vitest covers unit tests of the load script and the demo.
export default defineConfig({
  test: { include: ['load/**/*.test.ts', 'demo/**/*.test.ts'], testTimeout: 30_000 },
});
