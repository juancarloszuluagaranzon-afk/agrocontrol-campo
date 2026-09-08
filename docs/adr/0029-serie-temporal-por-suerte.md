# ADR-0029 — Serie temporal de índice por suerte (curva del ciclo)

Fecha: 2026-09-08 · Estado: aceptado

## Contexto

Las estadísticas por suerte (ADR-0027) devuelven **un** valor (media/mín/máx) de un período. Para
caracterizar el cultivo a lo largo del ciclo —y como insumo de un futuro modelo de **TCH**— hace falta la
**curva temporal**: NDVI/NDMI mes a mes desde el corte hasta la cosecha. La Statistical API ya sabe hacerlo
nativamente: con `aggregationInterval.of` menor que el período, devuelve **un punto por intervalo**.

Extraer la curva llamando N veces al endpoint de un solo intervalo (una por mes) multiplica por ~12 las
llamadas y la presión de rate-limit. Conviene obtener la serie **en una sola petición**.

## Decisión

- `statsBody` acepta un parámetro opcional **`interval`** (`"P30D"`, etc.). Sin él, sigue el comportamiento
  de ADR-0027 (un solo intervalo del período). Con él, la Statistical API devuelve la serie.
- Nuevo `parseStatsSeries(json)` → `[{ from, to, stats | null }]`: un punto por intervalo, **conservando los
  huecos** (`stats: null` cuando el intervalo cayó todo-nube tras el enmascaramiento SCL de ADR-0028) para no
  falsear la curva. Comparte con `parseStats` el helper `intervalStats` (misma lógica de media finita).
- La ruta `/api/sentinel-stats` acepta **`?interval=P<n>D`**: con él responde `{ series: [...] }`; sin él,
  `{ stats: {...} }` como antes. Retrocompatible.

## Consecuencias

- La curva de un índice por suerte se obtiene en **una** llamada (no ~12) → extracción masiva viable para el
  dataset de entrenamiento del modelo TCH.
- Reutilizable por el app: habilita una futura **mini-gráfica de curva** por suerte en el panel (eje "edad de
  la caña"), sin lógica nueva de red.
- Los huecos por nube quedan explícitos (`null`); el consumidor decide si interpola (para modelar) o los deja
  como gaps (para visualizar).

## Riesgos

- Una serie sobre un ciclo (~12 intervalos) es una petición más pesada que un solo intervalo: conviene
  llamarla **secuencialmente** en extracciones masivas (la concurrencia dispara timeouts de la función
  serverless y rate-limits de CDSE).
- En época lluviosa (La Niña) muchos intervalos vienen `null`; la curva puede quedar rala. Para un modelo,
  eso se maneja con features robustas a huecos (pico, integral, interpolación) y, a futuro, con Sentinel-1 SAR.
