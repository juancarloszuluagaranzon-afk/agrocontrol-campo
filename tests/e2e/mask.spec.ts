import { test, expect } from "@playwright/test";
import { elegirPlanta } from "./setup";

// Verificación de la máscara raster "solo nuestras fincas" (ADR-0023): con un
// índice encendido, Peralonso (tablones más chicos, antes tapados por el velo)
// debe mostrar el índice como el resto. Captura para revisión visual.
test("máscara: EVI se recorta a las fincas (incluida Peralonso)", async ({
  page,
}) => {
  await elegirPlanta(page); // Riopaila, directo al mapa
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // Espera a que el mapa monte todas sus capas.
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Boolean((window as { __e2eMap?: unknown }).__e2eMap),
        ),
      { timeout: 20000 },
    )
    .toBe(true);

  // Encender EVI: Herramientas → Capas → checkbox EVI.
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  await page.getByText("EVI (vigor)").click();

  // La máscara raster debe existir y quedar visible al encender el índice. Es la
  // regresión clave: con la máscara vectorial anterior se descartaban huecos
  // (>500 anillos) y Peralonso quedaba sin recorte; la imagen no tiene ese tope.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window as {
          __e2eMap?: {
            getLayer: (id: string) => unknown;
            getSource: (id: string) => { type?: string } | undefined;
            getLayoutProperty: (id: string, p: string) => unknown;
          };
        };
        const m = w.__e2eMap;
        if (!m || !m.getLayer("fincas-mask")) return "sin-capa";
        if (m.getSource("fincas-mask")?.type !== "image") return "no-raster";
        return m.getLayoutProperty("fincas-mask", "visibility");
      }),
    )
    .toBe("visible");
});
