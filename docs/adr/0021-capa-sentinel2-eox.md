# ADR-0021 — Capa Sentinel-2 sin nubes (EOX s2cloudless) como satélite alterno

Fecha: 2026-08-24 · Estado: aceptado

## Contexto

Se pidió traer imágenes Sentinel-2 a Rio Map. Como primer paso ("quick win") se busca una capa
satelital alterna al Esri World Imagery —que puede estar desactualizado— sin montar backend ni
manejar API keys.

## Decisión

- **EOX s2cloudless** (`tiles.maps.eox.at`), mosaico global Sentinel-2 **sin nubes**, **gratis y sin
  API key**. Se usa el más reciente disponible: **`s2cloudless-2025`** (WMTS RESTful en Web Mercator,
  `_3857`, orden de teselas `{z}/{y}/{x}`).
- Se añade como **fuente + capa raster `s2cloudless`** en `lib/geo/basemap.ts`, **encima del
  `esri-imagery` y debajo de las suertes** (que se agregan en `map.on("load")`), **oculta por
  defecto**. Se enciende/apaga con un toggle 🛰️ "Sentinel-2 (sin nubes)" en el panel 🗂️ Capas.
- Estado en `mapStore` (`sentinelVisible` / `toggleSentinel`, no persistido). MapView alterna la
  `visibility` de la capa con `mapReady` en las deps (mismo criterio que `baseMode`).
- **Caché de teselas** en el service worker (`agrocontrol-tiles-sentinel`, CacheFirst) igual que las
  del Esri: se ven sin re-descargar y **offline en zonas ya navegadas**.
- **Atribución** obligatoria de EOX/Copernicus en la fuente raster.

## Consecuencias

- Es un **compuesto anual sin nubes**, no una imagen de fecha específica ni NDVI: sirve como
  "satélite más fresco/limpio", no para monitoreo temporal. Eso vendría después con Copernicus/Sentinel
  Hub + un proxy con API key (evaluado, no incluido aquí).
- Resolución ~10 m (Sentinel-2): la fuente se declara `maxzoom: 15` y MapLibre sobre-acerca a más
  zoom (se ve borroso), como es esperable.
- **Requiere señal** la primera vez (tiles en línea); luego el SW las cachea. Sin conexión previa, la
  capa no carga (aceptable para una capa "extra").
- Sin dependencias nuevas ni claves; sin backend.

## Alternativas descartadas (por ahora)

- **Copernicus Data Space / Sentinel Hub** (fecha específica, NDVI, filtro de nubes): potente pero
  exige **API key** → proxy serverless para no exponerla. Es el siguiente paso si se quiere NDVI.
- **Earth Engine / COGs propios + TiTiler**: máximo control, pero requiere backend propio.
