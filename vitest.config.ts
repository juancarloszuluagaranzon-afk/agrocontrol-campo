import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Vitest corre los unit; los e2e son de Playwright.
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["domain/**", "lib/**"],
      reporter: ["text", "html"],
    },
  },
});
