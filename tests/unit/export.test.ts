import { describe, it, expect } from "vitest";
import {
  csvConsolidadoMensual,
  diasDelMes,
} from "@/domain/precipitaciones/export";
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
    id: 208,
    zona: 1,
    tecnico: "Manuel Primero",
    hacienda: "La Luisa 2",
    sitio: "Suerte 140,130", // coma en el texto: debe ir entre comillas
    area_ha: 300,
    lat: 4.35,
    lon: -76.1,
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

describe("diasDelMes", () => {
  it("cuenta los días del mes", () => {
    expect(diasDelMes("2026-06")).toBe(30);
    expect(diasDelMes("2026-02")).toBe(28);
    expect(diasDelMes("2026-01")).toBe(31);
  });
});

describe("csvConsolidadoMensual", () => {
  const items = [
    lectura({ pluviometro: 207, fecha: "2026-06-02", mm: 20 }),
    lectura({ pluviometro: 208, fecha: "2026-06-02", mm: 40 }),
    lectura({ pluviometro: 207, fecha: "2026-01-10", mm: 5 }), // suma al año
    lectura({ pluviometro: 207, fecha: "2025-06-02", mm: 99 }), // otro año, no entra
  ];
  const csv = csvConsolidadoMensual(
    pvs,
    items,
    "riopaila",
    "2026-06",
    "RIOPAILA",
  );
  const lineas = csv.split("\r\n");

  it("arranca con BOM y la cabecera con 30 días + acumulados", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lineas[0]).toContain('"1";"2"');
    expect(lineas[0]).toContain('"30";"Acumul. MES";"Acumul. AÑO"');
  });

  it("pone los mm en el día correcto y los acumulados mes/año por PV", () => {
    const fila207 = lineas[1]!;
    expect(fila207.startsWith('"1";"La Luisa 2"')).toBe(true);
    const cols = fila207.split(";");
    // cols: zona,hacienda,sitio,tecnico,id,area, d1..d30, mes, año
    expect(cols[4]).toBe("207");
    expect(cols[6]).toBe(""); // día 1 sin lectura
    expect(cols[7]).toBe("20"); // día 2
    expect(cols[cols.length - 2]).toBe("20"); // acumulado mes
    expect(cols[cols.length - 1]).toBe("25"); // acumulado año (20 jun + 5 ene)
  });

  it("entrecomilla texto con comas", () => {
    expect(lineas[2]).toContain('"Suerte 140,130"');
  });

  it("agrega la fila 'Promedio Zona' ponderada por área", () => {
    // Zona 1: día 2 = (20·100 + 40·300)/400 = 35 mm ponderado.
    const filaZona = lineas.find((l) => l.includes("Promedio Zona 1"))!;
    const cols = filaZona.split(";");
    expect(cols[5]).toBe("400"); // área total de la zona
    expect(cols[7]).toBe("35"); // día 2 ponderado
    expect(cols[cols.length - 2]).toBe("35"); // acumulado mes ponderado
  });

  it("cierra con la fila total de la planta", () => {
    const total = lineas[lineas.length - 1]!;
    expect(total).toContain('"RIOPAILA"');
  });
});
