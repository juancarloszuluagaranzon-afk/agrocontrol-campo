import type { CatalogoEntry } from "@/domain/suertes/schema";

/** Resumen de área neta agregada por hacienda. */
export interface ResumenHacienda {
  hacienda: string;
  /** hectáreas oficiales sumadas (área neta) */
  ha: number;
  /** número de tablones */
  tablones: number;
  /** número de suertes distintas */
  suertes: number;
}

/**
 * Agrega el catálogo de tablones por hacienda: suma el área oficial (área neta),
 * cuenta tablones y suertes distintas. Ordena de mayor a menor área (§11).
 */
export function areaPorHacienda(catalogo: CatalogoEntry[]): ResumenHacienda[] {
  const acc = new Map<
    string,
    { ha: number; tablones: number; suertes: Set<string> }
  >();
  for (const e of catalogo) {
    const cur = acc.get(e.hacienda) ?? {
      ha: 0,
      tablones: 0,
      suertes: new Set<string>(),
    };
    cur.ha += e.ha;
    cur.tablones += 1;
    cur.suertes.add(e.sec_ste);
    acc.set(e.hacienda, cur);
  }
  return [...acc.entries()]
    .map(([hacienda, v]) => ({
      hacienda,
      ha: v.ha,
      tablones: v.tablones,
      suertes: v.suertes.size,
    }))
    .sort((a, b) => b.ha - a.ha);
}

/** Totales generales (pie de tabla). */
export function totalResumen(
  filas: ResumenHacienda[],
): Omit<ResumenHacienda, "hacienda"> {
  return filas.reduce(
    (t, f) => ({
      ha: t.ha + f.ha,
      tablones: t.tablones + f.tablones,
      suertes: t.suertes + f.suertes,
    }),
    { ha: 0, tablones: 0, suertes: 0 },
  );
}
