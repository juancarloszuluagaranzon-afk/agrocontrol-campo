import { test, expect } from "@playwright/test";
import { elegirPlanta } from "./setup";

/**
 * "Mapa sin señal" (ADR-0036): el panel calcula las teselas de la planta, las
 * descarga al caché propio con progreso, se puede detener (lo bajado queda) y
 * borrar. Las descargas se simulan (solo las peticiones marcadas de descarga;
 * el mapa sigue usando la red normal).
 */
test("descargar, detener y borrar el mapa sin señal", async ({ page }) => {
  await elegirPlanta(page);
  await page.route(/riomap-descarga=1/, async (route) => {
    await new Promise((r) => setTimeout(r, 15));
    await route.fulfill({
      status: 200,
      contentType: "image/jpeg",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
  });

  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Mapa sin señal" }).click();

  const panel = page.getByRole("region", { name: "Mapa sin señal" });
  await expect(panel.getByText(/teselas · ≈ \d+ MB/)).toBeVisible({
    timeout: 30_000,
  });
  const estado = panel.getByTestId("mapa-offline-estado");
  await expect(estado).toHaveText("Aún no está descargado.");

  await panel.getByRole("button", { name: "Descargar" }).click();
  const barra = panel.getByRole("progressbar");
  await expect(barra).toBeVisible();
  await expect
    .poll(async () => Number(await barra.getAttribute("aria-valuenow")))
    .toBeGreaterThan(30);

  await panel.getByRole("button", { name: "Cancelar" }).click();
  await expect(panel.getByText(/Descarga detenida/)).toBeVisible();
  await expect(estado).toContainText("Descargado el");
  await expect(panel.getByRole("button", { name: "Completar" })).toBeVisible();

  await panel.getByRole("button", { name: "Borrar" }).click();
  await expect(estado).toHaveText("Aún no está descargado.");
});
