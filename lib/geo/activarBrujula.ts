import { useMapStore } from "@/lib/store/mapStore";
import { requestOrientationPermission } from "@/lib/geo/useDeviceHeading";
import { guardarGpsPersistido } from "@/lib/geo/gpsPersistido";

/**
 * Enciende la brújula (rumbo del celular). En iOS pide el permiso de
 * orientación, por eso hay que llamarla directamente dentro de un toque.
 * Recuerda que quedó encendida para reanudarla tras una recarga (ADR-0035).
 */
export async function activarBrujula(): Promise<boolean> {
  const ok = await requestOrientationPermission();
  const s = useMapStore.getState();
  s.setCompassActive(ok);
  if (ok) guardarGpsPersistido({ gps: s.gpsActive, brujula: true });
  return ok;
}
