import type { Precipitacion } from "@/domain/precipitaciones/schema";

/**
 * Cálculos puros sobre las lecturas de precipitación (compartidas). Se usan en
 * la planilla (acumulado mes/año por pluviómetro) y en el mapa (mm de hoy).
 */

function activasDe(
  items: Precipitacion[],
  planta: string,
  pluviometro: number,
): Precipitacion[] {
  return items.filter(
    (p) => !p.deleted && p.planta === planta && p.pluviometro === pluviometro,
  );
}

/**
 * Lectura más reciente (por `updated_at`) de un pluviómetro en una fecha, o
 * `null`. Sirve para precargar la planilla y para el mm del día en el mapa.
 */
export function lecturaDelDia(
  items: Precipitacion[],
  planta: string,
  pluviometro: number,
  fecha: string,
): Precipitacion | null {
  const dia = activasDe(items, planta, pluviometro).filter(
    (p) => p.fecha === fecha,
  );
  if (dia.length === 0) return null;
  return dia.reduce((a, b) => (a.updated_at >= b.updated_at ? a : b));
}

/**
 * Acumulado de mm de un pluviómetro entre dos fechas ISO (inclusive). Si hay
 * varias lecturas para un mismo día (distintos autores), toma la más reciente.
 */
export function acumulado(
  items: Precipitacion[],
  planta: string,
  pluviometro: number,
  desdeISO: string,
  hastaISO: string,
): number {
  const enRango = activasDe(items, planta, pluviometro).filter(
    (p) => p.fecha >= desdeISO && p.fecha <= hastaISO,
  );
  // Una lectura por día: la más reciente.
  const porDia = new Map<string, Precipitacion>();
  for (const p of enRango) {
    const prev = porDia.get(p.fecha);
    if (!prev || p.updated_at > prev.updated_at) porDia.set(p.fecha, p);
  }
  let total = 0;
  for (const p of porDia.values()) total += p.mm;
  return Math.round(total * 10) / 10;
}

/** Primer día del mes de `fechaISO` (YYYY-MM-01). */
export function inicioMes(fechaISO: string): string {
  return `${fechaISO.slice(0, 7)}-01`;
}

/** Primer día del año de `fechaISO` (YYYY-01-01). */
export function inicioAnio(fechaISO: string): string {
  return `${fechaISO.slice(0, 4)}-01-01`;
}
