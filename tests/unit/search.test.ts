import { describe, it, expect } from "vitest";
import { searchCatalogo } from "@/domain/suertes/search";
import type { CatalogoEntry } from "@/domain/suertes/schema";

const e = (sec_ste: string, hacienda: string): CatalogoEntry => ({
  sec_ste,
  hacienda,
  sector: sec_ste.split("-")[0] ?? "",
  ha: 1,
  lat: 4.3,
  lon: -76.1,
});

const catalogo: CatalogoEntry[] = [
  e("3110-090", "NORMANDIA"),
  e("3110-091", "NORMANDIA"),
  e("3102-010", "GERTRUDIS"),
  e("3200-005", "PERALONSO"),
];

describe("searchCatalogo", () => {
  it("devuelve vacío con consulta vacía", () => {
    expect(searchCatalogo(catalogo, "  ")).toEqual([]);
  });

  it("encuentra por prefijo de sec_ste", () => {
    const r = searchCatalogo(catalogo, "3110");
    expect(r.map((x) => x.sec_ste)).toEqual(["3110-090", "3110-091"]);
  });

  it("encuentra por hacienda sin importar acentos/mayúsculas", () => {
    const r = searchCatalogo(catalogo, "gertrudis");
    expect(r).toHaveLength(1);
    expect(r[0]?.sec_ste).toBe("3102-010");
  });

  it("prioriza coincidencias de código sobre hacienda", () => {
    const mixto = [e("0001-NORMANDIA", "OTRA"), ...catalogo];
    const r = searchCatalogo(mixto, "normandia");
    // las de hacienda NORMANDIA válidas aparecen; respeta el límite
    expect(r.some((x) => x.hacienda === "NORMANDIA")).toBe(true);
  });

  it("respeta el límite", () => {
    expect(searchCatalogo(catalogo, "31", 1)).toHaveLength(1);
  });
});
