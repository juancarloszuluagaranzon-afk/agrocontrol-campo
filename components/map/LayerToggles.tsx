"use client";

import { useState } from "react";
import { CONTEXT_LAYERS } from "@/lib/geo/layers";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Control de capas de contexto conmutables (§5). Plegable para no estorbar el
 * mapa; los toggles tienen objetivos táctiles grandes (§13).
 */
export function LayerToggles() {
  const [open, setOpen] = useState(false);
  const activeContext = useMapStore((s) => s.activeContext);
  const toggleContext = useMapStore((s) => s.toggleContext);
  const activos = Object.values(activeContext).filter(Boolean).length;

  return (
    <div className="pointer-events-auto absolute top-2 left-2 z-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="bg-background flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-lg ring-1 ring-black/10"
      >
        <span aria-hidden>🗂️</span> Capas
        {activos > 0 && (
          <span className="bg-primary text-accent rounded-full px-1.5 text-xs font-bold">
            {activos}
          </span>
        )}
      </button>

      {open && (
        <fieldset className="bg-background mt-1 rounded-lg p-2 shadow-lg ring-1 ring-black/10">
          <legend className="sr-only">Capas de contexto</legend>
          {CONTEXT_LAYERS.map((layer) => (
            <label
              key={layer.id}
              className="hover:bg-accent/5 flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={activeContext[layer.id] ?? false}
                onChange={() => toggleContext(layer.id)}
                className="size-4"
              />
              <span
                aria-hidden
                className="inline-block size-3 rounded-full"
                style={{ backgroundColor: layer.color }}
              />
              {layer.label}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
