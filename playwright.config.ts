import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e — flujos críticos (§11). En Fase 0 solo un smoke test;
 * se ampliará por fase (identificar suerte, medir área, programar equipo).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Margen para el arranque en frío del dev server (Turbopack) y la carga del mapa.
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Puerto 3100 para no chocar con otros dev servers locales en 3000.
    command: "pnpm exec next dev --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
