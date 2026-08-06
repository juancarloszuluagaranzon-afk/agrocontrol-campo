# ADR-0019 — Maestro de suertes nativo dentro de Rio Map

Fecha: 2026-08-06 · Estado: aceptado

## Contexto

Los técnicos de Riopaila y Castilla consultan el **Maestro de Suertes** en una PWA aparte
(`maestro-riopaila`). Se pidió traer esa consulta **dentro de Rio Map**, con aspecto **nativo** de
la app, aprovechando que Rio Map ya tiene los mismos datos del maestro y el mapa para "ir a la
suerte".

## Decisión

- **Entrada en el menú de Herramientas** (`ToolsMenu`, el único "menú" de la app), no una ruta ni
  una barra de navegación nueva. Abre un **panel a pantalla completa** con el mismo idioma que
  "Reporte de lluvia" (`activeTool === "maestro"` en `MapScreen`). Decisión del usuario.
- **Consulta nativa, no tabla densa**: buscar por suerte/hacienda → lista → ficha con toda la
  agronomía + botón **"Ver en el mapa"**. Se descartó replicar la tabla del sitio externo (columnas,
  orden, filtros por columna, ZQM): no encaja en una app de campo móvil. Decisión del usuario.
- **Reutilizar datos y lógica existentes** (sin duplicar ni añadir dependencias):
  - `useMaestro()` (agronomía por `sec_ste`) y `useCatalogo()` (suertes con punto lat/lon), ambos
    **planta-aware**.
  - `useMapStore().flyTo({ lon, lat, tabId })` (el mismo que usa el buscador `SearchBox`) para "Ver
    en el mapa"; luego `setActiveTool("none")` cierra el panel.
  - `edadSuerteMeses()` para la edad viva; el estilo de ficha de `SuertePanel`.
- **La lista se arma del catálogo** (una entrada por tablón), agrupado por suerte con
  `agruparSuertes()` (dominio puro): así **toda suerte listada tiene geometría y es ubicable** en el
  mapa. `buscarSuertes()` replica la normalización/prioridad del buscador (código sobre hacienda).
- **Acotado a la planta activa**, como el resto de Rio Map; cambiar de planta cambia el universo.

## Consecuencias

- Suertes que estén en el maestro pero **sin geometría** no aparecen en la lista (no serían
  ubicables). Es consistente con el resto de la app, que trabaja sobre el catálogo/tablones.
- Lógica de consulta en `domain/maestro/consulta.ts` (pura, testeada): agrupar y buscar.
- Sin dependencias nuevas; el panel calca patrones de `ReporteLluviaControl` (contenedor) y
  `SuertePanel` (ficha), y el flujo se cubre con un test e2e (el `flyTo` depende de `map.on("load")`,
  que el preview headless no dispara).

## Alternativas descartadas

- **Iframe del sitio externo** (`maestro-riopaila`): rápido pero no "nativo", con otra estética,
  otra sesión y sin integración con el mapa (no podría "ver en el mapa").
- **Ruta propia + navegación en la cabecera**: introduce navegación de cabecera que la app (de una
  sola sección) no tiene hoy; el usuario prefirió la entrada en Herramientas.
- **Tabla completa estilo el sitio externo**: densa y poco usable en celular de campo.
