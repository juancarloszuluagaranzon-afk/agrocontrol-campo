"use client";

import { useEffect, useState } from "react";
import { usePlantaStore } from "@/lib/store/plantaStore";
import {
  puntosHidrologicosRefSchema,
  type PuntoHidrologicoRef,
} from "@/domain/hidrologia/schema";

/**
 * Puntos de monitoreo hidrológico de referencia (nivel de río + evaporación,
 * con técnico asignado y umbrales opcionales) desde
 * `/data/puntos_hidrologicos_riopaila.json` (cacheado offline por el SW). Es
 * la red de Riopaila; en otras plantas → [].
 */
export function usePuntosHidrologicos(): PuntoHidrologicoRef[] {
  const planta = usePlantaStore((s) => s.planta);
  const [lista, setLista] = useState<PuntoHidrologicoRef[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cargar: Promise<PuntoHidrologicoRef[]> =
      planta === "riopaila"
        ? fetch("/data/puntos_hidrologicos_riopaila.json")
            .then((r) => r.json())
            .then((data: unknown) => puntosHidrologicosRefSchema.parse(data))
        : Promise.resolve([]);
    void cargar
      .then((p) => {
        if (!cancelled) setLista(p);
      })
      .catch(() => {
        /* sin puntos hidrológicos, la sección queda vacía */
      });
    return () => {
      cancelled = true;
    };
  }, [planta]);

  return lista;
}
