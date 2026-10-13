# ADR-0035 — Robustez en campo: sin recargas automáticas y GPS estable

Fecha: 2026-10-11 · Estado: aceptado

## Contexto

Los técnicos reportan que Rio Map "se reinicia", "no se ubica" y "tarda en
actualizar la ubicación" en campo, con señal intermitente. La razón de ser de
Rio Map es funcionar mejor que Avenza en esas condiciones. La revisión encontró:

1. `@serwist/next` registra el service worker con `reloadOnOnline: true` por
   defecto: **recarga la página en cada evento `online`**. Con señal que va y
   viene, la app se reiniciaba muchas veces; mapa al inicio, paneles cerrados y
   GPS apagado (`gpsActive` no se recordaba).
2. Tras cada recarga el GPS arranca en frío; sin datos móviles (sin A-GPS) el
   primer punto puede tardar minutos.

## Decisión (parte 1)

- `reloadOnOnline: false` en `next.config.ts`. La recarga no aporta: la app ya
  sincroniza sola al volver la señal (`useSync`, ADR-0033) y el SW nuevo se
  activa con `skipWaiting` + `clientsClaim`.
- `lib/geo/gpsPersistido.ts` recuerda en `localStorage` si el GPS y la brújula
  estaban encendidos. Al abrir, `GpsControl` los **reanuda solo si el permiso de
  ubicación ya está concedido** (`navigator.permissions`), sin pedir permisos
  fuera de un gesto del usuario. En iOS la brújula necesita gesto y queda
  apagada.

## Consecuencias

- Una nueva versión desplegada se aplica en la siguiente apertura, no a mitad de
  trabajo.
- El GPS queda encendido entre sesiones una vez que el técnico lo activa (como
  Avenza). No hay botón de apagado aún; si se pide, se agrega y limpia la marca.

## Decisión (parte 2) — GPS estable

- **Sin falsos errores**: solo el permiso denegado se muestra como error
  (`errorGpsDefinitivo`). "Sin posición" y "tiempo agotado" son transitorios y
  la app sigue en "Afinando ubicación…". Tiempo de espera de 30 s.
- **Arranque rápido**: además del seguimiento satelital se pide una posición
  aproximada reciente (Wi-Fi/celda o última conocida, hasta 2 min de vieja) para
  no dejar el mapa sin punto mientras el satélite converge.
- **Vigilante**: si pasan 30 s sin posición nueva, se reinicia el seguimiento; y
  se reinicia al volver a primer plano.
- **Pantalla encendida** mientras el GPS está activo (`useWakeLock`, Screen Wake
  Lock API): con la pantalla apagada el navegador pausa el GPS.
- **Modo "seguirme"** (`gpsSeguir`): el mapa acompaña cada posición nueva
  (`easeTo`, sin interrumpir vuelos en curso). Arrastrar el mapa lo desactiva;
  el botón muestra "Seguir mi ubicación" (borde azul) y al tocarlo vuelve a
  seguir (relleno azul).
- **Brújula liviana**: el cono se redibuja solo si cambió el rumbo (≥ 1°), la
  posición o el zoom (`necesitaRedibujoCono`), en vez de 60 veces por segundo.
- El punto GPS incluye `mapReady` en sus dependencias (gotcha de CLAUDE.md).
