import type { Feature, Polygon } from "geojson";
import type { LngLat } from "@/lib/geo/measure";

/**
 * Utilidades de orientación (brújula) para el indicador tipo Avenza (§5):
 * geometría del cono de dirección, suavizado angular y lectura del rumbo desde
 * los sensores del dispositivo. La parte geométrica es pura y testeable; la
 * lectura de sensores se aísla aquí para poder validar la fórmula.
 */

/** Normaliza un ángulo a [0, 360). */
export function normalizeDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

/** Diferencia angular más corta de `from` a `to`, en (-180, 180]. */
export function shortestAngleDelta(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Interpola por el camino corto entre dos rumbos (rotación suave). */
export function lerpAngle(from: number, to: number, t: number): number {
  return normalizeDeg(from + shortestAngleDelta(from, to) * t);
}

/** Metros por píxel en Web Mercator a una latitud y zoom dados. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

/** Punto destino a `distM` metros y rumbo `bearingDeg` (0=N, horario). */
function destino(
  lon: number,
  lat: number,
  bearingDeg: number,
  distM: number,
): LngLat {
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (distM * Math.cos(rad)) / 111320;
  const dLon =
    (distM * Math.sin(rad)) / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lon + dLon, lat + dLat];
}

export interface ConeOpts {
  /** apertura total del cono en grados (≈60° como Avenza) */
  apertureDeg?: number;
  /** alcance del cono en metros (calculado desde píxeles + zoom) */
  radiusM?: number;
  /** segmentos del arco (suavidad del borde) */
  steps?: number;
}

/**
 * Cono/sector geográfico con el **vértice en la ubicación del usuario**,
 * apuntando a `heading` (0=N, horario). Devuelve un polígono GeoJSON.
 */
export function coneSector(
  lon: number,
  lat: number,
  heading: number,
  opts: ConeOpts = {},
): Feature<Polygon> {
  const aperture = opts.apertureDeg ?? 60;
  const radius = opts.radiusM ?? 40;
  const steps = Math.max(2, opts.steps ?? 10);

  const tip: LngLat = [lon, lat];
  const ring: LngLat[] = [tip];
  const start = heading - aperture / 2;
  for (let i = 0; i <= steps; i++) {
    const b = start + (aperture * i) / steps;
    ring.push(destino(lon, lat, b, radius));
  }
  ring.push(tip); // cierra el anillo en el vértice

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {},
  };
}

/** Evento de orientación con los campos no estándar de WebKit (iOS). */
export interface OrientationLike {
  alpha: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

/**
 * Deriva el rumbo de la brújula (0=N, horario) desde un evento de orientación.
 * - iOS (Safari): `webkitCompassHeading` ya viene compensado.
 * - Estándar (`deviceorientationabsolute`): `alpha` es antihorario desde el norte.
 * `screenAngle` compensa la rotación de la pantalla (window.orientation / screen).
 * Devuelve null si el evento no permite un rumbo absoluto fiable.
 */
export function compassHeadingFromEvent(
  e: OrientationLike,
  screenAngle = 0,
): number | null {
  if (
    typeof e.webkitCompassHeading === "number" &&
    !Number.isNaN(e.webkitCompassHeading)
  ) {
    return normalizeDeg(e.webkitCompassHeading);
  }
  if (e.absolute && typeof e.alpha === "number") {
    return normalizeDeg(360 - e.alpha + screenAngle);
  }
  return null;
}

/** Umbral (grados) por encima del cual la brújula se considera mal calibrada. */
export const COMPASS_ACCURACY_POBRE = 20;

/** ¿La precisión reportada por la brújula sugiere calibrar? */
export function compassNecesitaCalibracion(accuracy: number | null): boolean {
  // iOS: webkitCompassAccuracy negativo = sin rumbo fiable; >20° = pobre.
  if (accuracy == null) return false;
  return accuracy < 0 || accuracy > COMPASS_ACCURACY_POBRE;
}
