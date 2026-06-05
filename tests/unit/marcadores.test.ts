import { describe, it, expect } from "vitest";
import { marcadorToRow } from "@/lib/sync/syncManager";
import { marcadorInputSchema, type Marcador } from "@/domain/marcadores/schema";

const base: Marcador = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  user_id: "",
  nombre: "Compuerta dañada",
  nota: "Revisar la próxima semana",
  color: "#ef4444",
  lat: 4.31,
  lon: -76.12,
  deleted: false,
  created_at: "2026-06-04T10:00:00.000Z",
  updated_at: "2026-06-04T10:00:00.000Z",
};

describe("marcadorInputSchema", () => {
  it("exige un nombre no vacío", () => {
    const r = marcadorInputSchema.safeParse({
      nombre: "",
      nota: "",
      color: "#ef4444",
    });
    expect(r.success).toBe(false);
  });

  it("acepta nota vacía", () => {
    const r = marcadorInputSchema.safeParse({
      nombre: "Punto",
      nota: "",
      color: "#22c55e",
    });
    expect(r.success).toBe(true);
  });
});

describe("marcadorToRow", () => {
  const uid = "auth-uid-999";
  const row = marcadorToRow(base, uid);

  it("fija user_id al uid autenticado (RLS), aunque el local esté vacío", () => {
    expect(row.user_id).toBe(uid);
    expect(base.user_id).toBe("");
  });

  it("conserva el id para upsert idempotente", () => {
    expect(row.id).toBe(base.id);
  });

  it("mapea nombre, nota, color y coordenadas", () => {
    expect(row.nombre).toBe("Compuerta dañada");
    expect(row.nota).toBe("Revisar la próxima semana");
    expect(row.color).toBe("#ef4444");
    expect(row.lat).toBe(4.31);
    expect(row.lon).toBe(-76.12);
    expect(row.deleted).toBe(false);
  });
});
