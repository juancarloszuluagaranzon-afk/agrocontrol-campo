/**
 * Identificadores y configuración de las capas del mapa (§5).
 * Centralizado para que MapView y los controles compartan una sola fuente.
 */

// Plano de campo: backdrop raster del GeoPDF (image source) + puntos de muestreo.
export const PDF_OVERLAY_SOURCE = "pdf-overlay";
export const PDF_OVERLAY_LAYER = "pdf-overlay-layer";
export const PLANO_PUNTOS_SOURCE = "plano-puntos";
export const PLANO_PUNTOS_DOT = "plano-puntos-dot";
export const PLANO_PUNTOS_LABEL = "plano-puntos-label";

// Lluvia de hoy: pluviómetros pintados como gotas de color por mm (estilo Gotas).
// La capa muestra el icono de gota + el número de mm en un solo símbolo.
export const LLUVIA_HOY_SOURCE = "lluvia-hoy";
export const LLUVIA_HOY_DOT = "lluvia-hoy-dot";

export const SUERTES_SOURCE = "suertes";
export const SUERTES_FILL = "suertes-fill";
export const SUERTES_LINE = "suertes-line";
export const SUERTES_SELECTED = "suertes-selected";
// Etiqueta de nomenclatura: cada tablón rotula el código de su suerte.
export const SUERTES_LABEL = "suertes-label";

// Marca de agua del nombre de hacienda, solo en modo Plano (§ADR-0014).
export const HACIENDA_LABEL_SOURCE = "hacienda-label";
export const HACIENDA_LABEL_LAYER = "hacienda-label-layer";

// GPS (§5: Mi ubicación)
export const GPS_SOURCE = "gps";
// Disco de precisión (polígono de radio real `accuracy`); reemplaza al halo fijo.
export const GPS_ACCURACY_SOURCE = "gps-accuracy";
export const GPS_HALO = "gps-halo";
export const GPS_DOT = "gps-dot";
// Cono de orientación (brújula, tipo Avenza): fuente y capa propias.
export const GPS_CONE_SOURCE = "gps-cone";
export const GPS_CONE = "gps-cone-fill";

// Medición (§5: área/distancia)
export const MEASURE_SOURCE = "measure";
export const MEASURE_FILL = "measure-fill";
export const MEASURE_LINE = "measure-line";
export const MEASURE_VERTICES = "measure-vertices";

// Mediciones guardadas (persistidas, §5)
export const MEDICIONES_SOURCE = "mediciones";
export const MEDICIONES_FILL = "mediciones-fill";
export const MEDICIONES_LINE = "mediciones-line";
export const MEDICIONES_LABEL = "mediciones-label";

// Marcadores privados del usuario (§5: puntos personales)
export const MARCADORES_SOURCE = "marcadores";
export const MARCADORES_DOT = "marcadores-dot";
export const MARCADORES_LABEL = "marcadores-label";

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
  /** opacidad del relleno (solo geometry "fill"); por defecto 0.5 */
  fillOpacity?: number;
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
    // Rojo: el plano de suertes es amarillo en satélite y se confundía.
    color: "#ef4444",
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
  {
    id: "freatimetros",
    label: "Freatímetros (pozos)",
    geometry: "point",
    color: "#8b5cf6",
    defaultOn: false,
  },
  {
    // Se dibuja como "gotas" de color con los mm de hoy (capa propia en MapView),
    // no como el círculo plano de contexto. El toggle/leyenda usan esta entrada.
    id: "pluviometros",
    label: "Pluviómetros (lluvia hoy)",
    geometry: "point",
    color: "#38bdf8",
    defaultOn: false,
  },
  {
    id: "thiessen",
    label: "Polígonos de Thiessen",
    geometry: "fill",
    // Slate más oscuro + más opacidad: antes se veía demasiado difuminado.
    color: "#475569",
    defaultOn: false,
    fillOpacity: 0.28,
  },
  {
    id: "haciendas",
    // Polígonos dibujados como contorno (capa MapLibre "line") para no rellenar.
    label: "Haciendas (límites)",
    geometry: "line",
    color: "#eab308",
    defaultOn: false,
  },
];

export function contextSourceId(id: string): string {
  return `ctx-${id}`;
}

export function contextLayerId(id: string): string {
  return `ctx-${id}-layer`;
}
