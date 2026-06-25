"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type Map as MlMap,
  type MapGeoJSONFeature,
  type GeoJSONSource,
  type ImageSource,
  type ExpressionSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { baseStyle } from "@/lib/geo/basemap";
import { haciendaMatchExpression } from "@/lib/geo/haciendas";
import { coneSector, lerpAngle, metersPerPixel } from "@/lib/geo/orientation";
import { accuracyCircle } from "@/lib/geo/gps";
import {
  CONTEXT_LAYERS,
  PDF_OVERLAY_SOURCE,
  PDF_OVERLAY_LAYER,
  PLANO_PUNTOS_SOURCE,
  PLANO_PUNTOS_DOT,
  PLANO_PUNTOS_LABEL,
  GPS_ACCURACY_SOURCE,
  GPS_CONE,
  GPS_CONE_SOURCE,
  GPS_DOT,
  GPS_HALO,
  GPS_SOURCE,
  MARCADORES_DOT,
  MARCADORES_LABEL,
  MARCADORES_SOURCE,
  MEASURE_FILL,
  MEASURE_LINE,
  MEASURE_SOURCE,
  MEASURE_VERTICES,
  MEDICIONES_FILL,
  MEDICIONES_LABEL,
  MEDICIONES_LINE,
  MEDICIONES_SOURCE,
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
import { usePlantaStore } from "@/lib/store/plantaStore";
import { usePlanoStore } from "@/lib/store/planoStore";
import { getImage } from "@/lib/storage/imageBlobStore";
import { plantaConfig } from "@/lib/plantas";
import { activos, useMarcadoresStore } from "@/lib/store/marcadoresStore";
import { activas, useMedicionesStore } from "@/lib/store/medicionesStore";
import type { TablonProperties } from "@/domain/suertes/schema";

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
      paint: {
        "fill-color": cfg.color,
        "fill-opacity": cfg.fillOpacity ?? 0.5,
      },
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
  const lookupRef = useRef<Map<string, TablonProperties>>(new Map());
  const pendingTabRef = useRef<string | null>(null);
  // objectURL del backdrop en uso (se revoca al reemplazar/desmontar).
  const overlayUrlRef = useRef<string | null>(null);
  const fittedKeyRef = useRef<string | null>(null);
  // El mapa terminó de cargar (capas listas); dispara la hidratación del plano.
  const [mapReady, setMapReady] = useState(false);
  const setSelected = useMapStore((s) => s.setSelected);

  // Planta activa: define cartografía y encuadre. `MapScreen` re-monta este
  // componente (key por planta), así que `cfg` es estable durante su vida.
  const planta = usePlantaStore((s) => s.planta);
  const cfg = plantaConfig(planta);

  // Índice tab_id → properties para enriquecer la selección del buscador
  // (el catálogo no trae supervisor/jefe_zona). El navegador cachea el GeoJSON.
  useEffect(() => {
    let cancelled = false;
    void fetch(cfg.tablones)
      .then((r) => r.json())
      .then((fc: { features: { properties: TablonProperties }[] }) => {
        if (cancelled) return;
        const map = new Map<string, TablonProperties>();
        for (const f of fc.features) map.set(f.properties.tab_id, f.properties);
        lookupRef.current = map;
        // Resolver una selección del buscador que llegó antes que el índice.
        if (pendingTabRef.current) {
          const props = map.get(pendingTabRef.current);
          if (props) setSelected(props);
          pendingTabRef.current = null;
        }
      })
      .catch(() => {
        /* sin índice, el buscador degrada a atributos parciales */
      });
    return () => {
      cancelled = true;
    };
  }, [setSelected, cfg.tablones]);

  // ── Montaje único del mapa ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseStyle(),
      center: cfg.aoi.center,
      zoom: cfg.aoi.zoom,
      minZoom: cfg.aoi.minZoom,
      maxZoom: cfg.aoi.maxZoom,
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

    // Centro del mapa en vivo (para la retícula de marcado preciso).
    const syncCenter = () => {
      const c = map.getCenter();
      useMapStore.getState().setMapCenter([c.lng, c.lat]);
    };
    map.on("move", syncCenter);

    map.on("load", () => {
      map.addSource(SUERTES_SOURCE, { type: "geojson", data: cfg.tablones });

      // Capas de contexto (ocultas por defecto) antes de las suertes.
      for (const cfg of CONTEXT_LAYERS) {
        map.addSource(contextSourceId(cfg.id), {
          type: "geojson",
          data: `/data/contexto_${cfg.id}.geojson`,
        });
        addContextLayer(map, cfg.id);
      }

      // El backdrop del "Plano de campo" (image source) se crea bajo demanda en su
      // efecto, con la imagen real; así no hace falta un placeholder.

      // Una sola capa de relleno + contorno para los 1378 tablones (§13).
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
        filter: ["==", ["get", "tab_id"], ""],
      });
      map.addLayer({
        id: SUERTES_LABEL,
        type: "symbol",
        source: SUERTES_SOURCE,
        minzoom: 13,
        layout: {
          // Cada tablón rotula el código de su suerte (ej. "3111-020"); el
          // número de tablón se ve en el panel al tocar el lote.
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
      // Disco de precisión (polígono de radio real); se rellena en su efecto.
      map.addSource(GPS_ACCURACY_SOURCE, { type: "geojson", data: emptyFc });

      // Cono de orientación (brújula). Va bajo el halo y el punto, con vértice
      // en la ubicación del usuario. Se rellena en su propio efecto (RAF).
      const emptyConeFc: FeatureCollection<Geometry> = {
        type: "FeatureCollection",
        features: [],
      };
      map.addSource(GPS_CONE_SOURCE, { type: "geojson", data: emptyConeFc });
      map.addLayer({
        id: GPS_CONE,
        type: "fill",
        source: GPS_CONE_SOURCE,
        paint: { "fill-color": "#2563eb", "fill-opacity": 0.28 },
      });

      // Halo = disco de precisión real (relleno del polígono de `accuracy`), no
      // un círculo de tamaño fijo: comunica la incertidumbre y su convergencia.
      map.addLayer({
        id: GPS_HALO,
        type: "fill",
        source: GPS_ACCURACY_SOURCE,
        paint: { "fill-color": "#2563eb", "fill-opacity": 0.15 },
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

      // Mediciones guardadas (persistidas): relleno + contorno + etiqueta.
      // Van bajo la medición en curso para que la edición activa resalte.
      const emptyMedFc: FeatureCollection<Geometry> = {
        type: "FeatureCollection",
        features: [],
      };
      map.addSource(MEDICIONES_SOURCE, { type: "geojson", data: emptyMedFc });
      map.addLayer({
        id: MEDICIONES_FILL,
        type: "fill",
        source: MEDICIONES_SOURCE,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#7c3aed", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: MEDICIONES_LINE,
        type: "line",
        source: MEDICIONES_SOURCE,
        filter: ["!=", ["geometry-type"], "Point"],
        paint: { "line-color": "#7c3aed", "line-width": 2.5 },
      });
      map.addLayer({
        id: MEDICIONES_LABEL,
        type: "symbol",
        source: MEDICIONES_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        layout: {
          "text-field": ["get", "etiqueta"],
          "text-size": 11,
          "text-offset": [0, 0.6],
          "text-anchor": "top",
          "text-font": ["Open Sans Regular"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#4c1d95",
          "text-halo-width": 1.4,
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

      // Marcadores privados del usuario: pin de color + etiqueta (§5).
      map.addSource(MARCADORES_SOURCE, { type: "geojson", data: emptyFc });
      map.addLayer({
        id: MARCADORES_DOT,
        type: "circle",
        source: MARCADORES_SOURCE,
        paint: {
          "circle-radius": 7,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: MARCADORES_LABEL,
        type: "symbol",
        source: MARCADORES_SOURCE,
        layout: {
          "text-field": ["get", "nombre"],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-font": ["Open Sans Regular"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1.4,
        },
      });

      // Puntos de muestreo del "Plano de campo": punto + número. Verde si ya se
      // muestreó, rojo si pendiente. Se llenan desde el store (efecto aparte).
      map.addSource(PLANO_PUNTOS_SOURCE, { type: "geojson", data: emptyFc });
      map.addLayer({
        id: PLANO_PUNTOS_DOT,
        type: "circle",
        source: PLANO_PUNTOS_SOURCE,
        paint: {
          "circle-radius": 8,
          "circle-color": ["case", ["get", "muestreado"], "#16a34a", "#dc2626"],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: PLANO_PUNTOS_LABEL,
        type: "symbol",
        source: PLANO_PUNTOS_SOURCE,
        layout: {
          "text-field": ["get", "etiqueta"],
          "text-size": 10,
          "text-font": ["Open Sans Regular"],
        },
        paint: { "text-color": "#ffffff" },
      });

      // Selección al tocar un lote (desactivada mientras se mide).
      map.on("click", SUERTES_FILL, (e) => {
        if (useMapStore.getState().measureMode !== "off") return;
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (f) setSelected(f.properties as unknown as TablonProperties);
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

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setSelected, cfg.tablones, cfg.aoi]);

  // ── Resaltado de la suerte seleccionada ──
  const selectedTabId = useMapStore((s) => s.selected?.tab_id ?? "");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(SUERTES_SELECTED)) return;
    map.setFilter(SUERTES_SELECTED, ["==", ["get", "tab_id"], selectedTabId]);
  }, [selectedTabId]);

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
    const props = lookupRef.current.get(flyTarget.tabId);
    if (props) setSelected(props);
    else pendingTabRef.current = flyTarget.tabId; // se resuelve al cargar el índice
  }, [flyTarget, setSelected]);

  // ── Marcador GPS + disco de precisión ──
  const gps = useMapStore((s) => s.gps);
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(GPS_SOURCE) as GeoJSONSource | undefined;
    const accuracy = map?.getSource(GPS_ACCURACY_SOURCE) as
      | GeoJSONSource
      | undefined;
    if (!source || !accuracy) return;
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
    accuracy.setData(
      gps
        ? accuracyCircle(gps.lon, gps.lat, gps.accuracy)
        : { type: "FeatureCollection", features: [] },
    );
  }, [gps]);

  // ── Cono de orientación (brújula tipo Avenza, §5) ──
  // Bucle de animación: interpola el rumbo por el camino corto (sin saltos en
  // 0/360) y redibuja el cono a ~60 fps. El tamaño en pantalla se mantiene
  // (radio en píxeles → metros según el zoom). Mantiene el rumbo aunque el
  // usuario esté quieto (lo alimenta el magnetómetro, no el GPS).
  const compassActive = useMapStore((s) => s.compassActive);
  const gpsPresente = useMapStore((s) => s.gps != null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(GPS_CONE_SOURCE) as GeoJSONSource | undefined;
    if (!source) return;

    if (!compassActive || !gpsPresente) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    let raf = 0;
    let mostrado: number | null = null; // rumbo suavizado actual
    const RADIO_PX = 64;

    const frame = () => {
      const s = useMapStore.getState();
      const fix = s.gps;
      const objetivo = s.deviceHeading;
      if (fix && objetivo != null) {
        mostrado =
          mostrado == null ? objetivo : lerpAngle(mostrado, objetivo, 0.2);
        const radioM = RADIO_PX * metersPerPixel(fix.lat, map.getZoom());
        source.setData(
          coneSector(fix.lon, fix.lat, mostrado, {
            apertureDeg: 60,
            radiusM: radioM,
            steps: 12,
          }),
        );
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [compassActive, gpsPresente]);

  // ── Centrar en mi ubicación ──
  const centerNonce = useMapStore((s) => s.centerNonce);
  useEffect(() => {
    const map = mapRef.current;
    const fix = useMapStore.getState().gps;
    if (!map || centerNonce === 0 || !fix) return;
    map.flyTo({ center: [fix.lon, fix.lat], zoom: 17, duration: 1000 });
  }, [centerNonce]);

  // ── Marcadores privados del usuario sobre el mapa (§5) ──
  const marcadores = useMarcadoresStore((s) => s.items);
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(MARCADORES_SOURCE) as
      | GeoJSONSource
      | undefined;
    if (!map || !source) return;
    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: activos(marcadores).map((m) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [m.lon, m.lat] },
        properties: { nombre: m.nombre, color: m.color },
      })),
    };
    source.setData(fc);
  }, [marcadores]);

  // ── Mediciones guardadas sobre el mapa (§5) ──
  const mediciones = useMedicionesStore((s) => s.items);
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(MEDICIONES_SOURCE) as
      | GeoJSONSource
      | undefined;
    if (!map || !source) return;
    const features: Feature<Geometry>[] = [];
    for (const m of activas(mediciones)) {
      // Forma medida (polígono o línea) …
      features.push({ type: "Feature", geometry: m.geom, properties: {} });
      // … y un punto en el centroide para la etiqueta con el nombre.
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [m.lon, m.lat] },
        properties: { etiqueta: m.nombre },
      });
    }
    source.setData({ type: "FeatureCollection", features });
  }, [mediciones]);

  // ── Modo de base: satélite ↔ plano (tablones por hacienda) ──
  const baseMode = useMapStore((s) => s.baseMode);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(SUERTES_FILL)) return;
    const plano = baseMode === "plano";
    if (map.getLayer("esri-imagery")) {
      map.setLayoutProperty(
        "esri-imagery",
        "visibility",
        plano ? "none" : "visible",
      );
    }
    map.setPaintProperty(
      SUERTES_FILL,
      "fill-color",
      plano
        ? (haciendaMatchExpression() as unknown as ExpressionSpecification)
        : "#facc15",
    );
    map.setPaintProperty(SUERTES_FILL, "fill-opacity", plano ? 0.62 : 0.12);
    map.setPaintProperty(
      SUERTES_LINE,
      "line-color",
      plano ? "#475569" : "#facc15",
    );
    map.setPaintProperty(
      SUERTES_LABEL,
      "text-color",
      plano ? "#0f172a" : "#ffffff",
    );
    map.setPaintProperty(
      SUERTES_LABEL,
      "text-halo-color",
      plano ? "#ffffff" : "#0f172a",
    );
  }, [baseMode]);

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
      const props = hits[0]?.properties as TablonProperties | undefined;
      setMeasureOfficial(
        props ? { label: props.tab_id, haOficial: props.ha_oficial } : null,
      );
    } else {
      setMeasureOfficial(null);
    }
  }, [vertices, measureMode]);

  // ── Marcar vértice en el centro exacto (retícula), con snap a vértice ──
  const markVertexNonce = useMapStore((s) => s.markVertexNonce);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || markVertexNonce === 0) return;
    const c = map.getCenter();
    let pt: LngLat = [c.lng, c.lat];
    // Snap al vértice de tablón más cercano al centro (≤ ~5 m).
    const hits = map.queryRenderedFeatures(map.project(c), {
      layers: [SUERTES_FILL],
    });
    const geom = hits[0]?.geometry;
    if (geom && (geom.type === "Polygon" || geom.type === "MultiPolygon")) {
      const rings: number[][][] =
        geom.type === "Polygon"
          ? (geom.coordinates as number[][][])
          : (geom.coordinates as number[][][][]).flat();
      const mLat = 111320;
      const mLon = 111320 * Math.cos((c.lat * Math.PI) / 180);
      let best = Infinity;
      let bestPt: LngLat | null = null;
      for (const ring of rings) {
        for (const v of ring) {
          const d = Math.hypot((v[0]! - c.lng) * mLon, (v[1]! - c.lat) * mLat);
          if (d < best) {
            best = d;
            bestPt = [v[0]!, v[1]!];
          }
        }
      }
      if (bestPt && best <= 5) pt = bestPt;
    }
    useMapStore.getState().addVertex(pt);
  }, [markVertexNonce]);

  // ── Backdrop del "Plano de campo" (GeoPDF) ──
  // Hidrata el image source desde el store + IndexedDB: actualiza la imagen y sus
  // 4 esquinas, ajusta opacidad/visibilidad y encuadra al cargar un plano nuevo.
  const plano = usePlanoStore((s) => s.plano);
  const planoOpacity = usePlanoStore((s) => s.opacity);
  const planoVisible = usePlanoStore((s) => s.visible);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Sin plano (o invisible): quitar la capa/fuente del backdrop si existía.
    if (!plano || !planoVisible) {
      if (map.getLayer(PDF_OVERLAY_LAYER)) map.removeLayer(PDF_OVERLAY_LAYER);
      if (map.getSource(PDF_OVERLAY_SOURCE))
        map.removeSource(PDF_OVERLAY_SOURCE);
      return;
    }

    let cancelled = false;
    void getImage(plano.imageKey).then((blob) => {
      if (cancelled || !blob || !mapRef.current) return;
      const url = URL.createObjectURL(blob);
      const existing = map.getSource(PDF_OVERLAY_SOURCE) as
        | ImageSource
        | undefined;
      if (existing) {
        existing.updateImage({ url, coordinates: plano.coordinates });
      } else {
        // Se crea con la imagen real (no placeholder) y se inserta bajo las
        // suertes/GPS para que el punto azul quede encima.
        map.addSource(PDF_OVERLAY_SOURCE, {
          type: "image",
          url,
          coordinates: plano.coordinates,
        });
        map.addLayer(
          {
            id: PDF_OVERLAY_LAYER,
            type: "raster",
            source: PDF_OVERLAY_SOURCE,
            paint: {
              "raster-opacity": planoOpacity,
              "raster-fade-duration": 0,
            },
          },
          map.getLayer(SUERTES_FILL) ? SUERTES_FILL : undefined,
        );
      }
      map.setPaintProperty(PDF_OVERLAY_LAYER, "raster-opacity", planoOpacity);
      if (overlayUrlRef.current) URL.revokeObjectURL(overlayUrlRef.current);
      overlayUrlRef.current = url;
      if (fittedKeyRef.current !== plano.imageKey) {
        fittedKeyRef.current = plano.imageKey;
        map.fitBounds(
          [
            [plano.bbox[0], plano.bbox[1]],
            [plano.bbox[2], plano.bbox[3]],
          ],
          { padding: 32, duration: 800 },
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [plano, planoOpacity, planoVisible, mapReady]);

  // ── Puntos de muestreo del plano sobre el mapa ──
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(PLANO_PUNTOS_SOURCE) as
      | GeoJSONSource
      | undefined;
    if (!map || !source || !mapReady) return;
    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: (plano?.puntos ?? []).map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {
          etiqueta: p.id.replace(/^P/, ""),
          muestreado: p.muestreado,
        },
      })),
    };
    source.setData(fc);
  }, [plano, mapReady]);

  // ── Con un plano activo, las suertes se ocultan para verlo solo ──
  // El GeoPDF ya trae su propia cartografía; mostrar las suertes encima lo
  // ensucia. Se restauran al quitar el plano (o al ocultarlo).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const vis = plano && planoVisible ? "none" : "visible";
    for (const id of [
      SUERTES_FILL,
      SUERTES_LINE,
      SUERTES_LABEL,
      SUERTES_SELECTED,
    ]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [plano, planoVisible, mapReady]);

  // `size-full` (no `absolute inset-0`): maplibre-gl.css fuerza
  // `.maplibregl-map { position: relative }` y anularía `inset-0`, colapsando la
  // altura. Con height/width 100% el mapa llena su contenedor en cualquier caso.
  return <div ref={containerRef} className="size-full" />;
}
