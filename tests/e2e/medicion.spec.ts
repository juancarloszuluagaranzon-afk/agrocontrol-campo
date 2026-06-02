import { test, expect } from "@playwright/test";

test.describe("GPS", () => {
  test.use({
    geolocation: { latitude: 4.31, longitude: -76.119 },
    permissions: ["geolocation"],
  });

  test("activar 'Mi ubicación' muestra la precisión", async ({ page }) => {
    await page.goto("/mapa");
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await page.getByRole("button", { name: "Activar mi ubicación" }).click();
    // Aparece la precisión y el botón pasa a modo "centrar".
    await expect(page.getByText(/±\s/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Centrar en mi ubicación" }),
    ).toBeVisible();
  });
});

test("medir área: marcar vértices calcula hectáreas", async ({ page }) => {
  await page.goto("/mapa");
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();

  // Esperar a que el mapa cargue y enganche los handlers de click.
  await page.waitForTimeout(3000);

  await page.getByRole("button", { name: "Medir", exact: true }).click();
  await page.getByRole("button", { name: "Medir área" }).click();

  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // Triángulo de tres toques distintos (mouse absoluto + pausa amplia).
  for (const [dx, dy] of [
    [-70, 40],
    [70, 40],
    [0, -70],
  ] as const) {
    await page.mouse.click(cx + dx, cy + dy);
    await page.waitForTimeout(450);
  }

  // El panel de medición muestra un área en hectáreas (patrón numérico es-CO).
  const panel = page.getByRole("status").filter({ hasText: "Medir área" });
  await expect(panel).not.toContainText("Marca al menos");
  await expect(panel).toContainText(/\d+,\d+\s*ha/);
});
