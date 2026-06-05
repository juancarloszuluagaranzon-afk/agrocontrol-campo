import { describe, it, expect } from "vitest";
import { areaPorHacienda, totalResumen } from "@/domain/suertes/resumen";
import type { CatalogoEntry } from "@/domain/suertes/schema";

function entry(p: Partial<CatalogoEntry>): CatalogoEntry {
  return {
    tab_id: "x",
    sec_ste: "0000-000",
    hacienda: "RIOPAILA",
    sector: "1",
    tablon: 1,
    ha: 1,
    lat: 4.3,
    lon: -76.1,
    ...p,
  };
}

const catalogo: CatalogoEntry[] = [
  entry({ hacienda: "RIOPAILA", sec_ste: "3111-020", ha: 10 }),
  entry({ hacienda: "RIOPAILA", sec_ste: "3111-020", ha: 5 }),
  entry({ hacienda: "RIOPAILA", sec_ste: "3111-030", ha: 5 }),
  entry({ hacienda: "PERALONSO", sec_ste: "3110-090", ha: 30 }),
];

describe("areaPorHacienda", () => {
  const filas = areaPorHacienda(catalogo);

  it("ordena por área descendente", () => {
    expect(filas[0]?.hacienda).toBe("PERALONSO");
    expect(filas[1]?.hacienda).toBe("RIOPAILA");
  });

  it("suma el área oficial por hacienda", () => {
    expect(filas.find((f) => f.hacienda === "RIOPAILA")?.ha).toBe(20);
    expect(filas.find((f) => f.hacienda === "PERALONSO")?.ha).toBe(30);
  });

  it("cuenta tablones y suertes distintas", () => {
    const rp = filas.find((f) => f.hacienda === "RIOPAILA");
    expect(rp?.tablones).toBe(3);
    expect(rp?.suertes).toBe(2);
  });
});

describe("totalResumen", () => {
  it("suma todas las filas", () => {
    const t = totalResumen(areaPorHacienda(catalogo));
    expect(t.ha).toBe(50);
    expect(t.tablones).toBe(4);
    expect(t.suertes).toBe(3);
  });
});
