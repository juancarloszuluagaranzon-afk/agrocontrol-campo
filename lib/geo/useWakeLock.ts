"use client";

import { useEffect } from "react";

/**
 * Mantiene la pantalla encendida mientras `active` (ADR-0035): con la pantalla
 * apagada el navegador pausa el GPS y, al volver, tarda en retomar. El bloqueo
 * se pierde al pasar a segundo plano, así que se vuelve a pedir al volver.
 * Navegadores sin la API (o que la rechazan, p. ej. batería baja) siguen igual.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    const wl = (
      navigator as Navigator & {
        wakeLock?: {
          request: (t: "screen") => Promise<{ release: () => Promise<void> }>;
        };
      }
    ).wakeLock;
    if (!wl) return;
    let bloqueo: { release: () => Promise<void> } | null = null;
    let vigente = true;

    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      void wl
        .request("screen")
        .then((b) => {
          if (vigente) bloqueo = b;
          else void b.release();
        })
        .catch(() => {
          /* rechazado (batería baja, política): la pantalla se apaga normal */
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") pedir();
    };

    pedir();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      vigente = false;
      document.removeEventListener("visibilitychange", onVisible);
      void bloqueo?.release().catch(() => undefined);
    };
  }, [active]);
}
