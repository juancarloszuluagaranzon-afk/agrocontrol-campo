"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  type Map as MlMap,
  type MapGeoJSONFeature,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AOI, baseStyle } from "@/lib/geo/basemap";
import {
  CONTEXT_LAYERS,
  SUERTES_FILL,
  SUERTES_LABEL,
  SUERTES_LINE,
  SUERTES_SELECTED,
  SUERTES_SOURCE,
  contextLayerId,
  contextSourceId,
} from "@/lib/geo/layers";
import { useMapStore } from "@/lib/store/mapStore";
import type { SuerteProperties } from "@/domain/suertes/schema";

const SUERTES_URL = "/data/suertes_riopaila.geojson";

/** Construye las capas de una capa de contexto según su geometría. */
function addContextLayer(map: MlMap, id: string): void {
  const cfg = CONTEXT_LAYERS.find((l) => l.id === id);
  if (!cfg) return;
  const layerId = contextLayerId(id);
  const source = contextSourceId(id);
  const common = {
    id: layerId,
    source,
    layout: { visibility: "none" as const },
  };

  if (cfg.geometry === "line") {
    map.addLayer({
      ...common,
      type: "line",
      paint: { "line-color": cfg.color, "line-width": 2 },
    });
  } else if (cfg.geometry === "fill") {
    map.addLayer({
      ...common,
      type: "fill",
      paint: { "fill-color": cfg.color, "fill-opacity": 0.5 },
    });
  } else {
    map.addLayer({
      ...common,
      type: "circle",
      paint: {
        "circle-radius": 5,
        "circle-color": cfg.color,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const lookupRef = useRef<Map<string, SuerteProperties>>(new Map());
  const setSelected = useMapStore((s) => s.setSelected);

  // Índice sec_ste → properties para enriquecer la selección del buscador
  // (el catálogo no trae supervisor/jefe_zona). El navegador cachea el GeoJSON.
  useEffect(() => {
    let cancelled = false;
    void fetch(SUERTES_URL)
      .then((r) => r.json())
      .then((fc: { features: { properties: SuerteProperties }[] }) => {
        if (cancelled) return;
        const map = new Map<string, SuerteProperties>();
        for (const f of fc.features)
          map.set(f.properties.sec_ste, f.properties);
        lookupRef.current = map;
      })
      .catch(() => {
        /* sin índice, el buscador degrada a atributos parciales */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Montaje único del mapa ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseStyle(),
      center: AOI.center,
      zoom: AOI.zoom,
      minZoom: AOI.minZoom,
      maxZoom: AOI.maxZoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.addControl(
      new maplibregl.ScaleControl({ unit: "metric" }),
      "bottom-left",
    );

    map.on("load", () => {
      map.addSource(SUERTES_SOURCE, { type: "geojson", data: SUERTES_URL });

      // Capas de contexto (ocultas por defecto) antes de las suertes.
      for (const cfg of CONTEXT_LAYERS) {
        map.addSource(contextSourceId(cfg.id), {
          type: "geojson",
          data: `/data/contexto_${cfg.id}.geojson`,
        });
        addContextLayer(map, cfg.id);
      }

      // Una sola capa de relleno + contorno para las 610 suertes (§13).
      map.addLayer({
        id: SUERTES_FILL,
        type: "fill",
        source: SUERTES_SOURCE,
        paint: { "fill-color": "#facc15", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: SUERTES_LINE,
        type: "line",
        source: SUERTES_SOURCE,
        paint: {
          "line-color": "#facc15",
          "line-width": 1.2,
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: SUERTES_SELECTED,
        type: "line",
        source: SUERTES_SOURCE,
        paint: { "line-color": "#ffffff", "line-width": 3 },
        filter: ["==", ["get", "sec_ste"], ""],
      });
      map.addLayer({
        id: SUERTES_LABEL,
        type: "symbol",
        source: SUERTES_SOURCE,
        minzoom: 14.5,
        layout: {
          "text-field": ["get", "sec_ste"],
          "text-size": 11,
          "text-font": ["Open Sans Regular"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1.2,
        },
      });

      // Selección al tocar un lote.
      map.on("click", SUERTES_FILL, (e) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (f) setSelected(f.properties as unknown as SuerteProperties);
      });
      map.on("mouseenter", SUERTES_FILL, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", SUERTES_FILL, () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setSelected]);

  // ── Resaltado de la suerte seleccionada ──
  const selectedSecSte = useMapStore((s) => s.selected?.sec_ste ?? "");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(SUERTES_SELECTED)) return;
    map.setFilter(SUERTES_SELECTED, ["==", ["get", "sec_ste"], selectedSecSte]);
  }, [selectedSecSte]);

  // ── Visibilidad de capas de contexto ──
  const activeContext = useMapStore((s) => s.activeContext);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const cfg of CONTEXT_LAYERS) {
      const layerId = contextLayerId(cfg.id);
      if (!map.getLayer(layerId)) continue;
      map.setLayoutProperty(
        layerId,
        "visibility",
        activeContext[cfg.id] ? "visible" : "none",
      );
    }
  }, [activeContext]);

  // ── Vuelo solicitado por el buscador ──
  const flyTarget = useMapStore((s) => s.flyTarget);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget) return;
    map.flyTo({
      center: [flyTarget.lon, flyTarget.lat],
      zoom: 16,
      duration: 1200,
    });
    const props = lookupRef.current.get(flyTarget.secSte);
    if (props) setSelected(props);
  }, [flyTarget, setSelected]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
