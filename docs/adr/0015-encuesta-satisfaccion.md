# ADR-0015 — Encuesta de satisfacción (popup obligatorio de 5 estrellas)

Fecha: 2026-07-24 · Estado: aceptado

## Contexto

La app ya la usan más de 50 personas y el usuario quiere medir el nivel de satisfacción.
Decisión de producto: un popup de calificación de 1 a 5 estrellas + comentario opcional, que se
muestra **una sola vez por usuario** y es **obligatorio** (sin botón de "ahora no"/cerrar) — no
se puede seguir usando la app sin calificar primero.

## Decisión

- **Se reutiliza el patrón outbox** (`items`/`pending` en un store zustand-persist, subido por
  `syncManager.ts`/`useSync.ts`) igual que marcadores/mediciones/lluvia/hidrología, aunque sea un
  evento de una sola vez: mantiene la arquitectura consistente y funciona sin conexión (un
  técnico puede estar calificando desde el campo sin señal).
- **Tabla nueva `encuesta_satisfaccion`, RLS privada** (como `marcadores`), no compartida como
  `precipitaciones`/`lecturas_hidrologicas`: una calificación no la necesita ver nadie más que el
  propio autor. Índice único en `user_id` además de forzarlo en el cliente (defensa en
  profundidad: si dos dispositivos del mismo usuario intentan crear una respuesta antes de
  sincronizar, la BD lo impide igual).
- **Sin mecanismo especial de "¿ya respondí?"**: como el pull normal de `useSync` ya queda
  filtrado por RLS a "solo mi propia fila", basta con `items.length > 0` — local (cacheado por el
  propio `persist` de zustand) o confirmado por Supabase en el primer sync si el usuario entra
  desde otro dispositivo. Se agrega `hydratedFromServer` (no persistido) al store, puesto en
  `true` en el `finally` de `flush()` (éxito, fallo de red, o e2e-skip), para que el popup nunca
  "parpadee" antes de que el primer intento de sync haya terminado.
- **Violación del índice único tratada como éxito**: si el `upsert` falla con `23505` (carrera
  entre dos dispositivos del mismo usuario), se limpia igual de `pending` en vez de reintentar
  para siempre — ya hay una respuesta guardada, que es justamente el objetivo.
- **Primer modal verdadero del proyecto**: no existía `<dialog>` ni librería de diálogo (el
  README menciona shadcn/ui de forma aspiracional, sin uso real). Se implementa con Tailwind puro
  (overlay `fixed inset-0` + tarjeta centrada, `role="dialog" aria-modal="true"`), sin agregar
  dependencias.
- **Montado en `app/(tabs)/layout.tsx`**, no dentro de `MapScreen.tsx`: es el único layout
  compartido por todas las pantallas autenticadas; `MapScreen` se remonta por `key={planta}` y
  reiniciaría el estado si el popup viviera ahí. Con `z-50` aparece incluso por encima del
  selector de planta — correcto, la encuesta es sobre la app en general, no por planta.

## Consecuencias

- Bajo `NEXT_PUBLIC_E2E=1`, `flush()` retorna antes del `try` (`if (E2E || !user) return`), así
  que `hydratedFromServer` nunca pasa a `true` y el popup nunca se muestra en los tests e2e
  existentes, sin necesidad de ningún caso especial en el componente.
- No hay vista in-app para ver el agregado de respuestas — se revisa en el Table Editor de
  Supabase. Un panel de resumen dentro de la app, si hace falta, es una entrega aparte.
- Requiere que el usuario aplique la migración `0011_encuesta_satisfaccion.sql` en el SQL Editor
  de Supabase.

## Alternativas descartadas

- **INSERT directo sin outbox**: más simple, pero rompe la consistencia arquitectónica (todas las
  tablas de escritura de usuario pasan por outbox) y perdería la respuesta si el usuario contesta
  sin conexión.
- **RLS compartida (select `using(true)`)**: no hace falta que otros usuarios vean calificaciones
  ajenas.
- **Botón "ahora no" / cadencia periódica**: decisión explícita del usuario descartarlos por
  ahora — obligatorio, una sola vez.
