# Working agreement — AgroControl Campo

Resumen operativo (§17 del documento maestro). El contrato completo es
`CONTEXTO_PROYECTO_1.md`; ante conflicto, prevalece ese documento.

## Reglas

- **Incrementos pequeños y verificables.** Un PR por funcionalidad.
- **Tests junto al código**, no después. No marcar hecho sin
  `typecheck + lint + test` en verde. Cobertura de la capa de dominio ≥ 80 %.
- **TypeScript `strict`.** Cero `any` sin justificación comentada. Sin `@ts-ignore`
  salvo ADR.
- **Validación en los bordes con Zod** (GeoJSON, formularios, entorno, API).
- **No introducir dependencias** sin justificarlas (ADR si es estructural).
- **No borrar/reescribir** módulos existentes sin explicar el porqué en el PR.
- Ante ambigüedad, **preguntar antes de asumir**; documentar la decisión (ADR).
- Mantener `README.md`, `CHANGELOG.md` y los ADR al día.
- **Nunca subir secretos.** Usar `.env.example`.

## Comandos clave

```bash
pnpm dev            # desarrollo
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint (cero warnings)
pnpm test           # vitest
pnpm build          # build de producción (webpack + SW)
```

## Convenciones

- **Commits:** Conventional Commits (los valida commitlint en `commit-msg`).
- **Idioma:** UI en español (Colombia); textos centralizados en `lib/i18n`.
- **Formato:** hectáreas con 3 decimales, metros enteros, coma decimal en la UI.
- **Capas:** las suertes se renderizan como **una** capa MapLibre (no 610).

## Fases

0 Cimientos ✓ · 1 Mapa de suertes · 2 GPS y medición · 3 Maquinaria ·
4 Persistencia y offline · 5 Endurecimiento. Detalle y DoD en el documento maestro.

## Gotchas

- **El preview headless de este entorno nunca dispara `map.on("load")` de
  MapLibre** (sin acceso real a los tiles de Esri, el evento `load` no
  completa) — cualquier `useEffect` que dependa de `mapReady` nunca corre ahí,
  y los screenshots del preview se cuelgan. Verificar cambios de mapa con
  `pnpm test:e2e` (Playwright, Chromium real), no con el preview del chat.
  Nota: Playwright y el preview no pueden correr `next dev` a la vez sobre el
  mismo proyecto (mismo lockfile de `.next/`) — detener uno antes del otro.
- **Todo `useEffect` que lea/escriba capas de MapLibre debe incluir `mapReady`
  en sus dependencias**, no solo comprobarlo al inicio de otro efecto. Si el
  usuario interactúa (cambia de modo, etc.) antes de que `map.on("load")`
  termine de montar las capas, un efecto sin `mapReady` en sus deps corta en
  silencio y **nunca se reintenta** cuando el mapa por fin esté listo (pasó
  con el efecto de `baseMode` en `MapView.tsx`, ADR-0014).
- **La consola del preview de este chat acumula mensajes de TODA la sesión**,
  incluso entre recargas de la misma pestaña — un error viejo (de una edición
  ya corregida) puede seguir apareciendo indefinidamente. Abrir una pestaña
  nueva (`tabs_create`) para una lectura de consola confiable.
- **`querySourceFeatures()` de MapLibre puede devolver features duplicadas**
  (repite las que caen en el borde de tiles internos) — deduplicar por alguna
  propiedad propia antes de contar, no comparar el `.length` crudo.
