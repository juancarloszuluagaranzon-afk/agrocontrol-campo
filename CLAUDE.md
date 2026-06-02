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
