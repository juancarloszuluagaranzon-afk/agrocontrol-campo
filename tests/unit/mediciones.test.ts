import { describe, it, expect } from "vitest";
import { medicionToRow } from "@/lib/sync/syncManager";
import { medicionInputSchema, type Medicion } from "@/domain/mediciones/schema";

const base: Medicion = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  autor: "",
  nombre: "Lote sur",
  tipo: "area",
  valor: 3.428,
  unidad: "ha",
  geom: {
    type: "Polygon",
    coordinates: [
      [
        [-76.12, 4.31],
        [-76.11, 4.31],
        [-76.11, 4.32],
        [-76.12, 4.31],
      ],
    ],
  },
  lat: 4.313,
  lon: -76.117,
  deleted: false,
  created_at: "2026-06-05T10:00:00.000Z",
  updated_at: "2026-06-05T10:00:00.000Z",
};

describe("medicionInputSchema", () => {
  it("exige un nombre no vacío", () => {
    expect(medicionInputSchema.safeParse({ nombre: "" }).success).toBe(false);
    expect(medicionInputSchema.safeParse({ nombre: "Lote" }).success).toBe(
      true,
    );
  });
});

describe("medicionToRow", () => {
  const uid = "auth-uid-777";
  const row = medicionToRow(base, uid);

  it("fija autor al uid autenticado (RLS), aunque el local esté vacío", () => {
    expect(row.autor).toBe(uid);
    expect(base.autor).toBe("");
  });

  it("conserva id, nombre, tipo, valor y geometría", () => {
    expect(row.id).toBe(base.id);
    expect(row.nombre).toBe("Lote sur");
    expect(row.tipo).toBe("area");
    expect(row.valor).toBe(3.428);
    expect(row.unidad).toBe("ha");
    expect(row.deleted).toBe(false);
    expect(row.geom).toBeTruthy();
  });
});
