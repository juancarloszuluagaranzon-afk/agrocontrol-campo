/**
 * Teselas del satélite para usar el mapa sin señal (ADR-0036). Funciones puras:
 * qué teselas cubren las suertes de una planta y cómo armar una tesela faltante
 * a partir de una "madre" de menor zoom. Las usa la app (descarga) y el service
 * worker (respuesta sin red), por eso no dependen del DOM.
 */

/** Plantilla de Esri World Imagery (misma que usa el estilo base del mapa). */
export const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/** Zooms que se descargan: del panorama de la planta al detalle de suerte. */
export const ZOOM_DESCARGA_MIN = 10;
export const ZOOM_DESCARGA_MAX = 18;
/** Hasta este zoom se baja la caja completa de la planta (pocas teselas). */
export const ZOOM_CAJA_COMPLETA = 14;
/** Margen alrededor de cada suerte (~165 m): bordes, callejones y vías. */
export const MARGEN_GRADOS = 0.0015;
/** Peso promedio de una tesela de Esri sobre caña, para estimar el tamaño. */
export const KB_POR_TESELA = 20;

/** Caja WGS84 `[oeste, sur, este, norte]`. */
export type Caja = [number, number, number, number];

export interface Tesela {
  z: number;
  x: number;
  y: number;
}

export function lonATeselaX(lon: number, z: number): number {
  const n = 2 ** z;
  return Math.min(n - 1, Math.max(0, Math.floor(((lon + 180) / 360) * n)));
}

export function latATeselaY(lat: number, z: number): number {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n,
  );
  return Math.min(n - 1, Math.max(0, y));
}

/** Caja de una geometría GeoJSON (cualquier anidamiento de coordenadas). */
export function cajaDeGeometria(geom: { coordinates: unknown }): Caja | null {
  const c: Caja = [Infinity, Infinity, -Infinity, -Infinity];
  const recorrer = (v: unknown): void => {
    if (!Array.isArray(v)) return;
    if (typeof v[0] === "number" && typeof v[1] === "number") {
      c[0] = Math.min(c[0], v[0]);
      c[1] = Math.min(c[1], v[1]);
      c[2] = Math.max(c[2], v[0]);
      c[3] = Math.max(c[3], v[1]);
      return;
    }
    for (const h of v) recorrer(h);
  };
  recorrer(geom.coordinates);
  return Number.isFinite(c[0]) ? c : null;
}

/** Cajas de todos los features con geometría de una colección GeoJSON. */
export function cajasDeColeccion(fc: {
  features: { geometry: { coordinates: unknown } | null }[];
}): Caja[] {
  const cajas: Caja[] = [];
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const c = cajaDeGeometria(f.geometry);
    if (c) cajas.push(c);
  }
  return cajas;
}

function unir(cajas: Caja[]): Caja | null {
  if (cajas.length === 0) return null;
  return cajas.reduce<Caja>(
    (a, b) => [
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.max(a[2], b[2]),
      Math.max(a[3], b[3]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

/**
 * Teselas que cubren las suertes: hasta `ZOOM_CAJA_COMPLETA` la caja entera de
 * la planta; por encima, solo alrededor de cada suerte (con margen), que es lo
 * que se recorre en campo. Sin duplicados, ordenadas de menor a mayor zoom para
 * que una descarga interrumpida ya deje útil el panorama.
 */
export function teselasDeCajas(
  cajas: Caja[],
  zMin = ZOOM_DESCARGA_MIN,
  zMax = ZOOM_DESCARGA_MAX,
): Tesela[] {
  const total = unir(cajas);
  if (!total) return [];
  const out: Tesela[] = [];
  for (let z = zMin; z <= zMax; z++) {
    const vistas = new Set<string>();
    const grupo = z <= ZOOM_CAJA_COMPLETA ? [total] : cajas;
    for (const [w, s, e, n] of grupo) {
      const x0 = lonATeselaX(w - MARGEN_GRADOS, z);
      const x1 = lonATeselaX(e + MARGEN_GRADOS, z);
      const y0 = latATeselaY(n + MARGEN_GRADOS, z);
      const y1 = latATeselaY(s - MARGEN_GRADOS, z);
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          const k = `${x}/${y}`;
          if (vistas.has(k)) continue;
          vistas.add(k);
          out.push({ z, x, y });
        }
      }
    }
  }
  return out;
}

export function urlTeselaEsri({ z, x, y }: Tesela): string {
  return ESRI_IMAGERY.replace("{z}", String(z))
    .replace("{y}", String(y))
    .replace("{x}", String(x));
}

/** Lee z/x/y de una URL de tesela Esri (orden `{z}/{y}/{x}`), o null. */
export function teselaDeUrlEsri(url: string): Tesela | null {
  const m = /\/World_Imagery\/MapServer\/tile\/(\d+)\/(\d+)\/(\d+)/.exec(url);
  if (!m) return null;
  return { z: Number(m[1]), y: Number(m[2]), x: Number(m[3]) };
}

export interface RecorteMadre {
  madre: Tesela;
  /** Esquina y lado (en píxeles de la madre de 256 px) del trozo a ampliar. */
  sx: number;
  sy: number;
  lado: number;
}

/**
 * Tesela "madre" `niveles` zooms más arriba y el trozo de ella que corresponde a
 * la tesela pedida. Sirve para mostrar algo (más borroso) cuando falta la tesela
 * exacta sin señal, p. ej. al acercar más allá del zoom descargado.
 */
export function recorteDeMadre(
  t: Tesela,
  niveles: number,
): RecorteMadre | null {
  if (niveles < 1 || niveles > t.z) return null;
  const madre = { z: t.z - niveles, x: t.x >> niveles, y: t.y >> niveles };
  const lado = 256 / 2 ** niveles;
  return {
    madre,
    sx: (t.x - (madre.x << niveles)) * lado,
    sy: (t.y - (madre.y << niveles)) * lado,
    lado,
  };
}

/** Glifos de las etiquetas (fuente única del mapa) para verlas sin señal. */
export const GLIFOS_URL =
  "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
export const FUENTES_MAPA = ["Open Sans Semibold"] as const;
/** Latín básico/extendido, puntuación (– … •) y símbolos (≥ ≤). */
export const RANGOS_GLIFOS = ["0-255", "256-511", "8192-8447", "8704-8959"];

export function urlsGlifos(): string[] {
  return FUENTES_MAPA.flatMap((f) =>
    RANGOS_GLIFOS.map((r) =>
      GLIFOS_URL.replace("{fontstack}", encodeURIComponent(f)).replace(
        "{range}",
        r,
      ),
    ),
  );
}
