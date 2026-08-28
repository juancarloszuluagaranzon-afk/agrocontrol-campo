import type { StyleSpecification } from "maplibre-gl";
import {
  sentinelHubConfig,
  sentinelHubMapId,
  sentinelHubTilesUrl,
} from "./sentinelHub";

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

// Mosaico Sentinel-2 "cloudless" (sin nubes) de EOX, gratis y sin API key
// (ADR-0021). WMTS RESTful en Web Mercator (`_3857`, orden {z}/{y}/{x}). Capa
// alterna al satélite Esri (a veces más reciente), conmutable desde 🗂️ Capas.
const S2CLOUDLESS =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg";

/**
 * Estilo base de MapLibre con la capa satelital de Esri World Imagery.
 *
 * Nota (§20): validar los términos de uso de Esri para producción; prever un
 * proveedor alterno (MapTiler/Mapbox) con SLA si se requiere. Para Fases 1–2 es
 * suficiente.
 */
export function baseStyle(): StyleSpecification {
  const sources: StyleSpecification["sources"] = {
    "esri-imagery": {
      type: "raster",
      tiles: [ESRI_IMAGERY],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
    s2cloudless: {
      type: "raster",
      tiles: [S2CLOUDLESS],
      tileSize: 256,
      maxzoom: 15,
      attribution:
        "Sentinel-2 cloudless 2025 (s2maps.eu) © EOX — modified Copernicus Sentinel data",
    },
  };

  const layers: StyleSpecification["layers"] = [
    // Fondo claro para el modo "Plano" (se ve al ocultar el satélite).
    {
      id: "fondo-plano",
      type: "background",
      paint: { "background-color": "#eef2f6" },
    },
    {
      id: "esri-imagery",
      type: "raster",
      source: "esri-imagery",
    },
    // Sentinel-2 sin nubes: encima del Esri y debajo de las suertes (que se
    // añaden en map.on("load")). Oculta por defecto; se enciende desde 🗂️ Capas.
    {
      id: "s2cloudless",
      type: "raster",
      source: "s2cloudless",
      layout: { visibility: "none" },
    },
  ];

  // Sentinel Hub (CDSE): imagen Sentinel-2 reciente / índices vía WMS. Una
  // fuente+capa por cada capa configurada (NDVI, NDMI…), solo si hay instance
  // ID; encima del s2cloudless y debajo de las suertes, ocultas por defecto
  // (ADR-0022).
  const sh = sentinelHubConfig();
  if (sh) {
    for (const layer of sh.layers) {
      const mapId = sentinelHubMapId(layer.id);
      sources[mapId] = {
        type: "raster",
        tiles: [
          sentinelHubTilesUrl({
            instanceId: sh.instanceId,
            layer: layer.id,
            maxCloudCoverage: sh.maxCloudCoverage,
          }),
        ],
        tileSize: 256,
        maxzoom: 16,
        attribution:
          "Modified Copernicus Sentinel data — Sentinel Hub (Copernicus Data Space Ecosystem)",
      };
      layers.push({
        id: mapId,
        type: "raster",
        source: mapId,
        layout: { visibility: "none" },
      });
    }
  }

  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources,
    layers,
  };
}
