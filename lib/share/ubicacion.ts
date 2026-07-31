import type { Geometry, Position } from "geojson";
import { formatCoordenadas } from "@/lib/geo/format";

/**
 * Utilidades puras para compartir la ubicación de un marcador o medición como
 * un link que abre Rio Map en ese punto (§ADR-0018). Sin `window`: el `origin`
 * se pasa como argumento para poder testear.
 */

export interface PuntoCompartido {
  planta: string;
  lon: number;
  lat: number;
  nombre: string;
}

/**
 * Primer punto de referencia de una medición (NO el centroide): primer vértice
 * de la línea (distancia) o del anillo exterior (área). Devuelve `[lon, lat]`.
 */
export function primerPuntoMedicion(geom: Geometry): [number, number] {
  let pos: Position | undefined;
  if (geom.type === "LineString") pos = geom.coordinates[0];
  else if (geom.type === "Polygon") pos = geom.coordinates[0]?.[0];
  else if (geom.type === "Point") pos = geom.coordinates;
  else throw new Error(`Geometría no soportada para compartir: ${geom.type}`);

  const lon = pos?.[0];
  const lat = pos?.[1];
  if (lon === undefined || lat === undefined) {
    throw new Error("La geometría no tiene un primer punto válido");
  }
  return [lon, lat];
}

/** Link que abre Rio Map (tras login) volando al punto. */
export function linkUbicacion(origin: string, p: PuntoCompartido): string {
  const q = new URLSearchParams({
    p: p.planta,
    lat: p.lat.toFixed(6),
    lon: p.lon.toFixed(6),
    n: p.nombre,
  });
  return `${origin}/mapa?${q.toString()}`;
}

/** Texto corto que acompaña al link en el mensaje de WhatsApp. */
export function mensajeCompartir(p: PuntoCompartido): string {
  return `📍 ${p.nombre} — Rio Map\n${formatCoordenadas(p.lon, p.lat)}`;
}
