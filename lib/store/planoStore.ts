import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlanoMeta, PuntoMuestreo } from "@/domain/plano/schema";

/**
 * Estado del "Plano de campo" (GeoPDF de muestreo de suelos). La metadata se
 * persiste en localStorage (liviana); la imagen vive en IndexedDB
 * (`imageBlobStore`, por `imageKey`). Uso ocasional, por dispositivo, sin sync.
 */
interface PlanoState {
  plano: PlanoMeta | null;
  /** Opacidad del backdrop (se ajusta sin recargar la imagen). */
  opacity: number;
  /** Mostrar/ocultar el backdrop (los puntos siguen visibles). */
  visible: boolean;

  cargar: (plano: PlanoMeta) => void;
  setOpacity: (o: number) => void;
  setVisible: (v: boolean) => void;
  /** Marca/desmarca un punto como muestreado. */
  toggleMuestreado: (id: string) => void;
  /** Añade un punto a mano (plan B si la extracción no trae puntos). */
  addPunto: (p: PuntoMuestreo) => void;
  quitar: () => void;
}

export const usePlanoStore = create<PlanoState>()(
  persist(
    (set) => ({
      plano: null,
      opacity: 0.85,
      visible: true,

      cargar: (plano) => set({ plano, opacity: plano.opacity, visible: true }),
      setOpacity: (opacity) =>
        set((s) => ({
          opacity,
          plano: s.plano ? { ...s.plano, opacity } : null,
        })),
      setVisible: (visible) => set({ visible }),

      toggleMuestreado: (id) =>
        set((s) =>
          s.plano
            ? {
                plano: {
                  ...s.plano,
                  puntos: s.plano.puntos.map((p) =>
                    p.id === id ? { ...p, muestreado: !p.muestreado } : p,
                  ),
                },
              }
            : {},
        ),

      addPunto: (p) =>
        set((s) =>
          s.plano
            ? { plano: { ...s.plano, puntos: [...s.plano.puntos, p] } }
            : {},
        ),

      quitar: () => set({ plano: null }),
    }),
    {
      name: "agrocontrol-plano",
      partialize: (s) => ({
        plano: s.plano,
        opacity: s.opacity,
        visible: s.visible,
      }),
    },
  ),
);
