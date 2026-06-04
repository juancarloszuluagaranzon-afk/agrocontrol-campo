import { describe, it, expect } from "vitest";
import { itemToRow } from "@/lib/sync/syncManager";
import { buildItem, type OpMeta } from "@/domain/maquinaria/operations";
import type { EquipoInput } from "@/domain/maquinaria/schema";

const meta: OpMeta = {
  id: "11111111-1111-1111-1111-111111111111",
  now: "2026-06-03T10:00:00.000Z",
  autor: "Operador Cuatro",
};
const input: EquipoInput = {
  tipo: "Bulldozer",
  identificacion: "BD-09",
  operador: "Juan",
  tab_id: "3110-090-T1",
  labor: "Nivelación",
  zona: 2,
  avance: 40,
  observaciones: "",
};
const item = buildItem(
  input,
  {
    sec_ste: "3110-090",
    tablon: 1,
    hacienda: "NORMANDIA",
    lat: 4.31,
    lon: -76.12,
  },
  "2026-06-03",
  meta,
);

describe("itemToRow", () => {
  const uid = "auth-uid-123";
  const row = itemToRow(item, uid);

  it("fija created_by al uid autenticado (RLS), no al nombre", () => {
    expect(row.created_by).toBe(uid);
    expect(row.created_by).not.toBe(item.created_by);
  });

  it("conserva el id (uuid) para upsert idempotente", () => {
    expect(row.id).toBe(item.id);
  });

  it("mapea los campos de negocio", () => {
    expect(row.sec_ste).toBe("3110-090");
    expect(row.zona).toBe(2);
    expect(row.avance).toBe(40);
    expect(row.deleted).toBe(false);
    expect(row.hacienda).toBe("NORMANDIA");
  });
});
