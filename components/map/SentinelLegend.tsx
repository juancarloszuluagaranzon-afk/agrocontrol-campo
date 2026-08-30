"use client";

import { sentinelHubConfig } from "@/lib/geo/sentinelHub";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Escala de color del índice Sentinel Hub activo (ADR-0026). Aparece abajo a la
 * izquierda mientras haya un índice encendido, para que en campo se entienda qué
 * significan los colores. Se oculta cuando hay un panel inferior (tablón o
 * medición), igual que el menú de herramientas, para no encimarse.
 */

const SENTINEL_HUB = sentinelHubConfig();

interface IndexLegend {
  title: string;
  /** Degradado CSS de menor a mayor valor del índice. */
  gradient: string;
  from: string;
  to: string;
}

// Escalas por índice (rampas estándar; el color exacto lo define el producto de
// la config CDSE, pero el significado —bajo→alto— es el mismo).
const INDEX_LEGENDS: Record<string, IndexLegend> = {
  NDVI: {
    title: "NDVI · vigor de la vegetación",
    gradient:
      "linear-gradient(to right,#a50026,#d73027,#fdae61,#fee08b,#a6d96a,#1a9850,#006837)",
    from: "Suelo / poca",
    to: "Vigorosa",
  },
  NDMI: {
    title: "NDMI · humedad de la vegetación",
    gradient:
      "linear-gradient(to right,#8c510a,#d8b365,#f6e8c3,#c7eae5,#5ab4ac,#01665e)",
    from: "Seco",
    to: "Húmedo",
  },
};

export function SentinelLegend() {
  const visible = useMapStore((s) => s.sentinelHubVisible);
  const tablonSeleccionado = useMapStore((s) => s.selected !== null);
  const midiendo = useMapStore((s) => s.measureMode !== "off");

  if (!SENTINEL_HUB) return null;
  // No encimarse con los paneles inferiores (mismo criterio que ToolsMenu).
  if (tablonSeleccionado || midiendo) return null;

  const activos = SENTINEL_HUB.layers.filter(
    (l) => visible[l.id] && INDEX_LEGENDS[l.id],
  );
  if (activos.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-2 z-10 flex flex-col gap-1.5">
      {activos.map((l) => {
        const leg = INDEX_LEGENDS[l.id];
        if (!leg) return null;
        return (
          <div
            key={l.id}
            className="bg-background/95 w-44 rounded-lg p-2 shadow-lg ring-1 ring-black/10 backdrop-blur"
          >
            <div className="mb-1 text-[11px] leading-tight font-semibold text-slate-700">
              {leg.title}
            </div>
            <div
              className="h-2.5 w-full rounded-full ring-1 ring-black/10"
              style={{ backgroundImage: leg.gradient }}
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
              <span>{leg.from}</span>
              <span>{leg.to}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
