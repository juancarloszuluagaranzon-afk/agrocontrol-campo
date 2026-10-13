# ADR-0036 — Mapa sin señal descargable y apertura con la sesión guardada

Fecha: 2026-10-11 · Estado: aceptado

## Contexto

Los técnicos dicen que Rio Map "no carga offline". Además de las recargas y el
GPS (ADR-0035), la revisión encontró:

1. **El satélite offline dependía de haber navegado la zona con señal.** Solo se
   guardaba lo visto, en un caché con tope de 3.000 teselas que se reemplazan.
   Riopaila necesita ~5.900 teselas para cubrir sus suertes hasta zoom 18 y
   Castilla ~9.300: nunca cabía todo, y lo visto la semana anterior podía no
   estar. Al acercar más allá de lo guardado (zoom 19) el fondo quedaba vacío.
2. **Las letras de las etiquetas** (glifos de `demotiles.maplibre.org`) caían en
   el caché genérico de Serwist (NetworkFirst, 1 h): sin señal, los rótulos
   desaparecían.
3. **Abrir sin señal con el token vencido**: `getSession()` intenta renovar el
   token, reintenta ~30 s y responde "sin sesión" aunque la sesión siga
   guardada. El técnico veía "Cargando…" y luego "Sin conexión y sin sesión
   guardada".

Avenza resuelve (1) con mapas descargados explícitamente. Ese es el estándar.

## Decisión

- **📥 Mapa sin señal** (herramienta del menú). Calcula las teselas Esri a partir
  de las suertes de la planta (`lib/geo/teselas.ts`): caja completa de la planta
  hasta zoom 14 y, de 15 a 18, solo alrededor de cada suerte con ~165 m de
  margen. Más los glifos de la fuente del mapa. La app las descarga
  (`lib/offline/mapaOffline.ts`, 6 a la vez, reintento, cancelable, reanudable
  porque salta lo ya guardado) a un caché propio `agrocontrol-mapa-offline`
  **sin tope ni expiración**, y pide `navigator.storage.persist()`.
- Las peticiones de descarga llevan `?riomap-descarga=1`; el service worker las
  deja pasar directo (NetworkOnly) para no duplicarlas en el caché al vuelo, y
  la app las guarda bajo la URL limpia, que es la que pide MapLibre. Esri acepta
  el parámetro y responde con CORS (`Access-Control-Allow-Origin: *`).
- **Service worker**, teselas Esri: 1) mapa descargado, 2) caché al vuelo / red
  (CacheFirst, como antes), 3) sin red, **tesela "madre" ampliada**: busca hasta
  5 zooms arriba y amplía el trozo correspondiente con `OffscreenCanvas`. Si el
  navegador no lo soporta, se comporta como antes.
- Glifos: mapa descargado primero y CacheFirst de 1 año (`agrocontrol-glifos`).
- **Sesión**: `lib/auth/usuarioGuardado.ts` guarda el último usuario (solo id,
  correo y nombre; ningún token). `useUser` lo muestra al instante y luego
  confirma con `getSession()`: con sesión → la usa; sin sesión **por falla de red**
  (`AuthRetryableFetchError`) → mantiene el guardado; sin sesión por otra causa →
  lo borra y se va a entrar. `INITIAL_SESSION` sin sesión se ignora (lo resuelve
  `getSession`); `SIGNED_OUT` y "Salir" lo borran.

## Consecuencias

- Una descarga por planta (~115–180 MB, con Wi-Fi) deja el satélite de todas las
  fincas disponible sin señal, sin depender de lo navegado.
- La imagen de Esri casi no cambia; "Completar" solo baja lo que falta. Para
  renovarla se borra y se descarga de nuevo.
- Mostrar el usuario guardado solo decide qué pantalla se ve: los datos del
  servidor siguen protegidos por RLS con el token real, y lo que se registre sin
  señal queda pendiente hasta que la sesión se renueve con red.
- Abrir desde el navegador interno de WhatsApp sigue sin service worker (no hay
  caché): se aborda aparte (aviso para abrir desde el ícono instalado).

## Alternativas descartadas

- **Subir el tope del caché al vuelo**: seguiría dependiendo de lo navegado y del
  orden de expiración.
- **Descargar desde el service worker** (mensaje): el navegador puede detener el
  SW a mitad de una descarga larga; desde la página se ve el progreso y se
  reanuda.
- **Bajar zoom 19**: ~22.000 teselas (~400 MB) solo en Riopaila. La tesela madre
  ampliada cubre ese zoom sin señal.
- **Limitar el mapa a zoom 18**: perdería detalle con señal.
