/**
 * Recuerda si el técnico tenía el GPS (y la brújula) encendidos, para
 * reanudarlos solos si el navegador recarga la página o Android cierra la
 * pestaña. Sin esto, tras cada recarga el GPS quedaba apagado hasta volver a
 * tocar el botón. `localStorage` puede no existir o lanzar (modo privado,
 * previsualizaciones): todo va en try/catch y por defecto es "apagado".
 */
const CLAVE = "agrocontrol-gps-activo";

export interface GpsPersistido {
  gps: boolean;
  brujula: boolean;
}

export function leerGpsPersistido(): GpsPersistido {
  try {
    const raw = globalThis.localStorage?.getItem(CLAVE);
    if (!raw) return { gps: false, brujula: false };
    const v = JSON.parse(raw) as Partial<GpsPersistido>;
    return { gps: v.gps === true, brujula: v.brujula === true };
  } catch {
    return { gps: false, brujula: false };
  }
}

export function guardarGpsPersistido(v: GpsPersistido): void {
  try {
    globalThis.localStorage?.setItem(CLAVE, JSON.stringify(v));
  } catch {
    /* sin almacenamiento: no se recuerda, pero no falla */
  }
}
