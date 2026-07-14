# ADR-0014 — Marca de agua del nombre de hacienda en modo Plano

Fecha: 2026-07-13 · Estado: aceptado

## Contexto

El modo **Plano** ya colorea cada tablón según su hacienda (`HACIENDA_COLORS`,
`lib/geo/haciendas.ts`, 17 haciendas de Riopaila). El usuario pidió agregar el **nombre de la
hacienda** como una marca de agua — texto grande y semitransparente centrado sobre su área,
como en apps tipo Avenza — puramente visual, sin tabla nueva ni cambios de Supabase.

## Decisión

- **Centroide del sector de mayor área, no de toda la hacienda**: una misma hacienda puede
  tener tablones en varios `sector` geográficamente separados (confirmado: GERTRUDIS, MORILLO,
  VENECIA, ZAMBRANO en Riopaila). Un centroide de "todos los tablones con ese nombre" puede caer
  en tierra de nadie entre dos masas desconectadas. `scripts/generar_etiquetas_haciendas.mjs`
  agrupa por `(hacienda, sector)`, elige el grupo de mayor `ha_oficial` total, y calcula su
  centroide con `@turf/centroid`. Si el centroide cae fuera de todos los polígonos del grupo
  (`@turf/boolean-point-in-polygon`), usa en su lugar el centroide del tablón individual más
  grande — garantiza el punto dentro de tierra real. En la práctica pasó en 2/17 haciendas de
  Riopaila y 21/60 de Castilla (formas cóncavas/en L), confirmando que el fallback era necesario.
- **No se usa `public/data/contexto_haciendas.geojson`**: tiene la propiedad `nombre` (no
  `hacienda`), 24 polígonos con una hacienda repetida en varios `sector` sin fusionar, y su
  valor `"LA LUISA"` no coincide con `"LA LUISA 1"`/`"LA LUISA 2"` de `HACIENDA_COLORS` — el
  mismo problema de fondo que el punto anterior evita, resuelto desde la fuente ya normalizada
  (`tablones_*.geojson`, campo `hacienda`, coincide 1:1 con la paleta).
- **Datos precomputados por script, no calculados en el cliente**: mismo patrón que
  `pluviometros_riopaila.json`/`puntos_hidrologicos_riopaila.json` — más simple y predecible
  que recalcular centroides en cada carga del mapa. Salida: `public/data/
haciendas_label_{riopaila,castilla}.json`, `[{ hacienda, lat, lon }]`.
- **Color del texto = paleta de hacienda oscurecida/saturada** (`domain/haciendas/schema.ts:
darkenSaturate`, vía HSL), no un gris neutro — debe leerse como propio de esa hacienda.
  Castilla, sin paleta de colores propia todavía, usa `HACIENDA_DEFAULT` oscurecido — mismo
  criterio que ya aplica hoy al relleno de sus tablones.
- **Zoom**: la capa (`HACIENDA_LABEL_LAYER`) tiene `maxzoom: 13` y un fundido de opacidad hacia
  cero llegando a ese zoom — justo donde `SUERTES_LABEL` (códigos de suerte, `minzoom: 13`) toma
  el relevo. Nunca compiten por espacio.

## Hallazgo colateral: fuente de glyphs

Al revisar qué fuente usar, se encontró que **todas** las capas `symbol` de texto de
`MapView.tsx` (`SUERTES_LABEL`, `MEDICIONES_LABEL`, `MARCADORES_LABEL`, `PLANO_PUNTOS_LABEL`,
`LLUVIA_HOY_DOT`) usaban `"Open Sans Regular"`, que **no existe** en el servidor de glyphs
configurado (`https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf`,
`lib/geo/basemap.ts`) — devuelve 404. El único fontstack que sirve ese servidor es
`"Open Sans Semibold"` (confirmado contra su propio `style.json`, y contra los logs reales de
Playwright: `AJAXError (404): .../font/Open Sans Regular/0-255.pbf`). Es decir, ningún texto de
etiqueta se veía en producción — códigos de suerte, nombres de marcadores/mediciones, números de
punto de muestreo, mm de lluvia sobre las gotas. Se corrige en el mismo cambio (todas las capas
pasan a `"Open Sans Semibold"`) por ser el mismo hallazgo técnico repetido.

## Hallazgo colateral: condición de carrera en el efecto de `baseMode`

El `useEffect` que alterna Satélite↔Plano (colores de hacienda, `SUERTES_*`) no dependía de
`mapReady`: si el usuario cambiaba de modo antes de que `map.on("load")` terminara de montar
las capas, el guard `!map.getLayer(SUERTES_FILL)` cortaba en silencio y el cambio de modo nunca
se reintentaba. Se agrega `mapReady` a sus dependencias — mismo fix que se le aplicó al efecto
nuevo de la marca de agua (que vive en el mismo componente y depende del mismo ciclo de carga).
Se detectó al escribir el test e2e de esta feature (fallaba de forma intermitente hasta
corregirlo), no por reporte de un usuario.

## Verificación

Se agrega `window.__e2eMap` (gateado por `NEXT_PUBLIC_E2E === "1"`, nunca en producción real —
mismo patrón que el bypass de auth en `lib/auth/useUser.ts`) para que el test e2e
(`tests/e2e/mapa.spec.ts`) pueda consultar `querySourceFeatures`/`getLayoutProperty` sin acceso
DOM. El entorno de preview de este proyecto (headless, sin tiles reales de Esri) no completa el
evento `load` de MapLibre, así que la verificación visual real de esta feature se hizo con
Playwright (Chromium real), no con el preview.

## Consecuencias

- Nuevo campo `PlantaConfig.haciendasLabel` (`lib/plantas.ts`); nuevos JSON en `/public/data`
  (cacheados automáticamente por el Service Worker junto al resto de `/public`).
- Si cambia la cartografía de tablones, hay que volver a correr
  `node scripts/generar_etiquetas_haciendas.mjs` y commitear el resultado.

## Alternativas descartadas

- `contexto_haciendas.geojson` como fuente (ver arriba).
- Centroide simple de todos los tablones por hacienda (cae fuera de tierra en haciendas
  multi-sector).
- Calcular el centroide en el cliente en cada carga del mapa (innecesario, menos predecible que
  un JSON precomputado).

## Fuera de esta entrega

Colorear suertes por renovación o por rango de edad (usando `maestro_suertes.json` y
`edadSuerteMeses()`, ya existentes) es una visión futura del usuario, sin relación estructural
con esta feature — queda para una entrega aparte.
