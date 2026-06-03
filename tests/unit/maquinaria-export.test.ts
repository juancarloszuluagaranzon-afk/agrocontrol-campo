import { describe, it, expect } from "vitest";
import {
  buildExport,
  parseImport,
  itemsToCSV,
} from "@/domain/maquinaria/export";
import { buildItem, type OpMeta } from "@/domain/maquinaria/operations";
import type { EquipoInput } from "@/domain/maquinaria/schema";

const meta: OpMeta = {
  id: "x1",
  now: "2026-06-02T10:00:00.000Z",
  autor: "Tester",
};
const input: EquipoInput = {
  tipo: "Bulldozer",
  identificacion: "BD-01",
  operador: "Juan",
  sec_ste: "3110-090",
  labor: "Nivelación",
  zona: 2,
  avance: 40,
  observaciones: "con; punto y coma",
};
const item = buildItem(
  input,
  { hacienda: "NORMANDIA", lat: 4.31, lon: -76.12 },
  "2026-06-02",
  meta,
);

describe("export/import", () => {
  it("roundtrip JSON conserva los datos", () => {
    const bundle = buildExport([item], []);
    const parsed = parseImport(JSON.parse(JSON.stringify(bundle)));
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.sec_ste).toBe("3110-090");
  });

  it("parseImport rechaza datos inválidos", () => {
    expect(() => parseImport({ version: 2, items: [], audit: [] })).toThrow();
  });

  it("CSV: cabecera + fila, con escape de ';'", () => {
    const csv = itemsToCSV([item]);
    const [header, row] = csv.split("\r\n");
    expect(header).toBe(
      "fecha;tipo;identificacion;operador;sec_ste;hacienda;labor;zona;avance;observaciones",
    );
    expect(row).toContain('"con; punto y coma"');
    expect(row).toContain("3110-090");
  });

  it("CSV omite registros borrados", () => {
    const csv = itemsToCSV([{ ...item, deleted: true }]);
    expect(csv.split("\r\n")).toHaveLength(1); // sólo cabecera
  });
});
