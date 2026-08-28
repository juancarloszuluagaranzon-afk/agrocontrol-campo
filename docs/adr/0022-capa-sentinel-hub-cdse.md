# ADR-0022 — Capa Sentinel Hub (Copernicus Data Space Ecosystem) por WMS

Fecha: 2026-08-27 · Estado: aceptado

## Contexto

ADR-0021 dejó explícito el "siguiente paso": pasar del mosaico anual sin nubes de EOX
(`s2cloudless`, un compuesto de todo el año, sin fecha ni NDVI) a **imágenes Sentinel-2 recientes e
índices agronómicos** vía Copernicus/Sentinel Hub. Se pidió conectar esa capa en AgroControl Campo.

El acceso OGC del **Copernicus Data Space Ecosystem (CDSE)** se autentica con el **instance ID en la
URL** —`https://sh.dataspace.copernicus.eu/ogc/wms/<INSTANCE_ID>`— sin OAuth para las peticiones
`GetMap`. Eso permite servir la capa **desde el cliente**, igual que ya se hace con Esri y EOX, sin
montar un proxy serverless (el proxy que ADR-0021 anticipaba solo es necesario para la Process API con
`client_secret`, que aquí no se usa).

## Decisión

- **Una fuente + capa raster por índice** (`sentinel-hub-<capa>`, p. ej. `sentinel-hub-NDVI`,
  `sentinel-hub-NDMI`) en `lib/geo/basemap.ts`, encima de `s2cloudless` y debajo de las suertes (que se
  añaden en `map.on("load")`), **ocultas por defecto**. Se añaden **solo si hay instance ID**
  configurado; si no, `baseStyle()` las omite por completo. La **lista de capas** se define en
  `NEXT_PUBLIC_SENTINELHUB_LAYERS` (coma, por defecto `NDVI,NDMI`; se acepta `ID:Etiqueta`), todas sobre
  la **misma instancia**. Cada una es un toggle propio en 🗂️ Capas.
- **Petición WMS** construida en `lib/geo/sentinelHub.ts`: `VERSION=1.1.1`, `SRS=EPSG:3857`,
  `BBOX={bbox-epsg-3857}` (marcador de MapLibre, sin URL-encode), `WIDTH/HEIGHT=256`, `FORMAT=image/png`,
  `TRANSPARENT=true`, `MAXCC` configurable. **Sin `TIME`**: CDSE devuelve la imagen más reciente bajo el
  umbral de nubes. Config validada con Zod en el borde (§11), como `lib/env.ts`.
- **Configuración por entorno** (`NEXT_PUBLIC_SENTINELHUB_INSTANCE_ID`, y opcionales `…_LAYER` con
  defecto `NDVI` y `…_MAXCC` con defecto `20`). El instance ID va en la URL del navegador ⇒ es
  `NEXT_PUBLIC_*` por diseño; **no es un secreto de credencial** (no deriva token) pero **consume la
  cuota** de la cuenta, así que la configuración de CDSE debe **restringirse al dominio** del despliegue.
- **Estado** en `mapStore` (`sentinelHubVisible: Record<layerId, boolean>` / `toggleSentinelHub(layerId)`,
  no persistido; mismo patrón que `activeContext`/`toggleContext`). MapView recorre las capas
  configuradas y alterna la `visibility` de cada una con `mapReady` en las deps y un guard `getLayer`
  (la capa puede no existir). Un toggle 🛰️ por capa en el panel 🗂️ Capas, **visibles solo si está
  configurado**.
- **Caché del service worker**: `StaleWhileRevalidate` (`agrocontrol-tiles-sentinelhub`, expiración de
  7 días), no `CacheFirst` como EOX/Esri: al ser la "última imagen", se sirve la cacheada al instante y
  se refresca en segundo plano en vez de anclar una imagen vieja.

## Consecuencias

- Se obtiene **monitoreo temporal** (NDVI/color real reciente por AOI), lo que el mosaico anual de EOX no
  daba. Complementa, no reemplaza, a `s2cloudless` (que sigue sin requerir configuración).
- **Requiere alta gratuita** en CDSE y crear una configuración OGC; sin instance ID la app funciona igual,
  solo sin esta capa (degradación limpia).
- La capa **depende de la cuota** de la cuenta CDSE; mitigado restringiendo el dominio de la configuración.
- Resolución ~10 m (Sentinel-2): fuente declarada `maxzoom: 16`; MapLibre sobre-acerca a más zoom.
- Sin dependencias nuevas ni backend propio.

## Alternativas descartadas (por ahora)

- **Process API de Sentinel Hub con OAuth `client_secret`** (evalscript propio, composites a medida):
  más potente, pero exige un proxy serverless que guarde el secreto. El patrón OGC por instance ID cubre
  el caso agronómico (NDVI/color real reciente) sin ese secreto.
- **`TIME` fijo por fecha**: útil para comparar dos fechas concretas; se dejó fuera para no complicar la
  UI. La capa muestra la imagen más reciente bajo `MAXCC`; un selector de fecha sería una iteración aparte.
