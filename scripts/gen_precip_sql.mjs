// Genera el SQL idempotente de precipitaciones (tabla public.precipitaciones)
// a partir del reporte diario oficial en Excel (una fila por pluviómetro,
// una columna por día del mes, columna "Acumul. MES").
//
//   node scripts/gen_precip_sql.mjs --xlsx "ruta.xlsx" --mes 2026-09 \
//        [--hoja agosto] [--namespace septiembre2026] [--nota "..."] [--ceros 21-31] \
//        [--fecha-carga 2026-09-11T12:00:00Z] [--out scripts/out/x.sql]
//
// - Solo pluviómetros del catálogo (public/data/pluviometros_riopaila.json);
//   PLUV 1 (GAN) y filas de totales quedan fuera.
// - Celdas vacías = sin lectura (no se cargan), salvo `--ceros a-b`, que las
//   escribe como 0.0 (para cerrar un mes cuyo acumulado anual demuestra 0 mm).
// - Valida: suma de los días cargados == "Acumul. MES" por pluviómetro.
// - UUID determinista (v5-like: sha1 de "precipitaciones:<namespace>:<pluv>:<fecha>")
//   + `on conflict (id) do update` → correr dos veces no duplica.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] ?? ""]);
    return acc;
  }, []),
);
const need = (k) => {
  if (!args[k]) throw new Error(`Falta --${k}`);
  return args[k];
};
const xlsx = need("xlsx");
const mes = need("mes"); // YYYY-MM
const [anio, mm2] = mes.split("-").map(Number);
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const nombreMes = MESES[mm2 - 1];
const namespace = args.namespace || `${nombreMes}${anio}`;
// Marca de tiempo de la carga. Por defecto `now()` de Postgres al ejecutar: la
// sincronización incremental (ADR-0033) baja solo filas con `updated_at` posterior
// al último visto por cada teléfono, así que una hora fija en el pasado podría
// dejar estas lecturas invisibles. `--fecha-carga ISO` fuerza una hora literal.
const fechaCarga = args["fecha-carga"] ? `'${args["fecha-carga"]}'` : "now()";
const ceros = args.ceros ? args.ceros.split("-").map(Number) : null;
const AUTOR = "512d1415-6cf7-4d62-8a94-79afc7928d31"; // autor fijo de las cargas oficiales

const catalogo = JSON.parse(
  readFileSync(resolve(repo, "public/data/pluviometros_riopaila.json"), "utf8"),
);
const ids = new Set(
  (catalogo.pluviometros ?? catalogo).map((p) => Number(p.id)),
);

function uuid(pluv, fecha) {
  const h = createHash("sha1")
    .update(`precipitaciones:${namespace}:${pluv}:${fecha}`)
    .digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}
const val = (cell) => {
  let v = cell.value;
  if (v && typeof v === "object") v = v.result ?? v.text ?? null;
  return v;
};
const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(xlsx);
// --hoja: nombre (o fragmento, sin distinguir mayúsculas) de la hoja; por defecto la primera.
// El libro anual trae hojas de varios años con nombres casi iguales ("Precip.Septiembre"
// y "Precip.Septiembre " con espacio): primero nombre EXACTO, luego un único
// fragmento coincidente; si el fragmento es ambiguo, se aborta.
function elegirHoja(nombre) {
  if (!nombre) return wb.worksheets[0];
  const exacta = wb.worksheets.find((w) => w.name === nombre);
  if (exacta) return exacta;
  const parecidas = wb.worksheets.filter((w) =>
    w.name.toLowerCase().includes(nombre.toLowerCase()),
  );
  if (parecidas.length > 1)
    throw new Error(
      `Hoja ambigua "${nombre}": ${parecidas.map((w) => JSON.stringify(w.name)).join(", ")}. Usa el nombre exacto.`,
    );
  return parecidas[0];
}
const ws = elegirHoja(args.hoja);
if (!ws) throw new Error(`No hay hoja que contenga "${args.hoja}"`);
console.log(`hoja: ${JSON.stringify(ws.name)}`);

// Fila de encabezado: la que contiene "PLUV No".
let hdrRow = null;
for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
  const row = ws.getRow(r);
  for (let c = 1; c <= ws.columnCount; c++) {
    if (
      String(val(row.getCell(c)) ?? "")
        .trim()
        .toUpperCase()
        .startsWith("PLUV")
    )
      hdrRow = r;
  }
  if (hdrRow) break;
}
if (!hdrRow) throw new Error("No encontré la fila de encabezado con 'PLUV No'");
const hdr = ws.getRow(hdrRow);
let colPluv = null,
  colAcMes = null,
  colAcAnio = null;
const colDia = new Map(); // día → col
for (let c = 1; c <= ws.columnCount; c++) {
  const t = String(val(hdr.getCell(c)) ?? "").trim();
  if (t.toUpperCase().startsWith("PLUV")) colPluv = c;
  else if (/^acumul\.? ?mes/i.test(t)) colAcMes = c;
  else if (/^acumul\.? ?a/i.test(t)) colAcAnio = c;
  else if (/^\d{1,2}$/.test(t) && Number(t) >= 1 && Number(t) <= 31)
    colDia.set(Number(t), c);
}
if (!colPluv || !colAcMes || colDia.size < 28)
  throw new Error(
    `Encabezado incompleto: pluv=${colPluv} acMes=${colAcMes} dias=${colDia.size}`,
  );

const filas = [];
const problemas = [];
const vistos = new Set();
let diasConDato = new Set();
for (let r = hdrRow + 1; r <= ws.rowCount; r++) {
  const row = ws.getRow(r);
  const pluv = num(val(row.getCell(colPluv)));
  if (pluv === null || !Number.isInteger(pluv)) continue;
  if (!ids.has(pluv)) {
    // Filas de promedios por zona y total de la empresa también traen un número en
    // "PLUV No" pero no tienen técnico: se omiten sin aviso. Un pluviómetro real
    // desconocido (con técnico) sí se reporta, para agregarlo al catálogo.
    const tecnico = String(val(row.getCell(colPluv - 2)) ?? "").trim();
    if (pluv !== 1 && tecnico)
      problemas.push(`fila : PLUV  () no está en el catálogo (omitido)`);
    continue;
  }
  vistos.add(pluv);
  let suma = 0;
  for (const [dia, c] of colDia) {
    const fecha = `${anio}-${String(mm2).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    if (new Date(fecha).getUTCMonth() + 1 !== mm2) continue; // 31 en mes de 30, etc.
    let v = num(val(row.getCell(c)));
    if (v === null && ceros && dia >= ceros[0] && dia <= ceros[1]) v = 0;
    if (v === null) continue;
    if (v < 0) {
      problemas.push(`fila ${r} PLUV ${pluv} día ${dia}: mm negativo (${v})`);
      continue;
    }
    suma += v;
    diasConDato.add(dia);
    filas.push({ pluv, fecha, mm: v });
  }
  const acMes = num(val(row.getCell(colAcMes)));
  // Excel no cachea el resultado de la fórmula compartida cuando la suma es 0:
  // un "Acumul. MES" vacío solo es válido si los días cargados también suman 0.
  if ((acMes ?? 0) !== 0 || suma !== 0)
    if (Math.abs((acMes ?? 0) - suma) > 0.01)
      problemas.push(
        `PLUV ${pluv}: suma días=${suma.toFixed(1)} ≠ Acumul. MES=${acMes}`,
      );
  if (colAcAnio) {
    const acAnio = num(val(row.getCell(colAcAnio)));
    filas.acAnio ??= {};
    filas.acAnio[pluv] = { mes: acMes, anio: acAnio };
  }
}
for (const id of ids)
  if (!vistos.has(id))
    problemas.push(`PLUV ${id} del catálogo no aparece en el Excel`);

const dias = [...diasConDato].sort((a, b) => a - b);
const rango = dias.length ? `${dias[0]}-${dias[dias.length - 1]}` : "ninguno";
const nota =
  args.nota || `Reporte oficial ${nombreMes} ${anio} (días ${rango})`;
const totalMm = filas.reduce((s, f) => s + f.mm, 0);

const lineas = filas.map(
  (f) =>
    `  ('${uuid(f.pluv, f.fecha)}', '${AUTOR}', 'riopaila', ${f.pluv}, '${f.fecha}', ${f.mm.toFixed(1)}, '${nota.replace(/'/g, "''")}', 'false', ${fechaCarga}, ${fechaCarga})`,
);
// `begin;` va en la línea 1: si al pegar en el SQL Editor se pierde el inicio
// del archivo, falla de forma obvia en vez de ejecutar un comentario truncado.
const sql = `begin;
-- ${nombreMes[0].toUpperCase() + nombreMes.slice(1)} ${anio}: días ${rango}. Fuente: Excel oficial '${xlsx.split(/[\/]/).pop()}'.
-- ${filas.length} lecturas, ${vistos.size} pluviómetros del catálogo (PLUV 1/GAN excluido).
-- Validado: la suma por pluviómetro de los días cargados == Acumul. MES${problemas.length ? " (VER AVISOS ABAJO)" : " en los " + vistos.size}.
-- Idempotente (UUID determinista namespace ${namespace}) + on conflict do update.
${problemas.map((p) => `-- AVISO: ${p}`).join("\n")}${problemas.length ? "\n" : ""}
insert into public.precipitaciones (id, autor, planta, pluviometro, fecha, mm, nota, deleted, created_at, updated_at)
values
${lineas.join(",\n")}
on conflict (id) do update set mm = excluded.mm, nota = excluded.nota, updated_at = excluded.updated_at;

commit;
`;
const out =
  args.out ||
  resolve(
    repo,
    "scripts/out",
    `${nombreMes}_${anio}_dias${rango.replace("-", "-")}.sql`,
  );
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, sql);
console.log(`OK → ${out}`);
console.log(
  `  lecturas: ${filas.length} · pluviómetros: ${vistos.size} · días: ${rango} · total mm: ${totalMm.toFixed(1)}`,
);
if (problemas.length) {
  console.log("  AVISOS:");
  for (const p of problemas) console.log("   -", p);
}
if (filas.acAnio && args["dump-acumulados"])
  console.log(JSON.stringify(filas.acAnio));
