import { describe, it, expect } from "vitest";
import type { FeatureCollection, Position } from "geojson";
import { buildFincasMask } from "@/lib/geo/fincasMask";

const cuadrado = (x: number, y: number, s = 1): Position[] => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
  [x, y],
];

const fc: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [cuadrado(0, 0)] },
    },
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [[cuadrado(2, 2)], [cuadrado(4, 4)]],
      },
    },
  ],
};

/** Todos los anillos de tablón (huecos) que aparecen en el MultiPolygon. */
function allHoles(coords: Position[][][]): Position[][] {
  return coords.flatMap((poly) => poly.slice(1));
}

describe("buildFincasMask", () => {
  it("devuelve un MultiPolygon: marco + celdas de la rejilla", () => {
    const mask = buildFincasMask(fc, cuadrado(-10, -10, 30), 2);
    expect(mask.geometry.type).toBe("MultiPolygon");
    const polys = mask.geometry.coordinates;
    // 1 marco + grid*grid celdas (2x2 = 4)
    expect(polys).toHaveLength(1 + 4);
    // el marco: exterior grande + bbox como hueco
    expect(polys[0]?.[0]).toEqual(cuadrado(-10, -10, 30));
    expect(polys[0]).toHaveLength(2);
  });

  it("cada tablón aparece como hueco en alguna celda", () => {
    const mask = buildFincasMask(fc, cuadrado(-10, -10, 30), 2);
    const holes = allHoles(mask.geometry.coordinates);
    for (const t of [cuadrado(0, 0), cuadrado(2, 2), cuadrado(4, 4)]) {
      expect(holes).toContainEqual(t);
    }
  });

  it("ninguna celda excede ~500 anillos (límite de MapLibre)", () => {
    // 60 tablones dispersos → con rejilla ninguna celda debe acercarse al tope.
    const features = Array.from({ length: 60 }, (_, i) => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [cuadrado((i % 10) * 2, Math.floor(i / 10) * 2, 0.5)],
      },
    }));
    const mask = buildFincasMask(
      { type: "FeatureCollection", features },
      undefined,
      4,
    );
    for (const poly of mask.geometry.coordinates) {
      expect(poly.length).toBeLessThan(500);
    }
  });

  it("sin tablones: solo el velo exterior (una celda, sin huecos)", () => {
    const mask = buildFincasMask({ type: "FeatureCollection", features: [] });
    expect(mask.geometry.coordinates).toHaveLength(1);
    expect(mask.geometry.coordinates[0]).toHaveLength(1); // solo el anillo exterior
  });

  it("usa un anillo exterior por defecto que cubre el AOI del ingenio (~-76,4)", () => {
    const [outer] = buildFincasMask({
      type: "FeatureCollection",
      features: [],
    }).geometry.coordinates[0]!;
    expect(outer).toContainEqual([-80, 0]);
    expect(outer).toContainEqual([-72, 8]);
  });
});
