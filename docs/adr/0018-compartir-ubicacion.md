# ADR-0018 — Compartir marcador/medición por WhatsApp (deep-link a Rio Map)

Fecha: 2026-07-30 · Estado: aceptado

## Contexto

Los técnicos quieren compartir la ubicación de un **marcador** o una **medición guardada** por
WhatsApp, para que otro técnico llegue al mismo punto. Se pidió que el mensaje lleve un **link con
el primer punto de referencia**.

## Decisión

- **Link que abre Rio Map en el punto** (no un link de Google Maps): decisión del usuario. Es uso
  interno entre técnicos, que ya tienen la app (Rio Map exige login). El link es
  `${origin}/mapa?p=<planta>&lat=<lat>&lon=<lon>&n=<nombre>`.
- **Se incluye la planta en el link** (`p`): los marcadores/mediciones no guardan planta, pero
  quien comparte está en una; así el receptor cae en la cartografía correcta aunque su planta
  persistida sea la otra.
- **Primer punto de referencia, no el centroide**: para una medición se toma el primer vértice
  (`geom.coordinates[0]` en línea / `[0][0]` en polígono), no el `lat`/`lon` (que es el centroide).
  Función pura `primerPuntoMedicion()` en `lib/share/ubicacion.ts`.
- **Hoja de compartir del sistema** (`navigator.share({ title, text, url })`), igual patrón que
  "Foto de campo": el técnico elige WhatsApp u otra app. Fallbacks: abrir WhatsApp Web
  (`wa.me/?text=`) o copiar al portapapeles. Se ignora `AbortError` (el usuario cerró la hoja).
- **Receptor del deep-link**: `MapScreen` lee `?p=` y cambia de planta si hace falta (antes de
  montar el mapa); `MapView`, cuando el mapa está listo, lee `?lat&lon&n`, vuela al punto y muestra
  un **pin efímero verde** con el nombre; luego **limpia la URL** (`history.replaceState`) para que
  un refresh no re-dispare ni deje el pin pegado.

## Consecuencias

- El receptor necesita cuenta: si no la tiene, el link lo lleva al login. Aceptable para el uso
  interno.
- Abrir el link puede **cambiar la planta activa** del receptor (si el punto es de la otra
  empresa) — comportamiento correcto para ver el punto.
- Funciones puras testeadas (`tests/unit/compartir.test.ts`): extracción del primer punto, armado
  del link, mensaje.

## Alternativas descartadas

- **Link de Google Maps** (`maps.google.com/?q=lat,lon`): universal y sin login, pero el usuario
  prefirió que el link abra Rio Map (contexto del ingenio, capas propias).
- **Botón directo a WhatsApp** (`wa.me`) como acción primaria: se prefiere la hoja del sistema
  (permite elegir otra app); `wa.me` queda solo como fallback.
- **Compartir el centroide de la medición**: el usuario pidió el **primer** punto de referencia.
