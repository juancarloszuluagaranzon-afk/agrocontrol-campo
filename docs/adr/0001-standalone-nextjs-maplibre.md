# ADR-0001 — Proyecto standalone con Next.js (App Router) y MapLibre

- Estado: **Aceptada**
- Fecha: 2026-06-02

## Contexto

El documento maestro (§7, §20) pedía confirmar el framework real de "AgroControl"
antes de fijar el stack, asumiendo que esta app de campo debía alinearse con un
sistema existente con Supabase self-hosted ya montado.

Tras búsqueda en el equipo del usuario, **AgroControl no existe como proyecto**
(no hay repo, ni instancia Supabase, ni prototipo). Las menciones a "alinear con
AgroControl" son aspiracionales.

## Decisión

1. Construir esta app **standalone, desde cero**, sin heredar backend ni framework.
2. **Framework:** Next.js (App Router) + TypeScript `strict`, tal como elige §7.
3. **Mapa:** **MapLibre GL JS** (no Leaflet). Ante el conflicto entre el BRIEF
   (sugería Leaflet "por continuidad") y el CONTEXTO_PROYECTO (elige MapLibre),
   **prevalece el CONTEXTO_PROYECTO** (render GPU de miles de polígonos, vector +
   PMTiles offline, sin vendor lock-in).
4. **Supabase:** proyecto **propio y nuevo** (Fase 4). Auth y RLS se diseñan aquí.

## Consecuencias

- Sin dependencias de un sistema externo: menos riesgo, scaffold limpio.
- PWA con Serwist (no `vite-plugin-pwa`, que sólo aplicaría con Vite).
- "Alinear con AgroControl" queda como guía de estilo de stack, no como contrato.
