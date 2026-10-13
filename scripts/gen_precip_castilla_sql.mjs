// Genera el SQL idempotente de precipitaciones de Castilla (tabla
// public.precipitaciones, planta 'castilla') desde el CSV de Recursos Hídricos
// "Precipitacion diaria por pluviometro.csv" (formato largo, ADR-0037):
//
//   PLUV;Fecha;Mes;Año;Dia;Precipitacion     (Fecha = serie de Excel)
//
//   node scripts/gen_precip_castilla_sql.mjs --csv "ruta.csv" \
//        [--desde 2026-01-01] [--hasta 2026-09-27] [--meses-por-archivo 3]
//
// - Solo pluviómetros de la red (public/data/pluviometros_castilla.json).
// - Valida: la serie de Excel coincide con Año/Mes/Día, mm ≥ 0, sin duplicados.
// - Un archivo por bloque de meses (por defecto trimestres) para pegarlos en el
//   SQL Editor de Supabase sin pasarse de tamaño.
// - UUID determinista (sha1 de "precipitaciones:castilla<año>:<pluv>:<fecha>",
//   como gen_precip_sql.mjs) + `on conflict (id) do update` → correr dos veces
//   no duplica.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] ?? ""]);
    return acc;
  }, []),
);
if (!args.csv) throw new Error("Falta --csv");
const desde = args.desde || "2026-01-01";
const hasta = args.hasta || "9999-12-31";
const mesesPorArchivo = Number(args["meses-por-archivo"] || 3);
const AUTOR = "512d1415-6cf7-4d62-8a94-79afc7928d31"; // autor fijo de las cargas oficiales

const red = JSON.parse(
  readFileSync(resolve(repo, "public/data/pluviometros_castilla.json"), "utf8"),
);
const ids = new Set(red.map((p) => Number(p.id)));

function uuid(pluv, fecha) {
  const ns = `castilla${fecha.slice(0, 4)}`;
  const h = createHash("sha1")
    .update(`precipitaciones:${ns}:${pluv}:${fecha}`)
    .digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

/** Serie de Excel (días desde 1899-12-30) → YYYY-MM-DD. */
function serieAFecha(n) {
  return new Date(Date.UTC(1899, 11, 30) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

const texto = readFileSync(args.csv, "utf8").replace(/^﻿/, "");
const [encabezado, ...lineas] = texto.split(/\r?\n/);
if (!/^PLUV;Fecha;Mes;A.o;Dia;Precipitacion$/i.test(encabezado.trim()))
  throw new Error(`Encabezado inesperado: ${encabezado}`);

const filas = [];
const problemas = [];
const fueraDeRed = new Map();
const vistas = new Set();
for (const [i, linea] of lineas.entries()) {
  if (!linea.trim()) continue;
  const [p, serie, mes, anio, dia, mm] = linea.split(";");
  const pluv = Number(p);
  const fecha = `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  if (fecha < desde || fecha > hasta) continue;
  if (!ids.has(pluv)) {
    fueraDeRed.set(pluv, (fueraDeRed.get(pluv) ?? 0) + 1);
    continue;
  }
  if (serieAFecha(Number(serie)) !== fecha) {
    problemas.push(`línea ${i + 2}: serie ${serie} ≠ ${fecha}`);
    continue;
  }
  const v = Number(String(mm).trim().replace(",", "."));
  if (String(mm).trim() === "" || !Number.isFinite(v) || v < 0) {
    problemas.push(`línea ${i + 2}: PLUV ${pluv} ${fecha} mm inválido (${mm})`);
    continue;
  }
  const k = `${pluv}:${fecha}`;
  if (vistas.has(k)) {
    problemas.push(`línea ${i + 2}: PLUV ${pluv} ${fecha} repetido`);
    continue;
  }
  vistas.add(k);
  filas.push({ pluv, fecha, mm: v });
}
filas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.pluv - b.pluv);
if (!filas.length) throw new Error("No hay lecturas en el rango");

// Bloques de meses: 2026-01..03, 2026-04..06, …
const bloques = new Map();
for (const f of filas) {
  const m = Number(f.fecha.slice(5, 7));
  const ini = Math.floor((m - 1) / mesesPorArchivo) * mesesPorArchivo + 1;
  const clave = `${f.fecha.slice(0, 4)}-${String(ini).padStart(2, "0")}`;
  if (!bloques.has(clave)) bloques.set(clave, []);
  bloques.get(clave).push(f);
}

const nota = "Histórico Castilla (Recursos Hídricos)";
mkdirSync(resolve(repo, "scripts/out"), { recursive: true });
for (const fs of bloques.values()) {
  const primero = fs[0].fecha;
  const ultimo = fs[fs.length - 1].fecha;
  const pluvs = new Set(fs.map((f) => f.pluv));
  const total = fs.reduce((s, f) => s + f.mm, 0);
  const valores = fs.map(
    (f) => `('${uuid(f.pluv, f.fecha)}',${f.pluv},'${f.fecha}',${f.mm})`,
  );
  // `begin;` en la línea 1: si al pegar se pierde el inicio, falla de forma obvia.
  const sql = `begin;
-- Castilla: lluvia diaria ${primero} a ${ultimo}. Fuente: '${args.csv.split(/[\\/]/).pop()}'.
-- ${fs.length} lecturas, ${pluvs.size} pluviómetros, ${total.toFixed(1)} mm en total.
-- Idempotente (UUID determinista) + on conflict do update.
insert into public.precipitaciones (id, autor, planta, pluviometro, fecha, mm, nota, deleted, created_at, updated_at)
select v.id::uuid, '${AUTOR}', 'castilla', v.pluv, v.fecha::date, v.mm, '${nota}', false, now(), now()
from (values
${valores.join(",\n")}
) as v(id, pluv, fecha, mm)
on conflict (id) do update set mm = excluded.mm, nota = excluded.nota, updated_at = excluded.updated_at;
commit;
`;
  const out = resolve(
    repo,
    "scripts/out",
    `castilla_lluvia_${primero}_a_${ultimo}.sql`,
  );
  writeFileSync(out, sql);
  console.log(
    `OK → ${out}\n   ${fs.length} lecturas · ${pluvs.size} pluviómetros · ${total.toFixed(1)} mm · ${(sql.length / 1024).toFixed(0)} KB`,
  );
}
for (const [p, n] of fueraDeRed)
  console.log(`  omitido PLUV ${p} (no está en la red): ${n} lecturas`);
if (problemas.length) {
  console.log(`  AVISOS (${problemas.length}):`);
  for (const p of problemas.slice(0, 30)) console.log("   -", p);
}
