import type { Feature, Polygon, Position } from "geojson";

/**
 * Máscara "solo nuestras fincas" (ADR-0023). Recorta visualmente las capas
 * Sentinel Hub a las suertes de la planta: velo oscuro con las fincas
 * transparentes, y el satélite atenuado alrededor.
 *
 * Se implementa como **imagen raster precomputada** por planta
 * (`public/data/mask_<planta>.png`, generada con `scripts/gen_mask.mjs`) y se
 * coloca como `image` source sobre el AOI (ver `PlantaConfig.mask`). Se usa
 * imagen —no geojson vectorial— porque las ~1345 parcelas separadas excederían
 * el límite de **500 anillos por polígono** de MapLibre (por eso los tablones
 * más pequeños, p. ej. Peralonso, se perdían). El raster no tiene ese límite.
 */

/** Id de la fuente y capa de la máscara (imagen raster) en MapLibre. */
export const FINCAS_MASK_SOURCE = "fincas-mask";
export const FINCAS_MASK_LAYER = "fincas-mask";

/**
 * Marco de velo para **fuera del bbox de la imagen** (el PNG solo cubre las
 * fincas + margen; más allá, el índice se vería suelto, como un bloque). Es un
 * polígono de 2 anillos: exterior enorme menos el bbox de la máscara (hueco),
 * así velo todo lo lejano y abuta sin costura con el PNG. Sin problema de anillos.
 */
export const FINCAS_MASK_FRAME_SOURCE = "fincas-mask-frame";
export const FINCAS_MASK_FRAME_LAYER = "fincas-mask-frame";

/** Anillo exterior amplio (SW de Colombia), CCW (exterior). */
const FRAME_OUTER: Position[] = [
  [-80, 0],
  [-72, 0],
  [-72, 8],
  [-80, 8],
  [-80, 0],
];

/** Marco = exterior grande con el bbox `[W,S,E,N]` recortado como hueco (CW). */
export function buildMaskFrame(
  bbox: [number, number, number, number],
): Feature<Polygon> {
  const [w, s, e, n] = bbox;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        FRAME_OUTER,
        [
          [w, s],
          [w, n],
          [e, n],
          [e, s],
          [w, s],
        ],
      ],
    },
  };
}
