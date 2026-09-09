// Resume, en Markdown, qué cambió en el maestro de Rio Map entre el commit
// HEAD y el árbol de trabajo (tras correr `scripts/import_maestro.mjs`). Lo usa
// el workflow "Sync maestro" para el cuerpo del PR (ADR-0032); también sirve a
// mano antes de abrir un PR de refresco:
//
//   node scripts/maestro_diff.mjs [sha-del-csv]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ARCHIVOS = [
  ["RIOP", "public/data/maestro_suertes.json"],
  ["CAST + CAUC", "public/data/maestro_castilla.json"],
];
const CAMPOS_RELEVANTES = [
  ["numero_corte", "nº corte"],
  ["fecha_ultimo_corte", "últ. corte"],
  ["fecha_proximo_corte", "próx. corte"],
  ["variedad", "variedad"],
  ["fecha_siembra", "siembra"],
  ["area_neta_ha", "área"],
  ["tecnico", "técnico"],
];

/** Mapa sec_ste → fila, tanto si el JSON es {suertes:{...}} como si es plano. */
function suertesDe(json) {
  const obj = JSON.parse(json);
  return obj && typeof obj === "object" && obj.suertes ? obj.suertes : obj;
}

function leerHead(ruta) {
  try {
    return execFileSync("git", ["show", `HEAD:${ruta}`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return "{}";
  }
}

const csvSha = process.argv[2];
const lineas = [];
lineas.push(
  "## Sincronización automática del maestro",
  "",
  `Regenerado desde el \`maestro.csv\` de maestro-riopaila${csvSha ? ` (commit \`${csvSha}\`)` : ""} con \`scripts/import_maestro.mjs\` (ADR-0032). Solo datos: no cambia código.`,
  "",
  "| Planta | Suertes | Nuevas | Retiradas | " +
    CAMPOS_RELEVANTES.map(([, t]) => `Δ ${t}`).join(" | ") +
    " |",
  "|---|---|---|---|" + CAMPOS_RELEVANTES.map(() => "---").join("|") + "|",
);
const detalle = [];
for (const [planta, ruta] of ARCHIVOS) {
  const antes = suertesDe(leerHead(ruta));
  const ahora = suertesDe(readFileSync(ruta, "utf8"));
  const nuevas = Object.keys(ahora).filter((k) => !(k in antes));
  const retiradas = Object.keys(antes).filter((k) => !(k in ahora));
  const conteo = Object.fromEntries(CAMPOS_RELEVANTES.map(([c]) => [c, 0]));
  for (const k of Object.keys(ahora)) {
    if (!(k in antes)) continue;
    for (const [c] of CAMPOS_RELEVANTES) {
      if (JSON.stringify(antes[k]?.[c]) !== JSON.stringify(ahora[k]?.[c]))
        conteo[c] += 1;
    }
  }
  lineas.push(
    `| ${planta} | ${Object.keys(ahora).length} | ${nuevas.length} | ${retiradas.length} | ` +
      CAMPOS_RELEVANTES.map(([c]) => conteo[c]).join(" | ") +
      " |",
  );
  if (nuevas.length)
    detalle.push(`- **Nuevas (${planta}):** ${nuevas.join(", ")}`);
  if (retiradas.length)
    detalle.push(`- **Retiradas (${planta}):** ${retiradas.join(", ")}`);
}
lineas.push(
  "",
  "Edad y uso se recalculan a la fecha del CSV, por eso el diff toca casi todas las filas.",
);
if (detalle.length) lineas.push("", ...detalle);
lineas.push(
  "",
  "Verificado en el workflow: `tests/unit/maestro.test.ts` (forma del JSON y cobertura de cartografía ≥ 90 %).",
);
process.stdout.write(lineas.join("\n") + "\n");
