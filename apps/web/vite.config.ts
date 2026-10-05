/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev proxy target is read from the environment; no host is hard-coded in app code.
const apiTarget = process.env.BSBOX_API_TARGET ?? 'http://localhost:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': { target: apiTarget, changeOrigin: true, ws: true } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
