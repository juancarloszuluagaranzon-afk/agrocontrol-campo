"use client";

import { useEffect } from "react";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Sigue la posición del usuario con `watchPosition` mientras `active` sea true
 * (§5: Mi ubicación). Escribe la posición y los errores en el store.
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

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { longitude, latitude, accuracy, heading } = pos.coords;
        setGps({
          lon: longitude,
          lat: latitude,
          accuracy,
          heading: heading != null && !Number.isNaN(heading) ? heading : null,
        });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Permiso de ubicación denegado."
            : "No se pudo obtener la ubicación.";
        setGpsError(msg);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10_000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [active, setGps, setGpsError]);
}
