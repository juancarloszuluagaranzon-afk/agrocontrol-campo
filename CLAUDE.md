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

## Gotchas (aprendidos en sesiones anteriores)

- **Sync de tablas compartidas y PostgREST**: `.select("*")` sin paginar se corta en
  **1000 filas por defecto**. Cualquier descarga nueva de una tabla compartida
  (`precipitaciones`, `lecturas_hidrologicas`, o la que siga) debe usar
  `fetchAllRows()` (`lib/sync/syncManager.ts`, pagina con `.range()`), nunca un
  `select("*")` directo — si no, datos reales quedan invisibles en el cliente sin
  ningún error visible (ADR-0013).
- **El preview/testing manual toca Supabase de PRODUCCIÓN real**, no hay entorno de
  staging separado. Cualquier valor de prueba guardado durante una verificación en
  el navegador queda en la base real y hay que limpiarlo después (soft-delete
  `deleted=true`, nunca DELETE físico) — no dejar residuos de prueba sin avisar.
- **Datos históricos de precipitaciones** (`scripts/out/*.sql`): son scripts de
  importación de una sola vez, **no se trackean en git** (quedan como artefactos
  locales); el usuario los corre él mismo en el SQL Editor de Supabase. Autor fijo
  para "histórico importado": `512d1415-6cf7-4d62-8a94-79afc7928d31`. Si una fecha
  ya tiene datos entrados por un técnico vía la app y aparece un dato "oficial" que
  choca (ej. reporte impreso), **preguntar cuál prevalece antes de sobrescribir**,
  nunca asumir.
- **Transcribir números desde una imagen es de alto riesgo** (alertas de nivel de
  río, reportes agrícolas) — preferir pedir el Excel/CSV fuente y leerlo con
  `exceljs` (ya es dependencia). Si solo hay imagen, validar cada fila contra una
  columna de control (ej. "Acumul. MES" = suma de los días) antes de generar SQL.
- **Preview server**: el puerto 3200 puede estar ocupado por otra sesión de chat
  trabajando en este mismo repo. Usar el config `agrocontrol-campo-preview` (puerto 3210) del `launch.json` global si el 3200 está tomado.
