import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  polygonAreaHa,
  polygonPerimeterM,
  lineLengthM,
  geometryAreaHa,
  type LngLat,
} from "@/lib/geo/measure";
import { errorRelativoPct } from "@/lib/geo/format";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";

describe("medición geodésica básica", () => {
  it("área de un cuadrado de ~1 km de lado ≈ 100 ha", () => {
    // ~0.008983° lat ≈ 1 km; en lon a 4.3° lat es similar.
    const d = 0.008983;
    const ring: LngLat[] = [
      [-76.1, 4.3],
      [-76.1 + d, 4.3],
      [-76.1 + d, 4.3 + d],
      [-76.1, 4.3 + d],
    ];
    expect(polygonAreaHa(ring)).toBeGreaterThan(98);
    expect(polygonAreaHa(ring)).toBeLessThan(102);
  });

  it("devuelve 0 con vértices insuficientes", () => {
    expect(polygonAreaHa([[-76.1, 4.3]])).toBe(0);
    expect(lineLengthM([[-76.1, 4.3]])).toBe(0);
  });

  it("el perímetro del cuadrado ≈ 4 km", () => {
    const d = 0.008983;
    const ring: LngLat[] = [
      [-76.1, 4.3],
      [-76.1 + d, 4.3],
      [-76.1 + d, 4.3 + d],
      [-76.1, 4.3 + d],
    ];
    const p = polygonPerimeterM(ring);
    expect(p).toBeGreaterThan(3900);
    expect(p).toBeLessThan(4100);
  });
});

describe("validación contra áreas oficiales de tablones (DoD < 5%)", () => {
  it("el área geodésica de cada tablón se aproxima a ha_oficial (mediana < 5%)", async () => {
    const raw = await readFile(
      join(process.cwd(), "public", "data", "tablones_riopaila.geojson"),
      "utf-8",
    );
    const fc = JSON.parse(raw) as FeatureCollection<
      Polygon | MultiPolygon,
      { tab_id: string; ha_oficial: number }
    >;

    const errores: number[] = [];
    for (const f of fc.features) {
      if (!f.properties.ha_oficial) continue;
      const calc = geometryAreaHa(f.geometry);
      errores.push(errorRelativoPct(calc, f.properties.ha_oficial));
    }

    errores.sort((a, b) => a - b);
    const mediana = errores[Math.floor(errores.length / 2)];

    expect(errores.length).toBeGreaterThan(1300);
    // El área es geodésica vs la oficial declarada: la mediana debe ser pequeña.
    expect(mediana).toBeLessThan(5);
  });
});
