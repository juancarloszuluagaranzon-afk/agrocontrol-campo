"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { useGeolocation } from "@/lib/geo/useGeolocation";
import { useWakeLock } from "@/lib/geo/useWakeLock";
import {
  requestOrientationPermission,
  useDeviceHeading,
} from "@/lib/geo/useDeviceHeading";
import { compassNecesitaCalibracion } from "@/lib/geo/orientation";
import { gpsAfinando } from "@/lib/geo/gps";
import { formatMetros } from "@/lib/geo/format";
import { t } from "@/lib/i18n/es-CO";
import {
  guardarGpsPersistido,
  leerGpsPersistido,
} from "@/lib/geo/gpsPersistido";

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
  const compassActive = useMapStore((s) => s.compassActive);
  const setCompassActive = useMapStore((s) => s.setCompassActive);
  const headingAccuracy = useMapStore((s) => s.headingAccuracy);
  const seguir = useMapStore((s) => s.gpsSeguir);
  const setSeguir = useMapStore((s) => s.setGpsSeguir);
  const centeredRef = useRef(false);
  // Ya se re-centró en el primer fix preciso de esta sesión de GPS.
  const refinedRef = useRef(false);

  // Reanuda el GPS (y la brújula) si estaban encendidos antes de una recarga o
  // de que Android cerrara la pestaña. Solo con el permiso ya concedido: sin
  // gesto del usuario no se debe pedir permiso nuevo.
  useEffect(() => {
    const previo = leerGpsPersistido();
    if (!previo.gps || useMapStore.getState().gpsActive) return;
    const permisos =
      typeof navigator !== "undefined" ? navigator.permissions : undefined;
    if (!permisos?.query) return;
    let vigente = true;
    void permisos
      .query({ name: "geolocation" })
      .then((estado) => {
        if (!vigente || estado.state !== "granted") return;
        centeredRef.current = false;
        refinedRef.current = false;
        setGpsActive(true);
        setSeguir(true);
        // En Android la brújula no requiere gesto; en iOS fallará y queda apagada.
        if (previo.brujula)
          void requestOrientationPermission().then((ok) =>
            setCompassActive(ok),
          );
      })
      .catch(() => {
        /* sin API de permisos: el técnico reactiva el GPS a mano */
      });
    return () => {
      vigente = false;
    };
  }, [setGpsActive, setCompassActive, setSeguir]);

  // Sigue la posición y la orientación mientras estén activos, y mantiene la
  // pantalla encendida para que el navegador no pause el GPS (ADR-0035).
  useGeolocation(gpsActive);
  useDeviceHeading(compassActive);
  useWakeLock(gpsActive);

  // Centra en la primera lectura (rápida, aproximada) y **re-centra** una vez al
  // llegar el primer fix preciso, para no quedar fijado en la posición burda.
  useEffect(() => {
    if (!gpsActive || !gps) return;
    if (!centeredRef.current) {
      centeredRef.current = true;
      centerOnMe();
    }
    if (!refinedRef.current && !gpsAfinando(gps.accuracy)) {
      refinedRef.current = true;
      centerOnMe();
    }
  }, [gpsActive, gps, centerOnMe]);

  function onClick() {
    if (!gpsActive) {
      centeredRef.current = false;
      refinedRef.current = false;
      setGpsActive(true);
      setSeguir(true);
      guardarGpsPersistido({ gps: true, brujula: false });
      // El permiso de orientación (iOS) debe pedirse dentro del gesto del click.
      void requestOrientationPermission().then((ok) => {
        setCompassActive(ok);
        guardarGpsPersistido({ gps: true, brujula: ok });
      });
    } else {
      // Si el técnico movió el mapa, el botón vuelve a "seguirme".
      setSeguir(true);
      centerOnMe();
    }
  }

  const precisionPobre = gps != null && gps.accuracy > PRECISION_POBRE_M;
  const calibrar = compassActive && compassNecesitaCalibracion(headingAccuracy);
  // Aviso transitorio: activo pero aún sin un fix preciso (sigue afinando).
  const afinando = gpsActive && gpsAfinando(gps?.accuracy ?? null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={gpsActive}
        aria-label={
          !gpsActive ? t.gps.activar : seguir ? t.gps.centrar : t.gps.seguir
        }
        title={gpsActive && seguir ? t.gps.siguiendo : undefined}
        className={`grid size-12 place-items-center rounded-full text-xl shadow-lg ring-1 ring-black/10 ${
          !gpsActive
            ? "bg-background"
            : seguir
              ? "bg-blue-600 text-white"
              : "bg-background text-blue-600 ring-2 ring-blue-600"
        }`}
      >
        ◎
      </button>

      {gpsError && (
        <span className="bg-background max-w-44 rounded-md px-2 py-1 text-right text-xs font-medium text-amber-700 shadow ring-1 ring-black/10">
          {gpsError}
        </span>
      )}
      {calibrar && (
        <span
          role="alert"
          className="bg-background max-w-44 rounded-md px-2 py-1 text-right text-xs font-medium text-amber-700 shadow ring-1 ring-black/10"
        >
          🧭 {t.brujula.calibrar}
        </span>
      )}
      {afinando && !gpsError && (
        <span className="bg-background text-accent/70 rounded-md px-2 py-1 text-right text-xs font-medium shadow ring-1 ring-black/10">
          📍 {t.gps.afinando}
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
