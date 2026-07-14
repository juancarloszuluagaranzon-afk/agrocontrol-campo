import { test, expect } from "@playwright/test";
import { elegirPlanta } from "./setup";

test.beforeEach(async ({ page }) => {
  await elegirPlanta(page); // entra directo al mapa de Riopaila
});

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
  // El área de la suerte completa (maestro), además del área del tablón.
  await expect(panel).toContainText("Área de la suerte");

  // Sección de agronomía del maestro (variedad de la suerte).
  await expect(panel).toContainText("Agronomía");
  await expect(panel).toContainText("CC 05-430");
});

test("mapa: el modo Plano muestra la leyenda de haciendas", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  // La leyenda sólo existe en modo Plano y dentro del panel de Capas.
  await page.getByRole("button", { name: "🗺️ Plano" }).click();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  await page.getByRole("button", { name: /Leyenda/ }).click();
  // Encabezado exacto de la leyenda; "Haciendas (límites)" es otra capa de contexto.
  await expect(page.getByText("Haciendas", { exact: true })).toBeVisible();
  await expect(page.getByText("PERALONSO")).toBeVisible();
});

test("mapa: modo Plano muestra la marca de agua del nombre de hacienda (ADR-0014)", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // Espera a que el mapa termine de montar todas sus capas (map.on("load"))
  // antes de interactuar, para no correr contra el efecto de baseMode a mitad
  // de carga (el propio mapa expone __e2eMap solo en E2E, ver MapView.tsx).
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as { __e2eMap?: unknown }).__e2eMap)),
    )
    .toBe(true);

  await page.getByRole("button", { name: "🗺️ Plano" }).click();

  // La capa se llena de forma asíncrona (fetch del JSON de etiquetas); espera
  // a que la fuente tenga datos y la capa esté visible.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const w = window as unknown as {
            __e2eMap?: {
              querySourceFeatures: (
                id: string,
              ) => { properties: { hacienda: string } }[];
              getLayoutProperty: (id: string, prop: string) => unknown;
            };
          };
          const map = w.__e2eMap;
          if (!map) return null;
          // querySourceFeatures puede repetir features en bordes de tiles
          // internos (comportamiento documentado de MapLibre); deduplica.
          const nombres = new Set(
            map
              .querySourceFeatures("hacienda-label")
              .map((f) => f.properties.hacienda),
          );
          return {
            featureCount: nombres.size,
            visibility: map.getLayoutProperty(
              "hacienda-label-layer",
              "visibility",
            ),
          };
        }),
      { timeout: 10_000 },
    )
    .toMatchObject({ featureCount: 17, visibility: "visible" });

  // Al volver a Satélite, se apaga junto con el color por hacienda.
  await page.getByRole("button", { name: "🛰️ Satélite" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window as unknown as {
          __e2eMap?: { getLayoutProperty: (id: string, p: string) => unknown };
        };
        return w.__e2eMap?.getLayoutProperty(
          "hacienda-label-layer",
          "visibility",
        );
      }),
    )
    .toBe("none");
});

test("mapa: en móvil el buscador y el conmutador no se solapan", async ({
  page,
}) => {
  // Viewport de un teléfono típico de campo.
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  const buscador = page.getByPlaceholder("Buscar suerte o hacienda");
  const base = page.getByRole("button", { name: "🗺️ Plano" });
  await expect(buscador).toBeVisible();
  await expect(base).toBeVisible();

  // El buscador (arriba) y el conmutador (debajo) no deben solaparse.
  const b = await buscador.boundingBox();
  const c = await base.boundingBox();
  expect(b).not.toBeNull();
  expect(c).not.toBeNull();
  if (b && c) expect(c.y).toBeGreaterThanOrEqual(b.y + b.height - 1);

  // El menú de herramientas funciona en pantalla angosta.
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  await expect(page.getByRole("checkbox").first()).toBeVisible();
});

test("mapa: crear un marcador privado lo lista", async ({ page }) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Marcadores", exact: true }).click();
  await page.getByRole("button", { name: /Nuevo marcador/ }).click();
  await page.getByPlaceholder("Nombre del punto").fill("Compuerta dañada");
  await page.getByRole("button", { name: "Guardar aquí" }).click();

  // Vuelve a la lista y aparece el marcador recién creado.
  await expect(
    page.getByRole("button", { name: "Compuerta dañada", exact: true }),
  ).toBeVisible();
});

test("mapa: planilla de lluvia por técnico guarda y acumula", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Lluvia (precipitación)" }).click();

  // Elige el primer técnico → aparecen sus pluviómetros.
  const tecnico = page.getByLabel("Técnico");
  await expect(tecnico.locator("option").nth(1)).toBeAttached();
  await tecnico.selectOption({ index: 1 });

  // Anota los mm del primer pluviómetro de su lista y guarda la planilla.
  const mm = page.locator('input[type="number"]').first();
  await mm.fill("12.5");
  await page.getByRole("button", { name: "Guardar planilla" }).click();

  // El acumulado del mes/año refleja la lectura recién guardada.
  await expect(page.getByText(/mes 12\.5 mm/)).toBeVisible();
});

test("mapa: el reporte de lluvia muestra la tabla y descarga el XLSX", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Reporte de lluvia" }).click();

  // Panel de pantalla completa con la tabla del consolidado (encabezados de semana).
  await expect(page.getByText("Reporte de lluvia")).toBeVisible();
  await expect(page.getByText(/SEMANA \d+/).first()).toBeVisible();
  await expect(page.getByText("RIOPAILA AGRICOLA S.A.")).toBeVisible();

  // Descargar XLSX no rompe la página (se dispara la descarga del archivo).
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar XLSX" }).click();
  const download = await descarga;
  expect(download.suggestedFilename()).toMatch(/^reporte_lluvia_.*\.xlsx$/);

  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});

test("mapa: se pueden conmutar las capas de contexto", async ({ page }) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  const redHidrica = page.getByRole("checkbox").first();
  await redHidrica.check();
  await expect(redHidrica).toBeChecked();
});

test("mapa: la capa de lluvia (gotas) se activa desde Capas sin romper el mapa", async ({
  page,
}) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  // Cualquier usuario enciende la lluvia de hoy desde el panel de Capas.
  const lluvia = page.getByRole("checkbox", {
    name: "Pluviómetros (lluvia hoy)",
  });
  await lluvia.check();
  await expect(lluvia).toBeChecked();
  // El mapa sigue en pie (la capa de gotas no lo desestabiliza).
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});
