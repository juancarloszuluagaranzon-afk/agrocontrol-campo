"use client";

import { useSuerteStats } from "@/lib/data/useSuerteStats";
import { STAT_INDEXES, type StatIndex } from "@/lib/geo/sentinelStats";
import type { PlantaId } from "@/lib/plantas";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";

/**
 * Estadísticas por tablón (media/mín/máx) del/los índice(s) Sentinel Hub
 * activos, del mismo período (fecha Antes/Después) que el mapa (ADR-0027).
 * Solo aparece si hay un índice encendido; una fila por índice activo.
 */

const fmt = (v: number) =>
  v.toLocaleString("es-CO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

function StatRow({
  tabId,
  planta,
  index,
  date,
}: {
  tabId: string;
  planta: PlantaId;
  index: StatIndex;
  date: string | null;
}) {
  const { stats, configured, loading } = useSuerteStats(
    tabId,
    planta,
    index,
    date,
    true,
  );
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="w-10 shrink-0 font-semibold">{index}</span>
      {!configured ? (
        <span className="text-accent/50 text-xs">no configurado</span>
      ) : loading ? (
        <span className="text-accent/50 text-xs">calculando…</span>
      ) : stats ? (
        <span className="text-xs tabular-nums">
          media <b>{fmt(stats.mean)}</b> · mín {fmt(stats.min)} · máx{" "}
          {fmt(stats.max)}
        </span>
      ) : (
        <span className="text-accent/50 text-xs">sin dato (nubes)</span>
      )}
    </div>
  );
}

export function SuerteIndexStats({ tabId }: { tabId: string }) {
  const visible = useMapStore((s) => s.sentinelHubVisible);
  const dates = useMapStore((s) => s.sentinelHubDates);
  const slot = useMapStore((s) => s.sentinelHubSlot);
  const planta = usePlantaStore((s) => s.planta);

  if (!planta) return null;
  const active = STAT_INDEXES.filter((i) => visible[i]);
  if (active.length === 0) return null;

  const date = dates[slot];
  return (
    <div className="mt-3 border-t border-black/5 pt-3">
      <p className="text-accent/50 text-[11px] font-semibold tracking-wide uppercase">
        📊 Índices · del período de la fecha
      </p>
      <div className="mt-1">
        {active.map((i) => (
          <StatRow
            key={i}
            tabId={tabId}
            planta={planta}
            index={i}
            date={date}
          />
        ))}
      </div>
    </div>
  );
}
