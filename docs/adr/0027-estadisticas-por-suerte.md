# ADR-0027 — Estadísticas por suerte (Statistical API de Sentinel Hub)

Fecha: 2026-09-08 · Estado: aceptado

## Contexto

Se pidió (Fase B) ver **media / mín / máx** de los índices (NDVI, NDMI, EVI, NIR) **por suerte/tablón**, en
el panel del tablón. Hasta ahora la app es un **cliente delgado del WMS de CDSE**: no procesa bandas ni
calcula índices (son evalscripts server-side que devuelven teselas coloreadas). No existía ningún cálculo
zonal.

## Decisión

- **Statistical API de Sentinel Hub** (`/api/v1/statistics`): calcula estadísticas de un evalscript sobre
  una **geometría** (el tablón). Exige OAuth → se hace en una **ruta serverless** `/api/sentinel-stats` que
  guarda el secreto. **Reutiliza el token** OAuth del calendario: se extrajo `getSentinelToken()` a
  `lib/sentinel/token.ts` (compartido por la ruta de fechas y la de estadísticas).
- **La ruta** recibe `tab_id + planta + index + from + to`, **lee la geometría** del tablón del geojson
  (`/data/tablones_<planta>.geojson`, cacheado por planta), arma el cuerpo (`lib/geo/sentinelStats.ts`:
  evalscript que emite el valor en FLOAT32 + `dataMask`, un solo intervalo del período, `maxCloudCoverage`)
  y devuelve `{mean,min,max,stDev,samples}` o `null` (sin dato). Helpers puros testeados; parseo robusto a
  las dos formas de respuesta (objeto/array).
- **Período = el mismo del mapa**: `sentinelHubTimeRange(fecha)` (ventana de 14 días de la fecha
  Antes/Después, o reciente si no hay fecha) — **reutiliza** el sistema de fechas, sin lógica nueva.
- **UI**: `SuerteIndexStats` en `SuertePanel` — una fila por **índice activo** (encendido en Capas), con
  media/mín/máx del tablón seleccionado. Solo aparece si hay un índice encendido. Sin credenciales →
  "no configurado"; sin escena despejada → "sin dato (nubes)".

## Consecuencias

- Estadísticas **bajo demanda** (al abrir un tablón con un índice encendido); no se almacenan (no toca
  Supabase). Coste: una llamada a la Statistical API por índice activo.
- **Degradación limpia**: cualquier fallo (sin credenciales, red, nubes, formato) muestra un texto, no rompe
  nada del panel ni del mapa.
- Reutiliza al máximo: OAuth, sistema de fechas, geometría de suertes, panel existente. Modificación mínima,
  sin backend propio nuevo (salvo la ruta) ni cambios de arquitectura.

## Riesgos

- La app usa **cliente delgado**: la Statistical API es la primera llamada de **cálculo** (no solo teselas).
  El formato exacto del cuerpo/respuesta se alineó con la documentación, pero la confirmación end-to-end
  requiere las credenciales OAuth en el entorno de prueba.
- El período de 14 días puede promediar 2–3 escenas (algunas con nubes) → conviene elegir un día despejado
  en el calendario para que la media sea representativa de esa fecha.
