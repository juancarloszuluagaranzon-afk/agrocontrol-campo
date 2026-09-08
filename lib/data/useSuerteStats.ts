"use client";

import { useEffect, useState } from "react";
import { sentinelHubTimeRange } from "@/lib/geo/sentinelHub";
import type { StatIndex, SuerteStats } from "@/lib/geo/sentinelStats";
import type { PlantaId } from "@/lib/plantas";

interface Result {
  stats: SuerteStats | null;
  configured: boolean;
  loading: boolean;
}

/**
 * Estadísticas (media/mín/máx) de un índice sobre un tablón, del endpoint
 * `/api/sentinel-stats`, para el mismo período (fecha Antes/Después) que el mapa.
 * Degrada a `null` si no hay credenciales, red o datos.
 */
export function useSuerteStats(
  tabId: string,
  planta: PlantaId,
  index: StatIndex,
  dateISO: string | null,
  enabled: boolean,
): Result {
  const { from, to } = sentinelHubTimeRange(dateISO);
  const key = `${tabId}|${planta}|${index}|${from}|${to}`;
  // Se guarda con su `key`; si la key actual no coincide, está "cargando"
  // (evita setState síncrono en el efecto y muestra datos frescos, no viejos).
  const [data, setData] = useState<{
    key: string;
    stats: SuerteStats | null;
    configured: boolean;
  }>({ key: "", stats: null, configured: true });

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    const q = new URLSearchParams({ tab_id: tabId, planta, index, from, to });
    fetch(`/api/sentinel-stats?${q.toString()}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: { stats?: SuerteStats | null; configured?: boolean }) =>
        setData({
          key,
          stats: j.stats ?? null,
          configured: j.configured ?? false,
        }),
      )
      .catch(() => {
        /* offline / abort */
      });
    return () => ctrl.abort();
  }, [key, enabled, tabId, planta, index, from, to]);

  const fresh = data.key === key;
  return {
    stats: fresh ? data.stats : null,
    configured: data.configured,
    loading: enabled && !fresh,
  };
}
