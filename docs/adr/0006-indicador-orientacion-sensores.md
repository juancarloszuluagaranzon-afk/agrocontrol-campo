# ADR-0006 — Indicador de orientación con sensores del dispositivo

- Estado: **Aceptada**
- Fecha: 2026-06-05

## Contexto

Los usuarios pidieron un indicador de orientación tipo Avenza Maps: además del
punto azul de ubicación, un **cono** que muestre hacia dónde apunta el teléfono y
que rote en tiempo real al girarlo. El `heading` del GPS (`watchPosition`) solo es
fiable en movimiento y se anula al estar quieto, así que no sirve como brújula.

## Decisión

Usar la **orientación del dispositivo** (magnetómetro + acelerómetro) vía
`DeviceOrientationEvent`:

- **Lectura del rumbo** (`lib/geo/orientation.ts`, pura y testeada):
  - iOS Safari: `webkitCompassHeading` (ya compensado, 0=N horario).
  - Estándar Android: evento `deviceorientationabsolute`, `alpha` antihorario →
    rumbo = `360 − alpha + ánguloPantalla`.
- **Permiso**: en iOS 13+ `DeviceOrientationEvent.requestPermission()` debe
  llamarse dentro de un gesto del usuario → se solicita en el click de
  "Mi ubicación" (`requestOrientationPermission`).
- **Render** (`MapView`): capa de relleno con un sector geográfico de ~60° cuyo
  vértice es la ubicación; un bucle `requestAnimationFrame` interpola el rumbo por
  el **camino corto** (sin saltos en 0/360) y redibuja a ~60 fps. El radio se
  calcula en metros desde un tamaño en píxeles y el zoom (tamaño en pantalla
  constante).
- **Calibración**: si `webkitCompassAccuracy` es negativa o > 20° se muestra un
  aviso para mover el teléfono en forma de 8.

## Consecuencias

- Requiere **HTTPS** (igual que la geolocalización) y, en iOS, un toque para
  conceder permiso. En escritorio/sin magnetómetro simplemente no aparece el cono.
- La geometría y el suavizado son deterministas y con tests unitarios; el contacto
  con los sensores se aísla en `useDeviceHeading` y solo se valida en dispositivo
  real (el entorno headless de CI no tiene brújula).
- No se añaden dependencias: todo con APIs del navegador + MapLibre.
