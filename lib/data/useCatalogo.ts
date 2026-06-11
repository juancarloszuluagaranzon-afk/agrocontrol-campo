"use client";

import { useEffect, useState } from "react";
import { catalogoSchema, type CatalogoEntry } from "@/domain/suertes/schema";
import { plantaConfig } from "@/lib/plantas";
import { usePlantaStore } from "@/lib/store/plantaStore";

/**
 * Carga el catálogo ligero de suertes de la **planta activa** desde /data y lo
 * valida con Zod. Reutilizado por el buscador del mapa y la tabla de área neta
 * por hacienda. Se recarga al cambiar de planta.
 */
export function useCatalogo(): CatalogoEntry[] {
  const planta = usePlantaStore((s) => s.planta);
  const [catalogo, setCatalogo] = useState<CatalogoEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch(plantaConfig(planta).catalogo)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!cancelled) setCatalogo(catalogoSchema.parse(data));
      })
      .catch(() => {
        /* sin catálogo, el autocompletar queda vacío */
      });
    return () => {
      cancelled = true;
    };
  }, [planta]);

  return catalogo;
}
