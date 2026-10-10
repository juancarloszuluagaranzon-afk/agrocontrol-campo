import type { Precipitacion } from "@/domain/precipitaciones/schema";

/**
 * Lluvia acumulada reciente por suerte (ADR-0034, adenda de lluvia): para decidir
 * a qué suertes se puede entrar a cosechar, lo más directo es cuánto llovió en
 * los últimos días sobre cada una. Cada suerte toma la lluvia del pluviómetro
 * cuyo polígono de Thiessen contiene su centro (o del más cercano si cae fuera).
 * Funciones puras: sin red, sin stores.
 */

export type DiasLluvia = 3 | 5 | 7;
export const OPCIONES_DIAS_LLUVIA: readonly DiasLluvia[] = [3, 5, 7];

/** Nivel de lluvia acumulada en la ventana (umbrales en mm, ver `NIVELES`). */
export type NivelLluvia = "seca" | "moderada" | "alta" | "sinDato";

export interface NivelLluviaInfo {
  id: NivelLluvia;
  etiqueta: string;
  color: string;
}

/**
 * Umbrales iniciales, a validar con Operaciones: hasta 5 mm se considera suelo
 * apto para entrar; de 5 a 15 mm, con precaución; más de 15 mm, mojado.
 */
export const LLUVIA_UMBRAL_MODERADA = 5;
export const LLUVIA_UMBRAL_ALTA = 15;

export const NIVELES_LLUVIA_SUERTE: readonly NivelLluviaInfo[] = [
  { id: "seca", etiqueta: "Hasta 5 mm", color: "#16a34a" },
  { id: "moderada", etiqueta: "De 5 a 15 mm", color: "#d97706" },
  { id: "alta", etiqueta: "Más de 15 mm", color: "#2563eb" },
  { id: "sinDato", etiqueta: "Sin lecturas", color: "#6b7280" },
];

export function nivelLluvia(mm: number | null): NivelLluvia {
  if (mm === null) return "sinDato";
  if (mm <= LLUVIA_UMBRAL_MODERADA) return "seca";
  if (mm <= LLUVIA_UMBRAL_ALTA) return "moderada";
  return "alta";
}

function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Ventana de `dias` días que **termina ayer**: la pluviometría se carga día
 * vencido, así que hoy todavía no tiene lectura. Fechas locales YYYY-MM-DD.
 */
export function ventanaLluvia(
  hoy: Date,
  dias: number,
): { desde: string; hasta: string; fechas: string[] } {
  const fechas: string[] = [];
  for (let i = dias; i >= 1; i--) {
    fechas.push(
      iso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i)),
    );
  }
  return { desde: fechas[0]!, hasta: fechas[fechas.length - 1]!, fechas };
}

type Anillo = number[][];

/** Punto dentro de un anillo (ray casting). */
function enAnillo(lon: number, lat: number, anillo: Anillo): boolean {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i] as [number, number];
    const [xj, yj] = anillo[j] as [number, number];
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/** Punto dentro de un polígono (exterior menos huecos). */
export function puntoEnPoligono(
  lon: number,
  lat: number,
  poligono: Anillo[],
): boolean {
  const [exterior, ...huecos] = poligono;
  if (!exterior || !enAnillo(lon, lat, exterior)) return false;
  return !huecos.some((h) => enAnillo(lon, lat, h));
}

export interface PoligonoThiessen {
  pluviometro: number;
  /** Polígono GeoJSON (lista de anillos) o MultiPolygon (lista de polígonos). */
  poligonos: Anillo[][];
}

export interface CentroSuerte {
  sec_ste: string;
  lon: number;
  lat: number;
}

/**
 * Centro de cada suerte: promedio de los centros de sus tablones ponderado por
 * área (un tablón grande pesa más). Entradas del catálogo de tablones.
 */
export function centrosDeSuertes(
  tablones: ReadonlyArray<{
    sec_ste: string;
    lon: number;
    lat: number;
    ha: number;
  }>,
): CentroSuerte[] {
  const acc = new Map<string, { lon: number; lat: number; peso: number }>();
  for (const t of tablones) {
    const w = t.ha > 0 ? t.ha : 1;
    const a = acc.get(t.sec_ste) ?? { lon: 0, lat: 0, peso: 0 };
    a.lon += t.lon * w;
    a.lat += t.lat * w;
    a.peso += w;
    acc.set(t.sec_ste, a);
  }
  return [...acc].map(([sec_ste, a]) => ({
    sec_ste,
    lon: a.lon / a.peso,
    lat: a.lat / a.peso,
  }));
}

/**
 * Pluviómetro de cada suerte: el polígono de Thiessen que contiene su centro;
 * si cae fuera de todos (bordes de la red), el pluviómetro más cercano.
 */
export function asignarPluviometros(
  centros: ReadonlyArray<CentroSuerte>,
  thiessen: ReadonlyArray<PoligonoThiessen>,
  pluviometros: ReadonlyArray<{ id: number; lon: number; lat: number }>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of centros) {
    const t = thiessen.find((p) =>
      p.poligonos.some((pol) => puntoEnPoligono(c.lon, c.lat, pol)),
    );
    if (t) {
      out.set(c.sec_ste, t.pluviometro);
      continue;
    }
    let mejor: number | null = null;
    let dmin = Infinity;
    for (const p of pluviometros) {
      const d = (p.lon - c.lon) ** 2 + (p.lat - c.lat) ** 2;
      if (d < dmin) {
        dmin = d;
        mejor = p.id;
      }
    }
    if (mejor !== null) out.set(c.sec_ste, mejor);
  }
  return out;
}

export interface LluviaSuerte {
  pluviometro: number;
  /** mm acumulados en la ventana, o `null` si no hay ninguna lectura. */
  mm: number | null;
  /** Días de la ventana con lectura (para avisar si faltan días). */
  diasConDato: number;
  dias: number;
}

/**
 * Lluvia acumulada en la ventana para cada suerte asignada. Si un día tiene
 * varias lecturas (distintos autores), se toma la más reciente.
 */
export function lluviaPorSuerte(
  items: ReadonlyArray<Precipitacion>,
  planta: string,
  asignacion: ReadonlyMap<string, number>,
  fechas: ReadonlyArray<string>,
): Map<string, LluviaSuerte> {
  const enVentana = new Set(fechas);
  // pluviómetro → fecha → lectura más reciente
  const porPluv = new Map<number, Map<string, Precipitacion>>();
  for (const p of items) {
    if (p.deleted || p.planta !== planta || !enVentana.has(p.fecha)) continue;
    const dias = porPluv.get(p.pluviometro) ?? new Map<string, Precipitacion>();
    const prev = dias.get(p.fecha);
    if (!prev || p.updated_at > prev.updated_at) dias.set(p.fecha, p);
    porPluv.set(p.pluviometro, dias);
  }
  const out = new Map<string, LluviaSuerte>();
  for (const [sec, pluv] of asignacion) {
    const dias = porPluv.get(pluv);
    const n = dias?.size ?? 0;
    let mm: number | null = null;
    if (dias && n > 0) {
      let total = 0;
      for (const p of dias.values()) total += p.mm;
      mm = Math.round(total * 10) / 10;
    }
    out.set(sec, {
      pluviometro: pluv,
      mm,
      diasConDato: n,
      dias: fechas.length,
    });
  }
  return out;
}

/** Texto de la etiqueta en el mapa: "12 mm", "12 mm*" si faltan días, "s/d". */
export function etiquetaLluvia(l: LluviaSuerte): string {
  if (l.mm === null) return "s/d";
  const mm = l.mm.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return `${mm} mm${l.diasConDato < l.dias ? "*" : ""}`;
}
