/**
 * Lectura de la georreferencia de un GeoPDF (estilo Avenza/QGIS) para el "Plano
 * de campo" (§ ADR-0008). Estos PDF traen la georreferencia en `/VP/Measure`:
 * `/GPTS` (4 esquinas geo, lat,lon) y `/BBox` (las mismas esquinas en puntos de
 * página). En los exportados por QGIS el objeto de página NO va en object stream,
 * así que `/GPTS` y `/BBox` están en **texto plano** y se parsean por bytes (sin
 * dependencias). El núcleo es puro y testeable; el render/rasterizado va aparte.
 */

/** Punto geográfico `[lon, lat]` (orden GeoJSON/MapLibre). */
export type LonLat = [number, number];

export interface GeoRef {
  /** Esquinas en orden MapLibre ImageSource: TL, TR, BR, BL (cada una [lon,lat]). */
  coordinates: [LonLat, LonLat, LonLat, LonLat];
  /** Caja envolvente `[minLon, minLat, maxLon, maxLat]`. */
  bbox: [number, number, number, number];
  /** Caja de la página en puntos PDF `[x0, y0, x1, y1]` (para la transformación). */
  pageBBox: [number, number, number, number];
}

/** Decodifica bytes a string latin1 por trozos (evita límites de pila). */
function toLatin1(bytes: Uint8Array): string {
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return s;
}

/** Lee los números de un array PDF `[ ... ]` que sigue a `token`. */
function readNumberArray(haystack: string, token: string): number[] | null {
  const i = haystack.indexOf(token);
  if (i < 0) return null;
  const open = haystack.indexOf("[", i);
  const close = haystack.indexOf("]", open);
  if (open < 0 || close < 0) return null;
  const nums = haystack
    .slice(open + 1, close)
    .trim()
    .split(/\s+/)
    .map(Number);
  return nums.some((n) => Number.isNaN(n)) ? null : nums;
}

/**
 * Lee `/GPTS` (8 números: 4 pares lat,lon) del GeoPDF. Devuelve null si el PDF no
 * trae georreferencia GEO.
 */
export function parseGpts(bytes: Uint8Array): number[] | null {
  const s = toLatin1(bytes);
  if (s.indexOf("/GPTS") < 0) return null;
  const g = readNumberArray(s, "/GPTS");
  return g && g.length === 8 ? g : null;
}

/** Lee la `/BBox` del viewport (`/VP`) en puntos de página. */
function parseVpBBox(
  bytes: Uint8Array,
): [number, number, number, number] | null {
  const s = toLatin1(bytes);
  const vp = s.indexOf("/VP");
  if (vp < 0) return null;
  const b = readNumberArray(s.slice(vp), "/BBox");
  return b && b.length === 4 ? [b[0]!, b[1]!, b[2]!, b[3]!] : null;
}

/** Convierte los 8 números de `/GPTS` en las 4 esquinas geo `[lon,lat]`. */
function gptsCorners(gpts: number[]): {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
} {
  const lats = [gpts[0]!, gpts[2]!, gpts[4]!, gpts[6]!];
  const lons = [gpts[1]!, gpts[3]!, gpts[5]!, gpts[7]!];
  return {
    minLon: Math.min(...lons),
    minLat: Math.min(...lats),
    maxLon: Math.max(...lons),
    maxLat: Math.max(...lats),
  };
}

/**
 * Coordenadas para el `image` source de MapLibre, en orden TL, TR, BR, BL. Como
 * estas hojas son rectángulos alineados a ejes (sin rotación), se derivan de la
 * bbox (esquinas geográficas).
 */
export function gptsToImageCoordinates(
  gpts: number[],
): [LonLat, LonLat, LonLat, LonLat] {
  const { minLon, minLat, maxLon, maxLat } = gptsCorners(gpts);
  return [
    [minLon, maxLat], // top-left
    [maxLon, maxLat], // top-right
    [maxLon, minLat], // bottom-right
    [minLon, minLat], // bottom-left
  ];
}

/** Bounds `[[minLon,minLat],[maxLon,maxLat]]` para `fitBounds`. */
export function gptsToBounds(gpts: number[]): [LonLat, LonLat] {
  const { minLon, minLat, maxLon, maxLat } = gptsCorners(gpts);
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

/**
 * Construye la georreferencia completa de un GeoPDF, o null si no es un GeoPDF
 * válido (sin `/GPTS`). `pageBBox` cae a A4 si no se encuentra (no afecta al
 * backdrop, solo a la conversión de puntos de página → geo).
 */
export function parseGeoRef(bytes: Uint8Array): GeoRef | null {
  const gpts = parseGpts(bytes);
  if (!gpts) return null;
  const { minLon, minLat, maxLon, maxLat } = gptsCorners(gpts);
  return {
    coordinates: gptsToImageCoordinates(gpts),
    bbox: [minLon, minLat, maxLon, maxLat],
    pageBBox: parseVpBBox(bytes) ?? [0, 0, 595, 842],
  };
}

/**
 * Transforma un punto de la **página PDF** `(px, py)` a `[lon, lat]`, asumiendo
 * rectángulo alineado a ejes (la `pageBBox` mapea a la bbox geográfica). Se usa
 * para ubicar los puntos de muestreo extraídos del contenido del PDF.
 */
export function pageToLonLat(ref: GeoRef, px: number, py: number): LonLat {
  const [x0, y0, x1, y1] = ref.pageBBox;
  const [minLon, minLat, maxLon, maxLat] = ref.bbox;
  const u = (px - x0) / (x1 - x0);
  const v = (py - y0) / (y1 - y0);
  return [minLon + u * (maxLon - minLon), minLat + v * (maxLat - minLat)];
}
