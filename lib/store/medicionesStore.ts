import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Medicion,
  MedicionDatos,
  MedicionInput,
} from "@/domain/mediciones/schema";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

interface MedicionesState {
  items: Medicion[];
  /** Outbox: ids con cambios pendientes de sincronizar (§14). */
  pending: string[];
  syncing: boolean;
  /** uid del usuario autenticado (dueño de las mediciones). */
  userId: string;

  setUserId: (id: string) => void;
  setSyncing: (v: boolean) => void;
  addMedicion: (input: MedicionInput, datos: MedicionDatos) => void;
  removeMedicion: (id: string) => void;
  markSynced: (ids: string[]) => void;
  replaceAll: (items: Medicion[]) => void;
}

function enqueue(pending: string[], id: string): string[] {
  return pending.includes(id) ? pending : [...pending, id];
}

export const useMedicionesStore = create<MedicionesState>()(
  persist(
    (set) => ({
      items: [],
      pending: [],
      syncing: false,
      userId: "",

      setUserId: (userId) => set({ userId }),
      setSyncing: (syncing) => set({ syncing }),

      addMedicion: (input, datos) =>
        set((s) => {
          const now = new Date().toISOString();
          const m: Medicion = {
            id: newId(),
            autor: s.userId,
            nombre: input.nombre,
            tipo: datos.tipo,
            valor: datos.valor,
            unidad: datos.unidad,
            geom: datos.geom,
            lat: datos.lat,
            lon: datos.lon,
            deleted: false,
            created_at: now,
            updated_at: now,
          };
          return { items: [...s.items, m], pending: enqueue(s.pending, m.id) };
        }),

      removeMedicion: (id) =>
        set((s) => ({
          items: s.items.map((m) =>
            m.id === id
              ? { ...m, deleted: true, updated_at: new Date().toISOString() }
              : m,
          ),
          pending: enqueue(s.pending, id),
        })),

      markSynced: (ids) =>
        set((s) => ({ pending: s.pending.filter((p) => !ids.includes(p)) })),
      replaceAll: (items) => set({ items }),
    }),
    {
      name: "agrocontrol-mediciones",
      partialize: (s) => ({ items: s.items, pending: s.pending }),
    },
  ),
);

/** Mediciones activas (no borradas). */
export function activas(items: Medicion[]): Medicion[] {
  return items.filter((m) => !m.deleted);
}
