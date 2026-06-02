/**
 * Identificadores y configuración de las capas del mapa (§5).
 * Centralizado para que MapView y los controles compartan una sola fuente.
 */

export const SUERTES_SOURCE = "suertes";
export const SUERTES_FILL = "suertes-fill";
export const SUERTES_LINE = "suertes-line";
export const SUERTES_SELECTED = "suertes-selected";
export const SUERTES_LABEL = "suertes-label";

// GPS (§5: Mi ubicación)
export const GPS_SOURCE = "gps";
export const GPS_HALO = "gps-halo";
export const GPS_DOT = "gps-dot";

// Medición (§5: área/distancia)
export const MEASURE_SOURCE = "measure";
export const MEASURE_FILL = "measure-fill";
export const MEASURE_LINE = "measure-line";
export const MEASURE_VERTICES = "measure-vertices";

export type ContextGeometry = "line" | "fill" | "point";

export interface ContextLayer {
  /** id estable, también nombre del archivo en /data/contexto_<id>.geojson */
  id: string;
  label: string;
  geometry: ContextGeometry;
  /** color principal del trazo/relleno/punto */
  color: string;
  /** visible por defecto al abrir el mapa */
  defaultOn: boolean;
}

/**
 * Capas de contexto conmutables. Los archivos son las versiones depuradas
 * (ADR-0002) en /public/data.
 */
export const CONTEXT_LAYERS: ContextLayer[] = [
  {
    id: "red_hidrica",
    label: "Red hídrica",
    geometry: "line",
    color: "#38bdf8",
    defaultOn: false,
  },
  {
    id: "canales",
    label: "Canales riego/drenaje",
    geometry: "line",
    color: "#22d3ee",
    defaultOn: false,
  },
  {
    id: "vias_acceso",
    label: "Vías de acceso",
    geometry: "line",
    color: "#fbbf24",
    defaultOn: false,
  },
  {
    id: "cuerpos_agua",
    label: "Cuerpos de agua",
    geometry: "fill",
    color: "#0ea5e9",
    defaultOn: false,
  },
  {
    id: "estaciones_bombeo",
    label: "Estaciones de bombeo",
    geometry: "point",
    color: "#f43f5e",
    defaultOn: false,
  },
];

export function contextSourceId(id: string): string {
  return `ctx-${id}`;
}

export function contextLayerId(id: string): string {
  return `ctx-${id}-layer`;
}
