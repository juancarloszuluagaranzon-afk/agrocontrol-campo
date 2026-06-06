"use client";

import { useMapStore } from "@/lib/store/mapStore";

/**
 * Selector del modo de medición (§5): área o distancia. Se abre desde el menú de
 * herramientas (activeTool === "medir"); al elegir, arranca la medición (el panel
 * inferior toma el control) y se cierra este selector.
 */
export function MeasureControl() {
  const setMeasureMode = useMapStore((s) => s.setMeasureMode);
  const setActiveTool = useMapStore((s) => s.setActiveTool);

  function elegir(mode: "area" | "distance") {
    setMeasureMode(mode);
    setActiveTool("none");
  }

  return (
    <div className="bg-background pointer-events-auto w-56 max-w-[calc(100vw-1rem)] rounded-xl p-2 shadow-lg ring-1 ring-black/10">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-sm font-semibold">📏 Dibujar y medir</span>
        <button
          type="button"
          onClick={() => setActiveTool("none")}
          aria-label="Cerrar"
          className="rounded px-1 text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
      <button
        type="button"
        onClick={() => elegir("area")}
        className="hover:bg-accent/5 w-full rounded-md px-3 py-2 text-left text-sm font-medium"
      >
        Medir área
      </button>
      <button
        type="button"
        onClick={() => elegir("distance")}
        className="hover:bg-accent/5 w-full rounded-md px-3 py-2 text-left text-sm font-medium"
      >
        Medir distancia
      </button>
    </div>
  );
}
