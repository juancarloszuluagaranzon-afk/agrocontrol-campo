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

test("mapa: se pueden conmutar las capas de contexto", async ({ page }) => {
  await page.goto("/mapa");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("button", { name: "Capas del mapa" }).click();
  const redHidrica = page.getByRole("checkbox").first();
  await redHidrica.check();
  await expect(redHidrica).toBeChecked();
});
