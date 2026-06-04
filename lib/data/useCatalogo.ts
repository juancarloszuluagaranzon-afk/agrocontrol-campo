"use client";

import { useEffect, useState } from "react";
import { catalogoSchema, type CatalogoEntry } from "@/domain/suertes/schema";

/**
 * Carga (una vez) el catálogo ligero de suertes desde /data y lo valida con Zod.
 * Reutilizado por el buscador del mapa y el formulario de maquinaria.
 */
export function useCatalogo(): CatalogoEntry[] {
  const [catalogo, setCatalogo] = useState<CatalogoEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/data/tablones_catalogo.json")
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
  }, []);

  return catalogo;
}
