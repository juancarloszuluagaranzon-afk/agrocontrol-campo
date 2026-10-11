import type { Feature, Polygon } from "geojson";
import type { LngLat } from "@/lib/geo/measure";

/**
 * Utilidades de calidad de ubicación (§5). El GPS entrega primero una posición
 * aproximada (Wi-Fi/celular) y la afina a satélite en unos segundos. Para que el
 * usuario *vea* esa convergencia, dibujamos un **disco de precisión** con el radio
 * real (`accuracy`, en metros) —como Avenza/Google Maps— en vez de un halo fijo.
 */

/** Precisión (m) en o por debajo de la cual consideramos la ubicación afinada. */
export const GPS_PRECISION_OK_M = 15;

/** ¿La ubicación aún está afinando (sin fix o con precisión pobre)? */
export function gpsAfinando(accuracy: number | null): boolean {
  return accuracy == null || accuracy > GPS_PRECISION_OK_M;
}

/** Distancia geodésica en metros entre dos puntos [lon,lat] (haversine). */
export function distanciaMetros(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Polígono (círculo geodésico aproximado) de radio `radiusM` metros centrado en
 * `(lon, lat)`. Sirve como disco de precisión del GPS. Suficientemente exacto a
 * escala de campo: convierte metros a grados con la latitud local.
 */
export function accuracyCircle(
  lon: number,
  lat: number,
  radiusM: number,
  steps = 48,
): Feature<Polygon> {
  const r = Math.max(0, radiusM);
  const dLat = r / 111_320;
  const dLon = r / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: LngLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (2 * Math.PI * i) / steps;
    ring.push([lon + dLon * Math.sin(a), lat + dLat * Math.cos(a)]);
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {},
  };
}

/**
 * Tipo de error de la geolocalización del navegador (ADR-0035). Solo el
 * permiso denegado (1) es definitivo; "sin posición" (2) y "tiempo agotado" (3)
 * son **transitorios** en campo (cielo tapado, arranque en frío sin datos
 * móviles): el GPS sigue buscando y no se debe mostrar como fallo.
 */
export function errorGpsDefinitivo(code: number): boolean {
  return code === 1;
}

/** Sin una posición nueva en este tiempo, se reinicia el seguimiento. */
export const GPS_WATCHDOG_MS = 30_000;

export interface EstadoCono {
  lon: number;
  lat: number;
  rumbo: number;
  zoom: number;
}

/** Diferencia angular más corta entre dos rumbos (grados, 0–180). */
function deltaRumbo(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * ¿Hay que redibujar el cono de orientación? Antes se redibujaba 60 veces por
 * segundo aunque nada cambiara, y cada redibujo obliga a MapLibre a reprocesar
 * la geometría: saturaba teléfonos de gama media y retrasaba el punto GPS.
 * Ahora solo si cambió el rumbo (≥ 1°), la posición o el zoom.
 */
export function necesitaRedibujoCono(
  previo: EstadoCono | null,
  nuevo: EstadoCono,
): boolean {
  if (!previo) return true;
  return (
    deltaRumbo(previo.rumbo, nuevo.rumbo) >= 1 ||
    previo.lon !== nuevo.lon ||
    previo.lat !== nuevo.lat ||
    Math.abs(previo.zoom - nuevo.zoom) >= 0.05
  );
}
