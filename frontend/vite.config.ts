import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = process.env.VITE_BACKEND_URL || "http://backend:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: backendTarget,
        ws: true,
        changeOrigin: true,
      },
      "/meetings": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/visit": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/users": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/cities": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/meeting-rooms": {
        target: backendTarget,
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
