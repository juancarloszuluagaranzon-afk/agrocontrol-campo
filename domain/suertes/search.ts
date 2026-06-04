import type { CatalogoEntry } from "@/domain/suertes/schema";

/** Normaliza para comparación: minúsculas y sin acentos. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Busca tablones por `tab_id`, `sec_ste` o `hacienda` (§5, buscador).
 *
 * - Coincidencia por subcadena, sin acentos ni mayúsculas.
 * - Prioriza coincidencias de código (tab_id / sec_ste) sobre hacienda.
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
    const tab = norm(entry.tab_id);
    const sec = norm(entry.sec_ste);
    const hac = norm(entry.hacienda);
    let score = -1;
    if (sec.startsWith(q) || tab.startsWith(q)) score = 0;
    else if (tab.includes(q)) score = 1;
    else if (hac.startsWith(q)) score = 2;
    else if (hac.includes(q)) score = 3;
    if (score >= 0) scored.push({ entry, score });
  }

  scored.sort(
    (a, b) => a.score - b.score || a.entry.tab_id.localeCompare(b.entry.tab_id),
  );
  return scored.slice(0, limit).map((s) => s.entry);
}
