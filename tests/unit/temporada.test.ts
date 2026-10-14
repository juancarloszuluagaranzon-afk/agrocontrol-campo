import { describe, expect, it } from "vitest";
import { esHalloween } from "@/lib/temporada";

const d = (mes: number, dia: number, anio = 2026) =>
  new Date(anio, mes - 1, dia, 12, 0, 0);

describe("temporada de Halloween", () => {
  it("activa del 14 de octubre al 1 de noviembre, inclusive", () => {
    expect(esHalloween(d(10, 13))).toBe(false);
    expect(esHalloween(d(10, 14))).toBe(true);
    expect(esHalloween(d(10, 31))).toBe(true);
    expect(esHalloween(d(11, 1))).toBe(true);
    expect(esHalloween(d(11, 2))).toBe(false);
  });

  it("se repite cada año y no aparece el resto del año", () => {
    expect(esHalloween(d(10, 20, 2027))).toBe(true);
    expect(esHalloween(d(1, 15))).toBe(false);
    expect(esHalloween(d(12, 31))).toBe(false);
  });
});
