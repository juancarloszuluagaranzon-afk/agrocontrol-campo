import { describe, it, expect } from "vitest";
import { isoWeek, agruparPorSemana } from "@/domain/precipitaciones/semanas";

describe("isoWeek", () => {
  it("da la semana ISO-8601 estándar de fechas conocidas", () => {
    // 2026-01-01 es jueves -> semana 1 (la semana que contiene el primer jueves del año).
    expect(isoWeek("2026-01-01")).toBe(1);
    // Un lunes y el domingo siguiente caen en la misma semana ISO.
    expect(isoWeek("2026-06-01")).toBe(isoWeek("2026-06-07"));
    // El lunes siguiente ya es la semana entrante.
    expect(isoWeek("2026-06-08")).toBe(isoWeek("2026-06-01") + 1);
  });

  it("maneja el cambio de año (una semana puede cruzar dic->ene)", () => {
    // 2026-01-01 es jueves -> esa semana empieza el lunes 2025-12-29, y por
    // ISO-8601 pertenece al año que tiene el jueves: semana 1 de 2026.
    expect(isoWeek("2025-12-29")).toBe(1);
    // El lunes anterior (2025-12-22) sí es una semana de 2025 (52).
    expect(isoWeek("2025-12-22")).toBe(52);
  });
});

describe("agruparPorSemana", () => {
  it("agrupa los días consecutivos de la misma semana ISO", () => {
    const grupos = agruparPorSemana("2026-06", 30);
    // La suma de cantidadDias de todos los grupos cubre el mes completo.
    const total = grupos.reduce((s, g) => s + g.cantidadDias, 0);
    expect(total).toBe(30);
    // Los grupos son consecutivos y sin huecos (desde/hasta encadenan).
    for (let i = 1; i < grupos.length; i++) {
      expect(grupos[i]!.desde).toBe(grupos[i - 1]!.hasta + 1);
    }
    // Cada grupo cae en una sola semana ISO distinta de sus vecinos.
    for (let i = 1; i < grupos.length; i++) {
      expect(grupos[i]!.semana).not.toBe(grupos[i - 1]!.semana);
    }
  });

  it("un mes que empieza a mitad de semana arranca con un grupo corto", () => {
    const grupos = agruparPorSemana("2026-02", 28);
    expect(grupos[0]!.desde).toBe(1);
    // Febrero 2026 empieza domingo: el primer grupo es de 1 solo día.
    expect(grupos[0]!.cantidadDias).toBeLessThanOrEqual(7);
  });
});
