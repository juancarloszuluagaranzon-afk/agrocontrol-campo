import { describe, it, expect, beforeEach } from "vitest";
import {
  acumulado,
  lecturaDelDia,
  inicioMes,
  inicioAnio,
} from "@/domain/precipitaciones/acumulado";
import type { Precipitacion } from "@/domain/precipitaciones/schema";
import { usePrecipitacionesStore } from "@/lib/store/precipitacionesStore";

function lectura(p: Partial<Precipitacion>): Precipitacion {
  return {
    id: Math.random().toString(36),
    autor: "u1",
    planta: "riopaila",
    pluviometro: 207,
    fecha: "2026-06-25",
    mm: 0,
    nota: "",
    deleted: false,
    created_at: "2026-06-25T10:00:00.000Z",
    updated_at: "2026-06-25T10:00:00.000Z",
    ...p,
  };
}

describe("acumulado / lecturaDelDia", () => {
  const items: Precipitacion[] = [
    lectura({ fecha: "2026-06-01", mm: 5 }),
    lectura({ fecha: "2026-06-25", mm: 10, updated_at: "...A" }),
    // misma fecha, corregida después (gana la más reciente)
    lectura({ fecha: "2026-06-25", mm: 12, updated_at: "...B" }),
    lectura({ fecha: "2026-05-30", mm: 99 }), // otro mes, fuera del rango mensual
    lectura({ pluviometro: 999, fecha: "2026-06-25", mm: 7 }), // otro PV
    lectura({ fecha: "2026-06-10", mm: 3, deleted: true }), // borrada, no suma
  ];

  it("lecturaDelDia toma la lectura más reciente del día", () => {
    const l = lecturaDelDia(items, "riopaila", 207, "2026-06-25");
    expect(l?.mm).toBe(12);
  });

  it("acumula una lectura por día (la más reciente) en el rango", () => {
    // mes de junio: 25/06 (12) + 01/06 (5) = 17; excluye mayo, otro PV y borrada.
    const mes = acumulado(
      items,
      "riopaila",
      207,
      inicioMes("2026-06-25"),
      "2026-06-25",
    );
    expect(mes).toBe(17);
  });

  it("el año incluye mayo y junio del mismo PV", () => {
    const anio = acumulado(
      items,
      "riopaila",
      207,
      inicioAnio("2026-06-25"),
      "2026-06-25",
    );
    expect(anio).toBe(99 + 5 + 12);
  });
});

describe("setLectura (anti-duplicado en la planilla)", () => {
  beforeEach(() => {
    usePrecipitacionesStore.setState({ items: [], pending: [], userId: "u1" });
  });

  it("actualiza la lectura propia del mismo PV+fecha en vez de duplicar", () => {
    const s = usePrecipitacionesStore.getState();
    s.setLectura("riopaila", 207, "2026-06-25", 5);
    s.setLectura("riopaila", 207, "2026-06-25", 8);
    const st = usePrecipitacionesStore.getState();
    const activas = st.items.filter((p) => !p.deleted);
    expect(activas).toHaveLength(1);
    const solo = activas[0];
    expect(solo).toBeDefined();
    expect(solo?.mm).toBe(8);
    if (solo) expect(st.pending).toContain(solo.id);
  });

  it("crea una lectura nueva para otra fecha", () => {
    const s = usePrecipitacionesStore.getState();
    s.setLectura("riopaila", 207, "2026-06-25", 5);
    s.setLectura("riopaila", 207, "2026-06-26", 9);
    expect(usePrecipitacionesStore.getState().items).toHaveLength(2);
  });
});
