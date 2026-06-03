import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuditEntry,
  EquipoInput,
  ProgramacionItem,
} from "@/domain/maquinaria/schema";
import {
  auditDelete,
  auditInsert,
  auditUpdate,
  buildItem,
  patchItem,
  type OpMeta,
  type SuerteDerivada,
} from "@/domain/maquinaria/operations";

/** Genera metadatos (id + timestamp) para una operación. */
function meta(autor: string): OpMeta {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    now: new Date().toISOString(),
    autor,
  };
}

interface MaquinariaState {
  items: ProgramacionItem[];
  audit: AuditEntry[];
  /** Autor de las acciones. Placeholder hasta Supabase Auth (Fase 4). */
  autor: string;

  addEquipo: (
    input: EquipoInput,
    derived: SuerteDerivada,
    fecha: string,
  ) => void;
  updateEquipo: (
    id: string,
    patch: Partial<EquipoInput & SuerteDerivada>,
  ) => void;
  removeEquipo: (id: string) => void;
  replaceAll: (items: ProgramacionItem[], audit: AuditEntry[]) => void;
  reset: () => void;
  /** Fija el autor de las acciones (usuario autenticado). */
  setAutor: (autor: string) => void;
}

export const useMaquinariaStore = create<MaquinariaState>()(
  persist(
    (set) => ({
      items: [],
      audit: [],
      autor: "Operador de campo",

      addEquipo: (input, derived, fecha) =>
        set((s) => {
          const m = meta(s.autor);
          const item = buildItem(input, derived, fecha, m);
          return {
            items: [...s.items, item],
            audit: [auditInsert(item, m), ...s.audit],
          };
        }),

      updateEquipo: (id, patch) =>
        set((s) => {
          const before = s.items.find((i) => i.id === id);
          if (!before) return s;
          const m = meta(s.autor);
          const after = patchItem(before, patch, m.now);
          return {
            items: s.items.map((i) => (i.id === id ? after : i)),
            audit: [auditUpdate(before, after, m), ...s.audit],
          };
        }),

      removeEquipo: (id) =>
        set((s) => {
          const before = s.items.find((i) => i.id === id);
          if (!before) return s;
          const m = meta(s.autor);
          // Soft delete: nunca se borra el histórico (§9).
          const after = { ...before, deleted: true, updated_at: m.now };
          return {
            items: s.items.map((i) => (i.id === id ? after : i)),
            audit: [auditDelete(before, m), ...s.audit],
          };
        }),

      replaceAll: (items, audit) => set({ items, audit }),
      reset: () => set({ items: [], audit: [] }),
      setAutor: (autor) => set({ autor }),
    }),
    { name: "agrocontrol-maquinaria" },
  ),
);

/** Equipos activos (no borrados) de una fecha. */
export function itemsForFecha(
  items: ProgramacionItem[],
  fecha: string,
): ProgramacionItem[] {
  return items.filter((i) => i.fecha === fecha && !i.deleted);
}
