import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  LecturaHidro,
  LecturaHidroInput,
  TipoLectura,
} from "@/domain/hidrologia/schema";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

interface HidrologiaState {
  items: LecturaHidro[];
  /** Outbox: ids de lecturas con cambios pendientes de sincronizar (§14). */
  pending: string[];
  syncing: boolean;
  /** uid del usuario autenticado (autor de las lecturas que crea). */
  userId: string;

  setUserId: (id: string) => void;
  setSyncing: (v: boolean) => void;
  addLectura: (input: LecturaHidroInput, planta: string) => void;
  /**
   * Registra/actualiza la lectura de un punto en una fecha: si ya existe una
   * lectura **propia** (no borrada) de ese (planta, punto, fecha), la
   * actualiza; si no, crea una nueva. Evita duplicados al editar la planilla.
   */
  setLectura: (
    planta: string,
    punto: string,
    tipo: TipoLectura,
    fecha: string,
    valor: number,
  ) => void;
  removeLectura: (id: string) => void;
  markSynced: (ids: string[]) => void;
  replaceAll: (items: LecturaHidro[]) => void;
}

function enqueue(pending: string[], id: string): string[] {
  return pending.includes(id) ? pending : [...pending, id];
}

export const useHidrologiaStore = create<HidrologiaState>()(
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
          const l: LecturaHidro = {
            id: newId(),
            autor: s.userId,
            planta,
            punto: input.punto,
            tipo: input.tipo,
            fecha: input.fecha,
            valor: input.valor,
            nota: input.nota,
            deleted: false,
            created_at: now,
            updated_at: now,
          };
          return { items: [...s.items, l], pending: enqueue(s.pending, l.id) };
        }),

      setLectura: (planta, punto, tipo, fecha, valor) =>
        set((s) => {
          const now = new Date().toISOString();
          const esMia = (l: LecturaHidro) =>
            l.autor === s.userId || s.pending.includes(l.id);
          const existente = s.items.find(
            (l) =>
              !l.deleted &&
              l.planta === planta &&
              l.punto === punto &&
              l.fecha === fecha &&
              esMia(l),
          );
          if (existente) {
            return {
              items: s.items.map((l) =>
                l.id === existente.id ? { ...l, valor, updated_at: now } : l,
              ),
              pending: enqueue(s.pending, existente.id),
            };
          }
          const l: LecturaHidro = {
            id: newId(),
            autor: s.userId,
            planta,
            punto,
            tipo,
            fecha,
            valor,
            nota: "",
            deleted: false,
            created_at: now,
            updated_at: now,
          };
          return { items: [...s.items, l], pending: enqueue(s.pending, l.id) };
        }),

      removeLectura: (id) =>
        set((s) => ({
          items: s.items.map((l) =>
            l.id === id
              ? { ...l, deleted: true, updated_at: new Date().toISOString() }
              : l,
          ),
          pending: enqueue(s.pending, id),
        })),

      markSynced: (ids) =>
        set((s) => ({ pending: s.pending.filter((p) => !ids.includes(p)) })),
      replaceAll: (items) => set({ items }),
    }),
    {
      name: "agrocontrol-hidrologia",
      partialize: (s) => ({ items: s.items, pending: s.pending }),
    },
  ),
);

/** Lecturas activas (no borradas). */
export function activas(items: LecturaHidro[]): LecturaHidro[] {
  return items.filter((l) => !l.deleted);
}
