"use client";

import { useEffect, useState } from "react";
import type { Bbox, CatalogDate } from "@/lib/geo/sentinelCatalog";

interface SentinelDatesResult {
  /** Fechas con imagen y su nubosidad (vacío si no configurado / offline). */
  dates: CatalogDate[];
  /** false si faltan las credenciales OAuth en el servidor (ADR-0025). */
  configured: boolean;
}

/**
 * Trae del endpoint las fechas de adquisición Sentinel-2 sobre el AOI. Degrada a
 * lista vacía si no hay credenciales o no hay red (el calendario sigue usable).
 */
export function useSentinelDates(
  bbox: Bbox,
  from: string,
  to: string,
  enabled: boolean,
): SentinelDatesResult {
  const [dates, setDates] = useState<CatalogDate[]>([]);
  const [configured, setConfigured] = useState(true);
  const bboxKey = bbox.join(",");

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    const q = new URLSearchParams({ bbox: bboxKey, from, to });
    fetch(`/api/sentinel-dates?${q.toString()}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: SentinelDatesResult) => {
        setDates(Array.isArray(j.dates) ? j.dates : []);
        setConfigured(j.configured ?? false);
      })
      .catch(() => {
        /* offline / abort: se queda con lo último (o vacío) */
      });
    return () => ctrl.abort();
  }, [bboxKey, from, to, enabled]);

  return { dates, configured };
}
