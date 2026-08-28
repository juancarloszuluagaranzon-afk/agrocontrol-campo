"use client";

import { sentinelHubConfig } from "@/lib/geo/sentinelHub";
import { plantaConfig } from "@/lib/plantas";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";

// Config leída del entorno (inlineada en build); si no hay instance ID, el
// toggle de Sentinel Hub no se muestra (ADR-0022).
const SENTINEL_HUB = sentinelHubConfig();

/**
 * Panel de capas de contexto conmutables (§5). Se abre desde el menú de
 * herramientas (activeTool === "capas"); los toggles tienen objetivos táctiles
 * grandes (§13).
 */
export function LayerToggles() {
  const activeContext = useMapStore((s) => s.activeContext);
  const toggleContext = useMapStore((s) => s.toggleContext);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const sentinelVisible = useMapStore((s) => s.sentinelVisible);
  const toggleSentinel = useMapStore((s) => s.toggleSentinel);
  const sentinelHubVisible = useMapStore((s) => s.sentinelHubVisible);
  const toggleSentinelHub = useMapStore((s) => s.toggleSentinelHub);
  const planta = usePlantaStore((s) => s.planta);
  const capas = plantaConfig(planta).contextLayers;

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
      {/* Satélite alterno (raster), aparte de las capas de contexto vectoriales. */}
      <label className="hover:bg-accent/5 flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm">
        <input
          type="checkbox"
          checked={sentinelVisible}
          onChange={toggleSentinel}
          className="size-4"
        />
        <span aria-hidden>🛰️</span>
        Sentinel-2 (sin nubes)
      </label>
      {/* Sentinel Hub (CDSE): una capa/toggle por índice. Solo si está configurado. */}
      {SENTINEL_HUB?.layers.map((layer) => (
        <label
          key={layer.id}
          className="hover:bg-accent/5 flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
        >
          <input
            type="checkbox"
            checked={sentinelHubVisible[layer.id] ?? false}
            onChange={() => toggleSentinelHub(layer.id)}
            className="size-4"
          />
          <span aria-hidden>🛰️</span>
          {layer.label}
        </label>
      ))}
      <div className="my-1 border-t border-black/5" />

      <fieldset className="mt-1">
        <legend className="sr-only">Capas de contexto</legend>
        {capas.map((layer) => (
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
