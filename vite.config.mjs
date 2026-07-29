import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/test/setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      "final-group/e2e/**",
      "final-group/src/firebase/firestore.rules.test.ts",
    ],
    environmentOptions: {
      jsdom: { url: "http://localhost/" },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    proxy: {
      "/api": "http://localhost:3001",
    },
    warmup: {
      clientFiles: ["./src/main.tsx"],
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        bai5: resolve(import.meta.dirname, "bai-5/index.html"),
        finalGroup: resolve(import.meta.dirname, "final-group/index.html"),
      },
    },
  },
});
