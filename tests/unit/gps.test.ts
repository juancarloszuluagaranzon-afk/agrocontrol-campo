import { describe, it, expect } from "vitest";
import {
  accuracyCircle,
  gpsAfinando,
  distanciaMetros,
  GPS_PRECISION_OK_M,
  errorGpsDefinitivo,
  necesitaRedibujoCono,
} from "@/lib/geo/gps";

describe("distanciaMetros", () => {
  it("0.001° de latitud ≈ 111 m", () => {
    const d = distanciaMetros(-76.1, 4.3, -76.1, 4.301);
    expect(d).toBeGreaterThan(108);
    expect(d).toBeLessThan(114);
  });

  it("el mismo punto da 0", () => {
    expect(distanciaMetros(-76.1, 4.3, -76.1, 4.3)).toBeCloseTo(0, 6);
  });
});

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

describe("errorGpsDefinitivo", () => {
  it("solo el permiso denegado es definitivo; sin posición y tiempo agotado son transitorios", () => {
    expect(errorGpsDefinitivo(1)).toBe(true);
    expect(errorGpsDefinitivo(2)).toBe(false);
    expect(errorGpsDefinitivo(3)).toBe(false);
  });
});

describe("necesitaRedibujoCono", () => {
  const base = { lon: -76.1, lat: 4.3, rumbo: 90, zoom: 16 };
  it("dibuja la primera vez", () => {
    expect(necesitaRedibujoCono(null, base)).toBe(true);
  });
  it("no redibuja si nada cambió o el rumbo varió menos de 1°", () => {
    expect(necesitaRedibujoCono(base, { ...base })).toBe(false);
    expect(necesitaRedibujoCono(base, { ...base, rumbo: 90.6 })).toBe(false);
  });
  it("redibuja por rumbo (incluido el cruce de 0/360), posición o zoom", () => {
    expect(necesitaRedibujoCono(base, { ...base, rumbo: 92 })).toBe(true);
    expect(
      necesitaRedibujoCono({ ...base, rumbo: 359.5 }, { ...base, rumbo: 0.2 }),
    ).toBe(false);
    expect(
      necesitaRedibujoCono({ ...base, rumbo: 359 }, { ...base, rumbo: 1 }),
    ).toBe(true);
    expect(necesitaRedibujoCono(base, { ...base, lat: 4.30001 })).toBe(true);
    expect(necesitaRedibujoCono(base, { ...base, zoom: 16.2 })).toBe(true);
  });
});
