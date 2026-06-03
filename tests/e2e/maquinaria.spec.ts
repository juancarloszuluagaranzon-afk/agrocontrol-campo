import { test, expect } from "@playwright/test";

test("maquinaria: crear un equipo lo agrega a la lista y al contador", async ({
  page,
}) => {
  await page.goto("/maquinaria");

  await page.getByRole("button", { name: "Agregar equipo" }).click();

  // Elegir suerte por autocompletar.
  await page.getByLabel("Suerte").fill("3110-090");
  await page.getByRole("button", { name: /3110-090/ }).click();

  // El centroide/hacienda se autocompletan.
  await expect(page.getByText(/NORMANDIA/)).toBeVisible();

  await page.getByLabel("Tipo de máquina").selectOption("Bulldozer");
  await page.getByLabel("Identificación").fill("BD-09");
  await page.getByLabel("Operador").fill("Juan Pérez");
  await page.getByLabel("Labor").selectOption("Nivelación");
  await page.getByLabel("Zona").selectOption("2");

  await page.getByRole("button", { name: "Guardar" }).click();

  // Aparece en la lista y suma al total.
  await expect(page.getByText("BD-09")).toBeVisible();
  await expect(page.getByText("Bulldozer")).toBeVisible();
  await expect(page.getByText("Total: 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Z2: 1", { exact: true })).toBeVisible();
});

test("maquinaria: el historial registra la creación", async ({ page }) => {
  await page.goto("/maquinaria");
  await page.getByRole("button", { name: "Agregar equipo" }).click();
  await page.getByLabel("Suerte").fill("3110-090");
  await page.getByRole("button", { name: /3110-090/ }).click();
  await page.getByLabel("Tipo de máquina").selectOption("Bulldozer");
  await page.getByLabel("Identificación").fill("BD-09");
  await page.getByLabel("Operador").fill("Ana");
  await page.getByLabel("Labor").selectOption("Nivelación");
  await page.getByRole("button", { name: "Guardar" }).click();

  await page.getByRole("button", { name: /Historial/ }).click();
  await expect(page.getByText(/Creó/)).toBeVisible();
});
