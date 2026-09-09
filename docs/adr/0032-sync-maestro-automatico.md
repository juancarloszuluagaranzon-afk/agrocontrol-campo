# ADR-0032 — Sincronización automática del maestro con maestro-riopaila

Fecha: 2026-09-09 · Estado: aceptado

## Contexto

El maestro agronómico de Rio Map (`public/data/maestro_suertes.json` y
`maestro_castilla.json`) es un **espejo** del `maestro.csv` del repo
[maestro-riopaila](https://github.com/juancarloszuluagaranzon-afk/maestro-riopaila),
la fuente de verdad que mantiene el ingenio (PR #55). El refresco era manual:
correr `scripts/import_maestro.mjs` y abrir un PR. En la práctica se olvidaba —
entre el 27-ago y el 8-sep el ingenio registró tres cortes (59 suertes) y Rio
Map siguió mostrando edades, cortes y técnicos viejos sin que nadie lo notara
(PR #75 lo corrigió a mano).

Opciones consideradas:

1. **Leer el CSV en vivo** desde GitHub al arrancar la app. Descartada: rompe
   el modo offline (ADR-0020), acopla el campo a la disponibilidad de un repo
   público y salta la validación Zod/tests del maestro.
2. **Push directo a `main`** desde un workflow. Descartada: el maestro afecta
   lo que ven todos los técnicos; el merge debe seguir siendo una decisión
   humana, con CI.
3. **Workflow que regenera y abre un PR** (elegida).

## Decisión

- Nuevo workflow **`Sync maestro`** (`.github/workflows/sync-maestro.yml`) en
  este repo: hace checkout de maestro-riopaila (público, sin token), corre
  `scripts/import_maestro.mjs`, y si los JSON cambian corre
  `tests/unit/maestro.test.ts` y abre —o actualiza— el PR
  `chore/sync-maestro` con `peter-evans/create-pull-request`. El cuerpo del PR
  lo genera **`scripts/maestro_diff.mjs`** (nuevo, sin dependencias): tabla por
  planta con suertes nuevas/retiradas y cuántas cambian de corte, fecha,
  variedad, área o técnico.
- Tres disparadores: **`repository_dispatch: maestro-actualizado`** (aviso
  inmediato desde maestro-riopaila), **cron diario** de respaldo (06:00
  Colombia, L–V) y **`workflow_dispatch`** manual. `concurrency` evita dos
  corridas a la vez; si no hay cambios termina sin abrir nada.
- En maestro-riopaila, el workflow **`Avisar a Rio Map`** envía el
  `repository_dispatch` en cada push a `main` que toque `maestro.csv`. Si el
  secreto `RIOMAP_DISPATCH_TOKEN` no existe, no falla: Rio Map lo tomará en la
  corrida diaria.
- **Token.** Con el secreto `MAESTRO_SYNC_TOKEN` (PAT fine-grained con
  _Contents_ y _Pull requests_ de este repo) el PR dispara el CI normal (e2e +
  quality). Sin él se usa `GITHUB_TOKEN`: exige activar "Allow GitHub Actions
  to create and approve pull requests" y, por diseño de GitHub, ese PR **no
  dispara el CI** (hay que cerrarlo y reabrirlo). El mismo PAT sirve para los
  dos secretos. Nadie más que el administrador ve el token.
- Los PR de sincronización son **solo datos** (los dos JSON); no editan
  `CHANGELOG.md` — el resumen vive en el PR. Un refresco manual sigue siendo
  posible con el importador.

## Consecuencias

- El maestro de Rio Map se desfasa como máximo un día hábil del CSV del
  ingenio, y cero minutos si el aviso está configurado. El merge sigue
  requiriendo revisión humana.
- Nueva dependencia de CI (no de la app): `peter-evans/create-pull-request`
  y `peter-evans/repository-dispatch`, acciones estándar y mantenidas.
- Si maestro-riopaila cambia el formato del CSV, el importador o el test del
  maestro fallan y el workflow se pone rojo sin abrir PR: señal explícita en
  vez de datos corruptos en producción.
- Numeración: el ADR del radar Sentinel-1 (PR #74) nació como 0030 en
  paralelo al de recuperación de contraseña (PR #73); se renumera a **0031**
  en este PR.
