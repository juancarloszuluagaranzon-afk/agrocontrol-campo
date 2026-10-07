import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogoSchema, tablonesGeojsonSchema } from "@/domain/suertes/schema";
import { maestroSchema } from "@/domain/maestro/schema";

const DATA = join(process.cwd(), "public", "data");

async function loadJson(name: string): Promise<unknown> {
  return JSON.parse(await readFile(join(DATA, name), "utf-8"));
}

describe("integridad de los datos de Castilla (§ ADR-0007)", () => {
  it("la capa de tablones valida; 2197 tablones / 782 suertes (sep-2026)", async () => {
    const fc = tablonesGeojsonSchema.parse(
      await loadJson("tablones_castilla.geojson"),
    );
    expect(fc.features).toHaveLength(2197);
    const suertes = new Set(fc.features.map((f) => f.properties.sec_ste));
    expect(suertes.size).toBe(782);
    // toda feature trae código y planta de Castilla/Invasión.
    expect(fc.features.every((f) => f.properties.sec_ste.length > 0)).toBe(
      true,
    );
    expect(
      fc.features.every((f) =>
        ["Castilla", "Invasión"].includes(f.properties.planta),
      ),
    ).toBe(true);
  });

  it("el catálogo valida y cuadra con la capa (2197)", async () => {
    const catalogo = catalogoSchema.parse(
      await loadJson("tablones_castilla_catalogo.json"),
    );
    expect(catalogo).toHaveLength(2197);
    const ids = new Set(catalogo.map((c) => c.tab_id));
    expect(ids.size).toBe(catalogo.length); // tab_id único
  });

  // 95 % desde la cartografía de sep-2026: salieron 79 suertes que ya no son
  // caña (sí estaban en el maestro), así que el cruce bajó de 96,2 % a 95,8 %.
  it("el maestro de Castilla cruza ≥ 95% de las suertes", async () => {
    const fc = tablonesGeojsonSchema.parse(
      await loadJson("tablones_castilla.geojson"),
    );
    const maestro = maestroSchema.parse(
      await loadJson("maestro_castilla.json"),
    );
    const suertes = new Set(fc.features.map((f) => f.properties.sec_ste));
    const conDatos = [...suertes].filter((s) => maestro[s]);
    expect(conDatos.length / suertes.size).toBeGreaterThanOrEqual(0.95);
  });
});
