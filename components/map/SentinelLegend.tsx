"use client";

import { sentinelHubConfig } from "@/lib/geo/sentinelHub";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Escala de color del índice Sentinel Hub activo (ADR-0026). Aparece abajo a la
 * izquierda mientras haya un índice encendido, para que en campo se entienda qué
 * significan los colores. Se oculta cuando hay un panel inferior (tablón o
 * medición), igual que el menú de herramientas, para no encimarse.
 *
 * Las escalas son **exactas**: replican la paleta del evalscript de cada capa.
 * NDVI/NDMI usan `ColorMapVisualizer.createDefaultColorMap()` de Sentinel Hub,
 * que es **discreta** (bins: color = parada más cercana ≤ valor), por eso la
 * barra va escalonada y no en degradado.
 */

const SENTINEL_HUB = sentinelHubConfig();

interface Bin {
  /** Valor del índice desde el que aplica este color (parada del color map). */
  from: number;
  color: string;
}

interface IndexLegend {
  title: string;
  bins: Bin[];
  /** Rango del eje de valores para posicionar las etiquetas. */
  axis: [number, number];
  /** Valores a rotular bajo la barra. */
  ticks: number[];
  /** Nota de la parada por debajo del rango (p. ej. negro = agua/sin dato). */
  note?: { color: string; label: string };
}

// Paleta por defecto de Sentinel Hub (`createDefaultColorMap`), común a NDVI/NDMI:
// paradas cada 0,1 de −0,2 a 0,9 (más negro para < −0,2). Discreta.
const DEFAULT_COLORMAP: Bin[] = [
  { from: -0.2, color: "#ff0000" },
  { from: -0.1, color: "#9a0000" },
  { from: 0.0, color: "#660000" },
  { from: 0.1, color: "#ffff33" },
  { from: 0.2, color: "#cccc33" },
  { from: 0.3, color: "#666600" },
  { from: 0.4, color: "#33ffff" },
  { from: 0.5, color: "#33cccc" },
  { from: 0.6, color: "#006666" },
  { from: 0.7, color: "#33ff33" },
  { from: 0.8, color: "#33cc33" },
  { from: 0.9, color: "#006600" },
];
const DEFAULT_NOTE = { color: "#000000", label: "< −0,2: agua / sin dato" };

const INDEX_LEGENDS: Record<string, IndexLegend> = {
  // NDVI: evalscript predefinido `createDefaultColorMap()` (verificado con el
  // evalscript real de la capa). B08/B04.
  NDVI: {
    title: "NDVI · vigor de la vegetación",
    bins: DEFAULT_COLORMAP,
    axis: [-0.2, 1.0],
    ticks: [-0.2, 0, 0.2, 0.4, 0.6, 0.8],
    note: DEFAULT_NOTE,
  },
  // NDMI: se asume la misma paleta por defecto (B08/B11) — pendiente de confirmar
  // con el evalscript real de la capa NDMI.
  NDMI: {
    title: "NDMI · humedad de la vegetación",
    bins: DEFAULT_COLORMAP,
    axis: [-0.2, 1.0],
    ticks: [-0.2, 0, 0.2, 0.4, 0.6, 0.8],
    note: DEFAULT_NOTE,
  },
};

const fmt = (v: number) => v.toLocaleString("es-CO");

function LegendCard({ leg }: { leg: IndexLegend }) {
  const [lo, hi] = leg.axis;
  const pos = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div className="bg-background/95 w-52 rounded-lg p-2 shadow-lg ring-1 ring-black/10 backdrop-blur">
      <div className="mb-1 text-[11px] leading-tight font-semibold text-slate-700">
        {leg.title}
      </div>
      {/* Barra escalonada (bins de igual ancho: paradas uniformes de 0,1). */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full ring-1 ring-black/10">
        {leg.bins.map((b) => (
          <div
            key={b.from}
            className="flex-1"
            style={{ backgroundColor: b.color }}
          />
        ))}
      </div>
      {/* Eje de valores del índice. */}
      <div className="relative mt-0.5 h-3">
        {leg.ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 text-[9px] text-slate-500"
            style={{ left: `${pos(t)}%` }}
          >
            {fmt(t)}
          </span>
        ))}
      </div>
      {leg.note && (
        <div className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-500">
          <span
            aria-hidden
            className="inline-block size-2.5 shrink-0 rounded-sm ring-1 ring-black/10"
            style={{ backgroundColor: leg.note.color }}
          />
          {leg.note.label}
        </div>
      )}
    </div>
  );
}

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
        return leg ? <LegendCard key={l.id} leg={leg} /> : null;
      })}
    </div>
  );
}
