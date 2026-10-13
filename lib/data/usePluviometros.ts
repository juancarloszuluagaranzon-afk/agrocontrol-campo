"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { plantaConfig } from "@/lib/plantas";
import {
  pluviometrosRefSchema,
  type PluviometroRef,
} from "@/domain/pluviometros/schema";

/**
 * Red de pluviómetros de referencia de la planta (técnico/zona/hacienda/sitio/
 * área/coords), desde `/data/pluviometros_<planta>.json` (generados de los
 * Excel de cada planta, cacheados offline por el SW). Sin planta → [].
 */
export function usePluviometros(): PluviometroRef[] {
  const planta = usePlantaStore((s) => s.planta);
  const [lista, setLista] = useState<PluviometroRef[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cargar: Promise<PluviometroRef[]> =
      planta != null
        ? fetch(plantaConfig(planta).pluviometros)
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

const asignacionSchema = z.record(z.string(), z.number().int());
const VACIA: ReadonlyMap<string, number> = new Map();

/**
 * Asignación oficial suerte → pluviómetro de la planta (Castilla, ADR-0037),
 * o un mapa vacío si la planta no la tiene (Riopaila usa Thiessen).
 */
export function useAsignacionPluviometros(): ReadonlyMap<string, number> {
  const planta = usePlantaStore((s) => s.planta);
  const [asignacion, setAsignacion] =
    useState<ReadonlyMap<string, number>>(VACIA);

  useEffect(() => {
    let cancelled = false;
    const url =
      planta != null ? plantaConfig(planta).pluviometrosSuertes : null;
    const cargar: Promise<ReadonlyMap<string, number>> = url
      ? fetch(url)
          .then((r) => r.json())
          .then(
            (data: unknown) =>
              new Map(Object.entries(asignacionSchema.parse(data))),
          )
      : Promise.resolve(VACIA);
    void cargar
      .then((m) => {
        if (!cancelled) setAsignacion(m);
      })
      .catch(() => {
        /* sin asignación oficial: se usa Thiessen o el más cercano */
      });
    return () => {
      cancelled = true;
    };
  }, [planta]);

  return asignacion;
}
