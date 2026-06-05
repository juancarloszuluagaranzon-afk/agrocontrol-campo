"use client";

import { useState } from "react";
import { HACIENDA_COLORS } from "@/lib/geo/haciendas";
import { CONTEXT_LAYERS } from "@/lib/geo/layers";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Leyenda / convenciones del modo Plano (§5): color por hacienda y capas de
 * contexto, como en el plano oficial de Ingeniería Agrícola.
 */
export function Legend() {
  const [open, setOpen] = useState(false);
  const baseMode = useMapStore((s) => s.baseMode);

  if (baseMode !== "plano") return null;

  return (
    <div className="pointer-events-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="bg-background flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-lg ring-1 ring-black/10"
      >
        <span aria-hidden>📖</span> Leyenda
      </button>

      {open && (
        <div className="bg-background mt-1 max-h-[60vh] w-52 overflow-auto rounded-lg p-3 text-xs shadow-lg ring-1 ring-black/10">
          <p className="text-accent/60 mb-1 font-bold uppercase">Haciendas</p>
          <ul className="space-y-1">
            {Object.entries(HACIENDA_COLORS).map(([hac, color]) => (
              <li key={hac} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">{hac}</span>
              </li>
            ))}
          </ul>
          <p className="text-accent/60 mt-3 mb-1 font-bold uppercase">
            Convenciones
          </p>
          <ul className="space-y-1">
            {CONTEXT_LAYERS.map((l) => (
              <li key={l.id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="truncate">{l.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
