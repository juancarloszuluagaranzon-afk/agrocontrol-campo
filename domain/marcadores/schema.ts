import { z } from "zod";

/** Colores disponibles para un marcador. */
export const MARCADOR_COLORS = [
  "#ef4444", // rojo
  "#f59e0b", // ámbar
  "#22c55e", // verde
  "#3b82f6", // azul
  "#a855f7", // morado
  "#ec4899", // rosa
] as const;

/** Datos que captura el usuario. */
export const marcadorInputSchema = z.object({
  nombre: z.string().min(1, "Ponle un nombre"),
  nota: z.string(),
  color: z.string(),
});
export type MarcadorInput = z.infer<typeof marcadorInputSchema>;

/** Marcador completo (persistido). */
export const marcadorSchema = marcadorInputSchema.extend({
  id: z.string(),
  user_id: z.string(),
  lat: z.number(),
  lon: z.number(),
  deleted: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Marcador = z.infer<typeof marcadorSchema>;
