import { describe, it, expect } from "vitest";
import type { CatalogoEntry } from "@/domain/suertes/schema";
import { agruparSuertes, buscarSuertes } from "@/domain/maestro/consulta";

function entry(p: Partial<CatalogoEntry>): CatalogoEntry {
  return {
    tab_id: "3111-020-T1",
    sec_ste: "3111-020",
    hacienda: "PERALONSO",
    sector: "3111",
    tablon: 1,
    ha: 1,
    lat: 4.3,
    lon: -76.1,
    ...p,
  };
}

describe("agruparSuertes", () => {
  it("agrupa tablones por sec_ste: suma Ha, promedia el punto, cuenta tablones", () => {
    const cat = [
      entry({ tab_id: "3111-020-T1", tablon: 1, ha: 2, lat: 4.0, lon: -76.0 }),
      entry({ tab_id: "3111-020-T2", tablon: 2, ha: 4, lat: 4.2, lon: -76.2 }),
    ];
    const [s] = agruparSuertes(cat);
    expect(s).toBeDefined();
    expect(s?.sec_ste).toBe("3111-020");
    expect(s?.ha).toBe(6);
    expect(s?.tablones).toBe(2);
    expect(s?.lat).toBeCloseTo(4.1, 6);
    expect(s?.lon).toBeCloseTo(-76.1, 6);
    // tabId = el del primer tablón visto (destino del flyTo).
    expect(s?.tabId).toBe("3111-020-T1");
    expect(s?.hacienda).toBe("PERALONSO");
  });

  it("ordena las suertes por sec_ste", () => {
    const cat = [
      entry({ sec_ste: "3111-030", tab_id: "3111-030-T1" }),
      entry({ sec_ste: "3111-010", tab_id: "3111-010-T1" }),
      entry({ sec_ste: "3111-020", tab_id: "3111-020-T1" }),
    ];
    expect(agruparSuertes(cat).map((s) => s.sec_ste)).toEqual([
      "3111-010",
      "3111-020",
      "3111-030",
    ]);
  });
});

describe("buscarSuertes", () => {
  const suertes = agruparSuertes([
    entry({
      sec_ste: "3111-020",
      tab_id: "3111-020-T1",
      hacienda: "PERALONSO",
    }),
    entry({
      sec_ste: "3102-010",
      tab_id: "3102-010-T1",
      hacienda: "GERTRUDIS",
    }),
    entry({
      sec_ste: "2101-010",
      tab_id: "2101-010-T1",
      hacienda: "SAN JORGE",
    }),
  ]);

  it("query vacía devuelve todas (acotado al límite)", () => {
    expect(buscarSuertes(suertes, "")).toHaveLength(3);
    expect(buscarSuertes(suertes, "  ", 2)).toHaveLength(2);
  });

  it("busca por código de suerte (prefijo)", () => {
    const r = buscarSuertes(suertes, "3102");
    expect(r.map((s) => s.sec_ste)).toEqual(["3102-010"]);
  });

  it("busca por hacienda sin importar acentos ni mayúsculas", () => {
    const r = buscarSuertes(suertes, "gertrudis");
    expect(r.map((s) => s.sec_ste)).toEqual(["3102-010"]);
  });

  it("prioriza coincidencia de código sobre hacienda", () => {
    // "3111" es código de una suerte; ninguna hacienda lo contiene → solo esa.
    const r = buscarSuertes(suertes, "3111");
    expect(r[0]?.sec_ste).toBe("3111-020");
  });
});
