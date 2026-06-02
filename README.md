# AgroControl Campo — Centro de Operaciones

Aplicación web de campo **offline-first e instalable (PWA)** para **Riopaila
Agrícola**. Replica lo esencial de Avenza Maps sobre la cartografía oficial del
ingenio (ubicación GPS, medición de área/distancia, mapa de suertes con linderos
reales) y suma la gestión de **maquinaria amarilla** ligada a esas suertes.

> Fuente de verdad funcional: `CONTEXTO_PROYECTO_1.md`. Decisiones de arquitectura
> en [`docs/adr`](docs/adr).

## Stack

- **Next.js 16 (App Router) + TypeScript `strict`** — ver [ADR-0001](docs/adr/0001-standalone-nextjs-maplibre.md)
- **MapLibre GL JS** + PMTiles (mapa, offline) — _Fase 1_
- **Turf.js** (medición geodésica) — _Fase 2_
- **Supabase** (Postgres + PostGIS + Auth + RLS) — _Fase 4_
- **TanStack Query** + **Dexie/IndexedDB** (offline, cola outbox) — _Fase 4_
- **Tailwind CSS** + shadcn/ui · **React Hook Form + Zod**
- **Serwist** (PWA / service worker) — ver [ADR-0003](docs/adr/0003-serwist-build-webpack.md)
- **Vitest** + **Playwright** · ESLint + Prettier + Husky + commitlint

## Requisitos

- Node **≥ 24** (ver `.nvmrc`) · **pnpm 11** (`corepack enable`)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # completar cuando exista Supabase (Fase 4)
pnpm dev                     # http://localhost:3000
```

## Scripts

| Comando          | Qué hace                                       |
| ---------------- | ---------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo (Turbopack)             |
| `pnpm build`     | Build de producción (webpack + service worker) |
| `pnpm start`     | Sirve el build                                 |
| `pnpm typecheck` | `tsc --noEmit`                                 |
| `pnpm lint`      | ESLint (cero warnings)                         |
| `pnpm format`    | Prettier (escribe)                             |
| `pnpm test`      | Tests unitarios (Vitest)                       |
| `pnpm test:e2e`  | Tests e2e (Playwright)                         |

## Estructura

```
app/(tabs)/{mapa,maquinaria}    Pestañas (§5)
components/                     UI (MapView, GpsMarker, …)
domain/                         Reglas puras + esquemas Zod (testeable, §8)
lib/{supabase,geo,db,sync,i18n} Acceso a datos y utilidades
public/data/                    GeoJSON + catálogo (capas depuradas, ADR-0002)
supabase/migrations/            Esquema PostGIS (§9)
docs/adr/                       Decisiones de arquitectura
tests/{unit,e2e}/               Pruebas
```

## Datos

`public/data/` contiene **610 suertes / 17 haciendas / 2.849,12 ha** (WGS84,
EPSG:4326) más capas de contexto **depuradas** (ADR-0002). Diccionario en
[`public/data/README_DATOS.md`](public/data/README_DATOS.md).

> **Alcance conocido:** esta capa cubre 610 suertes (2.849 ha), no la totalidad
> del ingenio (~5.583 ha netas). Las áreas por suerte sí son oficiales.

## Estado

**Fase 0 (Cimientos) — completa.** App vacía instalable, CI verde. Siguientes
fases: mapa de suertes (1), GPS y medición (2), maquinaria (3), persistencia y
offline (4), endurecimiento (5). Ver `CHANGELOG.md`.

## Despliegue

Vercel (HTTPS requerido para GPS). El AOI para tiles offline (bbox WGS84) es
`lon −76.185..−76.053, lat 4.235..4.385`.
