import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "http://backend:8000",
        ws: true,
        changeOrigin: true,
      },
      "/meetings": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/visit": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/users": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/cities": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/meeting-rooms": {
        target: "http://backend:8000",
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
