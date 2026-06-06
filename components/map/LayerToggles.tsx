"use client";

import { CONTEXT_LAYERS } from "@/lib/geo/layers";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Panel de capas de contexto conmutables (§5). Se abre desde el menú de
 * herramientas (activeTool === "capas"); los toggles tienen objetivos táctiles
 * grandes (§13).
 */
export function LayerToggles() {
  const activeContext = useMapStore((s) => s.activeContext);
  const toggleContext = useMapStore((s) => s.toggleContext);
  const setActiveTool = useMapStore((s) => s.setActiveTool);

  return (
    <div className="bg-background pointer-events-auto w-56 max-w-[calc(100vw-1rem)] rounded-xl p-2 shadow-lg ring-1 ring-black/10">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold">🗂️ Capas</span>
        <button
          type="button"
          onClick={() => setActiveTool("none")}
          aria-label="Cerrar"
          className="rounded px-1 text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
      <fieldset className="mt-1">
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
    </div>
  );
}
