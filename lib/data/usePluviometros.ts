"use client";

import { useEffect, useState } from "react";
import { usePlantaStore } from "@/lib/store/plantaStore";

/**
 * Lista ordenada de IDs de pluviómetro (campo `Pluviometr`) leída de
 * `/data/contexto_pluviometros.geojson` (ya cacheado offline por el SW). Es la
 * red oficial de Riopaila; en otras plantas no hay pluviómetros → lista vacía.
 */
export function usePluviometros(): number[] {
  const planta = usePlantaStore((s) => s.planta);
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Solo Riopaila tiene pluviómetros; en otras plantas se resuelve a [].
    const cargar: Promise<number[]> =
      planta === "riopaila"
        ? fetch("/data/contexto_pluviometros.geojson")
            .then((r) => r.json())
            .then(
              (fc: {
                features?: { properties?: { Pluviometr?: number } }[];
              }) => {
                const nums = (fc.features ?? [])
                  .map((f) => f.properties?.Pluviometr)
                  .filter((n): n is number => typeof n === "number");
                return [...new Set(nums)].sort((a, b) => a - b);
              },
            )
        : Promise.resolve([]);
    void cargar
      .then((nums) => {
        if (!cancelled) setIds(nums);
      })
      .catch(() => {
        /* sin pluviómetros, el selector queda vacío */
      });
    return () => {
      cancelled = true;
    };
  }, [planta]);

  return ids;
}
