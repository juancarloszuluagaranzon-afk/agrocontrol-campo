import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { edadSuerteMeses, maestroSchema } from "@/domain/maestro/schema";
import { catalogoSchema } from "@/domain/suertes/schema";

describe("edadSuerteMeses (igual que el maestro)", () => {
  const hoy = new Date(2026, 5, 9); // 2026-06-09 (mes 0-indexado)

  it("usa la siembra cuando el último corte es anterior (caña planta)", () => {
    // 3111-020: siembra 31/07/2025, corte 05/06/2025 (anterior) → ref = siembra.
    const edad = edadSuerteMeses(
      {
        variedad: "CC 05-430",
        fecha_siembra: "2025-07-31",
        fecha_ultimo_corte: "2025-06-05",
      },
      hoy,
    );
    expect(edad).toBeCloseTo(10.3, 1); // ≈ edad_csv 10.25
  });

  it("usa el último corte cuando es posterior a la siembra", () => {
    const edad = edadSuerteMeses(
      {
        variedad: "CC 05-430",
        fecha_siembra: "2022-02-26",
        fecha_ultimo_corte: "2026-04-17",
      },
      hoy,
    );
    expect(edad).toBeCloseTo(1.7, 1);
  });

  it("variedad RENOVACIÓN ⇒ 0", () => {
    expect(
      edadSuerteMeses(
        {
          variedad: "RENOVACION",
          fecha_siembra: "2020-01-01",
          fecha_ultimo_corte: null,
        },
        hoy,
      ),
    ).toBe(0);
  });

  it("sin fechas ⇒ 0", () => {
    expect(
      edadSuerteMeses(
        { variedad: "CC", fecha_siembra: null, fecha_ultimo_corte: null },
        hoy,
      ),
    ).toBe(0);
  });
});

describe("integridad del maestro (§5)", () => {
  it("valida y cruza con la cartografía", async () => {
    const dir = join(process.cwd(), "public", "data");
    const maestro = maestroSchema.parse(
      JSON.parse(await readFile(join(dir, "maestro_suertes.json"), "utf-8")),
    );
    const catalogo = catalogoSchema.parse(
      JSON.parse(await readFile(join(dir, "tablones_catalogo.json"), "utf-8")),
    );

    const claves = Object.keys(maestro);
    expect(claves.length).toBeGreaterThan(590); // ~604 de 610 suertes

    // Toda clave del maestro existe como suerte en la cartografía.
    const suertes = new Set(catalogo.map((c) => c.sec_ste));
    for (const k of claves) expect(suertes.has(k)).toBe(true);

    // Ejemplo conocido con datos.
    const ej = maestro["3104-123"];
    expect(ej?.variedad).toBeTruthy();
    expect(ej?.numero_corte).toBeGreaterThan(0);
  });
});
