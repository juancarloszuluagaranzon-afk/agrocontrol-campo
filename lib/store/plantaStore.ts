import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isPlantaId, type PlantaId } from "@/lib/plantas";

/**
 * Planta activa (Riopaila / Castilla), persistida en localStorage. El usuario la
 * elige una vez en el selector de entrada; al reabrir la app ve siempre esa
 * planta (§ ADR-0007). `hydrated` distingue "aún no leí localStorage" de
 * "ningún valor guardado", para no mostrar el selector mientras hidrata.
 */
interface PlantaState {
  planta: PlantaId | null;
  /** true cuando ya se rehidrató desde localStorage. */
  hydrated: boolean;
  setPlanta: (p: PlantaId) => void;
  setHydrated: (v: boolean) => void;
}

export const usePlantaStore = create<PlantaState>()(
  persist(
    (set) => ({
      planta: null,
      hydrated: false,
      setPlanta: (planta) => set({ planta }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "agrocontrol-planta",
      partialize: (s) => ({ planta: s.planta }),
      // Descarta un valor corrupto y marca hidratación al terminar.
      onRehydrateStorage: () => (state) => {
        if (state && !isPlantaId(state.planta)) state.planta = null;
        state?.setHydrated(true);
      },
    },
  ),
);
