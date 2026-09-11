"use client";

import { SentinelDatePicker } from "@/components/map/SentinelDatePicker";
import { sentinelHubConfig } from "@/lib/geo/sentinelHub";
import { useMapStore } from "@/lib/store/mapStore";

// Config leída del entorno (inlineada en build); si no hay instance ID, no hay
// índices que mostrar (ADR-0022).
const SENTINEL_HUB = sentinelHubConfig();

/**
 * Panel de índices satelitales (Sentinel Hub / CDSE): un toggle por índice
 * (NDVI, NDMI, EVI, NIR, NDRE, SAVI…). Se separó de 🗂️ Capas para que el visor
 * distinga las capas de contexto del mapa de los índices de vegetación. Se abre
 * desde el menú de herramientas (activeTool === "indices").
 */
export function IndexToggles() {
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const sentinelHubVisible = useMapStore((s) => s.sentinelHubVisible);
  const toggleSentinelHub = useMapStore((s) => s.toggleSentinelHub);

  // El calendario A/B solo tiene sentido con algún índice encendido.
  const anySentinelOn = SENTINEL_HUB
    ? SENTINEL_HUB.layers.some((l) => sentinelHubVisible[l.id])
    : false;

  return (
    <div className="bg-background pointer-events-auto w-56 max-w-[calc(100vw-1rem)] rounded-xl p-2 shadow-lg ring-1 ring-black/10">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold">🛰️ Índices</span>
        <button
          type="button"
          onClick={() => setActiveTool("none")}
          aria-label="Cerrar"
          className="rounded px-1 text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>

      {SENTINEL_HUB ? (
        <>
          {/* Un toggle por índice de la instancia CDSE. */}
          {SENTINEL_HUB.layers.map((layer) => (
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

          {/* Calendario A/B para comparar antes/después de un riego, con los días
              de paso del satélite marcados (ADR-0024, ADR-0025). */}
          {anySentinelOn && <SentinelDatePicker />}
        </>
      ) : (
        <p className="px-2 py-2 text-sm text-slate-500">
          Índices satelitales no configurados.
        </p>
      )}
    </div>
  );
}
