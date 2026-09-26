import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Tablas que se bajan de forma incremental por `updated_at` (ADR-0033). */
export type TablaIncremental =
  | "marcadores"
  | "mediciones"
  | "precipitaciones"
  | "lecturas_hidrologicas";

interface SyncState {
  /** uid al que pertenecen los cursores (al cambiar de usuario se reinician). */
  userId: string;
  /** Último `updated_at` sincronizado por tabla (ISO). Sin entrada = bajar todo. */
  cursores: Partial<Record<TablaIncremental, string>>;
  setCursor: (tabla: TablaIncremental, iso: string) => void;
  /** Alinea los cursores al usuario actual: si cambió, los borra. */
  prepararParaUsuario: (uid: string) => void;
  /** Fuerza una descarga completa en el próximo ciclo. */
  reiniciar: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      userId: "",
      cursores: {},
      setCursor: (tabla, iso) =>
        set((s) => ({ cursores: { ...s.cursores, [tabla]: iso } })),
      prepararParaUsuario: (uid) =>
        set((s) => (s.userId === uid ? s : { userId: uid, cursores: {} })),
      reiniciar: () => set({ cursores: {} }),
    }),
    { name: "agrocontrol-sync" },
  ),
);
