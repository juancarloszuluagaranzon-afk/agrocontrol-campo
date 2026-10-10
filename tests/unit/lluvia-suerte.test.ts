import { describe, it, expect } from "vitest";
import {
  asignarPluviometros,
  centrosDeSuertes,
  etiquetaLluvia,
  lluviaPorSuerte,
  nivelLluvia,
  puntoEnPoligono,
  ventanaLluvia,
} from "@/domain/precipitaciones/porSuerte";
import type { Precipitacion } from "@/domain/precipitaciones/schema";

const cuadrado = (x0: number, y0: number, x1: number, y1: number) => [
  [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ],
];

function lectura(p: Partial<Precipitacion>): Precipitacion {
  return {
    id: Math.random().toString(36).slice(2),
    autor: "a",
    planta: "riopaila",
    pluviometro: 207,
    fecha: "2026-10-09",
    mm: 0,
    nota: "",
    deleted: false,
    created_at: "2026-10-10T00:00:00Z",
    updated_at: "2026-10-10T00:00:00Z",
    ...p,
  } as Precipitacion;
}

describe("ventanaLluvia", () => {
  it("termina ayer (día vencido) y abarca N días", () => {
    const v = ventanaLluvia(new Date(2026, 9, 10), 3);
    expect(v).toEqual({
      desde: "2026-10-07",
      hasta: "2026-10-09",
      fechas: ["2026-10-07", "2026-10-08", "2026-10-09"],
    });
  });
  it("cruza el cambio de mes", () => {
    expect(ventanaLluvia(new Date(2026, 10, 2), 5).desde).toBe("2026-10-28");
  });
});

describe("puntoEnPoligono / asignarPluviometros", () => {
  const thiessen = [
    { pluviometro: 207, poligonos: [cuadrado(0, 0, 1, 1)] },
    { pluviometro: 208, poligonos: [cuadrado(1, 0, 2, 1)] },
  ];
  const pluvios = [
    { id: 207, lon: 0.5, lat: 0.5 },
    { id: 208, lon: 1.5, lat: 0.5 },
    { id: 209, lon: 5, lat: 5 },
  ];

  it("detecta el punto dentro y respeta huecos", () => {
    expect(puntoEnPoligono(0.5, 0.5, cuadrado(0, 0, 1, 1))).toBe(true);
    expect(puntoEnPoligono(1.5, 0.5, cuadrado(0, 0, 1, 1))).toBe(false);
    const conHueco = [...cuadrado(0, 0, 4, 4), ...cuadrado(1, 1, 2, 2)];
    expect(puntoEnPoligono(1.5, 1.5, conHueco)).toBe(false);
    expect(puntoEnPoligono(3, 3, conHueco)).toBe(true);
  });

  it("asigna por Thiessen y, fuera de la red, al pluviómetro más cercano", () => {
    const a = asignarPluviometros(
      [
        { sec_ste: "A", lon: 0.4, lat: 0.4 },
        { sec_ste: "B", lon: 1.6, lat: 0.2 },
        { sec_ste: "C", lon: 4.8, lat: 4.9 },
      ],
      thiessen,
      pluvios,
    );
    expect(Object.fromEntries(a)).toEqual({ A: 207, B: 208, C: 209 });
  });
});

describe("centrosDeSuertes", () => {
  it("promedia los centros de los tablones ponderando por área", () => {
    const c = centrosDeSuertes([
      { sec_ste: "S", lon: 0, lat: 0, ha: 3 },
      { sec_ste: "S", lon: 4, lat: 4, ha: 1 },
    ]);
    expect(c).toEqual([{ sec_ste: "S", lon: 1, lat: 1 }]);
  });
});

describe("lluviaPorSuerte / etiquetaLluvia / nivelLluvia", () => {
  const fechas = ["2026-10-07", "2026-10-08", "2026-10-09"];
  const asignacion = new Map([
    ["A", 207],
    ["B", 208],
  ]);

  it("suma la ventana, toma la lectura más reciente por día y avisa días faltantes", () => {
    const items = [
      lectura({ pluviometro: 207, fecha: "2026-10-07", mm: 4 }),
      lectura({
        pluviometro: 207,
        fecha: "2026-10-08",
        mm: 10,
        updated_at: "2026-10-09T00:00:00Z",
      }),
      lectura({
        pluviometro: 207,
        fecha: "2026-10-08",
        mm: 12,
        updated_at: "2026-10-09T05:00:00Z",
      }),
      lectura({ pluviometro: 207, fecha: "2026-10-09", mm: 0 }),
      lectura({ pluviometro: 207, fecha: "2026-10-01", mm: 99 }), // fuera de la ventana
      lectura({ pluviometro: 207, fecha: "2026-10-09", mm: 50, deleted: true }),
      lectura({
        pluviometro: 207,
        fecha: "2026-10-09",
        mm: 70,
        planta: "castilla",
      }),
    ];
    const r = lluviaPorSuerte(items, "riopaila", asignacion, fechas);
    expect(r.get("A")).toEqual({
      pluviometro: 207,
      mm: 16,
      diasConDato: 3,
      dias: 3,
    });
    expect(r.get("B")).toEqual({
      pluviometro: 208,
      mm: null,
      diasConDato: 0,
      dias: 3,
    });
    expect(etiquetaLluvia(r.get("A")!)).toBe("16 mm");
    expect(etiquetaLluvia(r.get("B")!)).toBe("s/d");
  });

  it("marca con asterisco cuando faltan días en la ventana", () => {
    const r = lluviaPorSuerte(
      [lectura({ pluviometro: 207, fecha: "2026-10-09", mm: 2.5 })],
      "riopaila",
      asignacion,
      fechas,
    );
    expect(etiquetaLluvia(r.get("A")!)).toBe("2,5 mm*");
  });

  it("clasifica por umbrales: hasta 5 seca, hasta 15 moderada, más alta", () => {
    expect(nivelLluvia(0)).toBe("seca");
    expect(nivelLluvia(5)).toBe("seca");
    expect(nivelLluvia(5.1)).toBe("moderada");
    expect(nivelLluvia(15)).toBe("moderada");
    expect(nivelLluvia(15.1)).toBe("alta");
    expect(nivelLluvia(null)).toBe("sinDato");
  });
});
