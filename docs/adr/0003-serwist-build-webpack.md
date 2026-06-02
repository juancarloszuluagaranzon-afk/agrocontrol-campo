# ADR-0003 — Build de producción con webpack por Serwist (Next 16 / Turbopack)

- Estado: **Aceptada** (revisable)
- Fecha: 2026-06-02

## Contexto

Next.js 16 usa **Turbopack por defecto**. El plugin `@serwist/next` (modo
clásico) inyecta configuración de **webpack** para compilar el service worker, lo
que es incompatible con el build de Turbopack y aborta la compilación. El soporte
oficial Serwist + Turbopack (`@serwist/turbopack`) es **experimental**.

## Decisión

- **Build de producción con webpack:** `next build --webpack` (Serwist clásico,
  estable). Genera `public/sw.js` correctamente.
- **Dev con Turbopack** (`next dev`), donde Serwist está **desactivado** (`disable`
  en `next.config.ts`), por lo que no hay conflicto y se conserva el HMR rápido.

## Consecuencias

- Pérdida de la velocidad de Turbopack **sólo en el build**; el dev no se afecta.
- A revisar cuando `@serwist/turbopack` sea estable: migrar y quitar `--webpack`.
- CI fija `SERWIST_SUPPRESS_TURBOPACK_WARNING=1` para silenciar el aviso informativo.
