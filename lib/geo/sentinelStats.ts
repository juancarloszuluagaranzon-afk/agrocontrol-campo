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
 * truncar NDVI/reflectancia) + `dataMask` con **enmascaramiento de nubes por
 * píxel** vía la Scene Classification Layer (SCL). El Valle es muy nublado
 * (peor en años La Niña): filtrar solo escenas por `maxCloudCoverage` dejaba las
 * ventanas de fase vacías (`null`) y sesgaba la media con píxeles de nube. Con
 * SCL se descarta nube/sombra/cirro/nieve **píxel a píxel**, así se pueden
 * admitir escenas más nubladas (maxcc alto) sin sesgar el resultado (ADR-0028).
 */
export function statEvalscript(index: StatIndex): string {
  const { bands, expr } = FORMULA[index];
  const input = [...bands, "SCL", "dataMask"].map((b) => `"${b}"`).join(", ");
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
  // SCL: 0,1 sin dato/defecto · 3 sombra · 8,9 nube · 10 cirro · 11 nieve.
  // clear=0 en esos → dataMask 0 → el píxel NO entra en la estadística.
  var scl = s.SCL;
  var clear = (scl === 0 || scl === 1 || scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11) ? 0 : 1;
  return { index: [${expr}], dataMask: [s.dataMask * clear] };
}`;
}

// Duración del intervalo = span de fechas, para que UN intervalo cubra el
// período y quede DENTRO del rango [from 00:00, to 23:59]. (Con +1 día el
// intervalo excedía el rango → la API no creaba ninguno → data vacía.)
const dayDur = (fromISO: string, toISO: string): string => {
  const ms =
    Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`);
  const days = Math.max(1, Math.round(ms / 86_400_000));
  return `P${days}D`;
};

// Reproyección lon/lat (EPSG:4326) → Web Mercator (EPSG:3857, metros). Se usa
// una CRS métrica para que `resx/resy = 10` sean 10 m reales (Sentinel-2);
// en grados el tablón caía por debajo de 1 píxel (data vacía).
const MERC_R = 20037508.342789244;
const toMerc = (p: number[]): [number, number] => [
  ((p[0] ?? 0) * MERC_R) / 180,
  (Math.log(Math.tan(((90 + (p[1] ?? 0)) * Math.PI) / 360)) * MERC_R) / Math.PI,
];

/** Reproyecta un Polygon/MultiPolygon de lon/lat a EPSG:3857. */
export function reprojectTo3857(g: Geometry): Geometry {
  if (g.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: g.coordinates.map((r) => r.map(toMerc)),
    };
  }
  if (g.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: g.coordinates.map((poly) => poly.map((r) => r.map(toMerc))),
    };
  }
  return g;
}

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
  // Con el enmascaramiento SCL (ADR-0028) las nubes se descartan por píxel, así
  // que admitir escenas más nubladas (60 %) rinde más ventanas con dato sin
  // sesgar la media —clave en época lluviosa—.
  maxcc = 60,
  // Duración del intervalo de agregación (ISO-8601, p. ej. `"P30D"`). Sin él,
  // **un solo intervalo** cubre todo el período (media/mín/máx del rango). Con
  // él, la Statistical API devuelve **una serie** —un punto por intervalo—: es
  // la **curva temporal** por suerte (ADR-0029).
  interval?: string,
) {
  return {
    input: {
      bounds: {
        // Geometría reproyectada a EPSG:3857 (metros) para que resx/resy=10 sean
        // 10 m reales. CRS soportado por Sentinel Hub.
        geometry: reprojectTo3857(geometry),
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/3857" },
      },
      data: [
        { type: "sentinel-2-l2a", dataFilter: { maxCloudCoverage: maxcc } },
      ],
    },
    aggregation: {
      timeRange: { from: `${fromISO}T00:00:00Z`, to: `${toISO}T23:59:59Z` },
      aggregationInterval: { of: interval ?? dayDur(fromISO, toISO) },
      resx: 10,
      resy: 10,
      evalscript: statEvalscript(index),
    },
    // Sin `calculations` → la Statistical API calcula las estadísticas por
    // defecto (min/max/mean/stDev/sampleCount) de las salidas (dataMask se
    // excluye). (`calculations: {}` puede interpretarse como "no calcular nada".)
  };
}

interface StatsApiBandStats {
  // La Statistical API puede devolver los estadísticos como número o como el
  // **string `"NaN"`** cuando, tras enmascarar nubes con SCL (ADR-0028), no
  // queda ningún píxel válido en el intervalo (aunque `sampleCount` > 0).
  min?: number | string;
  max?: number | string;
  mean?: number | string;
  stDev?: number | string;
  sampleCount?: number;
}

/** Número finito o el fallback (descarta `"NaN"`/strings/no-finitos). */
function finiteOr(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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
/** Estadísticas de **un** intervalo (primera banda con media finita) o `null`. */
function intervalStats(interval: { outputs?: unknown }): SuerteStats | null {
  for (const out of values(interval.outputs)) {
    for (const band of values((out as { bands?: unknown }).bands)) {
      const st = (band as { stats?: StatsApiBandStats }).stats;
      const mean = Number(st?.mean);
      // Requiere media **finita**: `"NaN"` (todo nube tras SCL) o sin muestras
      // → se ignora este intervalo/banda; sin ninguna válida → null.
      if (st?.sampleCount && Number.isFinite(mean)) {
        return {
          mean,
          min: finiteOr(st.min, mean),
          max: finiteOr(st.max, mean),
          stDev: finiteOr(st.stDev, 0),
          samples: st.sampleCount,
        };
      }
    }
  }
  return null;
}

export function parseStats(json: {
  data?: { outputs?: unknown }[];
}): SuerteStats | null {
  for (const interval of json.data ?? []) {
    const s = intervalStats(interval);
    if (s) return s;
  }
  return null;
}

/** Un punto de la curva temporal: su ventana `[from,to)` y sus estadísticas. */
export interface SeriesPoint {
  from: string | null;
  to: string | null;
  stats: SuerteStats | null;
}

/**
 * Serie temporal: **un punto por intervalo** de la respuesta (con `interval`).
 * Conserva los huecos (`stats: null` cuando el intervalo cayó todo-nube) para no
 * falsear la curva; el cliente decide si interpola.
 */
export function parseStatsSeries(json: {
  data?: { interval?: { from?: string; to?: string }; outputs?: unknown }[];
}): SeriesPoint[] {
  return (json.data ?? []).map((interval) => ({
    from: interval.interval?.from ?? null,
    to: interval.interval?.to ?? null,
    stats: intervalStats(interval),
  }));
}
