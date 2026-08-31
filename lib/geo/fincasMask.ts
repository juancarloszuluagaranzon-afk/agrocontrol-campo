import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Position,
} from "geojson";

/**
 * Máscara inversa de las fincas (suertes/tablones) para recortar visualmente las
 * capas Sentinel Hub a "solo nuestras fincas" (Riopaila + Castilla).
 *
 * MapLibre no recorta un raster a polígonos, así que se pinta un polígono que
 * cubre **todo el exterior** con las fincas restadas como **huecos**; encima del
 * índice y semi-transparente oscuro, deja NDVI/NDMI a plena intensidad dentro de
 * los lotes y el satélite **atenuado** alrededor (ADR-0023).
 *
 * **Por qué MultiPolygon con rejilla (ADR-0023, fix PR #64):** MapLibre limita a
 * **500 anillos por polígono** (`EARCUT_MAX_RINGS`) y, al exceder, conserva solo
 * los de **mayor área** y descarta el resto. Con ~1378 huecos en un solo polígono,
 * los tablones más pequeños (p. ej. Peralonso) perdían su hueco y quedaban bajo el
 * velo. Solución: repartir los huecos en una **rejilla** de celdas (cada celda es
 * un polígono aparte con < 500 huecos) + un "marco" que velo todo lo de afuera.
 */

/** Id de la fuente y capa de la máscara en el estilo de MapLibre. */
export const FINCAS_MASK_SOURCE = "fincas-mask";
export const FINCAS_MASK_LAYER = "fincas-mask";

/**
 * Anillo exterior amplio (SW de Colombia) que siempre cubre el viewport del AOI
 * del ingenio a cualquier zoom/paneo razonable. CCW (exterior).
 */
const OUTER_RING: Position[] = [
  [-80, 0],
  [-72, 0],
  [-72, 8],
  [-80, 8],
  [-80, 0],
];

// Nº de divisiones por eje de la rejilla (grid×grid celdas). GRID=7 → celda más
// cargada ~306 huecos en Castilla (2446 tablones), holgado bajo el límite de 500
// anillos/polígono de MapLibre; Riopaila queda ~80.
const GRID = 7;

type Bbox = [number, number, number, number];

function ringBbox(ring: Position[]): Bbox {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of ring) {
    const x = p[0]!,
      y = p[1]!;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/**
 * Construye la máscara inversa como **MultiPolygon**:
 *  - Un **marco** = anillo exterior grande (CCW) con la bbox de los tablones como
 *    hueco (CW): velo todo lo de afuera de las fincas.
 *  - Una **rejilla** de celdas sobre la bbox de los tablones; cada celda es un
 *    polígono (rect CCW) con los tablones que la intersecan como huecos (CW). Un
 *    tablón a caballo entre celdas es hueco en todas las que toca (sin costuras;
 *    las celdas no se solapan → sin doble velo).
 *
 * Puro y sin dependencias. MapLibre/earcut trata todo anillo con giro opuesto al
 * exterior como hueco: los tablones ya vienen CW y el exterior/celdas son CCW.
 */
export function buildFincasMask(
  tablones: FeatureCollection,
  outer: Position[] = OUTER_RING,
  grid: number = GRID,
): Feature<MultiPolygon> {
  const holes: Position[][] = [];
  const boxes: Bbox[] = [];
  let minx = Infinity,
    miny = Infinity,
    maxx = -Infinity,
    maxy = -Infinity;

  for (const f of tablones.features) {
    const g = f.geometry;
    const rings: Position[][] = [];
    if (g.type === "Polygon") {
      if (g.coordinates[0]?.length) rings.push(g.coordinates[0]);
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates)
        if (poly[0]?.length) rings.push(poly[0]);
    }
    for (const r of rings) {
      const b = ringBbox(r);
      holes.push(r);
      boxes.push(b);
      if (b[0] < minx) minx = b[0];
      if (b[1] < miny) miny = b[1];
      if (b[2] > maxx) maxx = b[2];
      if (b[3] > maxy) maxy = b[3];
    }
  }

  // Sin fincas: solo el velo exterior.
  if (holes.length === 0) {
    return {
      type: "Feature",
      properties: {},
      geometry: { type: "MultiPolygon", coordinates: [[outer]] },
    };
  }

  // Marco: exterior grande (CCW) menos la bbox de los tablones (hueco CW).
  const bboxHoleCW: Position[] = [
    [minx, miny],
    [minx, maxy],
    [maxx, maxy],
    [maxx, miny],
    [minx, miny],
  ];
  const polygons: Position[][][] = [[outer, bboxHoleCW]];

  // Rejilla sobre la bbox de los tablones.
  const cw = (maxx - minx) / grid || 1;
  const ch = (maxy - miny) / grid || 1;
  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid; gy++) {
      const cx0 = minx + gx * cw;
      const cx1 = gx === grid - 1 ? maxx : minx + (gx + 1) * cw;
      const cy0 = miny + gy * ch;
      const cy1 = gy === grid - 1 ? maxy : miny + (gy + 1) * ch;
      // Rect de la celda, CCW (exterior).
      const cell: Position[][] = [
        [
          [cx0, cy0],
          [cx1, cy0],
          [cx1, cy1],
          [cx0, cy1],
          [cx0, cy0],
        ],
      ];
      for (let k = 0; k < holes.length; k++) {
        const b = boxes[k]!;
        // bbox del tablón interseca la celda.
        if (b[0] <= cx1 && b[2] >= cx0 && b[1] <= cy1 && b[3] >= cy0) {
          cell.push(holes[k]!);
        }
      }
      polygons.push(cell);
    }
  }

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "MultiPolygon", coordinates: polygons },
  };
}
