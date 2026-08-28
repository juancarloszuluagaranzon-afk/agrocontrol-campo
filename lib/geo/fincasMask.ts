import type { Feature, FeatureCollection, Polygon, Position } from "geojson";

/**
 * Máscara inversa de las fincas (suertes/tablones) para recortar visualmente las
 * capas Sentinel Hub a "solo nuestras fincas" (Riopaila + Castilla).
 *
 * MapLibre no recorta un raster a polígonos, así que se pinta un polígono que
 * cubre **todo el exterior** con las fincas restadas como **huecos**; encima del
 * índice y semi-transparente oscuro, deja NDVI/NDMI a plena intensidad dentro de
 * los lotes y el satélite **atenuado** alrededor (ADR-0023).
 */

/** Id de la fuente y capa de la máscara en el estilo de MapLibre. */
export const FINCAS_MASK_SOURCE = "fincas-mask";
export const FINCAS_MASK_LAYER = "fincas-mask";

/**
 * Anillo exterior amplio (SW de Colombia) que siempre cubre el viewport del AOI
 * del ingenio a cualquier zoom/paneo razonable. Las fincas se recortan dentro.
 */
const OUTER_RING: Position[] = [
  [-80, 0],
  [-72, 0],
  [-72, 8],
  [-80, 8],
  [-80, 0],
];

/**
 * Construye la máscara inversa a partir de los tablones. Puro y O(n): concatena
 * el anillo exterior de cada tablón como un hueco del polígono exterior.
 *
 * MapLibre/earcut trata **todo anillo tras el primero como hueco**, sin importar
 * el sentido de giro, así que no hacen falta operaciones geométricas ni turf.
 */
export function buildFincasMask(
  tablones: FeatureCollection,
  outer: Position[] = OUTER_RING,
): Feature<Polygon> {
  const holes: Position[][] = [];
  for (const f of tablones.features) {
    const g = f.geometry;
    if (g.type === "Polygon") {
      if (g.coordinates[0]?.length) holes.push(g.coordinates[0]);
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) {
        if (poly[0]?.length) holes.push(poly[0]);
      }
    }
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [outer, ...holes] },
  };
}
