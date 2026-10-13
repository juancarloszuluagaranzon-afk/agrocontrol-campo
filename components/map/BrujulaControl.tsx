"use client";

import { useEffect, useState } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { activarBrujula } from "@/lib/geo/activarBrujula";
import { siguienteOrientacion } from "@/lib/geo/orientation";
import { t } from "@/lib/i18n/es-CO";

/** Si en este tiempo no llega ningún rumbo, el dispositivo no tiene brújula. */
const ESPERA_RUMBO_MS = 3000;
const AVISO_MS = 7000;

/**
 * Brújula siempre visible (arriba-derecha, bajo el zoom). La aguja roja apunta
 * al norte y gira con el mapa. Un toque: norte arriba ↔ el mapa gira con el
 * celular (lo que tienes al frente queda arriba). Si el mapa quedó girado con
 * dos dedos, un toque lo devuelve al norte.
 */
export function BrujulaControl() {
  const bearing = useMapStore((s) => s.mapBearing);
  const orientacion = useMapStore((s) => s.orientacion);
  const setOrientacion = useMapStore((s) => s.setOrientacion);
  const compassActive = useMapStore((s) => s.compassActive);
  const sinRumbo = useMapStore((s) => s.deviceHeading == null);
  const [aviso, setAviso] = useState<string | null>(null);

  // En modo "gira conmigo", si el celular no entrega rumbo, se avisa y se
  // vuelve al norte arriba en vez de dejar el mapa quieto sin explicación.
  useEffect(() => {
    if (orientacion !== "rumbo" || !sinRumbo) return;
    const id = setTimeout(() => {
      setOrientacion("norte");
      setAviso(t.brujula.sinSensor);
    }, ESPERA_RUMBO_MS);
    return () => clearTimeout(id);
  }, [orientacion, sinRumbo, setOrientacion]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), AVISO_MS);
    return () => clearTimeout(id);
  }, [aviso]);

  // "Norte" pero con el mapa girado (p. ej. por un vuelo): se trata como girado,
  // para que el toque siempre devuelva el norte arriba primero.
  const actual =
    orientacion === "norte" && Math.abs(bearing) > 1 ? "libre" : orientacion;

  function onClick() {
    setAviso(null);
    const siguiente = siguienteOrientacion(actual);
    if (siguiente !== "rumbo" || compassActive) {
      setOrientacion(siguiente);
      return;
    }
    // El permiso de orientación (iOS) debe pedirse dentro del toque.
    void activarBrujula().then((ok) => {
      if (ok) setOrientacion("rumbo");
      else setAviso(t.brujula.sinPermiso);
    });
  }

  const rumbo = orientacion === "rumbo";
  return (
    <div className="pointer-events-auto flex items-start gap-2">
      {aviso && (
        <span
          role="alert"
          className="bg-background max-w-52 rounded-md px-2 py-1 text-xs font-medium text-amber-700 shadow ring-1 ring-black/10"
        >
          {aviso}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-label={t.brujula[actual]}
        aria-pressed={rumbo}
        title={t.brujula[actual]}
        className={`bg-background grid size-11 shrink-0 place-items-center rounded-full shadow-lg ${
          rumbo ? "ring-2 ring-blue-600" : "ring-1 ring-black/10"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-7 transition-transform duration-100"
          style={{ transform: `rotate(${-bearing}deg)` }}
          aria-hidden
        >
          <path d="M12 2.5 15.5 12h-7z" fill="#dc2626" />
          <path d="M12 21.5 8.5 12h7z" fill="#94a3b8" />
          <circle cx="12" cy="12" r="1.6" fill="#0f172a" />
        </svg>
        <span className="sr-only">N</span>
      </button>
    </div>
  );
}
