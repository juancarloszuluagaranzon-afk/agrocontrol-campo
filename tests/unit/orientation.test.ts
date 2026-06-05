import { describe, it, expect } from "vitest";
import {
  normalizeDeg,
  shortestAngleDelta,
  lerpAngle,
  metersPerPixel,
  coneSector,
  compassHeadingFromEvent,
  compassNecesitaCalibracion,
} from "@/lib/geo/orientation";

describe("normalizeDeg", () => {
  it("envuelve a [0,360)", () => {
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(450)).toBe(90);
    expect(normalizeDeg(0)).toBe(0);
    expect(normalizeDeg(360)).toBe(0);
  });
});

describe("shortestAngleDelta", () => {
  it("toma el camino corto cruzando 0/360", () => {
    expect(shortestAngleDelta(350, 10)).toBe(20);
    expect(shortestAngleDelta(10, 350)).toBe(-20);
    expect(shortestAngleDelta(0, 90)).toBe(90);
    expect(shortestAngleDelta(0, 180)).toBe(180);
  });
});

describe("lerpAngle", () => {
  it("interpola por el camino corto (suave en 0/360)", () => {
    expect(lerpAngle(350, 10, 0.5)).toBe(0);
    expect(lerpAngle(0, 90, 0)).toBe(0);
    expect(lerpAngle(0, 90, 1)).toBe(90);
  });
});

describe("metersPerPixel", () => {
  it("decrece al acercar (mayor zoom)", () => {
    const z14 = metersPerPixel(4.3, 14);
    const z16 = metersPerPixel(4.3, 16);
    expect(z14).toBeGreaterThan(z16);
    expect(z14).toBeGreaterThan(0);
  });
});

describe("coneSector", () => {
  const cone = coneSector(-76.12, 4.31, 0, {
    apertureDeg: 60,
    radiusM: 50,
    steps: 10,
  });
  const ring = cone.geometry.coordinates[0]!;

  it("el vértice coincide con la ubicación (primer y último punto)", () => {
    expect(ring[0]).toEqual([-76.12, 4.31]);
    expect(ring[ring.length - 1]).toEqual([-76.12, 4.31]);
  });

  it("apunta al norte: el punto central del arco está casi al norte", () => {
    const centro = ring[1 + 5]!; // 10 pasos → índice medio
    expect(centro[1]!).toBeGreaterThan(4.31); // más al norte que el vértice
    expect(Math.abs(centro[0]! - -76.12)).toBeLessThan(1e-4); // ~mismo lon
  });

  it("los puntos del arco están aprox. al radio pedido", () => {
    const mLat = 111320;
    for (let i = 1; i < ring.length - 1; i++) {
      const p = ring[i]!;
      const lon = p[0]!;
      const lat = p[1]!;
      const dLat = (lat - 4.31) * mLat;
      const dLon = (lon - -76.12) * 111320 * Math.cos((4.31 * Math.PI) / 180);
      const dist = Math.hypot(dLat, dLon);
      expect(dist).toBeGreaterThan(45);
      expect(dist).toBeLessThan(55);
    }
  });
});

describe("compassHeadingFromEvent", () => {
  it("usa webkitCompassHeading en iOS", () => {
    expect(
      compassHeadingFromEvent({ alpha: 0, webkitCompassHeading: 90 }),
    ).toBe(90);
  });

  it("convierte alpha absoluto (antihorario) a rumbo horario", () => {
    expect(compassHeadingFromEvent({ alpha: 90, absolute: true })).toBe(270);
    expect(compassHeadingFromEvent({ alpha: 0, absolute: true })).toBe(0);
  });

  it("devuelve null si no es absoluto ni iOS", () => {
    expect(compassHeadingFromEvent({ alpha: 45, absolute: false })).toBeNull();
  });
});

describe("compassNecesitaCalibracion", () => {
  it("avisa con precisión negativa o > 20°", () => {
    expect(compassNecesitaCalibracion(-1)).toBe(true);
    expect(compassNecesitaCalibracion(35)).toBe(true);
    expect(compassNecesitaCalibracion(10)).toBe(false);
    expect(compassNecesitaCalibracion(null)).toBe(false);
  });
});
