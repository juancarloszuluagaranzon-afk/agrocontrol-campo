import { create } from "zustand";
import type { TablonProperties } from "@/domain/suertes/schema";
import { CONTEXT_LAYERS } from "@/lib/geo/layers";
import type { LngLat } from "@/lib/geo/measure";

/** Objetivo de vuelo solicitado por el buscador (o un click externo). */
export interface FlyTarget {
  lon: number;
  lat: number;
  tabId: string;
  /** cambia en cada solicitud para re-disparar el efecto aunque el destino repita */
  nonce: number;
}

/** Lectura de posición GPS. */
export interface GpsFix {
  lon: number;
  lat: number;
  /** precisión horizontal en metros */
  accuracy: number;
  /** rumbo en grados (0 = norte), o null si no disponible */
  heading: number | null;
}

export type MeasureMode = "off" | "area" | "distance";

interface MapState {
  /** Tablón seleccionado (properties del feature tocado), o null. */
  selected: TablonProperties | null;
  setSelected: (s: TablonProperties | null) => void;

  /** Base del mapa: satélite (Esri) o plano (estilo Ingeniería Agrícola). */
  baseMode: "satelite" | "plano";
  setBaseMode: (m: "satelite" | "plano") => void;

  /** Visibilidad de cada capa de contexto, por id. */
  activeContext: Record<string, boolean>;
  toggleContext: (id: string) => void;

  /** Última solicitud de vuelo (buscador). */
  flyTarget: FlyTarget | null;
  flyTo: (t: Omit<FlyTarget, "nonce">) => void;

  // ── GPS ──
  gps: GpsFix | null;
  gpsError: string | null;
  gpsActive: boolean;
  setGps: (fix: GpsFix) => void;
  setGpsError: (msg: string | null) => void;
  setGpsActive: (active: boolean) => void;
  /** Solicitud de centrar en la posición actual. */
  centerNonce: number;
  centerOnMe: () => void;

  // ── Brújula / orientación (indicador tipo Avenza, §5) ──
  /** Indicador de orientación activo (el usuario habilitó la brújula). */
  compassActive: boolean;
  setCompassActive: (active: boolean) => void;
  /** Rumbo del dispositivo en grados (0=N, horario), o null si no hay lectura. */
  deviceHeading: number | null;
  /** Precisión de la brújula en grados (negativa o alta = mal calibrada). */
  headingAccuracy: number | null;
  setDeviceHeading: (heading: number, accuracy: number | null) => void;

  // ── Medición ──
  measureMode: MeasureMode;
  vertices: LngLat[];
  setMeasureMode: (mode: MeasureMode) => void;
  addVertex: (v: LngLat) => void;
  undoVertex: () => void;
  clearVertices: () => void;
  /** Tablón oficial bajo el centroide de la medición (contraste), o null. */
  measureOfficial: { label: string; haOficial: number } | null;
  setMeasureOfficial: (o: { label: string; haOficial: number } | null) => void;

  // ── Marcado preciso con retícula central (§5) ──
  /** Centro actual del mapa, en vivo (lo actualiza MapView al desplazar). */
  mapCenter: LngLat;
  setMapCenter: (c: LngLat) => void;
  /** Solicitud de marcar un vértice de medición en el centro exacto. */
  markVertexNonce: number;
  markVertexAtCenter: () => void;
  /** Modo "colocar marcador" activo (muestra retícula). */
  placingMarker: boolean;
  setPlacingMarker: (v: boolean) => void;
}

const initialContext: Record<string, boolean> = Object.fromEntries(
  CONTEXT_LAYERS.map((l) => [l.id, l.defaultOn]),
);

export const useMapStore = create<MapState>((set) => ({
  selected: null,
  setSelected: (selected) => set({ selected }),

  baseMode: "satelite",
  setBaseMode: (baseMode) => set({ baseMode }),

  activeContext: initialContext,
  toggleContext: (id) =>
    set((state) => ({
      activeContext: { ...state.activeContext, [id]: !state.activeContext[id] },
    })),

  flyTarget: null,
  flyTo: (t) =>
    set((state) => ({
      flyTarget: { ...t, nonce: (state.flyTarget?.nonce ?? 0) + 1 },
    })),

  gps: null,
  gpsError: null,
  gpsActive: false,
  setGps: (gps) => set({ gps, gpsError: null }),
  setGpsError: (gpsError) => set({ gpsError }),
  setGpsActive: (gpsActive) => set({ gpsActive }),
  centerNonce: 0,
  centerOnMe: () => set((state) => ({ centerNonce: state.centerNonce + 1 })),

  compassActive: false,
  setCompassActive: (compassActive) =>
    set(
      compassActive
        ? { compassActive }
        : { compassActive, deviceHeading: null, headingAccuracy: null },
    ),
  deviceHeading: null,
  headingAccuracy: null,
  setDeviceHeading: (deviceHeading, headingAccuracy) =>
    set({ deviceHeading, headingAccuracy }),

  measureMode: "off",
  vertices: [],
  setMeasureMode: (measureMode) =>
    set({ measureMode, vertices: [], measureOfficial: null }),
  addVertex: (v) => set((state) => ({ vertices: [...state.vertices, v] })),
  undoVertex: () => set((state) => ({ vertices: state.vertices.slice(0, -1) })),
  clearVertices: () => set({ vertices: [], measureOfficial: null }),
  measureOfficial: null,
  setMeasureOfficial: (measureOfficial) => set({ measureOfficial }),

  mapCenter: [-76.119, 4.31],
  setMapCenter: (mapCenter) => set({ mapCenter }),
  markVertexNonce: 0,
  markVertexAtCenter: () =>
    set((s) => ({ markVertexNonce: s.markVertexNonce + 1 })),
  placingMarker: false,
  setPlacingMarker: (placingMarker) => set({ placingMarker }),
}));
