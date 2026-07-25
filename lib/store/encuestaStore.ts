import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RespuestaEncuesta } from "@/domain/encuesta/schema";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

interface EncuestaState {
  /** A lo sumo un elemento: la respuesta del propio usuario (RLS lo garantiza). */
  items: RespuestaEncuesta[];
  /** Outbox: ids con cambios pendientes de sincronizar (§14). */
  pending: string[];
  syncing: boolean;
  /** uid del usuario autenticado. */
  userId: string;
  /**
   * El primer intento de sync (éxito, fallo de red, o e2e-skip) ya terminó.
   * No persistido a propósito: evita que el popup se muestre antes de saber
   * si el usuario ya respondió desde otro dispositivo.
   */
  hydratedFromServer: boolean;

  setUserId: (id: string) => void;
  setSyncing: (v: boolean) => void;
  setHydratedFromServer: (v: boolean) => void;
  /** No-op si ya hay una respuesta local (defensivo; la UI ya lo evita). */
  addRespuesta: (estrellas: number, comentario: string) => void;
  markSynced: (ids: string[]) => void;
  replaceAll: (items: RespuestaEncuesta[]) => void;
}

function enqueue(pending: string[], id: string): string[] {
  return pending.includes(id) ? pending : [...pending, id];
}

export const useEncuestaStore = create<EncuestaState>()(
  persist(
    (set) => ({
      items: [],
      pending: [],
      syncing: false,
      userId: "",
      hydratedFromServer: false,

      setUserId: (userId) => set({ userId }),
      setSyncing: (syncing) => set({ syncing }),
      setHydratedFromServer: (hydratedFromServer) =>
        set({ hydratedFromServer }),

      addRespuesta: (estrellas, comentario) =>
        set((s) => {
          if (s.items.length > 0) return s;
          const r: RespuestaEncuesta = {
            id: newId(),
            user_id: s.userId,
            estrellas,
            comentario,
            created_at: new Date().toISOString(),
          };
          return { items: [...s.items, r], pending: enqueue(s.pending, r.id) };
        }),

      markSynced: (ids) =>
        set((s) => ({ pending: s.pending.filter((p) => !ids.includes(p)) })),
      replaceAll: (items) => set({ items }),
    }),
    {
      name: "agrocontrol-encuesta",
      partialize: (s) => ({ items: s.items, pending: s.pending }),
    },
  ),
);
