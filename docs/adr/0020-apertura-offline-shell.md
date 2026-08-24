# ADR-0020 — Apertura offline: shell precacheado + fallback de navegación

Fecha: 2026-08-07 · Estado: aceptado

## Contexto

En campo, sin señal, **Rio Map no abría** (pantalla en blanco / error de conexión), mientras Avenza
(nativa) abre, muestra el mapa descargado y el GPS funciona. Es una PWA de terreno: **tiene** que
abrir offline.

Causa raíz (confirmada leyendo `public/sw.js` compilado y la API de Serwist 9): el service worker
precachea los chunks `/_next/static/**` y `public/**` (`/data/*.json`, `/icons`, `/pdf`), pero
**nunca precachea un documento HTML de App Router**. Las navegaciones las servía `defaultCache` con
**NetworkFirst**: offline solo había documento si se visitó antes con red, y era **frágil entre
despliegues** (un HTML viejo cacheado referencia chunks que el nuevo precache ya purgó → arranca
roto). No había página de respaldo offline. Auth no era el problema (`getSession()` es local); datos
y tiles ya eran CacheFirst; el GPS es API nativa. El único bloqueo era abrir el documento/shell.

## Decisión

- **Shell offline precacheado** `app/~offline/page.tsx` (estático, `dynamic = "force-static"`),
  **fuera de `(tabs)`** para no heredar `AuthGate`. Monta `<MapScreen/>` directamente confiando en
  la **sesión y planta persistidas** (no depende de Supabase, que no autentica offline, ni rebota a
  `/login`). Comparte el grafo de chunks de `/mapa`, así que arranca desde el precache y es
  **consistente con el build**; se reprecachea con nueva revisión en cada despliegue (purga la vieja).
- **Precache vía `manifestTransforms`** en `next.config.ts` (no `additionalPrecacheEntries`, que
  desactiva el escaneo de `public/**` y perdería el precache de `/data/*.json`). Revisión = hash del
  build (o la hora como respaldo) para reprecachear tras cada deploy.
- **Ruta de navegación `NetworkOnly`** en `app/sw.ts`, **antes** de `defaultCache`: con señal el
  documento va siempre a la red (recibe el último deploy); sin señal falla y dispara el fallback.
  Necesario porque el NetworkFirst de `defaultCache` devolvería un HTML **viejo** (éxito) y el
  fallback nunca entraría.
- **`fallbacks`** de Serwist con `{ url: "/~offline", matcher: request.destination === "document" }`:
  ante error de una navegación de documento, sirve el shell precacheado.
- **`AuthGate` no redirige a `/login` si `navigator.onLine === false`** (defensa en profundidad para
  la ruta normal `/mapa` si estuviera cacheada): confía en la sesión persistida; si no hay sesión y
  no hay señal, muestra un aviso en vez de pantalla en blanco.

## Consecuencias

- La app **abre y funciona offline**: shell + chunks del precache, datos `/data` y tiles Esri ya
  cacheados, y GPS nativo. Sobrevive redeploys (shell y chunks versionados juntos).
- Online las navegaciones van por red (NetworkOnly) → documento siempre fresco; se renuncia al
  "app-shell instantáneo" online, a cambio de simplicidad y de no servir shell viejo.
- El satélite offline sigue limitado a lo ya navegado con señal (se cachea al vuelo). "Descargar
  zona" (pre-bajar tiles de un área) queda como mejora futura aparte.
- `navigationPreload` se mantiene en `true` (offline el preload falla y se sigue al fallback; efecto
  solo cosmético: un warning de "preload no usado" en la ruta NetworkOnly).

## Alternativas descartadas

- **`additionalPrecacheEntries`** para el shell: desactiva el escaneo de `public/**` → regresión
  (perdería el precache de `/data/*.json`).
- **Solo `fallbacks`** sin la ruta `NetworkOnly`: no basta, porque el NetworkFirst de `defaultCache`
  devuelve HTML viejo (éxito) y el fallback no se dispara.
- **Precachear `/mapa` y `/`**: reintroduce el riesgo de `AuthGate → /login` offline; el único
  `/~offline` atiende toda navegación de documento sin red.
