import { test, expect } from "@playwright/test";
import { elegirPlanta } from "./setup";

test("Halloween: calabaza y franja naranja solo en temporada, solo en la cabecera", async ({
  page,
}) => {
  await elegirPlanta(page);
  await page.clock.setFixedTime(new Date(2026, 9, 20, 10, 0, 0));
  await page.goto("/mapa");
  const cabecera = page.locator("header");
  await expect(cabecera.getByText("🎃")).toBeVisible();
  await expect(page.getByTestId("franja-halloween")).toBeVisible();

  await page.clock.setFixedTime(new Date(2026, 10, 5, 10, 0, 0));
  await page.reload();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(cabecera.getByText("🎃")).toHaveCount(0);
  await expect(page.getByTestId("franja-halloween")).toHaveCount(0);
});

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

test("login: '¿Olvidaste tu contraseña?' muestra el formulario de recuperación (ADR-0030)", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();

  await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page.getByText("Recuperar contraseña")).toBeVisible();
  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enviar enlace" }),
  ).toBeVisible();

  // Vuelve al login sin perder la pantalla.
  await page.getByRole("button", { name: "Volver a entrar" }).click();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("restablecer: sin sesión ni código, el enlace se reporta inválido (ADR-0030)", async ({
  page,
}) => {
  await page.goto("/restablecer");
  await expect(page.getByText("Nueva contraseña")).toBeVisible();
  // Sin sesión de recuperación ni ?code=, tras la verificación muestra el aviso.
  await expect(page.getByText(/no es válido o ya venció/)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByRole("button", { name: "Ir a entrar" })).toBeVisible();
});
