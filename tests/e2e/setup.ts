import type { Page } from "@playwright/test";

/**
 * Pre-selecciona la planta en localStorage antes de cargar la app, para que los
 * e2e que prueban el mapa entren directo (sin pasar por el selector de planta,
 * § ADR-0007). Debe llamarse antes de `page.goto`. El formato es el de
 * zustand-persist: `{ state: { planta }, version: 0 }`.
 */
export async function elegirPlanta(
  page: Page,
  planta: "riopaila" | "castilla" = "riopaila",
): Promise<void> {
  await page.addInitScript((p) => {
    localStorage.setItem(
      "agrocontrol-planta",
      JSON.stringify({ state: { planta: p }, version: 0 }),
    );
  }, planta);
}
