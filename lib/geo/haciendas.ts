/**
 * Paleta de colores por hacienda para el modo "Plano" (§5, estilo del plano
 * oficial de Ingeniería Agrícola). Gama propia, bien diferenciada (17 haciendas).
 */

/** hacienda → color. El orden define la leyenda. */
export const HACIENDA_COLORS: Record<string, string> = {
  RIOPAILA: "#2563eb", // azul
  VALPARAISO: "#16a34a", // verde
  PERALONSO: "#9333ea", // morado
  VENECIA: "#0891b2", // turquesa
  "LA LUISA 1": "#ea580c", // naranja
  "LA LUISA 2": "#ca8a04", // ámbar
  NORMANDIA: "#dc2626", // rojo
  "SAN NICOLAS": "#65a30d", // lima
  GERTRUDIS: "#0d9488", // teal
  MORILLO: "#db2777", // rosa
  ZAMBRANO: "#7c3aed", // violeta
  LAGUNAS: "#0284c7", // azul cielo
  "MEDIA LUNA": "#b45309", // marrón
  "PAILA ARRIBA": "#4d7c0f", // oliva
  "LA PAILA": "#be123c", // carmín
  TEQUENDAMA: "#1d4ed8", // índigo
  "SAN CARLOS LOTE 7": "#c2410c", // teja
};

/** Color por defecto para una hacienda no listada. */
export const HACIENDA_DEFAULT = "#94a3b8";

/** Lista ordenada de haciendas (para la leyenda). */
export const HACIENDAS = Object.keys(HACIENDA_COLORS);

/**
 * Expresión MapLibre `match` para colorear por hacienda.
 * Devuelve un array (tipado laxo a propósito: el spec de MapLibre es dinámico).
 */
export function haciendaMatchExpression(): unknown[] {
  const pairs = Object.entries(HACIENDA_COLORS).flatMap(([h, c]) => [h, c]);
  return ["match", ["get", "hacienda"], ...pairs, HACIENDA_DEFAULT];
}
