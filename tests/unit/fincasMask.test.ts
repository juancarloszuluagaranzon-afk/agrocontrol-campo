import { describe, it, expect } from "vitest";
import type { FeatureCollection } from "geojson";
import { buildFincasMask } from "@/lib/geo/fincasMask";

const cuadrado = (x: number, y: number, s = 1): number[][] => [
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

describe("buildFincasMask", () => {
  it("el primer anillo es el exterior; los demás son los tablones como huecos", () => {
    const mask = buildFincasMask(fc, cuadrado(-10, -10, 30));
    const rings = mask.geometry.coordinates;
    // 1 exterior + 1 Polygon + 2 del MultiPolygon = 4 anillos
    expect(rings).toHaveLength(4);
    expect(rings[0]).toEqual(cuadrado(-10, -10, 30));
    expect(rings[1]).toEqual(cuadrado(0, 0));
    expect(rings[2]).toEqual(cuadrado(2, 2));
    expect(rings[3]).toEqual(cuadrado(4, 4));
  });

  it("ignora features sin geometría de área", () => {
    const conPunto: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [0, 0] },
        },
      ],
    };
    const mask = buildFincasMask(conPunto);
    // solo el anillo exterior por defecto, sin huecos
    expect(mask.geometry.coordinates).toHaveLength(1);
  });

  it("usa un anillo exterior por defecto que cubre el AOI del ingenio (~-76,4)", () => {
    const [outer] = buildFincasMask({
      type: "FeatureCollection",
      features: [],
    }).geometry.coordinates;
    // Las esquinas SW y NE encierran el AOI del ingenio (lon −76,1 · lat 4,3).
    expect(outer).toContainEqual([-80, 0]);
    expect(outer).toContainEqual([-72, 8]);
  });
});
