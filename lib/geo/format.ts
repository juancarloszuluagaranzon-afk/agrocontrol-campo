/**
 * Formato de magnitudes para la UI — español (Colombia), §15.
 *
 * Reglas del documento maestro:
 *  - Áreas en hectáreas con 3 decimales.
 *  - Distancias en metros (0 decimales por defecto).
 *  - Separador decimal con coma en la UI (punto en los datos).
 *
 * Funciones puras, sin dependencias de framework (capa de dominio, §8).
 */

const ES_CO = "es-CO";

/** Formatea un área en hectáreas: `3.428` → `"3,428 ha"`. */
export function formatHectareas(ha: number, decimales = 3): string {
  const valor = new Intl.NumberFormat(ES_CO, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(ha);
  return `${valor} ha`;
}

/** Formatea una distancia en metros: `1234.5` → `"1.235 m"`. */
export function formatMetros(metros: number, decimales = 0): string {
  const valor = new Intl.NumberFormat(ES_CO, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(metros);
  return `${valor} m`;
}

/**
 * Error relativo (%) entre un área medida y el área oficial de la suerte.
 * Sirve al criterio de aceptación de medición (< 5 %, §5).
 */
export function errorRelativoPct(medida: number, oficial: number): number {
  if (oficial === 0) return Number.NaN;
  return (Math.abs(medida - oficial) / oficial) * 100;
}

/**
 * Formatea coordenadas para el sello de la foto: `lat, lon` con 6 decimales y
 * punto decimal (formato geográfico estándar, no el locale es-CO con coma).
 * Ej.: `formatCoordenadas(-76.10389, 4.28846)` → `"4.288460, -76.103890"`.
 */
export function formatCoordenadas(lon: number, lat: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}
