# ADR-0013 — Paginar la descarga en el sync de tablas compartidas

Fecha: 2026-07-07 · Estado: aceptado

## Contexto

El usuario reportó que, al elegir una fecha en la planilla de lluvia, los pluviómetros con
datos ya guardados aparecían vacíos ("mes 0 mm" incluso con meses de historial cargado). El
`flush()` de `useSync.ts` bajaba cada tabla compartida con `supabase.from(tabla).select("*")`,
sin paginar. PostgREST limita esa consulta a **1000 filas por defecto** (`max-rows`); con
varios pluviómetros × muchos días de historia, `precipitaciones` ya superaba ese límite, así
que las filas más allá del corte nunca llegaban al cliente — no era un problema de guardado
(los `INSERT` sí llegaban a Supabase), sino de **descarga silenciosamente truncada**.

## Decisión

- Se agrega `fetchAllRows()` en `lib/sync/syncManager.ts`: pagina con `.range(offset, offset +
999)` en un bucle hasta que una página devuelve menos de 1000 filas, y devuelve `null` si
  alguna página falla (mismo contrato que el `data` nulo que devolvía `.select("*")` en error).
- Se aplica a las **cuatro** descargas de `useSync.ts` (marcadores, mediciones, precipitaciones,
  lecturas_hidrologicas), no solo a las dos tablas compartidas que gatillaron el reporte:
  marcadores/mediciones son privadas por usuario hoy, pero nada impide que un usuario acumule
  más de 1000 filas propias con el tiempo.
- No se cambia el límite del lado de PostgREST (`db-max-rows` en la configuración de Supabase):
  paginar del lado del cliente es portable (no depende de configuración de proyecto) y ya sigue
  el mismo patrón `.range()` que usa Supabase-js para paginación estándar.

## Consecuencias

- Cada ciclo de sync (cada 20 s o al reconectar) ahora puede hacer varias peticiones por tabla
  si hay miles de filas, en vez de una sola. Aceptable: el intervalo ya es de 20 s y las
  peticiones son secuenciales dentro de `flush()`, no bloquean la UI.
- Verificado manualmente: antes del fix, `agrocontrol-precipitaciones` en `localStorage` tenía
  exactamente 1000 filas (el tope); después, 4226 (el total real), y los pluviómetros vuelven a
  mostrar su acumulado real del mes al elegir una fecha con historial.

## Alternativas descartadas

- **Subir `db-max-rows` en la configuración de Supabase**: resuelve el síntoma actual, pero deja
  el mismo techo (aunque más alto) para el próximo crecimiento de datos; requeriría acordarse de
  subirlo de nuevo. Paginar del lado del cliente no tiene techo.
- **Filtrar la descarga por rango de fechas** (p. ej. solo el mes visible): reduciría el
  volumen, pero rompe el acumulado "año" que ya usa la planilla y complica el offline-first (el
  técnico debe poder ver meses anteriores sin conexión). Paginar todo es más simple y ya
  resuelve el problema real.
