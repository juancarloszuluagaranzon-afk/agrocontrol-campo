import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Precipitacion,
  PrecipitacionInput,
} from "@/domain/precipitaciones/schema";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

interface PrecipitacionesState {
  items: Precipitacion[];
  /** Outbox: ids de lecturas con cambios pendientes de sincronizar (§14). */
  pending: string[];
  syncing: boolean;
  /** uid del usuario autenticado (autor de las lecturas que crea). */
  userId: string;

  setUserId: (id: string) => void;
  setSyncing: (v: boolean) => void;
  addLectura: (input: PrecipitacionInput, planta: string) => void;
  removeLectura: (id: string) => void;
  markSynced: (ids: string[]) => void;
  replaceAll: (items: Precipitacion[]) => void;
}

function enqueue(pending: string[], id: string): string[] {
  return pending.includes(id) ? pending : [...pending, id];
}

export const usePrecipitacionesStore = create<PrecipitacionesState>()(
  persist(
    (set) => ({
      items: [],
      pending: [],
      syncing: false,
      userId: "",

      setUserId: (userId) => set({ userId }),
      setSyncing: (syncing) => set({ syncing }),

      addLectura: (input, planta) =>
        set((s) => {
          const now = new Date().toISOString();
          const p: Precipitacion = {
            id: newId(),
            autor: s.userId,
            planta,
            pluviometro: input.pluviometro,
            fecha: input.fecha,
            mm: input.mm,
            nota: input.nota,
            deleted: false,
            created_at: now,
            updated_at: now,
          };
          return { items: [...s.items, p], pending: enqueue(s.pending, p.id) };
        }),

      removeLectura: (id) =>
        set((s) => ({
          items: s.items.map((p) =>
            p.id === id
              ? { ...p, deleted: true, updated_at: new Date().toISOString() }
              : p,
          ),
          pending: enqueue(s.pending, id),
        })),

      markSynced: (ids) =>
        set((s) => ({ pending: s.pending.filter((p) => !ids.includes(p)) })),
      replaceAll: (items) => set({ items }),
    }),
    {
      name: "agrocontrol-precipitaciones",
      partialize: (s) => ({ items: s.items, pending: s.pending }),
    },
  ),
);

/** Lecturas activas (no borradas). */
export function activas(items: Precipitacion[]): Precipitacion[] {
  return items.filter((p) => !p.deleted);
}
