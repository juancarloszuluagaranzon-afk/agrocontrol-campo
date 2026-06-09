"use client";

import { useEffect, useState } from "react";
import { maestroSchema, type Maestro } from "@/domain/maestro/schema";

/**
 * Carga (una vez) el maestro agronómico por suerte desde /data y lo valida con
 * Zod. El service worker cachea `/data/*.json`, así que funciona offline.
 */
export function useMaestro(): Maestro {
  const [maestro, setMaestro] = useState<Maestro>({});

  useEffect(() => {
    let cancelled = false;
    void fetch("/data/maestro_suertes.json")
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
  }, []);

  return maestro;
}
