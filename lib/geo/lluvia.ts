import type { ExpressionSpecification } from "maplibre-gl";

/**
 * Niveles de intensidad de lluvia (mm/día) para pintar los pluviómetros como
 * "gotas" de colores (estilo Gotas). Fuente única de umbrales: de aquí salen
 * tanto los iconos que se registran en el mapa como la expresión `step` que
 * elige la gota por mm — así no se duplican los cortes.
 */
export interface NivelLluvia {
  /** Límite superior EXCLUSIVO del nivel en mm (Infinity = último). */
  max: number;
  /** Color de la gota. */
  color: string;
  /** Nombre del icono registrado con `map.addImage`. */
  icon: string;
}

export const NIVELES_LLUVIA: NivelLluvia[] = [
  { max: 0.1, color: "#94a3b8", icon: "gota-0" }, // sin lluvia (gris)
  { max: 10, color: "#7dd3fc", icon: "gota-1" }, // ligera (celeste)
  { max: 25, color: "#38bdf8", icon: "gota-2" }, // moderada (azul)
  { max: 50, color: "#2563eb", icon: "gota-3" }, // fuerte (azul oscuro)
  { max: Infinity, color: "#7c3aed", icon: "gota-4" }, // extrema (morado)
];

/** Nivel correspondiente a unos mm (el primero cuyo `max` lo supera). */
export function nivelLluvia(mm: number): NivelLluvia {
  return (
    NIVELES_LLUVIA.find((n) => mm < n.max) ??
    NIVELES_LLUVIA[NIVELES_LLUVIA.length - 1]!
  );
}

/**
 * Expresión MapLibre `step` que elige el icono de gota según la propiedad `mm`.
 * Se construye desde `NIVELES_LLUVIA` para mantener los umbrales en un solo sitio.
 */
export function iconoGotaStep(): ExpressionSpecification {
  const expr: (string | number | ExpressionSpecification)[] = [
    "step",
    ["get", "mm"],
    NIVELES_LLUVIA[0]!.icon,
  ];
  for (let i = 1; i < NIVELES_LLUVIA.length; i++) {
    expr.push(NIVELES_LLUVIA[i - 1]!.max, NIVELES_LLUVIA[i]!.icon);
  }
  return expr as unknown as ExpressionSpecification;
}
