import {
  edadSuerteMeses,
  type Maestro,
  type SuerteMaestro,
} from "@/domain/maestro/schema";

/**
 * Capa "Edad de la caña" (ADR-0034): agrupa las suertes por rango de edad para
 * pintarlas en el mapa. Pedido de Operaciones Castilla: menor a 4 meses, de 4 a
 * 10 meses (ambos inclusive), de 10 a 11,8 y para cosecha (11,8 o más), un color
 * por rango (el corte de cosecha lo fijó el usuario el 6-oct-2026).
 */
export type RangoEdad = "joven" | "media" | "madura" | "cosecha" | "sinDato";

export interface RangoEdadInfo {
  id: RangoEdad;
  etiqueta: string;
  color: string;
}

/** Orden de la leyenda. Ámbar = próxima a cosecha; rojo = para cosecha. */
export const RANGOS_EDAD: readonly RangoEdadInfo[] = [
  { id: "joven", etiqueta: "Menor a 4 meses", color: "#a3e635" },
  { id: "media", etiqueta: "De 4 a 10 meses", color: "#15803d" },
  { id: "madura", etiqueta: "De 10 a 11,8 meses", color: "#f59e0b" },
  {
    id: "cosecha",
    etiqueta: "Para cosecha (11,8 meses o más)",
    color: "#dc2626",
  },
  { id: "sinDato", etiqueta: "Renovación / sin dato", color: "#9ca3af" },
];

/**
 * Límites en meses: [0, 4) joven · [4, 10] media · (10, 11,8) madura ·
 * [11,8, ∞) para cosecha. La edad es la de la ficha (redondeada a 1 decimal),
 * así lo que la ficha muestra como 11,8 cae en "para cosecha".
 */
export const EDAD_LIMITE_JOVEN = 4;
export const EDAD_LIMITE_MADURA = 10;
export const EDAD_LIMITE_COSECHA = 11.8;

function esCana(uso: string | null): boolean {
  const u = (uso ?? "").toUpperCase();
  return u === "CAÑA" || u === "CANA";
}

function esRenovacion(variedad: string | null): boolean {
  return (variedad ?? "").toUpperCase().startsWith("RENOVACI");
}

/**
 * Rango de edad de una suerte, o `null` si no es caña (arroz, semilla…: sin
 * color). Renovación y suertes sin fecha de siembra ni de corte van a
 * `sinDato`, para no esconderlas dentro de "menor a 4". La edad es la misma
 * que muestra la ficha del maestro (`edadSuerteMeses`, en vivo).
 */
export function rangoEdad(
  info: Pick<
    SuerteMaestro,
    "uso" | "variedad" | "fecha_siembra" | "fecha_ultimo_corte"
  >,
  hoy: Date = new Date(),
): RangoEdad | null {
  if (!esCana(info.uso)) return null;
  if (esRenovacion(info.variedad)) return "sinDato";
  if (!info.fecha_siembra && !info.fecha_ultimo_corte) return "sinDato";
  const meses = edadSuerteMeses(info, hoy);
  if (meses < EDAD_LIMITE_JOVEN) return "joven";
  if (meses <= EDAD_LIMITE_MADURA) return "media";
  if (meses < EDAD_LIMITE_COSECHA) return "madura";
  return "cosecha";
}

export interface ResumenEdad {
  /** `sec_ste` de cada rango (para la expresión de color del mapa). */
  suertes: Record<RangoEdad, string[]>;
  /** Hectáreas netas por rango (para la leyenda). */
  hectareas: Record<RangoEdad, number>;
}

/** Clasifica todo el maestro de la planta activa. */
export function resumirEdades(
  maestro: Maestro,
  hoy: Date = new Date(),
): ResumenEdad {
  const suertes: Record<RangoEdad, string[]> = {
    joven: [],
    media: [],
    madura: [],
    cosecha: [],
    sinDato: [],
  };
  const hectareas: Record<RangoEdad, number> = {
    joven: 0,
    media: 0,
    madura: 0,
    cosecha: 0,
    sinDato: 0,
  };
  for (const [sec, info] of Object.entries(maestro)) {
    const r = rangoEdad(info, hoy);
    if (!r) continue;
    suertes[r].push(sec);
    hectareas[r] += info.area_neta_ha ?? 0;
  }
  return { suertes, hectareas };
}

/**
 * Expresión `fill-color` de MapLibre: color del rango según `sec_ste` del
 * tablón; transparente si la suerte no es caña, no está en el maestro o su
 * rango está apagado en `activos` (por defecto, todos encendidos).
 */
export function expresionColorEdad(
  resumen: ResumenEdad,
  activos?: Partial<Record<RangoEdad, boolean>>,
): unknown {
  const ramas: unknown[] = [];
  for (const r of RANGOS_EDAD) {
    // Rango apagado en la leyenda: sin color (solo contorno), ADR-0034.
    if (activos && activos[r.id] === false) continue;
    const secs = resumen.suertes[r.id];
    if (secs.length === 0) continue;
    ramas.push(secs, r.color);
  }
  if (ramas.length === 0) return "rgba(0,0,0,0)";
  return ["match", ["get", "sec_ste"], ...ramas, "rgba(0,0,0,0)"];
}

/** Velo sobre las suertes fuera del filtro cuando hay un índice encendido. */
export const VELO_EDAD = "#0a0f1a";

/**
 * Modo índice (ADR-0034, adenda): con un índice satelital encendido, la capa de
 * edad deja de rellenar con su color y **vela** todo lo que no está en un rango
 * encendido, para que el índice se vea solo dentro de las suertes filtradas.
 * Las suertes filtradas quedan transparentes (se ve el índice); el resto, con
 * velo. Sin ningún rango encendido, todo queda velado.
 */
export function expresionVeloEdad(
  resumen: ResumenEdad,
  activos?: Partial<Record<RangoEdad, boolean>>,
): unknown {
  const visibles: string[] = [];
  for (const r of RANGOS_EDAD) {
    if (activos && activos[r.id] === false) continue;
    visibles.push(...resumen.suertes[r.id]);
  }
  if (visibles.length === 0) return VELO_EDAD;
  return ["match", ["get", "sec_ste"], visibles, "rgba(0,0,0,0)", VELO_EDAD];
}
