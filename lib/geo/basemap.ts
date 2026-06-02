import type { StyleSpecification } from "maplibre-gl";

/**
 * Área de interés (AOI) del ingenio, en WGS84 (§13). Se usa para centrar el mapa
 * y, en la Fase 4, para acotar el pre-cacheo de tiles offline.
 */
export const AOI = {
  bbox: [-76.185, 4.235, -76.053, 4.385] as [number, number, number, number],
  center: [-76.119, 4.31] as [number, number],
  zoom: 12.2,
  minZoom: 10,
  maxZoom: 19,
} as const;

const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/**
 * Estilo base de MapLibre con la capa satelital de Esri World Imagery.
 *
 * Nota (§20): validar los términos de uso de Esri para producción; prever un
 * proveedor alterno (MapTiler/Mapbox) con SLA si se requiere. Para Fases 1–2 es
 * suficiente.
 */
export function baseStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      "esri-imagery": {
        type: "raster",
        tiles: [ESRI_IMAGERY],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      },
    },
    layers: [
      {
        id: "esri-imagery",
        type: "raster",
        source: "esri-imagery",
      },
    ],
  };
}
