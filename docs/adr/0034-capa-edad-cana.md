# ADR-0034 — Capa "Edad de la caña" (suertes por rango de edad)

Fecha: 2026-10-03 · Estado: aceptado

## Contexto

El Jefe de Operaciones de Castilla pidió ver en el mapa las suertes agrupadas por
edad, un color por rango: menor a 4 meses, de 4 a 10 y mayor a 10. Sirve para
planear labores por etapa (control de malezas en caña joven, madurante y
cosecha en la mayor de 10) sin abrir suerte por suerte. Rio Map ya calcula la
edad en vivo con `edadSuerteMeses` (la misma de la ficha del maestro), así que
no hacen falta datos nuevos.

## Decisión

- Nueva capa de relleno `suertes-edad` sobre el relleno de suertes, oculta
  hasta encender **🗂️ Capas → Edad de la caña**. Su `fill-color` es un `match`
  por `sec_ste` que arma `expresionColorEdad()` desde el maestro de la planta
  activa; funciona igual en Riopaila y Castilla y sin conexión (el maestro ya
  está en caché).
- Lógica pura en `domain/maestro/edad.ts` (`rangoEdad`, `resumirEdades`), con
  tests. Rangos: **[0, 4)**, **[4, 10]** (4 y 10 meses inclusive en el medio) y
  **(10, ∞)**. Colores: verde claro, verde intenso y ámbar (caña próxima a
  cosecha).
- **Renovación y suertes sin fecha** de siembra ni corte van a un cuarto rango
  gris, "Renovación / sin dato", para no esconderlas dentro de "menor a 4".
  Lo que **no es caña** (arroz, semilla) queda sin color.
- Leyenda abajo a la derecha con suertes y hectáreas por rango, apilada con la
  escala de índices (ADR-0026) en un mismo contenedor para que no se encimen.
- Rangos **fijos**. Si Operaciones quiere otros cortes, se agrega un ajuste.

## Consecuencias

- La edad se recalcula a la fecha del dispositivo cada vez que se enciende la
  capa o cambia el maestro; se mantiene al día con el sync automático del
  maestro (ADR-0032).
- Riesgo: si el maestro trae una fecha de corte equivocada, la suerte cae en
  otro rango. Es el mismo dato de la ficha, así que el error se ve y se corrige
  en el maestro del ingenio.

## Adenda (2026-10-06) — filtrar por rango

A pedido del usuario, cada rango de la leyenda es un **interruptor** (`aria-pressed`):
solo se pintan los encendidos y los apagados quedan sin color, con su contorno.
Se pueden combinar (p. ej. solo "Mayor a 10 meses" para ver la caña próxima a
cosecha). Los conteos de suertes y hectáreas se ven siempre, aunque el rango esté
apagado. La selección vive en `mapStore.edadRangos` (no persistida: arranca con
los cuatro encendidos y se recuerda mientras la app siga abierta). Si se apagan
todos, la leyenda avisa "Ningún rango seleccionado". `expresionColorEdad()`
recibe los rangos activos y omite los apagados.

## Adenda (2026-10-06) — rango "para cosecha"

El usuario fijó que **la caña a cosechar es la de 11,8 meses o más**. El rango
"mayor a 10" se divide en dos: **de 10 a 11,8 meses** (más de 10 y menos de 11,8,
ámbar) y **para cosecha, 11,8 meses o más** (rojo). La comparación usa la edad
redondeada a un decimal, la misma que muestra la ficha: lo que la ficha dice
11,8 cae en "para cosecha". Quedan cinco rangos, todos filtrables. Las etiquetas
de la leyenda pasan a dos líneas en vez de truncarse.

## Adenda (2026-10-10) — filtro de índices por edad

Objetivo del usuario: filtrar, por ejemplo, la caña para cosecha y ver **solo en
esas suertes** un índice satelital (NDMI) para decidir a cuáles entrar. Con la
edad y un índice (Sentinel Hub o Sentinel-2 sin nubes) encendidos a la vez, la
capa entra en **modo índice**: `suertes-edad` deja de rellenar y pasa a **velo**
(`#0a0f1a`, opacidad 0,85) sobre todo lo que no está en un rango encendido
(`expresionVeloEdad`), y la nueva capa `suertes-edad-borde` dibuja el borde de
las suertes filtradas en el color de su rango. Sin índice, la capa vuelve al
relleno normal. La leyenda avisa "Índice visible solo en los rangos encendidos".

## Adenda (2026-10-10) — lluvia acumulada en las suertes filtradas

Para decidir si se puede entrar a cosechar, el NDMI (agua en hoja) no basta: lo
que manda es el suelo. Con la capa de edad encendida, la leyenda ofrece
**"Lluvia de los últimos 3 / 5 / 7 días"**: cada suerte de los rangos encendidos
muestra un rótulo "12 mm" con halo de color por nivel. Lógica pura en
`domain/precipitaciones/porSuerte.ts`:

- Cada suerte toma el pluviómetro cuyo **polígono de Thiessen** contiene su
  centro (promedio de los centros de sus tablones ponderado por área); si cae
  fuera de la red, el pluviómetro más cercano.
- Ventana que **termina ayer** (la lluvia se carga día vencido). Una lectura por
  día (la más reciente); "s/d" sin lecturas y asterisco si faltan días.
- Niveles **iniciales, a validar con Operaciones**: hasta 5 mm (verde), de 5 a
  15 mm (ámbar), más de 15 mm (azul). Constantes `LLUVIA_UMBRAL_*`.
- Solo Riopaila: Castilla aún no tiene red de pluviómetros en Rio Map; la
  leyenda lo indica.
