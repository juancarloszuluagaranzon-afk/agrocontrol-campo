import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogoSchema, suertesGeojsonSchema } from "@/domain/suertes/schema";

const DATA = join(process.cwd(), "public", "data");

async function loadJson(name: string): Promise<unknown> {
  return JSON.parse(await readFile(join(DATA, name), "utf-8"));
}

describe("integridad de los datos estáticos (§6)", () => {
  it("el catálogo valida y tiene 610 entradas", async () => {
    const catalogo = catalogoSchema.parse(
      await loadJson("suertes_catalogo.json"),
    );
    expect(catalogo).toHaveLength(610);
  });

  it("la capa de suertes valida y cuadra con los totales oficiales", async () => {
    const fc = suertesGeojsonSchema.parse(
      await loadJson("suertes_riopaila.geojson"),
    );
    expect(fc.features).toHaveLength(610);

    const haciendas = new Set(
      fc.features.map((f) => f.properties.hacienda).filter(Boolean),
    );
    expect(haciendas.size).toBe(17);

    const totalHa = fc.features.reduce(
      (acc, f) => acc + f.properties.ha_oficial,
      0,
    );
    expect(totalHa).toBeCloseTo(2849.12, 1);
  });

  it("todas las suertes tienen sec_ste único", async () => {
    const fc = suertesGeojsonSchema.parse(
      await loadJson("suertes_riopaila.geojson"),
    );
    const codigos = new Set(fc.features.map((f) => f.properties.sec_ste));
    expect(codigos.size).toBe(fc.features.length);
  });
});
