# ADR-0009 — Reporte diario de precipitación por pluviómetro

Fecha: 2026-06-25 · Estado: aceptado

## Contexto

Cada finca lee a diario sus pluviómetros (estaciones de lluvia con ID numérico,
ya presentes en `contexto_pluviometros.geojson` como `Pluviometr`). Se quiere que
los administradores registren esos milímetros en la app, que el dato se sincronice
y que **toda la empresa lo vea**. Debe funcionar offline en campo.

## Decisión

- **Unidad = pluviómetro.** La lectura es `(planta, pluviometro, fecha, mm)`. El ID
  del pluviómetro es la llave natural (ya existe en la cartografía), más preciso que
  reportar "por finca" y deja la puerta abierta a pintar Thiessen por lluvia del día.
- **Tabla nueva `precipitaciones`** (migración 0009) con el mismo patrón de
  marcadores/mediciones: soft delete, auditoría (`fn_audit`), `autor` por defecto
  `auth.uid()`.
- **RLS de lectura COMPARTIDA** (`select … using (true)`), a diferencia del
  aislamiento privado de marcadores/mediciones: la lluvia es dato operativo que todos
  necesitan ver. Escritura/edición sólo del propio autor
  (`insert/update … autor = auth.uid()`).
- **Offline-first con el outbox existente** (ADR-0004): zustand + persist +
  `pending[]`; `useSync` hace push (upsert idempotente por `id`) y pull de **todas**
  las lecturas. Reutiliza `createClient`, `useUser` y el patrón de panel RHF+zod.
- **Sin rol nuevo ni asignación usuario→finca:** cualquier autenticado puede
  registrar. Restringir a "su finca" exigiría construir esa asignación; se deja para
  después.

## Consecuencias

- Pueden coexistir varias lecturas para `(pluviometro, fecha)` de autores distintos.
  Se evita un `unique` duro (chocaría con la RLS por autor); la UI muestra las más
  recientes. Si se requiere una sola lectura oficial por día, se revisará luego.
- Mientras el usuario no aplique la migración 0009 (`supabase db push`), las lecturas
  quedan en el outbox local (el sync traga el error) y suben al aplicarla. Sin pérdida.
- Castilla no tiene pluviómetros cargados → el panel muestra estado vacío (correcto).

## Alternativas descartadas

- **Reporte por finca/hacienda:** más simple pero menos preciso y desligado de las
  estaciones físicas; se prefirió por pluviómetro.
- **RLS privada por autor (como marcadores):** rompería el objetivo de que toda la
  empresa vea la lluvia.
