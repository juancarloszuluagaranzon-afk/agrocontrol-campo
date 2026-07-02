import type { Precipitacion } from "@/domain/precipitaciones/schema";
import type { PluviometroRef } from "@/domain/pluviometros/schema";
import {
  acumulado,
  inicioAnio,
  lecturaDelDia,
} from "@/domain/precipitaciones/acumulado";

/**
 * Agregación única del **consolidado mensual** de precipitación (fuente de
 * verdad compartida por el CSV, la tabla en pantalla y el XLSX — un solo
 * cálculo, tres presentaciones). Agrupa por zona, calcula el promedio
 * **ponderado por área de influencia** (Thiessen) por zona y el total de la
 * planta.
 */

export interface ReporteFila {
  zona: string | number | null;
  hacienda: string | null;
  sitio: string | null;
  tecnico: string | null;
  pluviometro: number;
  areaHa: number | null;
  /** mm por día del mes (índice 0 = día 1); `null` = sin lectura ese día. */
  diasMm: (number | null)[];
  acumMes: number;
  acumAnio: number;
}

export interface ReportePonderado {
  etiqueta: string;
  zona: string | number | null;
  areaHa: number;
  /** mm ponderado por día (0 si no hay área o no hay lecturas). */
  diasMm: number[];
  acumMes: number;
  acumAnio: number;
}

export interface ReporteZona {
  zona: string;
  filas: ReporteFila[];
  promedio: ReportePonderado;
}

export interface ReporteMensual {
  anioMes: string;
  dias: number;
  zonas: ReporteZona[];
  total: ReportePonderado;
}

/** Días que tiene el mes `YYYY-MM`. */
export function diasDelMes(anioMes: string): number {
  const [y, m] = anioMes.split("-").map(Number);
  if (!y || !m) return 0;
  return new Date(y, m, 0).getDate();
}

function redondea1(n: number): number {
  return Math.round(n * 10) / 10;
}

function zonaOrden(z: PluviometroRef["zona"]): number {
  const n = Number(z);
  return Number.isFinite(n) ? n : 999;
}

/** Promedio ponderado por área: Σ(valor·área)/Σ(área). Sin área → 0. */
function ponderado(pares: { valor: number; area: number }[]): number {
  const sumaArea = pares.reduce((s, p) => s + p.area, 0);
  if (sumaArea === 0) return 0;
  const suma = pares.reduce((s, p) => s + p.valor * p.area, 0);
  return redondea1(suma / sumaArea);
}

function areaDe(p: PluviometroRef): number {
  return p.area_ha ?? 0;
}

function filaPonderada(
  etiqueta: string,
  grupo: PluviometroRef[],
  zona: string | number | null,
  items: Precipitacion[],
  planta: string,
  anioMes: string,
  dias: number,
): ReportePonderado {
  const desdeMes = `${anioMes}-01`;
  const hastaMes = `${anioMes}-${String(dias).padStart(2, "0")}`;
  const desdeAnio = inicioAnio(desdeMes);
  const areaTotal = redondea1(grupo.reduce((s, p) => s + areaDe(p), 0));

  const diasMm: number[] = [];
  for (let d = 1; d <= dias; d++) {
    const fecha = `${anioMes}-${String(d).padStart(2, "0")}`;
    diasMm.push(
      ponderado(
        grupo.map((p) => ({
          valor: lecturaDelDia(items, planta, p.id, fecha)?.mm ?? 0,
          area: areaDe(p),
        })),
      ),
    );
  }

  const acumMes = ponderado(
    grupo.map((p) => ({
      valor: acumulado(items, planta, p.id, desdeMes, hastaMes),
      area: areaDe(p),
    })),
  );
  const acumAnio = ponderado(
    grupo.map((p) => ({
      valor: acumulado(items, planta, p.id, desdeAnio, hastaMes),
      area: areaDe(p),
    })),
  );

  return { etiqueta, zona, areaHa: areaTotal, diasMm, acumMes, acumAnio };
}

export function construirReporteMensual(
  pluviometros: PluviometroRef[],
  items: Precipitacion[],
  planta: string,
  anioMes: string,
  nombrePlanta = "Total",
): ReporteMensual {
  const dias = diasDelMes(anioMes);
  const desdeMes = `${anioMes}-01`;
  const hastaMes = `${anioMes}-${String(dias).padStart(2, "0")}`;
  const desdeAnio = inicioAnio(desdeMes);

  const ordenados = [...pluviometros].sort(
    (a, b) =>
      zonaOrden(a.zona) - zonaOrden(b.zona) ||
      (a.tecnico ?? "").localeCompare(b.tecnico ?? "") ||
      a.id - b.id,
  );

  const zonasIds = [...new Set(ordenados.map((p) => String(p.zona ?? "")))];
  const zonas: ReporteZona[] = zonasIds.map((z) => {
    const grupo = ordenados.filter((p) => String(p.zona ?? "") === z);
    const filas: ReporteFila[] = grupo.map((p) => {
      const diasMm: (number | null)[] = [];
      for (let d = 1; d <= dias; d++) {
        const fecha = `${anioMes}-${String(d).padStart(2, "0")}`;
        const l = lecturaDelDia(items, planta, p.id, fecha);
        diasMm.push(l ? l.mm : null);
      }
      return {
        zona: p.zona,
        hacienda: p.hacienda,
        sitio: p.sitio,
        tecnico: p.tecnico,
        pluviometro: p.id,
        areaHa: p.area_ha,
        diasMm,
        acumMes: acumulado(items, planta, p.id, desdeMes, hastaMes),
        acumAnio: acumulado(items, planta, p.id, desdeAnio, hastaMes),
      };
    });
    const promedio = filaPonderada(
      `Promedio Zona ${z}`,
      grupo,
      z,
      items,
      planta,
      anioMes,
      dias,
    );
    return { zona: z, filas, promedio };
  });

  const total = filaPonderada(
    nombrePlanta,
    ordenados,
    "",
    items,
    planta,
    anioMes,
    dias,
  );

  return { anioMes, dias, zonas, total };
}
