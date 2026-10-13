# ADR-0038 — Brújula visible y mapa que gira con el celular

Fecha: 2026-10-13 · Estado: aceptado

## Contexto

Rio Map es para ubicarse en campo, y los técnicos dicen que "no tiene brújula
visible". La única brújula era el cono de orientación alrededor del punto GPS
(ADR-0006). Solo aparece con el GPS encendido y el permiso de orientación
concedido. En iPhone ese permiso se pide al tocar el GPS, y si se negaba no había
forma de volver a pedirlo. Además, el control de zoom se creó con
`showCompass: false`: el mapa se podía girar con dos dedos sin querer y no había
cómo volver a poner el norte arriba.

## Decisión

- **Botón 🧭 siempre visible** (`BrujulaControl`, arriba a la derecha, bajo el
  zoom). La aguja roja apunta al norte y gira con el mapa (`mapBearing`, desde el
  evento `rotate`).
- **Tres orientaciones** (`orientacion` en `mapStore`):
  - `norte`: norte arriba.
  - `rumbo`: el mapa gira con el celular, para que lo que el técnico tiene al
    frente quede arriba (como en Google Maps o Avenza).
  - `libre`: el técnico lo giró con dos dedos. `rotatestart` con
    `originalEvent` lo detecta.
- **Ciclo del toque** (`siguienteOrientacion`): un mapa girado o en `rumbo`
  vuelve a `norte`; desde `norte` pasa a `rumbo`. Cada pedido de norte incrementa
  `norteNonce`, para enderezar el mapa aunque ya estuviera en `norte`.
- En `rumbo`, un bucle `requestAnimationFrame` lleva el giro del mapa al rumbo
  del celular por el camino corto y suavizado, y no pisa un movimiento en curso.
  El modo seguirme incluye el rumbo en su mismo `easeTo`.
- Si se pide `rumbo` sin brújula activa, `activarBrujula()` pide el permiso
  dentro del toque (requisito de iOS). Si se niega, aparece un aviso. Si en 3 s no
  llega ningún rumbo (equipo sin magnetómetro), se avisa y se vuelve a `norte`.
- **Rumbo en texto** junto a la precisión del GPS: "🧭 NE 45°" (`textoRumbo`,
  8 puntos cardinales en español).
- Con el GPS encendido y la brújula apagada (permiso negado o nunca pedido),
  aparece el botón "🧭 Activar brújula".
- El efecto del cono incluye `mapReady` en sus dependencias (gotcha de
  CLAUDE.md).

## Consecuencias

- La brújula se ve siempre, con o sin GPS, y un toque endereza un mapa girado
  sin querer.
- El modo `rumbo` depende de la calibración del magnetómetro: se mantiene el
  aviso "Calibra la brújula" de ADR-0006.
- No se usa la brújula del `NavigationControl` de MapLibre: no permite el ciclo
  norte ↔ rumbo ni pedir el permiso de iOS dentro del toque.
