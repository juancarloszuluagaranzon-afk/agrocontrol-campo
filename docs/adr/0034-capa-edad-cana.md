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
