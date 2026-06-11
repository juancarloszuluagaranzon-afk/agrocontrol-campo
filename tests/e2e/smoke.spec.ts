import { test, expect } from "@playwright/test";
import { elegirPlanta } from "./setup";

test("la app abre y redirige al Mapa", async ({ page }) => {
  await elegirPlanta(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/mapa$/);
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByPlaceholder("Buscar suerte o hacienda")).toBeVisible();
});

test("planta: la primera vez muestra el selector y al elegir entra al mapa", async ({
  page,
}) => {
  // Sin planta en localStorage: aparece el selector de entrada (§ ADR-0007).
  await page.goto("/mapa");
  await expect(page.getByRole("heading", { name: "Rio Map" })).toBeVisible();
  await expect(page.getByText("Elige tu planta")).toBeVisible();

  // Al elegir Riopaila, se monta el mapa.
  await page.getByRole("button", { name: /Riopaila/ }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByPlaceholder("Buscar suerte o hacienda")).toBeVisible();
});
