# ADR-0017 — Capas de contexto por planta (Castilla)

Fecha: 2026-07-28 · Estado: aceptado

## Contexto

Las capas de contexto (red hídrica, canales, drenajes, vías, pozos, haciendas…) eran **globales**:
una sola lista `CONTEXT_LAYERS` y una ruta fija `/data/contexto_<id>.geojson` que contenía solo
datos de Riopaila. En Castilla esas capas salían vacías (los datos caen en la zona de Riopaila).
Se recibió la cartografía oficial de Castilla y se quiere que Castilla tenga sus propias capas,
incluyendo tipos que Riopaila no tiene (hidrantes, llaves, tubería enterrada).

## Decisión

- **La lista de capas es por planta**: se agrega `contextLayers: ContextLayer[]` a `PlantaConfig`
  (mismo patrón que `tablones`/`catalogo`/`maestro`/`haciendasLabel`). Riopaila = `CONTEXT_LAYERS`
  (sin cambios); Castilla = `CASTILLA_CONTEXT_LAYERS` (nueva).
- **`ContextLayer.file` opcional**: si falta, se usa `/data/contexto_<id>.geojson` (helper
  `contextLayerFile()`). Así los archivos de Riopaila **no se renombran**; Castilla fija
  `/data/contexto_castilla_<id>.geojson`. Evita churn y colisiones (validado en test).
- **Consumidores leen la planta activa**: `MapView` itera `cfg.contextLayers` y crea la fuente con
  `contextLayerFile(layer)`; `addContextLayer` recibe el objeto capa (ya no busca en la lista
  global); `LayerToggles` y `Legend` iteran `plantaConfig(planta).contextLayers`. Como `MapView`
  se re-monta con `key={planta}` (MapScreen), solo se montan las capas de la planta activa.
- **`activeContext` = unión de ids de todas las plantas** (no persistido): así el toggle funciona
  en cualquier planta sin migración de estado.
- **Conversión (`scripts/convertir_contexto_castilla.py`)**: los shapefiles de Castilla vienen en
  **Datum Bogotá / Colombia West Zone** (Internacional 1924), distinto de Riopaila (MAGNA-SIRGAS
  EPSG:3115). Se usa el **WKT del propio `.prj`** como CRS de origen (`CRS.from_wkt`), no un EPSG
  hardcodeado, para transformar correctamente a WGS84.

## Decisiones de datos (por peso, para no romper el offline de campo)

- **Red hídrica**: el shapefile trae 48.544 segmentos (17,8 MB). Solo **9.815 son ríos con
  nombre** (`principale`); los 38.729 restantes son micro-drenajes/zanjas sin nombre. Se queda
  solo con los ríos nombrados → 4,6 MB (equivalente conceptual a los 103 curados de Riopaila).
- **Municipios/corregimientos**: 6.501 fragmentos (3 MB), 6.479 sin nombre → se **omite** (bajo
  valor, mucho peso). Se puede sumar luego con una fuente más limpia.
- **RIOS y municipios** además se recortan al bounding box de Castilla (aunque en la práctica ya
  caían dentro).
- **`VIA_PAVIMENTADA`**: llegó incompleta (sin `.shp`/`.shx`) → se omite; pedir el archivo completo.

## Consecuencias

- Nuevos tipos de capa solo-Castilla: hidrantes, llaves, tubería (además de canales de riego,
  drenajes, red hídrica, vías, pozos, haciendas). En Riopaila no aparecen (su lista no los tiene).
- Nuevos `/data/contexto_castilla_*.geojson`, cacheados por el SW automáticamente (matcher
  `/data/`). El más pesado (red hídrica, 4,6 MB) es aceptable offline.
- Regenerar con el script si cambia la cartografía de Castilla.

## Alternativas descartadas

- **Renombrar los archivos de Riopaila a un esquema con prefijo**: churn innecesario; el campo
  `file` opcional evita tocarlos.
- **Incluir la red hídrica y municipios completos**: geojson de decenas de MB, inviable para el
  caché offline de los celulares de campo.
- **Hardcodear EPSG:3115 para Castilla** (como Riopaila): incorrecto, su datum es Bogotá/West;
  produciría un desplazamiento. Por eso se lee el WKT del `.prj`.
