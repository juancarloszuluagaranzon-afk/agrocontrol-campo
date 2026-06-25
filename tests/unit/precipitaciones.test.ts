import { describe, it, expect } from "vitest";
import { precipitacionInputSchema } from "@/domain/precipitaciones/schema";
import { precipitacionToRow } from "@/lib/sync/syncManager";
import type { Precipitacion } from "@/domain/precipitaciones/schema";

describe("precipitacionInputSchema", () => {
  it("acepta una lectura válida (0 mm cuenta como 'no llovió')", () => {
    const r = precipitacionInputSchema.safeParse({
      pluviometro: 207,
      fecha: "2026-06-25",
      mm: 0,
      nota: "",
    });
    expect(r.success).toBe(true);
  });

  it("exige elegir un pluviómetro", () => {
    const r = precipitacionInputSchema.safeParse({
      pluviometro: Number.NaN,
      fecha: "2026-06-25",
      mm: 12.5,
      nota: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("Elige un pluviómetro");
    }
  });

  it("rechaza mm negativos y fechas mal formadas", () => {
    expect(
      precipitacionInputSchema.safeParse({
        pluviometro: 207,
        fecha: "2026-06-25",
        mm: -3,
        nota: "",
      }).success,
    ).toBe(false);
    expect(
      precipitacionInputSchema.safeParse({
        pluviometro: 207,
        fecha: "25/06/2026",
        mm: 5,
        nota: "",
      }).success,
    ).toBe(false);
  });

  it("rechaza mm vacíos (NaN)", () => {
    expect(
      precipitacionInputSchema.safeParse({
        pluviometro: 207,
        fecha: "2026-06-25",
        mm: Number.NaN,
        nota: "",
      }).success,
    ).toBe(false);
  });
});

describe("precipitacionToRow", () => {
  it("fija el autor al uid autenticado (lo exige RLS)", () => {
    const p: Precipitacion = {
      id: "abc",
      autor: "",
      planta: "riopaila",
      pluviometro: 207,
      fecha: "2026-06-25",
      mm: 12.5,
      nota: "fuerte",
      deleted: false,
      created_at: "2026-06-25T10:00:00.000Z",
      updated_at: "2026-06-25T10:00:00.000Z",
    };
    const row = precipitacionToRow(p, "uid-123");
    expect(row.autor).toBe("uid-123");
    expect(row.pluviometro).toBe(207);
    expect(row.mm).toBe(12.5);
    expect(row.planta).toBe("riopaila");
  });
});
