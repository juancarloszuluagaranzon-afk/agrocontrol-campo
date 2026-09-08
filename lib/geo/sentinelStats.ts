import type { Geometry } from "geojson";

/**
 * Estadísticas por suerte (media/mín/máx de un índice sobre un tablón) usando la
 * **Statistical API** de Sentinel Hub (ADR-0027). Requiere OAuth (compartido con
 * el calendario). Aquí viven solo los helpers **puros** (evalscript por índice,
 * cuerpo de la petición y parseo); la llamada con red va en `/api/sentinel-stats`.
 */

/** Índices que soportan estadísticas por suerte. */
export const STAT_INDEXES = ["NDVI", "NDMI", "EVI", "NIR"] as const;
export type StatIndex = (typeof STAT_INDEXES)[number];

export function isStatIndex(x: string): x is StatIndex {
  return (STAT_INDEXES as readonly string[]).includes(x);
}

/** Estadísticas de un índice sobre una geometría. */
export interface SuerteStats {
  mean: number;
  min: number;
  max: number;
  stDev: number;
  samples: number;
}

// Bandas y fórmula por índice (mismas que los evalscripts de color en CDSE, pero
// devolviendo el VALOR, no color — para la Statistical API).
const FORMULA: Record<StatIndex, { bands: string[]; expr: string }> = {
  NDVI: { bands: ["B04", "B08"], expr: "(s.B08 - s.B04) / (s.B08 + s.B04)" },
  NDMI: { bands: ["B08", "B11"], expr: "(s.B08 - s.B11) / (s.B08 + s.B11)" },
  EVI: {
    bands: ["B02", "B04", "B08"],
    expr: "2.5 * (s.B08 - s.B04) / (s.B08 + 6.0 * s.B04 - 7.5 * s.B02 + 1.0)",
  },
  NIR: { bands: ["B08"], expr: "s.B08" },
};

/**
 * Evalscript de estadísticas: emite el **valor** del índice (FLOAT32, para no
 * truncar NDVI/reflectancia) + `dataMask` (obligatorio: excluye píxeles sin
 * dato/nubes del cálculo).
 */
export function statEvalscript(index: StatIndex): string {
  const { bands, expr } = FORMULA[index];
  const input = [...bands, "dataMask"].map((b) => `"${b}"`).join(", ");
  return `//VERSION=3
function setup() {
  return {
    input: [${input}],
    output: [
      { id: "index", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  return { index: [${expr}], dataMask: [s.dataMask] };
}`;
}

const dayDur = (fromISO: string, toISO: string): string => {
  const ms =
    Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`);
  const days = Math.max(1, Math.round(ms / 86_400_000) + 1);
  return `P${days}D`;
};

/**
 * Cuerpo de la Statistical API: estadísticas del índice sobre la geometría del
 * tablón (CRS84 lon/lat) en la ventana `from..to`, como **un solo intervalo**
 * (agrega todas las escenas del período bajo `maxCloudCoverage`).
 */
export function statsBody(
  geometry: Geometry,
  fromISO: string,
  toISO: string,
  index: StatIndex,
  maxcc = 20,
) {
  return {
    input: {
      bounds: {
        geometry,
        // GeoJSON lon/lat; Sentinel Hub lo interpreta con este CRS (EPSG:4326).
        properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
      },
      data: [
        { type: "sentinel-2-l2a", dataFilter: { maxCloudCoverage: maxcc } },
      ],
    },
    aggregation: {
      timeRange: { from: `${fromISO}T00:00:00Z`, to: `${toISO}T23:59:59Z` },
      aggregationInterval: { of: dayDur(fromISO, toISO) },
      resx: 10,
      resy: 10,
      evalscript: statEvalscript(index),
    },
    // `{}` = estadísticas por defecto (min/max/mean/stDev/sampleCount) de las
    // salidas (dataMask se excluye del cálculo).
    calculations: {},
  };
}

interface StatsApiBandStats {
  min?: number;
  max?: number;
  mean?: number;
  stDev?: number;
  sampleCount?: number;
}

/** Normaliza un objeto `{k:v}` o array a una lista de valores. */
function values(x: unknown): unknown[] {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") return Object.values(x as object);
  return [];
}

/**
 * Extrae media/mín/máx del **primer intervalo con datos**. Devuelve `null` si no
 * hay píxeles válidos (nubes/sin escena en el período). Robusto a que `outputs`
 * y `bands` vengan como objeto o como array (la doc los muestra de ambas formas).
 */
export function parseStats(json: {
  data?: { outputs?: unknown }[];
}): SuerteStats | null {
  for (const interval of json.data ?? []) {
    for (const out of values(interval.outputs)) {
      for (const band of values((out as { bands?: unknown }).bands)) {
        const st = (band as { stats?: StatsApiBandStats }).stats;
        if (st?.sampleCount && st.mean != null) {
          return {
            mean: st.mean,
            min: st.min ?? st.mean,
            max: st.max ?? st.mean,
            stDev: st.stDev ?? 0,
            samples: st.sampleCount,
          };
        }
      }
    }
  }
  return null;
}
