import { test, expect } from "@playwright/test";
import { elegirPlanta } from "./setup";

// La capa NIR (reflectancia) aparece en el panel Capas y, al encenderla, muestra
// su leyenda "NIR · reflectancia" (no de vigor). Verifica el cableado de la app
// (toggle + leyenda); el raster en sí lo sirve CDSE.
test("NIR: toggle en Capas y leyenda de reflectancia", async ({ page }) => {
  await elegirPlanta(page);
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();

  // El toggle existe (NIR está en NEXT_PUBLIC_SENTINELHUB_LAYERS).
  const toggle = page.getByText("NIR (reflectancia)");
  await expect(toggle).toBeVisible();

  // Al encenderlo, aparece su leyenda de reflectancia (no "vigor").
  await toggle.click();
  await expect(page.getByText("NIR · reflectancia")).toBeVisible();
  await expect(page.getByText("baja", { exact: true })).toBeVisible();
  await expect(page.getByText("alta", { exact: true })).toBeVisible();
});
