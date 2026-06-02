"use client";

import { useState } from "react";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Selector del modo de medición (§5): área o distancia. Botón flotante que abre
 * un pequeño menú; resalta cuando hay una medición activa.
 */
export function MeasureControl() {
  const [open, setOpen] = useState(false);
  const measureMode = useMapStore((s) => s.measureMode);
  const setMeasureMode = useMapStore((s) => s.setMeasureMode);
  const activo = measureMode !== "off";

  function elegir(mode: "area" | "distance") {
    setMeasureMode(mode);
    setOpen(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => (activo ? setMeasureMode("off") : setOpen((v) => !v))}
        aria-pressed={activo}
        aria-label={activo ? "Terminar medición" : "Medir"}
        className={`grid size-12 place-items-center rounded-full text-xl shadow-lg ring-1 ring-black/10 ${
          activo ? "bg-orange-500 text-white" : "bg-background"
        }`}
      >
        {activo ? "✕" : "📐"}
      </button>

      {open && !activo && (
        <div className="bg-background flex flex-col overflow-hidden rounded-lg text-sm font-semibold shadow-lg ring-1 ring-black/10">
          <button
            type="button"
            onClick={() => elegir("area")}
            className="hover:bg-accent/5 px-3 py-2 text-left"
          >
            Medir área
          </button>
          <button
            type="button"
            onClick={() => elegir("distance")}
            className="hover:bg-accent/5 px-3 py-2 text-left"
          >
            Medir distancia
          </button>
        </div>
      )}
    </div>
  );
}
