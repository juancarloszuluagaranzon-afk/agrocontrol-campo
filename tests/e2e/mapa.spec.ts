import { test, expect } from "@playwright/test";

test("mapa: buscar una suerte muestra sus atributos oficiales", async ({
  page,
}) => {
  await page.goto("/mapa");

  // El mapa MapLibre se monta.
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // Buscar por código de suerte.
  await page.getByPlaceholder("Buscar suerte o hacienda").fill("3110-090");
  await page.getByRole("button", { name: /3110-090/ }).click();

  // El panel muestra los atributos oficiales (§5).
  const panel = page.getByRole("dialog", { name: /3110-090/ });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("NORMANDIA");
  await expect(panel).toContainText("3,428 ha");
  await expect(panel).toContainText("Andres Felipe Messa");
});

test("mapa: se pueden conmutar las capas de contexto", async ({ page }) => {
  await page.goto("/mapa");
  await page.getByRole("button", { name: /Capas/ }).click();
  const redHidrica = page.getByRole("checkbox").first();
  await redHidrica.check();
  await expect(redHidrica).toBeChecked();
});
