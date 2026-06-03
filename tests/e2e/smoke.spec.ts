import { test, expect } from "@playwright/test";

test("la app abre y redirige a la pestaña Mapa", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/mapa$/);
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByPlaceholder("Buscar suerte o hacienda")).toBeVisible();
});

test("se puede navegar a la pestaña Maquinaria", async ({ page }) => {
  await page.goto("/mapa");
  await page.getByRole("link", { name: "Maquinaria" }).click();
  await expect(page).toHaveURL(/\/maquinaria$/);
  await expect(
    page.getByRole("button", { name: "Agregar equipo" }),
  ).toBeVisible();
});
