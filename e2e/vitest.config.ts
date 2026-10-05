import { defineConfig } from 'vitest/config';

// Playwright owns tests/*.spec.ts; vitest only covers the load script's unit tests.
export default defineConfig({ test: { include: ['load/**/*.test.ts'], testTimeout: 30_000 } });
