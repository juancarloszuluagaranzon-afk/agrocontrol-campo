/**
 * Adornos de temporada, sobrios y solo en la cabecera (nunca sobre el mapa).
 * Se activan y desactivan solos por fecha local, sin volver a publicar.
 */

/** Halloween: del 14 de octubre al 1 de noviembre (inclusive), cada año. */
export const HALLOWEEN = {
  desde: { mes: 10, dia: 14 },
  hasta: { mes: 11, dia: 1 },
} as const;

/** ¿La fecha local cae en la temporada de Halloween? */
export function esHalloween(fecha: Date): boolean {
  const md = (fecha.getMonth() + 1) * 100 + fecha.getDate();
  const desde = HALLOWEEN.desde.mes * 100 + HALLOWEEN.desde.dia;
  const hasta = HALLOWEEN.hasta.mes * 100 + HALLOWEEN.hasta.dia;
  return md >= desde && md <= hasta;
}
