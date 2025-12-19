import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 80,
    proxy: {
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
      '/meetings': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/visit': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
    coverage: {
      provider: "v8",
    },
  },
});
