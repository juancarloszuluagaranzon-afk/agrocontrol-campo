import area from "@turf/area";
import length from "@turf/length";
import { lineString, polygon } from "@turf/helpers";
import type { Feature, Geometry, Polygon, MultiPolygon } from "geojson";

/** Coordenada [lon, lat] en WGS84. */
export type LngLat = [number, number];

const M2_PER_HA = 10_000;

/** Cierra un anillo si no lo está (primer punto === último). */
function closeRing(ring: LngLat[]): LngLat[] {
  if (ring.length < 3) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

/**
 * Área geodésica (hectáreas) de un polígono definido por sus vértices [lon,lat].
 * Requiere ≥ 3 vértices; devuelve 0 si no. (§5: medición de área.)
 */
export function polygonAreaHa(ring: LngLat[]): number {
  if (ring.length < 3) return 0;
  return area(polygon([closeRing(ring)])) / M2_PER_HA;
}

/** Perímetro (metros) del polígono cerrado definido por sus vértices. */
export function polygonPerimeterM(ring: LngLat[]): number {
  if (ring.length < 2) return 0;
  return length(lineString(closeRing(ring)), { units: "kilometers" }) * 1000;
}

/**
 * Longitud (metros) de una polilínea abierta. (§5: medición de distancia.)
 * Requiere ≥ 2 vértices.
 */
export function lineLengthM(coords: LngLat[]): number {
  if (coords.length < 2) return 0;
  return length(lineString(coords), { units: "kilometers" }) * 1000;
}

/**
 * Área geodésica (ha) de una geometría GeoJSON polígonal (Polygon/MultiPolygon).
 * Se usa para validar contra el área oficial de las suertes.
 */
export function geometryAreaHa(
  geometry: Geometry | Feature<Polygon | MultiPolygon>,
): number {
  return area(geometry) / M2_PER_HA;
}
