import { describe, it, expect } from "vitest";
import { accuracyCircle, gpsAfinando, GPS_PRECISION_OK_M } from "@/lib/geo/gps";

describe("gpsAfinando", () => {
  it("afina solo cuando hay fix preciso (≤ umbral)", () => {
    expect(gpsAfinando(null)).toBe(true); // sin fix
    expect(gpsAfinando(50)).toBe(true); // pobre
    expect(gpsAfinando(GPS_PRECISION_OK_M + 0.1)).toBe(true);
    expect(gpsAfinando(GPS_PRECISION_OK_M)).toBe(false);
    expect(gpsAfinando(5)).toBe(false);
  });
});

describe("accuracyCircle", () => {
  it("devuelve un anillo cerrado con steps+1 puntos", () => {
    const c = accuracyCircle(-76.36, 3.25, 10, 48);
    const ring = c.geometry.coordinates[0]!;
    expect(ring).toHaveLength(49);
    expect(ring[0]).toEqual(ring[ring.length - 1]); // cerrado
  });

  it("el radio en metros corresponde al desplazamiento en grados", () => {
    const lat = 3.25;
    const r = 25;
    const c = accuracyCircle(-76.36, lat, r, 48);
    const ring = c.geometry.coordinates[0]!;
    // Punto norte (a=0): lat + r/111320; lon sin cambio.
    const norte = ring[0]!;
    expect(norte[1]).toBeCloseTo(lat + r / 111_320, 6);
    expect(norte[0]).toBeCloseTo(-76.36, 9);
  });

  it("radio negativo se trata como 0 (sin disco)", () => {
    const c = accuracyCircle(-76.36, 3.25, -5, 8);
    const ring = c.geometry.coordinates[0]!;
    expect(ring.every((p) => p[0] === -76.36 && p[1] === 3.25)).toBe(true);
  });
});
