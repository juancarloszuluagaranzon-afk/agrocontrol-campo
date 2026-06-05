import { test, expect } from "@playwright/test";

test("la app abre y redirige al Mapa", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/mapa$/);
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByPlaceholder("Buscar suerte o hacienda")).toBeVisible();
});
