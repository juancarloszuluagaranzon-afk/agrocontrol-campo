import { describe, it, expect, beforeEach } from "vitest";
import { respuestaEncuestaInputSchema } from "@/domain/encuesta/schema";
import { respuestaEncuestaToRow } from "@/lib/sync/syncManager";
import type { RespuestaEncuesta } from "@/domain/encuesta/schema";
import { useEncuestaStore } from "@/lib/store/encuestaStore";

describe("respuestaEncuestaInputSchema", () => {
  it("acepta estrellas de 1 a 5", () => {
    for (let n = 1; n <= 5; n++) {
      expect(
        respuestaEncuestaInputSchema.safeParse({ estrellas: n, comentario: "" })
          .success,
      ).toBe(true);
    }
  });

  it("rechaza 0 y 6 estrellas", () => {
    expect(
      respuestaEncuestaInputSchema.safeParse({ estrellas: 0, comentario: "" })
        .success,
    ).toBe(false);
    expect(
      respuestaEncuestaInputSchema.safeParse({ estrellas: 6, comentario: "" })
        .success,
    ).toBe(false);
  });

  it("el comentario es opcional en el sentido de poder ir vacío", () => {
    const r = respuestaEncuestaInputSchema.safeParse({
      estrellas: 5,
      comentario: "",
    });
    expect(r.success).toBe(true);
  });
});

describe("respuestaEncuestaToRow", () => {
  it("fija el autor al uid autenticado y mapea los campos", () => {
    const r: RespuestaEncuesta = {
      id: "abc",
      user_id: "",
      estrellas: 4,
      comentario: "Muy útil",
      created_at: "2026-07-24T10:00:00.000Z",
    };
    const row = respuestaEncuestaToRow(r, "uid-123");
    expect(row.user_id).toBe("uid-123");
    expect(row.estrellas).toBe(4);
    expect(row.comentario).toBe("Muy útil");
  });
});

describe("encuestaStore.addRespuesta", () => {
  beforeEach(() => {
    useEncuestaStore.setState({ items: [], pending: [], userId: "u1" });
  });

  it("crea la respuesta y la encola en pending", () => {
    useEncuestaStore.getState().addRespuesta(5, "Excelente");
    const s = useEncuestaStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.items[0]?.estrellas).toBe(5);
    expect(s.items[0]?.user_id).toBe("u1");
    expect(s.pending).toContain(s.items[0]?.id);
  });

  it("es no-op si ya hay una respuesta guardada", () => {
    useEncuestaStore.getState().addRespuesta(5, "Primera");
    useEncuestaStore.getState().addRespuesta(1, "Segunda");
    const s = useEncuestaStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.items[0]?.comentario).toBe("Primera");
  });
});
