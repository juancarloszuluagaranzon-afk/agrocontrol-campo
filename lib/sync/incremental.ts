/**
 * Sincronización incremental (ADR-0033): funciones puras que deciden qué
 * bajar y cómo fusionarlo con la caché local. Sin red ni stores: testeables.
 */

/** Segundos de solape al reanudar desde un cursor: evita perder filas cuyo
 *  `updated_at` coincide con el cursor o llegó en otra transacción. Las filas
 *  repetidas son inocuas (se fusionan por id). */
export const SOLAPE_S = 5;

/** Días hacia atrás que siempre se conservan de precipitaciones, aunque el
 *  año cambie (la planilla "día vencido" del 1 de enero necesita diciembre). */
export const DIAS_MINIMOS_PRECIP = 60;

/** Cursor de reanudación con solape: `updated_at >= cursor − SOLAPE_S`. */
export function desdeConSolape(cursor: string): string {
  return new Date(new Date(cursor).getTime() - SOLAPE_S * 1000).toISOString();
}

/** Mayor `updated_at` visto (ISO), o el cursor previo si no llegó nada. */
export function cursorDesde(
  filas: ReadonlyArray<{ updated_at: string }>,
  previo: string | null,
): string | null {
  let max = previo;
  for (const f of filas) if (!max || f.updated_at > max) max = f.updated_at;
  return max;
}

/**
 * Fecha (YYYY-MM-DD) desde la que se bajan/conservan precipitaciones: el 1 de
 * enero del año en curso, o `DIAS_MINIMOS_PRECIP` días atrás si eso es antes.
 */
export function inicioVentanaPrecipitaciones(hoy: Date): string {
  const enero = new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1));
  const atras = new Date(hoy.getTime() - DIAS_MINIMOS_PRECIP * 86_400_000);
  return (atras < enero ? atras : enero).toISOString().slice(0, 10);
}

/** Descarta filas con `fecha` anterior a la ventana (mantiene chica la caché). */
export function podarPorFecha<T extends { fecha: string }>(
  items: ReadonlyArray<T>,
  desde: string,
): T[] {
  return items.filter((i) => i.fecha >= desde);
}

/**
 * Fusiona lo bajado con la caché local.
 * - `modo: "reemplazar"` (sin cursor: primera vez o cambio de usuario): la
 *   verdad es el servidor; solo sobreviven los pendientes locales.
 * - `modo: "fusionar"` (con cursor): lo local se conserva y las filas bajadas
 *   lo sobreescriben por id (incluidos borrados lógicos, `deleted: true`).
 * En ambos, un pendiente local gana sobre la versión remota de su mismo id.
 */
export function fusionarRemoto<T extends { id: string }>(
  locales: ReadonlyArray<T>,
  remotos: ReadonlyArray<T>,
  pendingIds: ReadonlyArray<string>,
  modo: "reemplazar" | "fusionar",
): T[] {
  const byId = new Map<string, T>();
  if (modo === "fusionar") for (const l of locales) byId.set(l.id, l);
  for (const r of remotos) byId.set(r.id, r);
  const pendientes = new Set(pendingIds);
  for (const l of locales) if (pendientes.has(l.id)) byId.set(l.id, l);
  return [...byId.values()];
}
