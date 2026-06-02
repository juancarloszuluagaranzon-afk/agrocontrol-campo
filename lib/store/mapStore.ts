import { create } from "zustand";
import type { SuerteProperties } from "@/domain/suertes/schema";
import { CONTEXT_LAYERS } from "@/lib/geo/layers";

/** Objetivo de vuelo solicitado por el buscador (o un click externo). */
export interface FlyTarget {
  lon: number;
  lat: number;
  secSte: string;
  /** cambia en cada solicitud para re-disparar el efecto aunque el destino repita */
  nonce: number;
}

interface MapState {
  /** Suerte seleccionada (properties del feature tocado), o null. */
  selected: SuerteProperties | null;
  setSelected: (s: SuerteProperties | null) => void;

  /** Visibilidad de cada capa de contexto, por id. */
  activeContext: Record<string, boolean>;
  toggleContext: (id: string) => void;

  /** Última solicitud de vuelo (buscador). */
  flyTarget: FlyTarget | null;
  flyTo: (t: Omit<FlyTarget, "nonce">) => void;
}

const initialContext: Record<string, boolean> = Object.fromEntries(
  CONTEXT_LAYERS.map((l) => [l.id, l.defaultOn]),
);

export const useMapStore = create<MapState>((set) => ({
  selected: null,
  setSelected: (selected) => set({ selected }),

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
}));
