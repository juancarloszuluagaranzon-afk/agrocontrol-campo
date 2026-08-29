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
  const sentinelHubDates = useMapStore((s) => s.sentinelHubDates);
  const sentinelHubSlot = useMapStore((s) => s.sentinelHubSlot);
  const setSentinelHubDate = useMapStore((s) => s.setSentinelHubDate);
  const setSentinelHubSlot = useMapStore((s) => s.setSentinelHubSlot);
  const planta = usePlantaStore((s) => s.planta);
  const capas = plantaConfig(planta).contextLayers;

  // La fecha A/B solo tiene sentido con algún índice Sentinel Hub encendido.
  const anySentinelOn = SENTINEL_HUB
    ? SENTINEL_HUB.layers.some((l) => sentinelHubVisible[l.id])
    : false;

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

      {/* Fecha A/B para comparar antes/después de un riego (ADR-0024). */}
      {anySentinelOn && (
        <div className="mx-1 mt-1 rounded-md bg-black/[0.03] p-2">
          <div className="mb-1 text-xs font-medium text-slate-600">
            📅 Fecha — comparar riego
          </div>
          {(["A", "B"] as const).map((slot) => (
            <label
              key={slot}
              className="flex items-center gap-2 py-1 text-sm"
              title="Marca este punto para mostrarlo en el mapa"
            >
              <input
                type="radio"
                name="sentinelhub-slot"
                checked={sentinelHubSlot === slot}
                onChange={() => setSentinelHubSlot(slot)}
                className="size-4"
              />
              <span className="w-16 shrink-0">
                {slot === "A" ? "Antes" : "Después"}
              </span>
              <input
                type="date"
                value={sentinelHubDates[slot] ?? ""}
                onChange={(e) =>
                  setSentinelHubDate(slot, e.target.value || null)
                }
                className="min-w-0 flex-1 rounded border border-black/10 px-1 py-0.5 text-xs"
              />
            </label>
          ))}
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
            Vacío = imagen más reciente. Muestra la última escena hasta esa
            fecha; alterna Antes/Después para comparar.
          </p>
        </div>
      )}

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
