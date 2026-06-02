# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/);
versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Fase 1 — Mapa de suertes

- Mapa MapLibre GL con base satelital Esri World Imagery, centrado en el AOI.
- Capa de las 610 suertes como **una sola** capa GeoJSON (relleno + contorno +
  etiquetas `sec_ste`), con resaltado de la suerte seleccionada (§13).
- Panel de atributos al tocar un lote: `sec_ste`, hacienda, sector, área oficial
  (ha, formato es-CO), supervisor y jefe de zona (§5).
- Capas de contexto conmutables (red hídrica, canales, vías, cuerpos de agua,
  estaciones de bombeo) con control plegable.
- Buscador por `sec_ste` o hacienda (lógica de dominio pura + testeada) con
  `flyTo` y resaltado; enriquece los atributos desde el GeoJSON.
- Estado de UI con Zustand (`lib/store/mapStore`). e2e Playwright del flujo
  (buscar → panel; conmutar capas). Puerto de tests/preview movido a 3100.

### Fase 0 — Cimientos

- Scaffold Next.js 16 (App Router) + TypeScript `strict`
  (`noUncheckedIndexedAccess` y flags adicionales).
- Shell de la app: dos pestañas (Mapa / Maquinaria), navegación inferior táctil,
  indicador permanente de estado de conexión, i18n es-CO centralizado.
- Tooling de calidad: ESLint (cero warnings) + Prettier + Husky (pre-commit y
  commit-msg) + lint-staged + commitlint (Conventional Commits).
- Tests: Vitest + React Testing Library (unit) y Playwright (e2e smoke). Incluye
  validación de integridad de los datos (610 suertes / 17 haciendas / 2.849,12 ha).
- PWA con Serwist: service worker, `manifest.webmanifest`, iconos
  (ver [ADR-0003](docs/adr/0003-serwist-build-webpack.md)).
- Supabase: clientes browser/server (SSR), tipos derivados del SQL, validación de
  entorno con Zod, `.env.example`. Esquema PostGIS en `supabase/migrations`.
- Datos: GeoJSON + catálogo en `public/data`; capas de contexto depuradas
  (ver [ADR-0002](docs/adr/0002-limpieza-capas-contexto.md)).
- CI (GitHub Actions): `typecheck → lint → format → test → build` + e2e.
- ADR-0001 (standalone, Next.js, MapLibre), ADR-0002, ADR-0003.
