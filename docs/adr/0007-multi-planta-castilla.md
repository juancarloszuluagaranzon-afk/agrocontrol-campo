# ADR-0007 — Multi-planta: Castilla Agrícola junto a Riopaila

- Estado: **Aceptada**
- Fecha: 2026-06-11

## Contexto

Rio Map nació para Riopaila Agrícola, pero el grupo opera otra empresa hermana,
**Castilla Agrícola**, con su propia cartografía de suertes/tablones y su propio
maestro agronómico. Castilla está en un área geográfica **separada** de Riopaila
(lat ~3,1–3,4 vs ~4,2–4,4); no es una capa que se superponga al mismo mapa, sino
un **universo cartográfico distinto**. Un usuario de campo pertenece a una sola
empresa y cambia de planta rara vez.

La cartografía de Castilla llegó como shapefile de ArcGIS
(`STES_AGRICOLAS_JUN_9_2026`): polígonos por tablón, WGS84, con el código de suerte
(`Suerte_Sap`) como atributo. Se convirtió en `public/data/tablones_castilla.*`
(2.445 tablones / 853 suertes) y su maestro
(`maestro_castilla.json`) cruza el **96 %** de las suertes (775 CAST + 46 CAUC; el
resto, geometría sin datos agronómicos aún).

## Decisión

Modelar la planta como **contexto/alcance**, no como una herramienta del mapa:

- **Selección en la entrada, persistida.** Un store
  (`lib/store/plantaStore.ts`, zustand-persist en `localStorage`) guarda la planta
  elegida. La primera vez se muestra `PlantaSelector`; al reabrir la app se entra
  directo a esa planta. Un flag `hydrated` evita parpadear el selector mientras se
  lee `localStorage`.
- **Cambio discreto en el header** (`PlantaSwitch`), no entre los FAB del mapa (que
  se mantienen despejados, estilo Avenza). Cambiar de planta es raro.
- **Carga solo lo de la planta activa.** Toda la configuración por planta vive en
  `lib/plantas.ts` (rutas de `tablones`/`catálogo`/`maestro` y encuadre `AOI`).
  `MapView`, `useCatalogo` y `useMaestro` leen del store y cargan ese dato; el SW
  cachea solo lo que se visita (cache-first sobre `/data/*`).
- **Reconstrucción al cambiar.** `MapScreen` va `key`-ada por planta: cambiar
  reconstruye el mapa y sus capas con la otra cartografía, sin estados residuales.
- **`tab_id` como PK real.** Un tablón partido en varios polígonos (mismo número)
  es **un** tablón (MultiPolygon, área sumada), no varios. En el insumo de Castilla
  ocurre 1 vez (suerte 2120-031, tablón 2).

A futuro, cuando el login tenga organización/rol, la planta saldrá del **perfil
del usuario** y la mayoría no verá el selector (queda para admins corporativos).

## Consecuencias

- Los e2e que prueban el mapa pre-seleccionan la planta en `localStorage`
  (`tests/e2e/setup.ts`) para entrar directo; un e2e nuevo cubre el selector.
- No se añaden dependencias: zustand-persist ya estaba en el proyecto.
- El generador `scripts/convertir_castilla.py` (Python puro, sin GDAL) y
  `scripts/convertir_maestro.py castilla` reproducen los datos desde el shapefile y
  el maestro.
- Descartados los insumos previos de Castilla: el GeoPDF (geometría sin llave
  fiable, ~44 %) y un shapefile de líneas sin atributos (solo `FID`).
