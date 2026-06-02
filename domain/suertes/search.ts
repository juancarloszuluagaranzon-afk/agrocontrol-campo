import type { CatalogoEntry } from "@/domain/suertes/schema";

/** Normaliza para comparación: minúsculas y sin acentos. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Busca suertes por `sec_ste` o `hacienda` (§5, buscador).
 *
 * - Coincidencia por subcadena, sin acentos ni mayúsculas.
 * - Prioriza coincidencias de código que empiezan por la consulta.
 * - Función pura (capa de dominio, testeable).
 */
export function searchCatalogo(
  entries: readonly CatalogoEntry[],
  query: string,
  limit = 10,
): CatalogoEntry[] {
  const q = norm(query.trim());
  if (!q) return [];

  const scored: { entry: CatalogoEntry; score: number }[] = [];
  for (const entry of entries) {
    const code = norm(entry.sec_ste);
    const hac = norm(entry.hacienda);
    let score = -1;
    if (code.startsWith(q)) score = 0;
    else if (code.includes(q)) score = 1;
    else if (hac.startsWith(q)) score = 2;
    else if (hac.includes(q)) score = 3;
    if (score >= 0) scored.push({ entry, score });
  }

  scored.sort(
    (a, b) =>
      a.score - b.score || a.entry.sec_ste.localeCompare(b.entry.sec_ste),
  );
  return scored.slice(0, limit).map((s) => s.entry);
}
