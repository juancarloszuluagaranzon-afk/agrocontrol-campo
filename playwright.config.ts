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
    baseURL: "http://localhost:3200",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Puerto 3200 propio: evita choques y SW cacheados de otras apps locales.
    command: "pnpm exec next dev --port 3200",
    url: "http://localhost:3200",
    // No reutilizar: garantiza que el server lleve el bypass de auth e2e.
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_E2E: "1" },
  },
});
