"use client";

import { useSyncExternalStore } from "react";
import { esHalloween } from "@/lib/temporada";

const sinSuscripcion = () => () => {};

/**
 * ¿Hoy es temporada de Halloween? En el servidor (HTML estático, también el
 * shell sin señal) responde `false`, y en el navegador usa la fecha local: así
 * no hay desajuste de hidratación y el adorno aparece y se va solo.
 */
function useHalloween(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => esHalloween(new Date()),
    () => false,
  );
}

/** Calabaza junto al nombre de la app (decorativa, oculta a lectores). */
export function CalabazaHalloween() {
  const activo = useHalloween();
  if (!activo) return null;
  return (
    <span aria-hidden className="ml-1 text-sm" title="Feliz Halloween">
      🎃
    </span>
  );
}

/** Línea fina naranja bajo la cabecera. */
export function FranjaHalloween() {
  const activo = useHalloween();
  if (!activo) return null;
  return (
    <div
      aria-hidden
      data-testid="franja-halloween"
      className="h-0.5 shrink-0 bg-orange-500 print:hidden"
    />
  );
}
