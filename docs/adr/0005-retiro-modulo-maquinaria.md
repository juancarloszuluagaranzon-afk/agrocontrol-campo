# ADR-0005 — Retiro del módulo de Maquinaria

- Estado: **Aceptada**
- Fecha: 2026-06-05

## Contexto

El módulo de Maquinaria (pestaña 🚜, programación de equipo amarillo, formulario
RHF+Zod, historial auditable, export JSON/CSV y los íconos sobre el mapa) se
construyó en la Fase 3 como una herramienta de gestión compartida. En la práctica
su uso era **personal y puntual** (ubicar dónde estaba la maquinaria), no un flujo
de operación del equipo. La app de campo se usa ~90 % en móvil y conviene que esté
enfocada en una sola tarea: el mapa de tablones (identificar, medir, marcar, GPS).

## Decisión

**Eliminar** del frontend todo el módulo de maquinaria:

- Rutas: `app/(tabs)/maquinaria/` y la pestaña en la barra inferior. Con una sola
  sección, se retira también la `TabBar` y se libera ese alto para el mapa.
- Componentes y dominio: `components/maquinaria/*`, `domain/maquinaria/*`,
  `lib/store/maquinariaStore.ts`, la capa `MAQUINARIA_*` del mapa y sus tests.
- Desacople de lo compartido: el estado de sincronización (`SyncStatus`, `useSync`)
  pasa a leerse del `marcadoresStore` (lo único que sincroniza ahora); `AuthGate`
  deja de fijar el autor de auditoría de maquinaria.

**No se toca la base de datos.** La tabla `programacion` y sus migraciones
(0001/0003/0006) quedan como historial aplicado; `DROP` en producción es
irreversible y la tabla sin uso es inocua. Si se decide limpiarla, se hará con una
migración explícita ejecutada y confirmada por el responsable.

## Consecuencias

- La app queda como un mapa a pantalla completa (GPS, medición, marcadores
  privados, modo Plano) — más simple y rápida para campo.
- Reversible vía historial de git si vuelve a requerirse la maquinaria.
- Los tipos de `programacion` permanecen en `lib/supabase/types.ts` para reflejar
  la base de datos viva.
