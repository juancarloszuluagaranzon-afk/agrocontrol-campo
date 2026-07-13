"use client";

import { useEffect, useState } from "react";
import {
  haciendaLabelListSchema,
  type HaciendaLabel,
} from "@/domain/haciendas/schema";
import { plantaConfig } from "@/lib/plantas";
import { usePlantaStore } from "@/lib/store/plantaStore";

/**
 * Puntos de etiqueta de hacienda (nombre + centroide) de la **planta activa**,
 * para la marca de agua del modo Plano (§ADR-0014). Se recarga al cambiar de
 * planta, igual que `useCatalogo`.
 */
export function useHaciendasLabel(): HaciendaLabel[] {
  const planta = usePlantaStore((s) => s.planta);
  const [lista, setLista] = useState<HaciendaLabel[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch(plantaConfig(planta).haciendasLabel)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!cancelled) setLista(haciendaLabelListSchema.parse(data));
      })
      .catch(() => {
        /* sin etiquetas, el modo Plano queda sin marca de agua */
      });
    return () => {
      cancelled = true;
    };
  }, [planta]);

  return lista;
}
