import { AOI } from "@/lib/geo/basemap";
import {
  CONTEXT_LAYERS,
  CASTILLA_CONTEXT_LAYERS,
  type ContextLayer,
} from "@/lib/geo/layers";

/**
 * Multi-planta (§ ADR-0007). Rio Map sirve a más de una empresa del grupo
 * (Riopaila, Castilla). Cada planta es un **universo cartográfico** propio
 * —suertes, catálogo y maestro distintos, y áreas geográficas separadas—, no una
 * capa que se alterna sobre el mismo mapa. El usuario elige su planta una vez (se
 * persiste) y la app carga solo esos datos; el satélite y el resto de la UI son
 * comunes. Aquí vive toda la configuración por planta.
 */

export type PlantaId = "riopaila" | "castilla";

/** Encuadre del mapa para una planta (centrado y límites de zoom). */
export interface PlantaAOI {
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  /** Caja WGS84 [W,S,E,N] del área de la planta (catálogo de fechas, ADR-0025). */
  bbox: [number, number, number, number];
}

export interface PlantaConfig {
  id: PlantaId;
  /** Nombre corto para el conmutador (ej. "Riopaila"). */
  nombre: string;
  /** Razón social, para el selector de entrada. */
  empresa: string;
  /** GeoJSON de tablones de la planta. */
  tablones: string;
  /** Catálogo ligero (buscador/autocompletar). */
  catalogo: string;
  /** Maestro agronómico por `sec_ste`. */
  maestro: string;
  /** Puntos de etiqueta de hacienda (marca de agua del modo Plano, ADR-0014). */
  haciendasLabel: string;
  /** Capas de contexto conmutables de esta planta (ADR-0017). */
  contextLayers: ContextLayer[];
  /** Encuadre inicial del mapa. */
  aoi: PlantaAOI;
}

export const PLANTAS: Record<PlantaId, PlantaConfig> = {
  riopaila: {
    id: "riopaila",
    nombre: "Riopaila",
    empresa: "Riopaila Agrícola",
    tablones: "/data/tablones_riopaila.geojson",
    catalogo: "/data/tablones_catalogo.json",
    maestro: "/data/maestro_suertes.json",
    haciendasLabel: "/data/haciendas_label_riopaila.json",
    contextLayers: CONTEXT_LAYERS,
    aoi: {
      center: AOI.center,
      zoom: AOI.zoom,
      minZoom: AOI.minZoom,
      maxZoom: AOI.maxZoom,
      bbox: [...AOI.bbox],
    },
  },
  castilla: {
    id: "castilla",
    nombre: "Castilla",
    empresa: "Castilla Agrícola",
    tablones: "/data/tablones_castilla.geojson",
    catalogo: "/data/tablones_castilla_catalogo.json",
    maestro: "/data/maestro_castilla.json",
    haciendasLabel: "/data/haciendas_label_castilla.json",
    contextLayers: CASTILLA_CONTEXT_LAYERS,
    // bbox cartografía Castilla: [-76.496, 3.058, -76.225, 3.443] (más amplia
    // que Riopaila → un punto de zoom menos).
    aoi: {
      center: [-76.36, 3.251],
      zoom: 10.8,
      minZoom: 9,
      maxZoom: 19,
      bbox: [-76.496, 3.058, -76.225, 3.443],
    },
  },
};

/** Orden de presentación en el selector y el conmutador. */
export const PLANTA_IDS: PlantaId[] = ["riopaila", "castilla"];

/** ¿Es `value` un id de planta válido? (validación de borde para el store). */
export function isPlantaId(value: unknown): value is PlantaId {
  return value === "riopaila" || value === "castilla";
}

/** Config de una planta, con Riopaila como respaldo si el id no es válido. */
export function plantaConfig(id: PlantaId | null | undefined): PlantaConfig {
  return isPlantaId(id) ? PLANTAS[id] : PLANTAS.riopaila;
}
