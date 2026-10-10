"use client";

import { useEffect, useState } from "react";
import { usePlantaStore } from "@/lib/store/plantaStore";
import type { PoligonoThiessen } from "@/domain/precipitaciones/porSuerte";

type Geometria =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

/**
 * Polígonos de Thiessen de la red de pluviómetros (área de influencia de cada
 * uno), desde `/data/contexto_thiessen.geojson` (cacheado offline por el SW).
 * Solo existe para Riopaila; en otras plantas → [].
 */
export function useThiessen(): PoligonoThiessen[] {
  const planta = usePlantaStore((s) => s.planta);
  const [poligonos, setPoligonos] = useState<PoligonoThiessen[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (planta !== "riopaila") {
      queueMicrotask(() => {
        if (!cancelled) setPoligonos([]);
      });
      return () => {
        cancelled = true;
      };
    }
    void fetch("/data/contexto_thiessen.geojson")
      .then((r) => r.json())
      .then(
        (fc: {
          features?: Array<{
            properties?: { Pluviometr?: number };
            geometry?: Geometria;
          }>;
        }) => {
          const out: PoligonoThiessen[] = [];
          for (const f of fc.features ?? []) {
            const id = Number(f.properties?.Pluviometr);
            const g = f.geometry;
            if (!Number.isFinite(id) || !g) continue;
            out.push({
              pluviometro: id,
              poligonos: g.type === "Polygon" ? [g.coordinates] : g.coordinates,
            });
          }
          if (!cancelled) setPoligonos(out);
        },
      )
      .catch(() => {
        /* sin Thiessen, cada suerte usa el pluviómetro más cercano */
      });
    return () => {
      cancelled = true;
    };
  }, [planta]);

  return poligonos;
}
