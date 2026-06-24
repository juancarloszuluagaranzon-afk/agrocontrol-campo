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
