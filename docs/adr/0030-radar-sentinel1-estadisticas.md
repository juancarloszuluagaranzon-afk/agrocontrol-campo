# ADR-0030 — Radar Sentinel-1 en las estadísticas por suerte (curva que no pierde la nube)

Fecha: 2026-09-08 · Estado: aceptado

## Contexto

El techo del modelo de TCH con óptico (Sentinel-2) es la **nube**: en el Valle, y peor en años La Niña,
se pierden meses enteros de curva NDVI/NDMI/EVI aun con enmascaramiento SCL (ADR-0028). El **radar
Sentinel-1** atraviesa la nube y adquiere cada ~6–12 días sin importar el clima → una **serie densa y sin
huecos**, complementaria del óptico. El backscatter (VV/VH) y el RVI se relacionan con la biomasa y la
estructura del dosel.

## Decisión

- Ampliar los helpers de estadísticas (`lib/geo/sentinelStats.ts`) para admitir **índices de radar**
  `SAR_INDEXES = ["VV","VH","RVI"]` además de los ópticos. `isSarIndex` los distingue.
- **Evalscript SAR** propio: VV/VH en **dB** (`10·log10`, con guarda anti −∞) y **RVI = 4·VH/(VV+VH)**;
  salida FLOAT32 + `dataMask` (disponibilidad; el radar no tiene nubes → sin SCL ni `maxCloudCoverage`).
- `statsBody` ramifica la fuente: radar usa `sentinel-1-grd` con `dataFilter {acquisitionMode:"IW",
polarization:"DV"}` y `processing {orthorectify:true, backCoeff:"GAMMA0_TERRAIN"}` (backscatter
  comparable en relieve); óptico sigue igual. Reutiliza reproyección a 3857, `interval` (serie temporal,
  ADR-0029) y el parseo (`parseStats`/`parseStatsSeries`).
- La ruta `/api/sentinel-stats` no cambia: ya validaba con `isStatIndex`, que ahora acepta los de radar.

## Consecuencias

- Se puede pedir la **curva de radar por suerte** (`?index=VV&interval=P30D`) igual que la óptica, en una
  llamada, sin huecos por nube. Habilita features SAR para el modelo de TCH (etapa 3) y, a futuro, una capa
  de radar en el mapa.
- No añade dependencias ni cambia el comportamiento óptico existente (retrocompatible).

## Riesgos

- Mezclar órbitas ascendente/descendente introduce algo de variación de backscatter; para la media mensual
  se promedia. Si resultara ruidoso, se puede fijar `orbitDirection` (a costa de menos observaciones).
- GAMMA0 orto-rectificado depende del DEM; suficiente para la media zonal de un tablón.
