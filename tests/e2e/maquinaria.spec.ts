import { test, expect } from "@playwright/test";

test("maquinaria: crear un equipo (por tablón) lo agrega a la lista y al contador", async ({
  page,
}) => {
  await page.goto("/maquinaria");

  await page.getByRole("button", { name: "Agregar equipo" }).click();

  // Elegir tablón por autocompletar.
  await page.getByLabel("Tablón").fill("3111-020");
  await page.getByRole("button", { name: "3111-020-T1" }).click();

  // La hacienda/centroide se autocompletan desde el tablón.
  await expect(page.getByText(/PERALONSO/)).toBeVisible();

  await page.getByLabel("Tipo de máquina").selectOption("Bulldozer");
  await page.getByLabel("Identificación").fill("BD-09");
  await page.getByLabel("Operador").fill("Juan Pérez");
  await page.getByLabel("Labor").selectOption("Nivelación");
  await page.getByLabel("Zona").selectOption("2");

  await page.getByRole("button", { name: "Guardar" }).click();

  // Aparece en la lista (con su tablón) y suma al total.
  await expect(page.getByText("BD-09")).toBeVisible();
  await expect(page.getByText("3111-020-T1")).toBeVisible();
  await expect(page.getByText("Total: 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Z2: 1", { exact: true })).toBeVisible();
});

test("maquinaria: el historial registra la creación", async ({ page }) => {
  await page.goto("/maquinaria");
  await page.getByRole("button", { name: "Agregar equipo" }).click();
  await page.getByLabel("Tablón").fill("3111-020");
  await page.getByRole("button", { name: "3111-020-T1" }).click();
  await page.getByLabel("Tipo de máquina").selectOption("Bulldozer");
  await page.getByLabel("Identificación").fill("BD-09");
  await page.getByLabel("Operador").fill("Ana");
  await page.getByLabel("Labor").selectOption("Nivelación");
  await page.getByRole("button", { name: "Guardar" }).click();

  await page.getByRole("button", { name: /Historial/ }).click();
  await expect(page.getByText(/Creó/)).toBeVisible();
});
