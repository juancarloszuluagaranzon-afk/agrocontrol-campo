import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ZOOM_CAJA_COMPLETA,
  ZOOM_DESCARGA_MAX,
  ZOOM_DESCARGA_MIN,
  cajaDeGeometria,
  cajasDeColeccion,
  latATeselaY,
  lonATeselaX,
  recorteDeMadre,
  teselaDeUrlEsri,
  teselasDeCajas,
  urlTeselaEsri,
  urlsGlifos,
  type Caja,
} from "@/lib/geo/teselas";

describe("teselas: coordenadas", () => {
  it("convierte lon/lat a teselas Web Mercator", () => {
    expect(lonATeselaX(-180, 10)).toBe(0);
    expect(lonATeselaX(0, 10)).toBe(512);
    expect(latATeselaY(0, 10)).toBe(512);
    // Riopaila (4,31° N): un poco al norte del ecuador → y algo menor que la mitad (65.536).
    expect(latATeselaY(4.31, 17)).toBe(63965);
    expect(lonATeselaX(-76.119, 17)).toBe(37821);
  });

  it("lee la caja de un polígono y de un multipolígono", () => {
    expect(
      cajaDeGeometria({
        coordinates: [
          [
            [1, 2],
            [3, 0],
            [2, 5],
          ],
        ],
      }),
    ).toEqual([1, 0, 3, 5]);
    expect(
      cajaDeGeometria({
        coordinates: [[[[-1, -1]]], [[[4, 2]]]],
      }),
    ).toEqual([-1, -1, 4, 2]);
    expect(cajaDeGeometria({ coordinates: [] })).toBeNull();
  });

  it("arma y lee la URL de Esri en orden {z}/{y}/{x}", () => {
    const u = urlTeselaEsri({ z: 17, x: 38440, y: 63283 });
    expect(u).toMatch(/\/tile\/17\/63283\/38440$/);
    expect(teselaDeUrlEsri(u)).toEqual({ z: 17, x: 38440, y: 63283 });
    expect(teselaDeUrlEsri("https://otro.com/x.png")).toBeNull();
  });
});

describe("teselas: lista de descarga", () => {
  const dos: Caja[] = [
    [-76.12, 4.3, -76.119, 4.301],
    [-76.06, 4.25, -76.059, 4.251],
  ];

  it("cubre de zoom mínimo a máximo, sin duplicados y en orden de zoom", () => {
    const ts = teselasDeCajas(dos);
    const zs = ts.map((t) => t.z);
    expect(zs[0]).toBe(ZOOM_DESCARGA_MIN);
    expect(zs.at(-1)).toBe(ZOOM_DESCARGA_MAX);
    expect([...zs].sort((a, b) => a - b)).toEqual(zs);
    const claves = ts.map((t) => `${t.z}/${t.x}/${t.y}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("en zoom alto solo baja alrededor de las suertes, no la caja entera", () => {
    const ts = teselasDeCajas(dos);
    const z = ZOOM_CAJA_COMPLETA + 3;
    const enZ = ts.filter((t) => t.z === z).length;
    const cajaEntera = teselasDeCajas([[-76.12, 4.25, -76.059, 4.301]], z, z);
    expect(enZ).toBeLessThan(cajaEntera.length / 10);
  });

  it("vacía si no hay suertes", () => {
    expect(teselasDeCajas([])).toEqual([]);
  });

  it("Riopaila completa queda en un tamaño razonable (< 8.000 teselas)", () => {
    const fc = JSON.parse(
      readFileSync("public/data/tablones_riopaila.geojson", "utf8"),
    ) as Parameters<typeof cajasDeColeccion>[0];
    const n = teselasDeCajas(cajasDeColeccion(fc)).length;
    expect(n).toBeGreaterThan(3000);
    expect(n).toBeLessThan(8000);
  });
});

describe("teselas: madre para ampliar sin señal", () => {
  it("un nivel arriba: cuadrante de 128 px", () => {
    expect(recorteDeMadre({ z: 19, x: 5, y: 6 }, 1)).toEqual({
      madre: { z: 18, x: 2, y: 3 },
      sx: 128,
      sy: 0,
      lado: 128,
    });
  });

  it("tres niveles arriba: trozo de 32 px en la posición correcta", () => {
    const r = recorteDeMadre({ z: 18, x: 8 * 10 + 7, y: 8 * 4 + 2 }, 3);
    expect(r).toEqual({
      madre: { z: 15, x: 10, y: 4 },
      sx: 7 * 32,
      sy: 2 * 32,
      lado: 32,
    });
  });

  it("rechaza niveles inválidos", () => {
    expect(recorteDeMadre({ z: 2, x: 0, y: 0 }, 0)).toBeNull();
    expect(recorteDeMadre({ z: 2, x: 0, y: 0 }, 3)).toBeNull();
  });
});

describe("teselas: glifos", () => {
  it("incluye el rango latino y la fuente codificada", () => {
    const u = urlsGlifos();
    expect(u).toContain(
      "https://demotiles.maplibre.org/font/Open%20Sans%20Semibold/0-255.pbf",
    );
    expect(u.length).toBeGreaterThanOrEqual(4);
  });
});
