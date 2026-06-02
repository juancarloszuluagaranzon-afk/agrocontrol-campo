"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { useGeolocation } from "@/lib/geo/useGeolocation";
import { formatMetros } from "@/lib/geo/format";

/** Precisión (m) por encima de la cual avisamos que el GPS es pobre (§13, §20). */
const PRECISION_POBRE_M = 30;

/**
 * Control de "Mi ubicación" (§5): activa el seguimiento GPS, centra el mapa y
 * muestra la precisión, con aviso si es baja.
 */
export function GpsControl() {
  const gpsActive = useMapStore((s) => s.gpsActive);
  const setGpsActive = useMapStore((s) => s.setGpsActive);
  const gps = useMapStore((s) => s.gps);
  const gpsError = useMapStore((s) => s.gpsError);
  const centerOnMe = useMapStore((s) => s.centerOnMe);
  const centeredRef = useRef(false);

  // Sigue la posición mientras el GPS esté activo.
  useGeolocation(gpsActive);

  // Centra automáticamente en la primera lectura tras activar.
  useEffect(() => {
    if (gpsActive && gps && !centeredRef.current) {
      centeredRef.current = true;
      centerOnMe();
    }
  }, [gpsActive, gps, centerOnMe]);

  function onClick() {
    if (!gpsActive) {
      centeredRef.current = false;
      setGpsActive(true);
    } else {
      centerOnMe();
    }
  }

  const precisionPobre = gps != null && gps.accuracy > PRECISION_POBRE_M;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={gpsActive}
        aria-label={
          gpsActive ? "Centrar en mi ubicación" : "Activar mi ubicación"
        }
        className={`grid size-12 place-items-center rounded-full text-xl shadow-lg ring-1 ring-black/10 ${
          gpsActive ? "bg-blue-600 text-white" : "bg-background"
        }`}
      >
        ◎
      </button>

      {gpsError && (
        <span className="bg-background max-w-44 rounded-md px-2 py-1 text-right text-xs font-medium text-amber-700 shadow ring-1 ring-black/10">
          {gpsError}
        </span>
      )}
      {gps && (
        <span
          className={`bg-background rounded-md px-2 py-1 text-xs font-medium shadow ring-1 ring-black/10 ${
            precisionPobre ? "text-amber-700" : "text-accent/70"
          }`}
        >
          ± {formatMetros(gps.accuracy)}
          {precisionPobre ? " · precisión baja" : ""}
        </span>
      )}
    </div>
  );
}
