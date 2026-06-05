"use client";

import { useMapStore } from "@/lib/store/mapStore";

/** Conmutador de base del mapa: satélite ↔ plano (estilo Ingeniería Agrícola). */
export function BaseToggle() {
  const baseMode = useMapStore((s) => s.baseMode);
  const setBaseMode = useMapStore((s) => s.setBaseMode);

  return (
    <div className="bg-background pointer-events-auto inline-flex overflow-hidden rounded-lg text-xs font-semibold shadow-lg ring-1 ring-black/10">
      <button
        type="button"
        onClick={() => setBaseMode("satelite")}
        aria-pressed={baseMode === "satelite"}
        className={`px-3 py-2 ${baseMode === "satelite" ? "bg-accent text-white" : ""}`}
      >
        🛰️ Satélite
      </button>
      <button
        type="button"
        onClick={() => setBaseMode("plano")}
        aria-pressed={baseMode === "plano"}
        className={`px-3 py-2 ${baseMode === "plano" ? "bg-accent text-white" : ""}`}
      >
        🗺️ Plano
      </button>
    </div>
  );
}
