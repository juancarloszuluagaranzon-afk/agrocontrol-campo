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

/** Id de la fuente y capa de la máscara en el estilo de MapLibre. */
export const FINCAS_MASK_SOURCE = "fincas-mask";
export const FINCAS_MASK_LAYER = "fincas-mask";
