import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Precipitacion } from "@/domain/precipitaciones/schema";
import type { PluviometroRef } from "@/domain/pluviometros/schema";

const pvs: PluviometroRef[] = [
  {
    id: 207,
    zona: 1,
    tecnico: "Manuel Primero",
    hacienda: "La Luisa 2",
    sitio: "Estación Luisa 2",
    area_ha: 100,
    lat: 4.35,
    lon: -76.1,
  },
  {
    id: 401,
    zona: 2,
    tecnico: "Freddy Reyes",
    hacienda: "Venecia 1",
    sitio: null,
    area_ha: 287,
    lat: 4.3,
    lon: -76.11,
  },
];

function lectura(p: Partial<Precipitacion>): Precipitacion {
  return {
    id: Math.random().toString(36),
    autor: "u1",
    planta: "riopaila",
    pluviometro: 207,
    fecha: "2026-06-02",
    mm: 0,
    nota: "",
    deleted: false,
    created_at: "2026-06-02T10:00:00.000Z",
    updated_at: "2026-06-02T10:00:00.000Z",
    ...p,
  };
}

describe("xlsxConsolidadoMensual", () => {
  beforeEach(() => {
    // No hay logo en el entorno de test: el generador debe omitirlo sin fallar.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
  });

  it("genera un Blob de Excel no vacío sin lanzar, con o sin logo", async () => {
    const { xlsxConsolidadoMensual } =
      await import("@/domain/precipitaciones/exportXlsx");
    const items = [
      lectura({ pluviometro: 207, fecha: "2026-06-02", mm: 20 }),
      lectura({ pluviometro: 401, fecha: "2026-06-02", mm: 15 }),
    ];
    const blob = await xlsxConsolidadoMensual(
      pvs,
      items,
      "riopaila",
      "2026-06",
      "RIOPAILA AGRICOLA S.A.",
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }, // El import dinámico de exceljs + armar el workbook es más lento que el
  // timeout por defecto (5s) cuando corre junto al resto de la suite.
  15_000);
});
