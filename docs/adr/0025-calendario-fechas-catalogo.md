# ADR-0025 — Calendario con días de paso del satélite (Catalog API)

Fecha: 2026-08-29 · Estado: aceptado

## Contexto

El selector A/B (ADR-0024) dejaba elegir cualquier fecha, pero Sentinel-2 solo pasa ~cada 5 días y muchas
escenas tienen nubes (el Valle es muy nublado): el usuario acababa eligiendo días sin imagen útil. Se pidió
un **calendario que marque con un círculo los días con paso real del satélite** sobre las fincas, para
elegir bien las fechas a comparar.

Saber qué días hay imagen sobre un AOI requiere la **Catalog API (STAC) de CDSE**, que **exige OAuth**
(se verificó: 401 sin token; el `GetCapabilities` del WMS trae la dimensión `time` vacía, no sirve).

## Decisión

- **Ruta serverless `/api/sentinel-dates`** (App Router) que guarda el secreto OAuth y consulta el
  catálogo: token `client_credentials` (cacheado en módulo) → `POST …/catalog/1.0.0/search` con el bbox de
  la planta y un rango de fechas → devuelve `[{date, cloud}]` (dedup por día, menor nubosidad). Helpers
  **puros** en `lib/geo/sentinelCatalog.ts` (testeados); token en `lib/env.ts` (`sentinelHubOAuth()`,
  Zod, **secreto de servidor**, NO `NEXT_PUBLIC`).
- **Calendario** `SentinelDatePicker` (sin dependencias): rejilla mensual (helper puro `monthMatrix`,
  testeado), un **círculo por día con imagen coloreado por nubosidad** (verde despejado → gris muy
  nublado), selección **A/B** (Antes/Después) que escribe en el store (ADR-0024), navegación de mes,
  resumen y limpiar. Montaje diferido para evitar mismatch de hidratación con "hoy".
- **Degradación limpia**: sin credenciales OAuth, la ruta responde `{configured:false}` y el calendario
  **sigue usable** (eliges día a mano, sin círculos). El endpoint se cachea en el SW
  (StaleWhileRevalidate) para ver las últimas fechas sin señal.
- **Bbox por planta**: se añadió `bbox` a `PlantaAOI` (Riopaila y Castilla) para acotar la búsqueda al AOI.

## Consecuencias

- El usuario elige **días con paso real y despejados** (ve el % de nubes), no fechas a ciegas; combina con
  el recorte a fincas (ADR-0023) y el índice (ADR-0022).
- **Requiere un cliente OAuth** gratuito de CDSE (`SENTINELHUB_CLIENT_ID`/`SECRET` en el servidor). Es la
  primera pieza que usa un **secreto** del lado servidor (hasta ahora todo era el instance ID público).
- La consulta consume cuota mínima (solo metadatos del catálogo, sin renderizar imágenes). Ventana por
  defecto: 6 meses hacia atrás.

## Alternativas descartadas

- **Cadencia teórica de la órbita (sin OAuth)**: marcaría días de paso sin backend, pero aproximada y sin
  saber de nubes (un día marcado podría salir nublado). El usuario prefirió fechas reales + nubosidad.
- **WMS `GetCapabilities`**: su dimensión `time` no lista las fechas de adquisición por AOI.
- **Precomputar un JSON estático por cron**: evitaría el token por request, pero las fechas quedan viejas
  entre corridas; la ruta en vivo (con caché) es más simple y fresca.
