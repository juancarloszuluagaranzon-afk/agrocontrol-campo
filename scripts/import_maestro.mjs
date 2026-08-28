// Regenera el maestro agronómico de Rio Map a partir del `maestro.csv` de
// maestro-riopaila (fuente de verdad; ver ADR/CHANGELOG). El maestro de Rio Map
// DEBE ser espejo de ese CSV: cortes, edades y fechas se desfasan si no se
// refresca cuando el ingenio corta/renueva.
//
//   node scripts/import_maestro.mjs [ruta/maestro.csv]
//
// Escribe public/data/maestro_suertes.json (EMPRESA RIOP) y
// public/data/maestro_castilla.json (EMPRESA CAST + CAUC), con la forma de
// domain/maestro/schema.ts (indexado por sec_ste). Fechas d/m/aaaa → ISO.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const csvPath =
  process.argv[2] ?? resolve(repo, "..", "maestro-riopaila", "maestro.csv");

/** "8.73" → 8.73, "1173" → 1173, "" → null (sin datos ⇒ null, no 0). */
function num(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
/** Texto: vacío ⇒ null. */
function str(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}
/** Fecha d/m/aaaa (o ya ISO) → "aaaa-mm-dd"; vacío/invalida ⇒ null. */
function fecha(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const raw = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
const head = lines[0];
const delim = head.split(";").length > head.split("\t").length ? ";" : "\t";
const cols = head.split(delim).map((h) => h.trim());
const at = (name) => cols.indexOf(name);

// Mapa columna del CSV → campo del JSON (domain/maestro/schema.ts).
const IDX = {
  suerte: at("SUERTE"),
  variedad: at("VARIEDAD"),
  numero_corte: at("NUMERO DE CORTE"),
  uso: at("USO DE LA SUERTE"),
  fecha_siembra: at("FECHA DE SIEMBRA"),
  fecha_ultimo_corte: at("FECHA DE ULTIMO CORTE"),
  fecha_proximo_corte: at("FECHA DEL PROXIMO CORTE"),
  edad_csv: at("EDAD HOY MESES"),
  zona: at("ZONA"),
  zona_agroecologica: at("Zona Agroecologica"),
  area_neta_ha: at("AREA NETA HA"),
  tch_ppto: at("TCH PPTO"),
  toneladas_ppto: at("TONELADAS PPTO"),
  toneladas_estimadas: at("TONELADAS ESTIMADAS"),
  responsable_zona: at("RESPONSABLE ZONA"),
  tecnico: at("TECNICO AGRICOLA RESPONSABLE"),
  empresa: at("EMPRESA"),
};
const faltan = Object.entries(IDX).filter(([, i]) => i < 0);
if (faltan.length) {
  console.error("Columnas no encontradas:", faltan.map(([k]) => k).join(", "));
  process.exit(1);
}

const riopaila = {};
const castilla = {};
let n = 0;
for (const ln of lines.slice(1)) {
  const c = ln.split(delim);
  const sec = str(c[IDX.suerte]);
  if (!sec) continue;
  const empresa = str(c[IDX.empresa]);
  const rec = {
    variedad: str(c[IDX.variedad]),
    numero_corte: num(c[IDX.numero_corte]),
    uso: str(c[IDX.uso]),
    fecha_siembra: fecha(c[IDX.fecha_siembra]),
    fecha_ultimo_corte: fecha(c[IDX.fecha_ultimo_corte]),
    fecha_proximo_corte: fecha(c[IDX.fecha_proximo_corte]),
    edad_csv: num(c[IDX.edad_csv]),
    zona: num(c[IDX.zona]),
    zona_agroecologica: str(c[IDX.zona_agroecologica]),
    area_neta_ha: num(c[IDX.area_neta_ha]),
    tch_ppto: num(c[IDX.tch_ppto]),
    toneladas_ppto: num(c[IDX.toneladas_ppto]),
    toneladas_estimadas: num(c[IDX.toneladas_estimadas]),
    responsable_zona: str(c[IDX.responsable_zona]),
    tecnico: str(c[IDX.tecnico]),
    empresa,
  };
  const target = empresa === "RIOP" ? riopaila : castilla; // CAST + CAUC → castilla
  target[sec] = rec;
  n++;
}

const outRio = join(repo, "public", "data", "maestro_suertes.json");
const outCas = join(repo, "public", "data", "maestro_castilla.json");
writeFileSync(outRio, JSON.stringify(riopaila));
writeFileSync(outCas, JSON.stringify(castilla));

console.log(`CSV: ${csvPath}  (delim ${JSON.stringify(delim)})`);
console.log(`filas: ${n}`);
console.log(`  maestro_suertes.json (RIOP):   ${Object.keys(riopaila).length}`);
console.log(
  `  maestro_castilla.json (CAST+CAUC): ${Object.keys(castilla).length}`,
);
const ej = castilla["2123-013"] ?? riopaila["2123-013"];
if (ej)
  console.log(
    `  2123-013 → corte ${ej.numero_corte}, últ. corte ${ej.fecha_ultimo_corte}, área ${ej.area_neta_ha}`,
  );
