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
