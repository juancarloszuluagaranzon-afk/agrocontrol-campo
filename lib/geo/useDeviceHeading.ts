"use client";

import { useEffect } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import {
  compassHeadingFromEvent,
  type OrientationLike,
} from "@/lib/geo/orientation";

/** Tipo del constructor de evento con `requestPermission` (iOS 13+). */
interface DOEWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/** Ángulo de rotación de la pantalla, para compensar el rumbo. */
function screenAngle(): number {
  if (typeof window === "undefined") return 0;
  const a = window.screen?.orientation?.angle;
  if (typeof a === "number") return a;
  // Fallback heredado (algunos navegadores antiguos).
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}

/**
 * Pide permiso de orientación (obligatorio en iOS 13+, debe llamarse dentro de
 * un gesto del usuario). En el resto de plataformas no hace falta y resuelve true.
 */
export async function requestOrientationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
    return false;
  }
  const ctor = window.DeviceOrientationEvent as unknown as DOEWithPermission;
  if (typeof ctor.requestPermission === "function") {
    try {
      return (await ctor.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true; // Android/escritorio: no requiere permiso explícito.
}

/** Intervalo mínimo entre escrituras al store (ms) → ~20 Hz (≥5 Hz pedido). */
const MIN_MS = 50;

/**
 * Lee el rumbo de la brújula (magnetómetro + acelerómetro) mientras `active` sea
 * true y lo publica en el store. Mantiene el rumbo aunque el usuario esté quieto
 * (a diferencia del `heading` del GPS, que se anula al detenerse). §5.
 */
export function useDeviceHeading(active: boolean): void {
  const setDeviceHeading = useMapStore((s) => s.setDeviceHeading);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    if (!("DeviceOrientationEvent" in window)) return;

    let ultimo = 0;
    const onOrient = (ev: Event) => {
      const e = ev as DeviceOrientationEvent & OrientationLike;
      const heading = compassHeadingFromEvent(e, screenAngle());
      if (heading == null) return;
      const ahora = Date.now();
      if (ahora - ultimo < MIN_MS) return;
      ultimo = ahora;
      const acc =
        typeof e.webkitCompassAccuracy === "number"
          ? e.webkitCompassAccuracy
          : null;
      setDeviceHeading(heading, acc);
    };

    // `deviceorientationabsolute` (Android) da rumbo absoluto; `deviceorientation`
    // cubre iOS (webkitCompassHeading). Escuchamos ambos; el parser ignora los
    // eventos sin rumbo fiable.
    window.addEventListener("deviceorientationabsolute", onOrient);
    window.addEventListener("deviceorientation", onOrient);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrient);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [active, setDeviceHeading]);
}
