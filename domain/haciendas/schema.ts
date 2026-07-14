import { z } from "zod";
import { HACIENDA_COLORS, HACIENDA_DEFAULT } from "@/lib/geo/haciendas";

/**
 * Punto de etiqueta de una hacienda para la marca de agua del modo Plano
 * (§ADR-0014). Precomputado por `scripts/generar_etiquetas_haciendas.mjs`.
 */
export const haciendaLabelSchema = z.object({
  hacienda: z.string(),
  lat: z.number(),
  lon: z.number(),
});
export type HaciendaLabel = z.infer<typeof haciendaLabelSchema>;
export const haciendaLabelListSchema = z.array(haciendaLabelSchema);

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}

/**
 * Oscurece y satura un color hex (vía HSL) para usarlo como texto legible
 * sobre el propio relleno translúcido de la hacienda en modo Plano.
 */
export function darkenSaturate(
  hex: string,
  lFactor = 0.62,
  sBoost = 1.15,
): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, Math.min(1, s * sBoost), l * lFactor);
  return rgbToHex(nr, ng, nb);
}

/** Color del texto de marca de agua para una hacienda (paleta oscurecida). */
export function haciendaLabelColor(hacienda: string): string {
  return darkenSaturate(HACIENDA_COLORS[hacienda] ?? HACIENDA_DEFAULT);
}

/**
 * Expresión MapLibre `match`, paralela a `haciendaMatchExpression()` pero con
 * los colores oscurecidos — para usar directo como `text-color`.
 */
export function haciendaLabelColorExpression(): unknown[] {
  const pairs = Object.entries(HACIENDA_COLORS).flatMap(([h, c]) => [
    h,
    darkenSaturate(c),
  ]);
  return [
    "match",
    ["get", "hacienda"],
    ...pairs,
    darkenSaturate(HACIENDA_DEFAULT),
  ];
}
