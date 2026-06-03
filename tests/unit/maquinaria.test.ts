import { describe, it, expect } from "vitest";
import {
  buildItem,
  patchItem,
  auditInsert,
  auditUpdate,
  auditDelete,
  type OpMeta,
  type SuerteDerivada,
} from "@/domain/maquinaria/operations";
import {
  equipoInputSchema,
  programacionItemSchema,
  type EquipoInput,
} from "@/domain/maquinaria/schema";

const input: EquipoInput = {
  tipo: "Bulldozer",
  identificacion: "BD-01",
  operador: "Juan",
  sec_ste: "3110-090",
  labor: "Nivelación",
  zona: 1,
  avance: 25,
  observaciones: "",
};

const derived: SuerteDerivada = {
  hacienda: "NORMANDIA",
  lat: 4.31,
  lon: -76.12,
};

const meta: OpMeta = {
  id: "abc",
  now: "2026-06-02T10:00:00.000Z",
  autor: "Tester",
};

describe("buildItem", () => {
  it("combina input + derivados + metadatos y valida el esquema", () => {
    const item = buildItem(input, derived, "2026-06-02", meta);
    expect(() => programacionItemSchema.parse(item)).not.toThrow();
    expect(item.id).toBe("abc");
    expect(item.hacienda).toBe("NORMANDIA");
    expect(item.created_by).toBe("Tester");
    expect(item.created_at).toBe(item.updated_at);
    expect(item.deleted).toBe(false);
  });
});

describe("patchItem", () => {
  it("aplica el parche y actualiza updated_at sin tocar created_at", () => {
    const item = buildItem(input, derived, "2026-06-02", meta);
    const after = patchItem(item, { avance: 80 }, "2026-06-02T12:00:00.000Z");
    expect(after.avance).toBe(80);
    expect(after.created_at).toBe(meta.now);
    expect(after.updated_at).toBe("2026-06-02T12:00:00.000Z");
  });
});

describe("auditoría", () => {
  const item = buildItem(input, derived, "2026-06-02", meta);

  it("insert: antes null, después = item", () => {
    const a = auditInsert(item, meta);
    expect(a.accion).toBe("insert");
    expect(a.antes).toBeNull();
    expect(a.despues?.id).toBe("abc");
  });

  it("update: registra antes y después", () => {
    const after = patchItem(item, { avance: 50 }, meta.now);
    const a = auditUpdate(item, after, meta);
    expect(a.accion).toBe("update");
    expect((a.antes as { avance: number }).avance).toBe(25);
    expect((a.despues as { avance: number }).avance).toBe(50);
  });

  it("delete: después null", () => {
    const a = auditDelete(item, meta);
    expect(a.accion).toBe("delete");
    expect(a.despues).toBeNull();
  });
});

describe("equipoInputSchema", () => {
  it("rechaza avance fuera de rango", () => {
    expect(equipoInputSchema.safeParse({ ...input, avance: 150 }).success).toBe(
      false,
    );
  });
});
