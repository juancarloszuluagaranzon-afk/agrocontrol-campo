# ADR-0033 — Sincronización incremental por `updated_at` (egress bajo control)

Fecha: 2026-09-25 · Estado: aceptado

## Contexto

Supabase restringió el proyecto por agotar la cuota de **egress** del plan Free
(5,82 GB de 5 GB en el ciclo) con una base de solo 56 MB. La causa estaba en
`useSync`: cada **20 s**, con la app abierta, bajaba **completas** las tablas
compartidas (marcadores, mediciones, precipitaciones, lecturas hidrológicas,
encuesta) con `select("*")` paginado. Eso lo introdujo el ADR-0013 (paginar
para no truncar en 1.000 filas), correcto para aquel bug pero convertido en una
copia total de la base tres veces por minuto. Con ~10.000 lecturas de lluvia
(2 a 3 MB por descarga) y 88 usuarios activos, un solo técnico con la app
abierta dos horas al día generaba varios GB al mes. Además, la ingestión de
logs iba en 0,79 GB de 1 GB por el volumen de peticiones.

## Decisión

- **Descarga incremental.** Nueva `fetchRowsSince()` en `lib/sync/syncManager.ts`:
  filtra `updated_at >= cursor`, ordena por `updated_at, id` y pagina. El
  **cursor por tabla** (mayor `updated_at` recibido) se persiste en el nuevo
  `lib/store/syncStore.ts`. Sin cursor (primer uso del dispositivo o cambio de
  usuario) se baja el conjunto completo y se **reemplaza**; con cursor se
  **fusiona por id** sobre la caché local (`fusionarRemoto`, en
  `lib/sync/incremental.ts`, puro y testeado). Un pendiente local siempre gana
  sobre su versión remota; los borrados lógicos llegan como filas con
  `deleted: true`. Al reanudar se resta un **solape de 5 s** al cursor para no
  perder filas con el mismo instante; las repetidas son inocuas.
- **Ventana de precipitaciones.** Solo se baja y conserva desde el **1 de enero
  del año en curso**, o los últimos **60 días** si eso es anterior (la planilla
  "día vencido" del 1 de enero necesita diciembre). El histórico completo
  sigue en Supabase (reporte XLSX y análisis leen de allá si hace falta); la
  caché del móvil (localStorage, ~5 MB de tope) deja de crecer sin límite.
- **Menos ciclos.** Intervalo de **60 s** (antes 20 s) y **pausa en segundo
  plano**: `flush()` no corre con `document.visibilityState === "hidden"` y se
  reanuda con `visibilitychange`, además de `online` y del intervalo.
- `encuesta_satisfaccion` no tiene `updated_at` y RLS la limita a una fila:
  sigue con descarga completa.

## Consecuencias

- Tráfico por ciclo: de megas a bytes (solo lo cambiado). La primera
  sincronización de cada dispositivo sigue siendo completa (una vez).
- Peticiones por hora por dispositivo: de ~900 a ~300 con la app en primer
  plano, cero en segundo plano.
- Un cambio hecho directamente en la base **sin tocar `updated_at`** no se
  propaga hasta que el dispositivo reinicie cursores (`useSyncStore.reiniciar()`
  o borrar el almacenamiento del sitio). Las cargas oficiales por SQL fijan
  `updated_at`, así que sí llegan.
- Riesgo residual: filas cuyo `updated_at` quede en el futuro (reloj de un
  dispositivo adelantado) adelantan el cursor y podrían ocultar cambios
  intermedios hasta el solape. Aceptado: el servidor fija `updated_at` en las
  cargas oficiales y el impacto es acotado.

## Alternativas descartadas

- **Solo alargar el intervalo**: reduce el problema linealmente, no lo resuelve;
  la copia completa sigue siendo la unidad de trabajo.
- **Realtime de Supabase**: menos tráfico aún, pero añade websockets abiertos
  desde el campo con señal intermitente y un canal más que mantener offline.
- **Pasar a Pro** sin cambiar el código: 250 GB de egress absorben el
  desperdicio, pero el gasto crece con cada usuario y cada mes de lluvia.
