import { test, expect } from "@playwright/test";

test("mapa: buscar una suerte y abrir un tablón muestra sus atributos", async ({
  page,
}) => {
  await page.goto("/mapa");

  // El mapa MapLibre se monta.
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // Buscar por código de suerte → aparecen sus tablones.
  await page.getByPlaceholder("Buscar suerte o hacienda").fill("3111-020");
  await page.getByRole("button", { name: "3111-020-T1" }).click();

  // El panel muestra el tablón con sus atributos oficiales (§5).
  const panel = page.getByRole("dialog", { name: "Tablón 3111-020-T1" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Suerte 3111-020");
  await expect(panel).toContainText("Tablón 1");
  await expect(panel).toContainText("de 5");
  await expect(panel).toContainText("PERALONSO");
});

test("mapa: se pueden conmutar las capas de contexto", async ({ page }) => {
  await page.goto("/mapa");
  await page.getByRole("button", { name: /Capas/ }).click();
  const redHidrica = page.getByRole("checkbox").first();
  await redHidrica.check();
  await expect(redHidrica).toBeChecked();
});
