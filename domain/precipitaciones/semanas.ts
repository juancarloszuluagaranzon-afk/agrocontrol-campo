/**
 * Semana ISO-8601 (igual a `WEEKNUM(..., 21)` de Excel) y agrupación de los
 * días de un mes por semana, para los encabezados "SEMANA N" del reporte
 * (tabla en pantalla y XLSX). No replica un esquema propietario del Excel del
 * usuario: es el estándar, verificable independientemente.
 */

/** Número de semana ISO-8601 de una fecha `YYYY-MM-DD`. */
export function isoWeek(fechaISO: string): number {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(y!, m! - 1, d));
  const dia = fecha.getUTCDay() || 7; // lunes=1 .. domingo=7
  fecha.setUTCDate(fecha.getUTCDate() + 4 - dia); // jueves de esa semana
  const inicioAnio = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((fecha.getTime() - inicioAnio.getTime()) / 86_400_000 + 1) / 7,
  );
}

export interface GrupoSemana {
  semana: number;
  /** Día del mes (1-indexado) donde empieza el grupo dentro de este mes. */
  desde: number;
  /** Día del mes donde termina el grupo dentro de este mes. */
  hasta: number;
  cantidadDias: number;
}

/**
 * Agrupa los días 1..`dias` de `anioMes` en tramos consecutivos que caen en
 * la misma semana ISO — para los encabezados combinados "SEMANA N".
 */
export function agruparPorSemana(anioMes: string, dias: number): GrupoSemana[] {
  const grupos: GrupoSemana[] = [];
  for (let d = 1; d <= dias; d++) {
    const semana = isoWeek(`${anioMes}-${String(d).padStart(2, "0")}`);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.semana === semana) {
      ultimo.hasta = d;
      ultimo.cantidadDias += 1;
    } else {
      grupos.push({ semana, desde: d, hasta: d, cantidadDias: 1 });
    }
  }
  return grupos;
}
