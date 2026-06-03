"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  type Map as MlMap,
  type MapGeoJSONFeature,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AOI, baseStyle } from "@/lib/geo/basemap";
import {
  CONTEXT_LAYERS,
  GPS_DOT,
  GPS_HALO,
  GPS_SOURCE,
  MAQUINARIA_DOT,
  MAQUINARIA_LABEL,
  MAQUINARIA_SOURCE,
  MEASURE_FILL,
  MEASURE_LINE,
  MEASURE_SOURCE,
  MEASURE_VERTICES,
  SUERTES_FILL,
  SUERTES_LABEL,
  SUERTES_LINE,
  SUERTES_SELECTED,
  SUERTES_SOURCE,
  contextLayerId,
  contextSourceId,
} from "@/lib/geo/layers";
import type { Feature, FeatureCollection, Geometry, Point } from "geojson";
import type { LngLat } from "@/lib/geo/measure";
import { useMapStore } from "@/lib/store/mapStore";
import { itemsForFecha, useMaquinariaStore } from "@/lib/store/maquinariaStore";
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
      // Evita que toques seguidos al marcar vértices se interpreten como zoom.
      doubleClickZoom: false,
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

      // Capa GPS: halo de presencia + punto azul (§5).
      const emptyFc: FeatureCollection<Point> = {
        type: "FeatureCollection",
        features: [],
      };
      map.addSource(GPS_SOURCE, { type: "geojson", data: emptyFc });
      map.addLayer({
        id: GPS_HALO,
        type: "circle",
        source: GPS_SOURCE,
        paint: {
          "circle-radius": 20,
          "circle-color": "#2563eb",
          "circle-opacity": 0.18,
        },
      });
      map.addLayer({
        id: GPS_DOT,
        type: "circle",
        source: GPS_SOURCE,
        paint: {
          "circle-radius": 7,
          "circle-color": "#2563eb",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Capas de medición (§5): relleno + línea (discontinua) + vértices.
      const emptyGeom: FeatureCollection<Geometry> = {
        type: "FeatureCollection",
        features: [],
      };
      map.addSource(MEASURE_SOURCE, { type: "geojson", data: emptyGeom });
      map.addLayer({
        id: MEASURE_FILL,
        type: "fill",
        source: MEASURE_SOURCE,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#f97316", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: MEASURE_LINE,
        type: "line",
        source: MEASURE_SOURCE,
        filter: ["!=", ["geometry-type"], "Point"],
        paint: {
          "line-color": "#f97316",
          "line-width": 2.5,
          "line-dasharray": [2, 1.5],
        },
      });
      map.addLayer({
        id: MEASURE_VERTICES,
        type: "circle",
        source: MEASURE_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#f97316",
        },
      });

      // Capa de maquinaria amarilla, ubicada en el centroide de su suerte (§5).
      map.addSource(MAQUINARIA_SOURCE, { type: "geojson", data: emptyFc });
      map.addLayer({
        id: MAQUINARIA_DOT,
        type: "circle",
        source: MAQUINARIA_SOURCE,
        paint: {
          "circle-radius": 7,
          "circle-color": "#eab308",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#0f172a",
        },
      });
      map.addLayer({
        id: MAQUINARIA_LABEL,
        type: "symbol",
        source: MAQUINARIA_SOURCE,
        layout: {
          "text-field": ["get", "identificacion"],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-font": ["Open Sans Regular"],
        },
        paint: {
          "text-color": "#facc15",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1.4,
        },
      });

      // Selección al tocar un lote (desactivada mientras se mide).
      map.on("click", SUERTES_FILL, (e) => {
        if (useMapStore.getState().measureMode !== "off") return;
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (f) setSelected(f.properties as unknown as SuerteProperties);
      });
      map.on("mouseenter", SUERTES_FILL, () => {
        if (useMapStore.getState().measureMode === "off")
          map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", SUERTES_FILL, () => {
        map.getCanvas().style.cursor = "";
      });

      // En modo medición, cada toque agrega un vértice.
      map.on("click", (e) => {
        if (useMapStore.getState().measureMode === "off") return;
        useMapStore.getState().addVertex([e.lngLat.lng, e.lngLat.lat]);
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

  // ── Marcador GPS ──
  const gps = useMapStore((s) => s.gps);
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(GPS_SOURCE) as GeoJSONSource | undefined;
    if (!source) return;
    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: gps
        ? [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [gps.lon, gps.lat] },
              properties: { accuracy: gps.accuracy },
            },
          ]
        : [],
    };
    source.setData(fc);
  }, [gps]);

  // ── Centrar en mi ubicación ──
  const centerNonce = useMapStore((s) => s.centerNonce);
  useEffect(() => {
    const map = mapRef.current;
    const fix = useMapStore.getState().gps;
    if (!map || centerNonce === 0 || !fix) return;
    map.flyTo({ center: [fix.lon, fix.lat], zoom: 17, duration: 1000 });
  }, [centerNonce]);

  // ── Maquinaria del día sobre los polígonos (§5) ──
  const maqItems = useMaquinariaStore((s) => s.items);
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(MAQUINARIA_SOURCE) as
      | GeoJSONSource
      | undefined;
    if (!map || !source) return;
    const d = new Date();
    const hoy = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: itemsForFecha(maqItems, hoy).map((i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [i.lon, i.lat] },
        properties: { identificacion: i.identificacion, tipo: i.tipo },
      })),
    };
    source.setData(fc);
  }, [maqItems]);

  // ── Dibujo de la medición en curso ──
  const vertices = useMapStore((s) => s.vertices);
  const measureMode = useMapStore((s) => s.measureMode);
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(MEASURE_SOURCE) as GeoJSONSource | undefined;
    if (!map || !source) return;

    if (measureMode !== "off") map.getCanvas().style.cursor = "crosshair";
    else map.getCanvas().style.cursor = "";

    const features: Feature<Geometry>[] = vertices.map((v: LngLat) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: v },
      properties: {},
    }));

    if (measureMode === "area" && vertices.length >= 3) {
      const ring = [...vertices, vertices[0]!];
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {},
      });
    } else if (vertices.length >= 2) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: vertices },
        properties: {},
      });
    }

    source.setData({ type: "FeatureCollection", features });

    // Contraste: ¿el centroide cae dentro de una suerte conocida? (§5)
    const setMeasureOfficial = useMapStore.getState().setMeasureOfficial;
    if (measureMode === "area" && vertices.length >= 3) {
      const cx = vertices.reduce((a, v) => a + v[0], 0) / vertices.length;
      const cy = vertices.reduce((a, v) => a + v[1], 0) / vertices.length;
      const hits = map.queryRenderedFeatures(map.project([cx, cy]), {
        layers: [SUERTES_FILL],
      });
      const props = hits[0]?.properties as SuerteProperties | undefined;
      setMeasureOfficial(
        props ? { secSte: props.sec_ste, haOficial: props.ha_oficial } : null,
      );
    } else {
      setMeasureOfficial(null);
    }
  }, [vertices, measureMode]);

  // `size-full` (no `absolute inset-0`): maplibre-gl.css fuerza
  // `.maplibregl-map { position: relative }` y anularía `inset-0`, colapsando la
  // altura. Con height/width 100% el mapa llena su contenedor en cualquier caso.
  return <div ref={containerRef} className="size-full" />;
}
