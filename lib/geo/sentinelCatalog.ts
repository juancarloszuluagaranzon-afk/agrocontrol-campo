/**
 * Catálogo de fechas de adquisición Sentinel-2 sobre el AOI (ADR-0025).
 *
 * Se consulta la **Catalog API (STAC) de CDSE**, que exige OAuth → se hace desde
 * una ruta serverless (`/api/sentinel-dates`) que guarda el secreto; aquí viven
 * solo los helpers **puros** (armado del cuerpo y dedup del resultado), testeables
 * sin red.
 */

/** Una fecha con imagen y su nubosidad (0–100 %). */
export interface CatalogDate {
  date: string; // YYYY-MM-DD
  cloud: number; // % de nubes de la mejor escena de ese día
}

interface CatalogFeature {
  properties?: {
    datetime?: string;
    "eo:cloud_cover"?: number;
  };
}

/** BBOX [W,S,E,N] del AOI (tupla WGS84). */
export type Bbox = [number, number, number, number];

/**
 * Cuerpo de la búsqueda STAC: Sentinel-2 L2A que intersecta el AOI en el rango
 * de fechas, pidiendo solo fecha y nubosidad (sin geometría) para respuestas
 * livianas.
 */
export function catalogSearchBody(
  bbox: Bbox,
  fromISO: string,
  toISO: string,
  limit = 100,
) {
  return {
    collections: ["sentinel-2-l2a"],
    bbox,
    datetime: `${fromISO}/${toISO}`,
    limit,
    fields: {
      include: ["properties.datetime", "properties.eo:cloud_cover"],
      exclude: ["geometry", "assets", "links"],
    },
  };
}

/**
 * Convierte las features STAC en fechas únicas. Un mismo día puede traer varias
 * teselas (varias features); se conserva la **menor nubosidad** de ese día.
 * Ordenado ascendente por fecha.
 */
export function parseCatalogDates(features: CatalogFeature[]): CatalogDate[] {
  const byDate = new Map<string, number>();
  for (const f of features) {
    const dt = f.properties?.datetime;
    if (!dt) continue;
    const date = dt.slice(0, 10);
    const cloudRaw = f.properties?.["eo:cloud_cover"];
    const cloud = Math.round(typeof cloudRaw === "number" ? cloudRaw : 100);
    const prev = byDate.get(date);
    if (prev === undefined || cloud < prev) byDate.set(date, cloud);
  }
  return [...byDate.entries()]
    .map(([date, cloud]) => ({ date, cloud }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
