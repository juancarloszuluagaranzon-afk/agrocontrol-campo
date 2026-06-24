import { describe, it, expect } from "vitest";
import {
  parseGpts,
  parseGeoRef,
  gptsToImageCoordinates,
  gptsToBounds,
  pageToLonLat,
} from "@/lib/geo/geopdf";

// Fragmento real de 3104-131.pdf (texto plano; QGIS no usa object streams).
const SNIPPET =
  "/VP [ << /Type /Viewport /BBox [ 28.3 32.7 570.6 743.7 ] /Measure << " +
  "/Subtype /GEO /GCS << /Type /GEOGCS /EPSG 4326 >> " +
  "/GPTS [ 4.292360822760771 -76.1087369354051759 4.292360822760771 " +
  "-76.1017795161111223 4.2832300244153858 -76.1087369354051759 " +
  "4.2832300244153858 -76.1017795161111223 ] " +
  "/LPTS [ -0.0 1.0 1.0 1.0 -0.0 -0.0 1.0 -0.0 ] >> >> ]";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("parseGpts", () => {
  it("lee los 8 números de /GPTS del GeoPDF", () => {
    const g = parseGpts(bytes(SNIPPET));
    expect(g).not.toBeNull();
    expect(g).toHaveLength(8);
    expect(g![0]).toBeCloseTo(4.29236, 4);
    expect(g![1]).toBeCloseTo(-76.108737, 4);
  });

  it("devuelve null si el PDF no trae georreferencia", () => {
    expect(parseGpts(bytes("%PDF-1.7 sin georreferencia"))).toBeNull();
  });
});

describe("parseGeoRef", () => {
  const ref = parseGeoRef(bytes(SNIPPET))!;

  it("calcula la bbox correcta de la suerte", () => {
    expect(ref.bbox[0]).toBeCloseTo(-76.108737, 4); // minLon
    expect(ref.bbox[1]).toBeCloseTo(4.28323, 4); // minLat
    expect(ref.bbox[2]).toBeCloseTo(-76.10178, 4); // maxLon
    expect(ref.bbox[3]).toBeCloseTo(4.292361, 4); // maxLat
  });

  it("lee la BBox de página del viewport", () => {
    expect(ref.pageBBox).toEqual([28.3, 32.7, 570.6, 743.7]);
  });
});

describe("gptsToImageCoordinates", () => {
  it("devuelve las 4 esquinas en orden MapLibre TL,TR,BR,BL", () => {
    const g = parseGpts(bytes(SNIPPET))!;
    const c = gptsToImageCoordinates(g);
    const [minLon, minLat, maxLon, maxLat] = [
      -76.108737, 4.28323, -76.10178, 4.292361,
    ];
    expect(c[0][0]).toBeCloseTo(minLon, 4); // TL
    expect(c[0][1]).toBeCloseTo(maxLat, 4);
    expect(c[1][0]).toBeCloseTo(maxLon, 4); // TR
    expect(c[2][1]).toBeCloseTo(minLat, 4); // BR
    expect(c[3][0]).toBeCloseTo(minLon, 4); // BL
  });
});

describe("gptsToBounds", () => {
  it("devuelve [[minLon,minLat],[maxLon,maxLat]]", () => {
    const b = gptsToBounds(parseGpts(bytes(SNIPPET))!);
    expect(b[0][0]).toBeCloseTo(-76.108737, 4);
    expect(b[1][1]).toBeCloseTo(4.292361, 4);
  });
});

describe("pageToLonLat", () => {
  const ref = parseGeoRef(bytes(SNIPPET))!;

  it("la esquina inferior-izquierda de la página cae en (minLon,minLat)", () => {
    const [lon, lat] = pageToLonLat(ref, 28.3, 32.7);
    expect(lon).toBeCloseTo(-76.108737, 4);
    expect(lat).toBeCloseTo(4.28323, 4);
  });

  it("el centro de la página cae en el centro geográfico", () => {
    const [lon, lat] = pageToLonLat(
      ref,
      (28.3 + 570.6) / 2,
      (32.7 + 743.7) / 2,
    );
    expect(lon).toBeCloseTo((-76.108737 + -76.10178) / 2, 4);
    expect(lat).toBeCloseTo((4.28323 + 4.292361) / 2, 4);
  });
});
