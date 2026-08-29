# ADR-0024 — Selector de fecha A/B para comparar antes/después (Sentinel Hub)

Fecha: 2026-08-28 · Estado: aceptado

## Contexto

Las capas Sentinel Hub (ADR-0022) mostraban siempre la **imagen más reciente**. Para uso agronómico
(regadíos) se pidió **comparar antes/después de un riego**: ver el índice (NDVI/NDMI) en una fecha y
alternarlo con otra sobre la misma vista.

Sentinel-2 **revisita ~cada 5 días** y muchas escenas tienen nubes, así que "la imagen del día exacto"
casi nunca existe: hay que pedir la **última escena hasta** una fecha dada.

## Decisión

- **Parámetro `TIME` del WMS** en el constructor de URL (`sentinelHubTilesUrl`, opcional `time`). El
  helper puro `sentinelHubTimeParam(fecha, windowDays=14)` convierte `YYYY-MM-DD` en una **ventana
  `inicio/fin`** que termina en la fecha y abarca 14 días atrás (cubre 2–3 pasadas de S-2). Solo fechas
  (sin hora) → sin `:` que escapar; el `/` del rango va crudo como en la doc de CDSE. Sin fecha →
  sin `TIME` (más reciente, comportamiento anterior).
- **Dos fechas A/B ("Antes"/"Después") con un radio para alternar** cuál se muestra (estado en `mapStore`:
  `sentinelHubDates {A,B}` + `sentinelHubSlot`, no persistido). Fijar una fecha activa su slot. UI en el
  panel 🗂️ Capas, **visible solo cuando hay algún índice Sentinel Hub encendido**.
- **Cambio de fecha en caliente** con `RasterTileSource.setTiles([url])` (MapLibre v5): un efecto re-tesela
  todas las capas Sentinel Hub con la nueva ventana `TIME`, sin recrear fuentes ni capas.

## Consecuencias

- Comparar antes/después es **un toque** (alternar A/B); cada slot resuelve a la última escena bajo `MAXCC`
  hasta su fecha. Se combina con la máscara "solo nuestras fincas" (ADR-0023) y con NDVI/NDMI.
- La fecha mostrada es **aproximada**: la última escena disponible dentro de la ventana de 14 días, no
  necesariamente del día pedido (limitación de la revisita de S-2). El texto de ayuda lo aclara.
- Sin dependencias nuevas ni backend. La cuota CDSE se consume igual que cualquier tesela.

## Alternativas descartadas

- **Comparación por swipe/cortina** (dos rásters con línea móvil): UX potente pero choca con los gestos de
  paneo del mapa en móvil y duplica peticiones; se dejó para una iteración posterior si se pide.
- **Fecha exacta de un solo día** (`TIME=fecha`): casi siempre vacío por la revisita/nubes; la ventana de
  14 días es más robusta.
