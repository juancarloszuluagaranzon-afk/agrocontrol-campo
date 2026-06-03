# ADR-0004 — Outbox de sincronización sobre el store persistido (no Dexie aún)

- Estado: **Aceptada** (revisable)
- Fecha: 2026-06-03

## Contexto

§7/§14 proponen IndexedDB (Dexie) + cola outbox + SyncManager para el offline.
La programación de maquinaria es un volumen **pequeño** (decenas–cientos de filas)
y ya se persiste con `zustand/persist` en localStorage (Fase 3).

## Decisión

Para la Fase 4 se implementa el patrón **offline-first + outbox** sobre el store
persistido existente, sin introducir Dexie todavía:

- El store (`maquinariaStore`, localStorage) es la **caché offline**: toda lectura
  sirve desde ahí; toda escritura se aplica localmente al instante.
- Un **outbox** (`pending: string[]`, ids de registros con cambios sin enviar),
  también persistido, sobrevive a recargas y cortes de red.
- El **SyncManager** vacía el outbox contra Supabase (upsert idempotente por `id`
  uuid generado en el cliente) cuando hay red + sesión, con reintentos.
- La **auditoría** del servidor la generan los triggers de Postgres (§10) en cada
  upsert; el cliente conserva además su bitácora local (Fase 3).
- **TanStack Query** se difiere: hoy no hay lecturas server-state que lo
  justifiquen (las suertes son estáticas; la programación vive en el store).

## Consecuencias

- Menos dependencias y menor superficie de fallo para el volumen actual.
- Si la programación crece mucho o se requieren consultas/índices locales, se
  migra a **Dexie** (la interfaz del SyncManager queda aislada para facilitarlo).
- El upsert fija `created_by = auth.uid()` (RLS, §12); el nombre del autor se
  resuelve por join a `profiles` al leer.
