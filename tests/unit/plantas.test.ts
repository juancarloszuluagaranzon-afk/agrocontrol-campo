import { describe, it, expect } from "vitest";
import {
  PLANTAS,
  PLANTA_IDS,
  isPlantaId,
  plantaConfig,
  type PlantaId,
} from "@/lib/plantas";

describe("config de plantas (§ ADR-0007)", () => {
  it("expone Riopaila y Castilla, en ese orden", () => {
    expect(PLANTA_IDS).toEqual(["riopaila", "castilla"]);
  });

  it("cada planta tiene rutas de datos propias y distintas", () => {
    const tablones = PLANTA_IDS.map((id) => PLANTAS[id].tablones);
    const catalogos = PLANTA_IDS.map((id) => PLANTAS[id].catalogo);
    const maestros = PLANTA_IDS.map((id) => PLANTAS[id].maestro);
    // sin colisiones entre plantas
    expect(new Set(tablones).size).toBe(PLANTA_IDS.length);
    expect(new Set(catalogos).size).toBe(PLANTA_IDS.length);
    expect(new Set(maestros).size).toBe(PLANTA_IDS.length);
    for (const id of PLANTA_IDS) {
      const p = PLANTAS[id];
      expect(p.id).toBe(id);
      expect(p.tablones.endsWith(".geojson")).toBe(true);
      expect(p.catalogo.endsWith(".json")).toBe(true);
      expect(p.maestro.endsWith(".json")).toBe(true);
    }
  });

  it("el AOI de cada planta es coherente (zoom dentro de [min,max])", () => {
    for (const id of PLANTA_IDS) {
      const { center, zoom, minZoom, maxZoom } = PLANTAS[id].aoi;
      expect(center).toHaveLength(2);
      expect(minZoom).toBeLessThanOrEqual(zoom);
      expect(zoom).toBeLessThanOrEqual(maxZoom);
      const [lon, lat] = center;
      // Valle del Cauca (ambas empresas): lon ~−76, lat entre 3 y 5.
      expect(lon).toBeGreaterThan(-77);
      expect(lon).toBeLessThan(-76);
      expect(lat).toBeGreaterThan(3);
      expect(lat).toBeLessThan(5);
    }
  });
});

describe("isPlantaId", () => {
  it("acepta solo ids conocidos", () => {
    expect(isPlantaId("riopaila")).toBe(true);
    expect(isPlantaId("castilla")).toBe(true);
    expect(isPlantaId("cauca")).toBe(false);
    expect(isPlantaId(null)).toBe(false);
    expect(isPlantaId(undefined)).toBe(false);
    expect(isPlantaId(42)).toBe(false);
  });
});

describe("plantaConfig", () => {
  it("devuelve la config pedida", () => {
    expect(plantaConfig("castilla").id).toBe("castilla");
  });

  it("respalda en Riopaila ante un id inválido o nulo", () => {
    expect(plantaConfig(null).id).toBe("riopaila");
    expect(plantaConfig("x" as PlantaId).id).toBe("riopaila");
  });
});
