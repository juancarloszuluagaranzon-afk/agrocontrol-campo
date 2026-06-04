import { describe, it, expect } from "vitest";
import { searchCatalogo } from "@/domain/suertes/search";
import type { CatalogoEntry } from "@/domain/suertes/schema";

const e = (
  sec_ste: string,
  tablon: number,
  hacienda: string,
): CatalogoEntry => ({
  tab_id: `${sec_ste}-T${tablon}`,
  sec_ste,
  hacienda,
  sector: sec_ste.split("-")[0] ?? "",
  tablon,
  ha: 1,
  lat: 4.3,
  lon: -76.1,
});

const catalogo: CatalogoEntry[] = [
  e("3110-090", 1, "NORMANDIA"),
  e("3110-090", 2, "NORMANDIA"),
  e("3102-010", 1, "GERTRUDIS"),
  e("3200-005", 1, "PERALONSO"),
];

describe("searchCatalogo", () => {
  it("devuelve vacío con consulta vacía", () => {
    expect(searchCatalogo(catalogo, "  ")).toEqual([]);
  });

  it("encuentra los tablones por prefijo de sec_ste", () => {
    const r = searchCatalogo(catalogo, "3110-090");
    expect(r.map((x) => x.tab_id)).toEqual(["3110-090-T1", "3110-090-T2"]);
  });

  it("encuentra un tablón concreto por tab_id", () => {
    const r = searchCatalogo(catalogo, "3110-090-T2");
    expect(r).toHaveLength(1);
    expect(r[0]?.tab_id).toBe("3110-090-T2");
  });

  it("encuentra por hacienda sin importar acentos/mayúsculas", () => {
    const r = searchCatalogo(catalogo, "gertrudis");
    expect(r).toHaveLength(1);
    expect(r[0]?.sec_ste).toBe("3102-010");
  });

  it("respeta el límite", () => {
    expect(searchCatalogo(catalogo, "31", 1)).toHaveLength(1);
  });
});
