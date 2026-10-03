import {
  edadSuerteMeses,
  type Maestro,
  type SuerteMaestro,
} from "@/domain/maestro/schema";

/**
 * Capa "Edad de la caña" (ADR-0034): agrupa las suertes por rango de edad para
 * pintarlas en el mapa. Pedido de Operaciones Castilla: menor a 4 meses, de 4 a
 * 10 meses (ambos inclusive) y mayor a 10 meses, un color por rango.
 */
export type RangoEdad = "joven" | "media" | "madura" | "sinDato";

export interface RangoEdadInfo {
  id: RangoEdad;
  etiqueta: string;
  color: string;
}

/** Orden de la leyenda. Ámbar = caña próxima a cosecha. */
export const RANGOS_EDAD: readonly RangoEdadInfo[] = [
  { id: "joven", etiqueta: "Menor a 4 meses", color: "#a3e635" },
  { id: "media", etiqueta: "De 4 a 10 meses", color: "#15803d" },
  { id: "madura", etiqueta: "Mayor a 10 meses", color: "#f59e0b" },
  { id: "sinDato", etiqueta: "Renovación / sin dato", color: "#9ca3af" },
];

/** Límites en meses: [0, 4) joven · [4, 10] media · (10, ∞) madura. */
export const EDAD_LIMITE_JOVEN = 4;
export const EDAD_LIMITE_MADURA = 10;

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
  return "madura";
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
    sinDato: [],
  };
  const hectareas: Record<RangoEdad, number> = {
    joven: 0,
    media: 0,
    madura: 0,
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
 * tablón; transparente si la suerte no es caña o no está en el maestro.
 */
export function expresionColorEdad(resumen: ResumenEdad): unknown {
  const ramas: unknown[] = [];
  for (const r of RANGOS_EDAD) {
    const secs = resumen.suertes[r.id];
    if (secs.length === 0) continue;
    ramas.push(secs, r.color);
  }
  if (ramas.length === 0) return "rgba(0,0,0,0)";
  return ["match", ["get", "sec_ste"], ...ramas, "rgba(0,0,0,0)"];
}
