# ADR-0023 — Máscara "solo nuestras fincas" para las capas Sentinel Hub

Fecha: 2026-08-28 · Estado: aceptado

## Contexto

Las capas Sentinel Hub (NDVI/NDMI, ADR-0022) pintan el índice sobre **todo el rectángulo** de teselas,
incluidas tierras vecinas. Se pidió que el índice se vea **solo sobre las fincas de Riopaila y Castilla**
(las suertes/tablones oficiales), y que **alrededor se conserve el satélite pero atenuado** (mantener
contexto de ríos/vías).

MapLibre **no recorta un raster a polígonos** de forma nativa, y recortar del lado servidor (Sentinel Hub
Process API con la geometría de miles de tablones) exige mandar esa geometría en cada petición (inviable
por tamaño de URL) o un proxy OAuth (pesado y sin offline).

## Decisión

- **Máscara raster precomputada por planta** (`public/data/mask_<planta>.png`, generada con
  `scripts/gen_mask.mjs`): un velo oscuro (`#0a0f1a`, alpha 0,6 horneado en el PNG) con las fincas
  recortadas (transparentes). Se coloca como **`image` source** de MapLibre sobre el bbox de la planta
  (`PlantaConfig.mask`), **encima del índice** y **debajo de contexto/suertes**; así NDVI/NDMI queda a
  plena intensidad dentro de los lotes y el satélite **atenuado** fuera. Oculta salvo que haya un índice
  encendido. El PNG se cachea con el resto de `/data/` en el service worker (offline).
- **Por qué raster y no vectorial (ver Historial):** los ~1345 tablones son **parcelas separadas** (vías/
  canales entre ellas), y MapLibre limita a **500 anillos por polígono** — una máscara vectorial que las
  perfore a todas siempre excede ese tope y **descarta las de menor área** (por eso Peralonso, de tablones
  más chicos, se perdía). Una imagen no tiene ese límite.
- **Generación** (`scripts/gen_mask.mjs`, offline con `sharp`): proyecta los tablones a **Web Mercator**
  (para que calce con la colocación del `image` source), dibuja un SVG (rect del lienzo + tablones con
  `fill-rule=evenodd` → huecos) y lo rasteriza a PNG ~4096 px. `pnpm gen:mask` para regenerar cuando cambie
  la cartografía.
- **Visibilidad ligada a Sentinel Hub**: la máscara solo aparece cuando **alguna** capa Sentinel Hub está
  encendida (no afecta la navegación normal en satélite ni el mosaico de EOX). Se añade solo si hay
  instance ID configurado.

## Consecuencias

- Efecto "foco en nuestras fincas" **100% cliente y offline**, sin backend ni claves, sin dependencias
  nuevas, en sincronía automática con la cartografía oficial (si cambian las suertes, cambia la máscara).
- Es **atenuación, no recorte exacto**: el índice puede insinuarse **muy tenue** fuera de los lotes (a
  través del velo). Aceptado en la decisión del usuario ("satélite atenuado alrededor") frente a la opción
  de recorte servidor. Subir la opacidad del velo lo oculta más.
- El PNG pesa ~1,3 MB (Riopaila) / ~0,7 MB (Castilla); se descarga una vez y queda en la caché del SW.
- **Resolución** ~4096 px: los bordes del velo pueden verse un pelín suaves a zoom muy alto (es un velo,
  no dato; las suertes van nítidas por encima). Regenerable a más px si hiciera falta.
- El velo también atenúa el satélite/mosaico base fuera de las suertes (deseado).

## Historial (por qué se llegó al raster)

1. **Vectorial, 1 polígono con ~1378 huecos** (v1): se veía bien salvo que **MapLibre descarta huecos
   pasando de 500 anillos/polígono** (`EARCUT_MAX_RINGS`, conserva los de mayor área) → los tablones más
   chicos (Peralonso) quedaban sin recorte.
2. **`tolerance: 0`** (PR #63): se creyó que era simplificación; no lo era → no arregló nada.
3. **MultiPolygon en rejilla** (PR #64): repartir huecos en celdas <500; **quedó peor** (revertido).
4. **Disolver con `polygon-clipping`**: las parcelas **no comparten bordes** (vías/canales) → no se fusionan
   (quedaban ~1345 bloques) y crasheaba en Castilla.
5. **Raster (esta decisión)**: sin límite de anillos, sin costuras, verificado a nivel de píxel (Peralonso
   192/193 tablones en hueco; exterior con velo).

## Alternativas descartadas

- **Recorte del lado servidor (Sentinel Hub Process API + geometría)**: recorte exacto con satélite normal
  fuera, pero pesado (proxy OAuth) y sin offline.
- **Fondo neutro opaco fuera** (tapar todo lo exterior con un color sólido): foco total, pero pierde el
  contexto del satélite; el usuario prefirió mantenerlo atenuado.
- **turf.mask / difference**: dependencia nueva y operación geométrica costosa sobre miles de polígonos,
  innecesaria: la concatenación de anillos como huecos basta.
