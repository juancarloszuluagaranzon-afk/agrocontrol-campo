import { z } from "zod";

/**
 * Lecturas hidrológicas por técnico: nivel de río (cota, en metros) en puntos
 * de monitoreo con nombre propio, y evaporación (mm, un valor por técnico/día,
 * sin punto físico). Cobertura parcial: solo los técnicos con puntos asignados
 * en `puntos_hidrologicos_riopaila.json` (ver ADR-0012).
 */

export const TIPO_LECTURA = ["nivel_rio", "evaporacion"] as const;
export type TipoLectura = (typeof TIPO_LECTURA)[number];

/** Punto de referencia (técnico asignado + umbrales opcionales de alerta). */
export const puntoHidrologicoRefSchema = z.object({
  punto: z.string(),
  tipo: z.enum(TIPO_LECTURA),
  tecnico: z.string().nullable(),
  zona: z.union([z.number(), z.string()]).nullable(),
  /** Umbrales en la misma unidad que `valor` (m para nivel_rio); null = sin definir. */
  alerta: z.number().nullable(),
  critico: z.number().nullable(),
  emergencia: z.number().nullable(),
});
export type PuntoHidrologicoRef = z.infer<typeof puntoHidrologicoRefSchema>;

export const puntosHidrologicosRefSchema = z.array(puntoHidrologicoRefSchema);

/** Unidad de despliegue según el tipo de lectura. */
export function unidadLectura(tipo: TipoLectura): string {
  return tipo === "nivel_rio" ? "m" : "mm";
}

/** Etiqueta legible del punto para el formulario. */
export function etiquetaPunto(p: PuntoHidrologicoRef): string {
  return p.tipo === "evaporacion" ? "Evaporación" : p.punto;
}

/** Severidad de una lectura de nivel de río frente a los umbrales del punto. */
export const NIVEL_SEVERIDAD = [
  "normal",
  "alerta",
  "critico",
  "emergencia",
] as const;
export type NivelSeveridad = (typeof NIVEL_SEVERIDAD)[number];

/**
 * Compara `valor` contra los umbrales del punto (mayor severidad primero).
 * Sin umbrales definidos (o si el punto no es de nivel_rio) → siempre "normal".
 */
export function nivelAlerta(
  valor: number,
  punto: Pick<
    PuntoHidrologicoRef,
    "tipo" | "alerta" | "critico" | "emergencia"
  >,
): NivelSeveridad {
  if (punto.tipo !== "nivel_rio") return "normal";
  if (punto.emergencia != null && valor >= punto.emergencia)
    return "emergencia";
  if (punto.critico != null && valor >= punto.critico) return "critico";
  if (punto.alerta != null && valor >= punto.alerta) return "alerta";
  return "normal";
}

/** Datos que captura el usuario en el formulario. */
export const lecturaHidroInputSchema = z.object({
  punto: z.string().min(1),
  tipo: z.enum(TIPO_LECTURA),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  valor: z.number().finite(),
  nota: z.string(),
});
export type LecturaHidroInput = z.infer<typeof lecturaHidroInputSchema>;

/** Lectura completa (persistida + sincronizada). */
export const lecturaHidroSchema = lecturaHidroInputSchema.extend({
  id: z.string(),
  autor: z.string(),
  planta: z.string(),
  deleted: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type LecturaHidro = z.infer<typeof lecturaHidroSchema>;
