"use client";

import { useEffect } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { errorGpsDefinitivo, GPS_WATCHDOG_MS } from "@/lib/geo/gps";

/**
 * Sigue la posición del usuario con `watchPosition` mientras `active` sea true
 * (§5: Mi ubicación). Escribe la posición y los errores en el store.
 *
 * Robustez en campo (ADR-0035):
 * - Solo el **permiso denegado** se muestra como error. "Sin posición" y
 *   "tiempo agotado" son transitorios (cielo tapado, arranque en frío sin datos
 *   móviles): la app sigue mostrando "Afinando ubicación…" y sigue buscando.
 * - Al arrancar pide además una posición **aproximada** reciente (Wi-Fi/celda o
 *   la última conocida), para no dejar el mapa sin punto mientras el satélite
 *   converge.
 * - **Vigilante**: si pasan 30 s sin una posición nueva, reinicia el
 *   seguimiento (algunos Android lo detienen tras un error).
 * - Al volver a primer plano (pantalla encendida de nuevo), lo reinicia para
 *   retomar de inmediato.
 *
 * Nota: la geolocalización del navegador exige HTTPS o localhost (§8 notas).
 */
export function useGeolocation(active: boolean): void {
  const setGps = useMapStore((s) => s.setGps);
  const setGpsError = useMapStore((s) => s.setGpsError);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Este dispositivo no soporta geolocalización.");
      return;
    }
    const geo = navigator.geolocation;
    let watchId: number | null = null;
    let ultimaPosicion = Date.now();
    let preciso = false;

    const onPos = (pos: GeolocationPosition) => {
      ultimaPosicion = Date.now();
      const { longitude, latitude, accuracy, heading } = pos.coords;
      setGps({
        lon: longitude,
        lat: latitude,
        accuracy,
        heading: heading != null && !Number.isNaN(heading) ? heading : null,
      });
    };
    const onError = (err: GeolocationPositionError) => {
      if (errorGpsDefinitivo(err.code)) {
        setGpsError("Permiso de ubicación denegado.");
      }
      // Transitorio: se sigue buscando; el vigilante reinicia si hace falta.
    };

    const iniciar = () => {
      if (watchId !== null) geo.clearWatch(watchId);
      watchId = geo.watchPosition(
        (pos) => {
          preciso = true;
          onPos(pos);
        },
        onError,
        // `maximumAge: 0`: cada lectura del seguimiento es fresca (no una
        // posición cacheada). Tiempo de espera amplio: en frío y sin datos
        // móviles el primer fix satelital puede tardar.
        { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_WATCHDOG_MS },
      );
    };

    // Posición aproximada inmediata, solo si aún no llegó la precisa.
    geo.getCurrentPosition(
      (pos) => {
        if (!preciso) onPos(pos);
      },
      () => {
        /* sin posición aproximada: se espera la satelital */
      },
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 5_000 },
    );
    iniciar();

    const vigilante = window.setInterval(() => {
      if (Date.now() - ultimaPosicion > GPS_WATCHDOG_MS) {
        ultimaPosicion = Date.now();
        iniciar();
      }
    }, 5_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        ultimaPosicion = Date.now();
        iniciar();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(vigilante);
      document.removeEventListener("visibilitychange", onVisible);
      if (watchId !== null) geo.clearWatch(watchId);
    };
  }, [active, setGps, setGpsError]);
}
