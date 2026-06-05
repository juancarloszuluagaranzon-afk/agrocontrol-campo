import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogoSchema, tablonesGeojsonSchema } from "@/domain/suertes/schema";

const DATA = join(process.cwd(), "public", "data");

async function loadJson(name: string): Promise<unknown> {
  return JSON.parse(await readFile(join(DATA, name), "utf-8"));
}

describe("integridad de los datos de tablones (§6)", () => {
  it("el catálogo valida y tiene 1378 tablones", async () => {
    const catalogo = catalogoSchema.parse(
      await loadJson("tablones_catalogo.json"),
    );
    expect(catalogo).toHaveLength(1378);
  });

  it("la capa de tablones valida; 610 suertes y ~5567 ha", async () => {
    const fc = tablonesGeojsonSchema.parse(
      await loadJson("tablones_riopaila.geojson"),
    );
    expect(fc.features).toHaveLength(1378);

    const suertes = new Set(fc.features.map((f) => f.properties.sec_ste));
    expect(suertes.size).toBe(610);

    const totalHa = fc.features.reduce(
      (acc, f) => acc + f.properties.ha_oficial,
      0,
    );
    expect(totalHa).toBeGreaterThan(5500);
    expect(totalHa).toBeLessThan(5600);
  });

  it("las etiquetas de suerte: una por suerte (610), únicas y en el AOI", async () => {
    const fc = (await loadJson("suertes_labels.geojson")) as {
      features: {
        geometry: { coordinates: [number, number] };
        properties: { sec_ste: string; hacienda: string };
      }[];
    };
    expect(fc.features).toHaveLength(610);

    const secs = new Set(fc.features.map((f) => f.properties.sec_ste));
    expect(secs.size).toBe(610); // sin duplicados: una etiqueta por suerte
    expect(secs.has("3111-020")).toBe(true);

    // Todas las coordenadas dentro del área de interés (Valle del Cauca).
    for (const f of fc.features) {
      const [lon, lat] = f.geometry.coordinates;
      expect(lon).toBeGreaterThan(-76.3);
      expect(lon).toBeLessThan(-75.9);
      expect(lat).toBeGreaterThan(4.1);
      expect(lat).toBeLessThan(4.5);
    }
  });

  it("cada tab_id es único y la suerte 3111-020 tiene 5 tablones", async () => {
    const fc = tablonesGeojsonSchema.parse(
      await loadJson("tablones_riopaila.geojson"),
    );
    const ids = new Set(fc.features.map((f) => f.properties.tab_id));
    expect(ids.size).toBe(fc.features.length);

    const t3111 = fc.features.filter(
      (f) => f.properties.sec_ste === "3111-020",
    );
    expect(t3111).toHaveLength(5);
    expect(t3111.every((f) => f.properties.tablon_total === 5)).toBe(true);
  });
});
