import { z } from "zod";

export const respuestaEncuestaInputSchema = z.object({
  estrellas: z.number().int().min(1).max(5),
  comentario: z.string(),
});
export type RespuestaEncuestaInput = z.infer<
  typeof respuestaEncuestaInputSchema
>;

export const respuestaEncuestaSchema = respuestaEncuestaInputSchema.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
});
export type RespuestaEncuesta = z.infer<typeof respuestaEncuestaSchema>;
