import type { CatalogoEntry } from "@/domain/suertes/schema";

/**
 * Consulta del Maestro (§ ADR-0019). El catálogo trae una entrada por **tablón**;
 * la consulta del maestro razona por **suerte** (`sec_ste`). Aquí se agrupa el
 * catálogo en un resumen por suerte y se busca por código o hacienda, con la
 * misma normalización/prioridad que el buscador del mapa (`domain/suertes/search`).
 * Funciones puras (capa de dominio, testeables).
 */

/** Resumen de una suerte para la lista/ficha del Maestro. */
export interface SuerteResumen {
  sec_ste: string;
  hacienda: string;
  sector: string;
  /** Área oficial de la suerte = suma de las áreas de sus tablones. */
  ha: number;
  /** Punto representativo (promedio de los tablones), para volar en el mapa. */
  lat: number;
  lon: number;
  /** `tab_id` del primer tablón: destino del `flyTo` (resalta ese tablón). */
  tabId: string;
  /** Número de tablones de la suerte. */
  tablones: number;
}

/** Normaliza para comparación: minúsculas y sin acentos (igual que el buscador). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Agrupa el catálogo (una entrada por tablón) en un resumen por suerte:
 * hacienda/sector del primer tablón, `ha` = suma de tablones y `lat/lon` = punto
 * representativo (promedio). Ordena por `sec_ste`.
 */
export function agruparSuertes(
  catalogo: readonly CatalogoEntry[],
): SuerteResumen[] {
  const acc = new Map<
    string,
    { first: CatalogoEntry; ha: number; lat: number; lon: number; n: number }
  >();
  for (const e of catalogo) {
    const cur = acc.get(e.sec_ste);
    if (cur) {
      cur.ha += e.ha;
      cur.lat += e.lat;
      cur.lon += e.lon;
      cur.n += 1;
    } else {
      acc.set(e.sec_ste, { first: e, ha: e.ha, lat: e.lat, lon: e.lon, n: 1 });
    }
  }

  const out: SuerteResumen[] = [];
  for (const [sec_ste, v] of acc) {
    out.push({
      sec_ste,
      hacienda: v.first.hacienda,
      sector: v.first.sector,
      ha: v.ha,
      lat: v.lat / v.n,
      lon: v.lon / v.n,
      tabId: v.first.tab_id,
      tablones: v.n,
    });
  }
  out.sort((a, b) => a.sec_ste.localeCompare(b.sec_ste));
  return out;
}

/**
 * Filtra el resumen por `sec_ste` o hacienda. Misma prioridad que el buscador:
 * código (prefijo > subcadena) sobre hacienda (prefijo > subcadena). Con query
 * vacía devuelve todo (ya ordenado), acotado a `limit`.
 */
export function buscarSuertes(
  resumenes: readonly SuerteResumen[],
  query: string,
  limit = 50,
): SuerteResumen[] {
  const q = norm(query.trim());
  if (!q) return resumenes.slice(0, limit);

  const scored: { s: SuerteResumen; score: number }[] = [];
  for (const s of resumenes) {
    const sec = norm(s.sec_ste);
    const hac = norm(s.hacienda);
    let score = -1;
    if (sec.startsWith(q)) score = 0;
    else if (sec.includes(q)) score = 1;
    else if (hac.startsWith(q)) score = 2;
    else if (hac.includes(q)) score = 3;
    if (score >= 0) scored.push({ s, score });
  }
  scored.sort(
    (a, b) => a.score - b.score || a.s.sec_ste.localeCompare(b.s.sec_ste),
  );
  return scored.slice(0, limit).map((x) => x.s);
}
