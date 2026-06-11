"use client";

import { useEffect, useState } from "react";
import { maestroSchema, type Maestro } from "@/domain/maestro/schema";
import { plantaConfig } from "@/lib/plantas";
import { usePlantaStore } from "@/lib/store/plantaStore";

/**
 * Carga el maestro agronómico por suerte de la **planta activa** desde /data y lo
 * valida con Zod. El service worker cachea `/data/*.json`, así que funciona
 * offline. Se recarga al cambiar de planta.
 */
export function useMaestro(): Maestro {
  const planta = usePlantaStore((s) => s.planta);
  const [maestro, setMaestro] = useState<Maestro>({});

  useEffect(() => {
    let cancelled = false;
    void fetch(plantaConfig(planta).maestro)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!cancelled) setMaestro(maestroSchema.parse(data));
      })
      .catch(() => {
        /* sin maestro, el panel del tablón degrada a solo cartografía */
      });
    return () => {
      cancelled = true;
    };
  }, [planta]);

  return maestro;
}
