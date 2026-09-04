// Genera la máscara "solo nuestras fincas" como IMAGEN (PNG) por planta.
//
// Los tablones son ~1345 parcelas separadas (con vías/canales entre ellas), así
// que una máscara vectorial que las perfore excede el límite de 500 anillos/
// polígono de MapLibre (por eso Peralonso, de tablones chicos, se perdía). Una
// máscara RASTER no tiene ese límite: se pinta un velo oscuro con las fincas
// recortadas (transparentes) y se coloca como `image` source sobre el AOI.
//
// Proyección Web Mercator para que calce con la colocación de MapLibre.
// Uso: node scripts/gen_mask.mjs
// Salida: public/data/mask_<planta>.png  +  imprime el bbox [W,S,E,N] para plantas.ts

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PLANTAS = [
  { id: "riopaila", src: "tablones_riopaila.geojson" },
  { id: "castilla", src: "tablones_castilla.geojson" },
];
const DATA_DIR = path.join(process.cwd(), "public", "data");
const WIDTH = 4096; // px; alto se calcula por aspecto Mercator
const PAD = 0.15; // margen alrededor de la bbox de tablones (fracción)
const VEIL = "#0a0f1a";
const VEIL_OPACITY = 0.6;

const mercY = (lat) =>
  (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

function rings(geom) {
  if (geom?.type === "Polygon")
    return geom.coordinates[0] ? [geom.coordinates[0]] : [];
  if (geom?.type === "MultiPolygon")
    return geom.coordinates.map((p) => p[0]).filter(Boolean);
  return [];
}

for (const planta of PLANTAS) {
  const fc = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, planta.src), "utf8"),
  );

  // bbox de los tablones.
  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;
  const all = [];
  for (const f of fc.features) {
    for (const r of rings(f.geometry)) {
      all.push(r);
      for (const [x, y] of r) {
        if (x < minLon) minLon = x;
        if (x > maxLon) maxLon = x;
        if (y < minLat) minLat = y;
        if (y > maxLat) maxLat = y;
      }
    }
  }
  // margen.
  const dLon = (maxLon - minLon) * PAD,
    dLat = (maxLat - minLat) * PAD;
  const W = minLon - dLon,
    E = maxLon + dLon,
    S = minLat - dLat,
    N = maxLat + dLat;

  // Mercator bbox → tamaño de imagen por aspecto.
  const mW = W,
    mE = E,
    mS = mercY(S),
    mN = mercY(N);
  const height = Math.round((WIDTH * (mN - mS)) / (mE - mW));
  const px = (lon) => ((lon - mW) / (mE - mW)) * WIDTH;
  const py = (lat) => ((mN - mercY(lat)) / (mN - mS)) * height;

  // Un solo path: rect de todo el lienzo + cada tablón, fill-rule evenodd →
  // el velo cubre todo menos el interior de los tablones (huecos transparentes).
  let d = `M0 0H${WIDTH}V${height}H0Z`;
  for (const r of all) {
    let s = "";
    for (let i = 0; i < r.length; i++) {
      s +=
        (i ? "L" : "M") + px(r[i][0]).toFixed(1) + " " + py(r[i][1]).toFixed(1);
    }
    d += s + "Z";
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}"><path d="${d}" fill="${VEIL}" fill-opacity="${VEIL_OPACITY}" fill-rule="evenodd"/></svg>`;

  const out = path.join(DATA_DIR, `mask_${planta.id}.png`);
  const png = await sharp(Buffer.from(svg), { limitInputPixels: false })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(out, png);
  console.log(
    `[${planta.id}] ${all.length} tablones · ${WIDTH}x${height}px · ${(png.length / 1024) | 0} KB`,
  );
  console.log(
    `  bbox [W,S,E,N] = [${W.toFixed(5)}, ${S.toFixed(5)}, ${E.toFixed(5)}, ${N.toFixed(5)}]`,
  );
}
