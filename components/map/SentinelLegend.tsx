"use client";

import { sentinelHubConfig } from "@/lib/geo/sentinelHub";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Escala de color del índice Sentinel Hub activo (ADR-0026). Aparece al margen
 * inferior derecho mientras haya un índice encendido, para que en campo se
 * entienda qué significan los colores. Se oculta cuando hay un panel inferior
 * (tablón o medición) para no encimarse; va abajo-derecha (no al centro) para
 * despejar el FAB de "Mi ubicación".
 *
 * Las escalas son **exactas**: replican la paleta del evalscript real de cada
 * capa (ambas son discretas → barra escalonada, no degradado). Las paradas se
 * rotulan por límite de bin, no por eje lineal, para soportar bins no uniformes.
 */

const SENTINEL_HUB = sentinelHubConfig();

interface Bin {
  /** Valor del índice desde el que aplica este color (límite inferior del bin). */
  from: number;
  color: string;
}

interface IndexLegend {
  title: string;
  bins: Bin[];
  /** Índices de bin cuyo `from` se rotula bajo la barra (posición = i/bins.length). */
  ticks: number[];
  /** Palabras en los extremos (semántica bajo→alto). */
  ends: [string, string];
  /** Parada por debajo del rango, aparte de la barra (p. ej. negro NDVI). */
  note?: { color: string; label: string };
}

// NDVI: `ColorMapVisualizer.createDefaultColorMap()` de Sentinel Hub (verificado
// con el evalscript real). Paradas cada 0,1 de −0,2 a 0,9; negro para < −0,2.
const NDVI_BINS: Bin[] = [
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

// NDMI: evalscript propio (verificado). 5 clases: seco → húmedo. La primera
// (< −0,2) es un color mostrado, no "sin dato" (from sentinela para la key).
const NDMI_BINS: Bin[] = [
  { from: -1, color: "#cc8033" }, // < −0,2 (seco)
  { from: -0.2, color: "#f0cc73" },
  { from: 0.0, color: "#d9e68c" },
  { from: 0.2, color: "#80cc8c" },
  { from: 0.4, color: "#1a73b3" }, // ≥ 0,4 (húmedo)
];

const INDEX_LEGENDS: Record<string, IndexLegend> = {
  NDVI: {
    title: "NDVI · vigor de la vegetación",
    bins: NDVI_BINS,
    ticks: [2, 4, 6, 8, 10], // 0 · 0,2 · 0,4 · 0,6 · 0,8
    ends: ["poca veg.", "vigorosa"],
    note: { color: "#000000", label: "< −0,2: agua / sin dato" },
  },
  NDMI: {
    title: "NDMI · humedad de la vegetación",
    bins: NDMI_BINS,
    ticks: [1, 2, 3, 4], // −0,2 · 0 · 0,2 · 0,4
    ends: ["seco", "húmedo"],
  },
};

const fmt = (v: number) => v.toLocaleString("es-CO");

function LegendCard({ leg }: { leg: IndexLegend }) {
  const n = leg.bins.length;
  return (
    <div className="bg-background/95 w-52 rounded-lg p-2 shadow-lg ring-1 ring-black/10 backdrop-blur">
      <div className="mb-1 text-[11px] leading-tight font-semibold text-slate-700">
        {leg.title}
      </div>
      {/* Barra escalonada (un segmento por bin). */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full ring-1 ring-black/10">
        {leg.bins.map((b, i) => (
          <div
            key={i}
            className="flex-1"
            style={{ backgroundColor: b.color }}
          />
        ))}
      </div>
      {/* Rótulos de valor en los límites de bin (posición = i/n). */}
      <div className="relative mt-0.5 h-3">
        {leg.ticks.map((i) => {
          const b = leg.bins[i];
          return b ? (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-[9px] text-slate-500"
              style={{ left: `${(i / n) * 100}%` }}
            >
              {fmt(b.from)}
            </span>
          ) : null;
        })}
      </div>
      {/* Palabras extremas (bajo → alto). */}
      <div className="flex justify-between text-[9px] font-medium text-slate-500">
        <span>{leg.ends[0]}</span>
        <span>{leg.ends[1]}</span>
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
    <div className="pointer-events-none absolute right-2 bottom-[calc(2rem+env(safe-area-inset-bottom,0px))] z-10 flex flex-col items-end gap-1.5">
      {activos.map((l) => {
        const leg = INDEX_LEGENDS[l.id];
        return leg ? <LegendCard key={l.id} leg={leg} /> : null;
      })}
    </div>
  );
}
