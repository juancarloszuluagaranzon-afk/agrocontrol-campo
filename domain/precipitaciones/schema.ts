import { z } from "zod";

/**
 * Lectura diaria de precipitación (lluvia) en un pluviómetro. La capturan los
 * administradores de finca; es un dato compartido (toda la empresa lo ve).
 */

/** Datos que captura el usuario en el formulario. */
export const precipitacionInputSchema = z.object({
  /** ID del pluviómetro (campo `Pluviometr` del GeoJSON: 207, 208, …). */
  // Un campo sin elegir llega como NaN (valueAsNumber); el error base lo captura.
  pluviometro: z
    .number({ error: "Elige un pluviómetro" })
    .int()
    .positive("Elige un pluviómetro"),
  /** Día de la lectura (YYYY-MM-DD). */
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  /** Milímetros de lluvia (0 es válido: no llovió). */
  mm: z
    .number({ error: "Ingresa los milímetros" })
    .min(0, "No puede ser negativa")
    .max(999.99, "Valor demasiado alto"),
  nota: z.string(),
});
export type PrecipitacionInput = z.infer<typeof precipitacionInputSchema>;

/** Lectura completa (persistida + sincronizada). */
export const precipitacionSchema = precipitacionInputSchema.extend({
  id: z.string(),
  autor: z.string(),
  planta: z.string(),
  deleted: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Precipitacion = z.infer<typeof precipitacionSchema>;
