import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Marcador, MarcadorInput } from "@/domain/marcadores/schema";
import type { LngLat } from "@/lib/geo/measure";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

interface MarcadoresState {
  items: Marcador[];
  /** Outbox: ids de marcadores con cambios pendientes de sincronizar (§14). */
  pending: string[];
  syncing: boolean;
  /** uid del usuario autenticado (dueño de los marcadores). */
  userId: string;

  setUserId: (id: string) => void;
  setSyncing: (v: boolean) => void;
  addMarcador: (input: MarcadorInput, point: LngLat) => void;
  updateMarcador: (id: string, patch: Partial<MarcadorInput>) => void;
  removeMarcador: (id: string) => void;
  markSynced: (ids: string[]) => void;
  replaceAll: (items: Marcador[]) => void;
}

function enqueue(pending: string[], id: string): string[] {
  return pending.includes(id) ? pending : [...pending, id];
}

export const useMarcadoresStore = create<MarcadoresState>()(
  persist(
    (set) => ({
      items: [],
      pending: [],
      syncing: false,
      userId: "",

      setUserId: (userId) => set({ userId }),
      setSyncing: (syncing) => set({ syncing }),

      addMarcador: (input, point) =>
        set((s) => {
          const now = new Date().toISOString();
          const m: Marcador = {
            id: newId(),
            user_id: s.userId,
            nombre: input.nombre,
            nota: input.nota,
            color: input.color,
            lon: point[0],
            lat: point[1],
            deleted: false,
            created_at: now,
            updated_at: now,
          };
          return { items: [...s.items, m], pending: enqueue(s.pending, m.id) };
        }),

      updateMarcador: (id, patch) =>
        set((s) => ({
          items: s.items.map((m) =>
            m.id === id
              ? { ...m, ...patch, updated_at: new Date().toISOString() }
              : m,
          ),
          pending: enqueue(s.pending, id),
        })),

      removeMarcador: (id) =>
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
      name: "agrocontrol-marcadores",
      partialize: (s) => ({ items: s.items, pending: s.pending }),
    },
  ),
);

/** Marcadores activos (no borrados). */
export function activos(items: Marcador[]): Marcador[] {
  return items.filter((m) => !m.deleted);
}
