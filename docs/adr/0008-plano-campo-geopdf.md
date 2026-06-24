# ADR-0008 — "Plano de campo": GeoPDF de muestreo en el cliente (pdfjs)

- Estado: **Aceptada**
- Fecha: 2026-06-24

## Contexto

Los técnicos de Riopaila hacían **muestreo de suelos** con **Avenza**: Agricultura
de Precisión genera un **GeoPDF** por suerte (plan de puntos de muestreo,
georreferenciado WGS84) y el técnico, en campo, lo abre en Avenza y **camina con el
GPS a cada punto**. Es trabajo **ocasional**, así que no debe embeberse en el repo
ni en la BD: el técnico **sube el PDF en la app** y la usa esa jornada.

Rio Map ya tenía el motor de mapa, GPS, brújula y marcadores. Faltaba (a) mostrar el
GeoPDF georreferenciado sobre el mapa y (b) extraer sus puntos de muestreo para
verlos y marcarlos como "muestreado".

## Decisión

Nueva herramienta **"Plano de campo"** (`PdfPlanControl`), 100 % en el cliente,
efímera y por dispositivo (sin Supabase).

- **Dependencia nueva: `pdfjs-dist`** (única forma de rasterizar y leer la lista de
  operadores de un PDF en el navegador). Se carga por **import dinámico** (no entra
  al bundle inicial). El worker se **auto-aloja** en `public/pdf/pdf.worker.min.mjs`
  (copiado en `predev`/`prebuild` por `scripts/copy-pdf-worker.mjs`; gitignored) en
  vez de `new URL(...)` —que webpack/turbopack resuelven distinto— y se cachea en el
  SW para offline.
- **Georreferencia sin dependencias** (`lib/geo/geopdf.ts`): estos GeoPDF de QGIS no
  usan object streams, así que `/VP/Measure/GPTS` y `/BBox` están en texto plano y se
  parsean por bytes → 4 esquinas (overlay), bbox (encuadre) y la transformación
  página→WGS84. Núcleo puro y testeado contra el PDF real.
- **Backdrop**: capa `image` de MapLibre con las 4 esquinas de `/GPTS`, opacidad
  ajustable. La imagen rasterizada va a **IndexedDB** (`lib/storage/imageBlobStore.ts`,
  helper propio sin dependencia) porque pesa >1 MB; la metadata liviana va a
  `planoStore` (zustand-persist/localStorage). Sobrevive recargas.
- **Puntos de muestreo** (`lib/geo/pdfPoints.ts`): se extraen de la capa OCG
  `punto_muestreo` con la lista de operadores de pdf.js, rastreando la CTM (incluidos
  los límites de Form XObject) y tomando el centro de cada símbolo (`constructPath`)
  → lat/lon. El id del OCG se deduce por bytes (`/Name (punto_muestreo)` → `${N}R`).
  Validado contra el PDF real (6 puntos). Si no hay capa de puntos, el panel ofrece
  **marcado manual** (añadir punto en el centro del mapa) como plan B.

## Consecuencias

- El núcleo (georreferencia, conversión de coordenadas, mapeo del OCG, distancia
  geodésica) es **puro y testeable**; la rasterización/extracción con pdf.js, el
  `image` source y el GPS se aíslan (no unit-testeables, igual criterio que ADR-0006)
  y se validaron en dispositivo/spike.
- `pdfjs-dist` (~300 KB + worker 1,2 MB) solo se descarga al usar la herramienta;
  offline cubierto por el SW.
- La extracción de puntos asume el patrón de estos GeoPDF (QGIS, capa
  `punto_muestreo`, sin object streams, rectángulo eje-alineado). PDFs muy distintos
  (object streams, rotación) caerían al marcado manual.
- Sin cambios de BD ni de sync: es una capa local por dispositivo.
