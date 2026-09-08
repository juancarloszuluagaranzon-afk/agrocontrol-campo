# ADR-0028 — Enmascaramiento de nubes por píxel (SCL) en las estadísticas por suerte

Fecha: 2026-09-08 · Estado: aceptado

## Contexto

Las estadísticas por suerte (ADR-0027) calculaban la media/mín/máx del índice admitiendo escenas con
`maxCloudCoverage = 20 %` y excluyendo del cálculo solo los píxeles **sin dato** (`dataMask`). En el Valle
del Cauca —muy nublado, peor en años **La Niña**— esto tiene dos problemas:

- **Ventanas vacías (`null`)**: si ninguna escena del período baja del 20 % de nube, no entra ninguna →
  "sin dato (nubes)" con más frecuencia de la necesaria. Al probar **curvas temporales por suerte** (ventanas
  de fase de 60–90 días para un futuro modelo de TCH), solo **10 de 42** suertes conseguían una ventana con
  dato; el resto caía en época lluviosa.
- **Media sesgada**: cuando sí había escena, sus píxeles de **nube no se descartaban** (solo los "sin dato"),
  así que la media podía estar contaminada hacia abajo (NDVI) o arriba (reflectancia).

## Decisión

- **Máscara de nubes por píxel con la Scene Classification Layer (SCL)** de Sentinel-2 L2A. El evalscript de
  estadísticas (`statEvalscript`) añade `SCL` a la entrada y pone `dataMask = 0` en los píxeles de
  **nube/sombra/cirro/nieve** (SCL ∈ {0,1,3,8,9,10,11}), que quedan así **fuera** de la estadística.
- **Subir la nubosidad de escena admitida** a `maxCloudCoverage = 60 %` por defecto (antes 20). Con la
  máscara SCL descartando la nube píxel a píxel, admitir escenas más nubladas **suma píxeles limpios** sin
  sesgar la media. La ruta `/api/sentinel-stats` acepta además `?maxcc=` (0–100) para afinar.

## Consecuencias

- Muchas más ventanas devuelven dato (menos "sin dato (nubes)") y la media refleja **solo suelo/vegetación
  despejados**, no nube. Mejora tanto el panel 📊 en vivo como la extracción de features satelitales para
  análisis de TCH.
- Cambio **retrocompatible** en la interfaz de la ruta (nuevo parámetro opcional; el resto igual). Los helpers
  siguen siendo puros y testeados (`statEvalscript` incluye SCL; `statsBody` propaga `maxcc`).
- Sin coste nuevo relevante: es el mismo número de llamadas a la Statistical API; solo cambia el evalscript y
  el filtro de nubosidad.

## Riesgos

- La SCL de Sen2Cor no es perfecta (puede dejar pasar bruma fina o marcar de más en bordes). Para la media
  zonal de un tablón es suficiente; para un modelo se puede endurecer (excluir también SCL 2 "dark area" o
  usar probabilidad de nube) sin cambiar la arquitectura.
- Subir `maxcc` a 60 admite escenas con más nube: si en una ventana **toda** la escena está nublada sobre el
  tablón, seguirá devolviendo `null` (correcto: no hay píxel limpio que promediar).
