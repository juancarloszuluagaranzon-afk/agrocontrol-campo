import { describe, it, expect } from "vitest";
import {
  darkenSaturate,
  haciendaLabelColor,
  haciendaLabelColorExpression,
  haciendaLabelListSchema,
} from "@/domain/haciendas/schema";
import { HACIENDA_COLORS, HACIENDA_DEFAULT } from "@/lib/geo/haciendas";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminancia(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (r + g + b) / 3;
}

describe("darkenSaturate", () => {
  it("produce un color más oscuro que el original", () => {
    for (const color of Object.values(HACIENDA_COLORS)) {
      expect(luminancia(darkenSaturate(color))).toBeLessThan(luminancia(color));
    }
  });
});

describe("haciendaLabelColor", () => {
  it("da un color distinto (más oscuro) que el relleno de la hacienda", () => {
    const original: string = HACIENDA_COLORS.RIOPAILA ?? "";
    const label = haciendaLabelColor("RIOPAILA");
    expect(label).not.toBe(original);
    expect(luminancia(label)).toBeLessThan(luminancia(original));
  });

  it("respalda en el color por defecto oscurecido para haciendas sin paleta (ej. Castilla)", () => {
    expect(haciendaLabelColor("BUCHITOLO")).toBe(
      darkenSaturate(HACIENDA_DEFAULT),
    );
    expect(haciendaLabelColor("HACIENDA_INEXISTENTE")).toBe(
      darkenSaturate(HACIENDA_DEFAULT),
    );
  });
});

describe("haciendaLabelColorExpression", () => {
  it("tiene un par [hacienda, color] por cada entrada de HACIENDA_COLORS más el default", () => {
    const expr = haciendaLabelColorExpression();
    // ["match", ["get","hacienda"], h1, c1, h2, c2, ..., default]
    const pares = Object.keys(HACIENDA_COLORS).length;
    expect(expr).toHaveLength(2 + pares * 2 + 1);
  });
});

describe("haciendaLabelListSchema", () => {
  it("acepta una lista válida de {hacienda, lat, lon}", () => {
    const r = haciendaLabelListSchema.safeParse([
      { hacienda: "RIOPAILA", lat: 4.31, lon: -76.11 },
    ]);
    expect(r.success).toBe(true);
  });

  it("rechaza una entrada sin lat", () => {
    const r = haciendaLabelListSchema.safeParse([
      { hacienda: "RIOPAILA", lon: -76.11 },
    ]);
    expect(r.success).toBe(false);
  });
});
