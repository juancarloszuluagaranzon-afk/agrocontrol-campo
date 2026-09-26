import { describe, it, expect } from "vitest";
import {
  cursorDesde,
  desdeConSolape,
  fusionarRemoto,
  inicioVentanaPrecipitaciones,
  podarPorFecha,
  SOLAPE_S,
} from "@/lib/sync/incremental";
import {
  fetchRowsSince,
  type ConsultaIncremental,
} from "@/lib/sync/syncManager";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Fila = { id: string; updated_at: string; deleted: boolean; v?: number };
const f = (
  id: string,
  updated_at: string,
  extra: Partial<Fila> = {},
): Fila => ({
  id,
  updated_at,
  deleted: false,
  ...extra,
});

describe("fusionarRemoto", () => {
  const locales = [
    f("a", "2026-09-01T00:00:00Z", { v: 1 }),
    f("b", "2026-09-01T00:00:00Z"),
  ];
  it("fusionar: conserva lo local y sobreescribe por id lo que llega", () => {
    const out = fusionarRemoto(
      locales,
      [f("a", "2026-09-02T00:00:00Z", { v: 2 })],
      [],
      "fusionar",
    );
    expect(out.map((x) => x.id).sort()).toEqual(["a", "b"]);
    expect(out.find((x) => x.id === "a")?.v).toBe(2);
  });
  it("reemplazar: solo sobrevive lo remoto y los pendientes locales", () => {
    const out = fusionarRemoto(
      locales,
      [f("c", "2026-09-02T00:00:00Z")],
      ["b"],
      "reemplazar",
    );
    expect(out.map((x) => x.id).sort()).toEqual(["b", "c"]);
  });
  it("un pendiente local gana sobre la versión remota del mismo id", () => {
    const out = fusionarRemoto(
      locales,
      [f("a", "2026-09-02T00:00:00Z", { v: 9 })],
      ["a"],
      "fusionar",
    );
    expect(out.find((x) => x.id === "a")?.v).toBe(1);
  });
  it("un borrado lógico remoto llega y se conserva como deleted", () => {
    const out = fusionarRemoto(
      locales,
      [f("b", "2026-09-02T00:00:00Z", { deleted: true })],
      [],
      "fusionar",
    );
    expect(out.find((x) => x.id === "b")?.deleted).toBe(true);
  });
});

describe("cursorDesde / desdeConSolape", () => {
  it("devuelve el mayor updated_at, o el previo si no llegó nada", () => {
    expect(
      cursorDesde(
        [f("a", "2026-09-01T10:00:00Z"), f("b", "2026-09-03T10:00:00Z")],
        null,
      ),
    ).toBe("2026-09-03T10:00:00Z");
    expect(cursorDesde([], "2026-09-05T00:00:00Z")).toBe(
      "2026-09-05T00:00:00Z",
    );
    expect(
      cursorDesde([f("a", "2026-09-01T10:00:00Z")], "2026-09-05T00:00:00Z"),
    ).toBe("2026-09-05T00:00:00Z");
  });
  it("aplica el solape en segundos", () => {
    expect(desdeConSolape("2026-09-05T00:00:10.000Z")).toBe(
      new Date(Date.UTC(2026, 8, 5, 0, 0, 10 - SOLAPE_S)).toISOString(),
    );
  });
});

describe("inicioVentanaPrecipitaciones / podarPorFecha", () => {
  it("a mitad de año arranca el 1 de enero", () => {
    expect(inicioVentanaPrecipitaciones(new Date("2026-09-25T12:00:00Z"))).toBe(
      "2026-01-01",
    );
  });
  it("a inicios de enero conserva al menos 60 días (diciembre incluido)", () => {
    expect(inicioVentanaPrecipitaciones(new Date("2027-01-03T12:00:00Z"))).toBe(
      "2026-11-04",
    );
  });
  it("poda por fecha (inclusive)", () => {
    const items = [
      { fecha: "2025-12-31" },
      { fecha: "2026-01-01" },
      { fecha: "2026-05-05" },
    ];
    expect(podarPorFecha(items, "2026-01-01").map((i) => i.fecha)).toEqual([
      "2026-01-01",
      "2026-05-05",
    ]);
  });
});

/** Fake del builder: registra filtros y sirve páginas. */
function fakeSupabase(paginas: Fila[][]) {
  const filtros: Array<[string, string]> = [];
  const ordenes: string[] = [];
  let llamada = 0;
  const q: ConsultaIncremental = {
    gte(c, v) {
      filtros.push([c, v]);
      return q;
    },
    order(c) {
      ordenes.push(c);
      return q;
    },
    range() {
      const data = paginas[llamada++] ?? [];
      return Promise.resolve({ data, error: null });
    },
  };
  const sb = {
    from: () => ({ select: () => q }),
  } as unknown as SupabaseClient<Database>;
  return { sb, filtros, ordenes, llamadas: () => llamada };
}

describe("fetchRowsSince", () => {
  it("sin cursor baja todo (solo filtro de fecha) y ordena por updated_at,id", async () => {
    const fk = fakeSupabase([[f("a", "2026-09-01T00:00:00Z")]]);
    const rows = await fetchRowsSince<Fila>(fk.sb, "precipitaciones", {
      since: null,
      fechaDesde: "2026-01-01",
    });
    expect(rows?.map((r) => r.id)).toEqual(["a"]);
    expect(fk.filtros).toEqual([["fecha", "2026-01-01"]]);
    expect(fk.ordenes).toEqual(["updated_at", "id"]);
  });
  it("con cursor filtra updated_at >= since", async () => {
    const fk = fakeSupabase([[]]);
    await fetchRowsSince<Fila>(fk.sb, "marcadores", {
      since: "2026-09-05T00:00:00Z",
    });
    expect(fk.filtros).toEqual([["updated_at", "2026-09-05T00:00:00Z"]]);
  });
  it("pagina de a 1000 hasta una página corta", async () => {
    const llena = Array.from({ length: 1000 }, (_, i) =>
      f(`p${i}`, "2026-09-01T00:00:00Z"),
    );
    const fk = fakeSupabase([llena, [f("z", "2026-09-02T00:00:00Z")]]);
    const rows = await fetchRowsSince<Fila>(fk.sb, "mediciones", {
      since: null,
    });
    expect(rows?.length).toBe(1001);
    expect(fk.llamadas()).toBe(2);
  });
  it("devuelve null si una página falla", async () => {
    const q = {
      gte: () => q,
      order: () => q,
      range: () => Promise.resolve({ data: null, error: { message: "boom" } }),
    };
    const sb = {
      from: () => ({ select: () => q }),
    } as unknown as SupabaseClient<Database>;
    expect(
      await fetchRowsSince<Fila>(sb, "marcadores", { since: null }),
    ).toBeNull();
  });
});
