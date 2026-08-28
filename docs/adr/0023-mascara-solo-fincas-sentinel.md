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

- **Máscara inversa cliente** (`lib/geo/fincasMask.ts`): un polígono que cubre todo el exterior con las
  suertes recortadas como **huecos**. Se pinta semi-transparente oscuro (`#0a0f1a`, `fill-opacity` 0.6)
  **encima del índice** y **debajo de contexto/suertes**, así NDVI/NDMI queda a plena intensidad dentro de
  los lotes y el satélite **atenuado** fuera.
- **Construcción pura y O(n) sin dependencias**: se concatena el anillo exterior de cada tablón como hueco
  del polígono exterior. MapLibre/earcut trata todo anillo tras el primero como hueco (sin importar el
  sentido de giro), así que **no hace falta turf** ni operaciones geométricas. Se arma en runtime desde los
  tablones que la app ya carga (`cfg.tablones`), por planta, siempre en sincronía y offline.
- **Anillo exterior amplio** (SW de Colombia, lon −80..−72, lat 0..8) que cubre el viewport a cualquier
  zoom/paneo razonable del AOI del ingenio.
- **Visibilidad ligada a Sentinel Hub**: la máscara solo aparece cuando **alguna** capa Sentinel Hub está
  encendida (no afecta la navegación normal en satélite ni el mosaico de EOX). Se añade solo si hay
  instance ID configurado.

## Consecuencias

- Efecto "foco en nuestras fincas" **100% cliente y offline**, sin backend ni claves, sin dependencias
  nuevas, en sincronía automática con la cartografía oficial (si cambian las suertes, cambia la máscara).
- Es **atenuación, no recorte exacto**: el índice puede insinuarse **muy tenue** fuera de los lotes (a
  través del velo). Aceptado en la decisión del usuario ("satélite atenuado alrededor") frente a la opción
  de recorte servidor. Subir la opacidad del velo lo oculta más.
- Un polígono con miles de huecos (1378 Riopaila / 2446 Castilla) se triangula una vez al montar la capa:
  costo puntual asumible; si molestara, se precomputaría a un `geojson` estático por planta.
- El velo también atenúa el satélite/mosaico base fuera de las suertes (deseado); el contexto vectorial y
  las suertes van por encima y quedan nítidos.

## Alternativas descartadas

- **Recorte del lado servidor (Sentinel Hub Process API + geometría)**: recorte exacto con satélite normal
  fuera, pero pesado (proxy OAuth) y sin offline.
- **Fondo neutro opaco fuera** (tapar todo lo exterior con un color sólido): foco total, pero pierde el
  contexto del satélite; el usuario prefirió mantenerlo atenuado.
- **turf.mask / difference**: dependencia nueva y operación geométrica costosa sobre miles de polígonos,
  innecesaria: la concatenación de anillos como huecos basta.
