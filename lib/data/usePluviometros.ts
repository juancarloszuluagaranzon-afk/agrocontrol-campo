"use client";

import { useEffect, useState } from "react";
import { usePlantaStore } from "@/lib/store/plantaStore";
import {
  pluviometrosRefSchema,
  type PluviometroRef,
} from "@/domain/pluviometros/schema";

/**
 * Red de pluviómetros de referencia (con técnico/zona/hacienda/sitio/área/coords)
 * desde `/data/pluviometros_riopaila.json` (generado del Excel + geojson, ya
 * cacheado offline por el SW). Es la red de Riopaila; en otras plantas → [].
 */
export function usePluviometros(): PluviometroRef[] {
  const planta = usePlantaStore((s) => s.planta);
  const [lista, setLista] = useState<PluviometroRef[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cargar: Promise<PluviometroRef[]> =
      planta === "riopaila"
        ? fetch("/data/pluviometros_riopaila.json")
            .then((r) => r.json())
            .then((data: unknown) => pluviometrosRefSchema.parse(data))
        : Promise.resolve([]);
    void cargar
      .then((p) => {
        if (!cancelled) setLista(p);
      })
      .catch(() => {
        /* sin red de pluviómetros, la planilla queda vacía */
      });
    return () => {
      cancelled = true;
    };
  }, [planta]);

  return lista;
}
