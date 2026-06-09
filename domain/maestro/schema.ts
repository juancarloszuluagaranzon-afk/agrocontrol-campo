import { z } from "zod";

/**
 * Información agronómica por suerte tomada del maestro de Riopaila (§5).
 * Indexada por `sec_ste`. Todos los campos pueden faltar (datos parciales).
 */
export const suerteMaestroSchema = z.object({
  variedad: z.string().nullable(),
  numero_corte: z.number().nullable(),
  uso: z.string().nullable(),
  fecha_siembra: z.string().nullable(),
  fecha_ultimo_corte: z.string().nullable(),
  fecha_proximo_corte: z.string().nullable(),
  edad_csv: z.number().nullable(),
  zona: z.number().nullable(),
  zona_agroecologica: z.string().nullable(),
  area_neta_ha: z.number().nullable(),
  tch_ppto: z.number().nullable(),
  toneladas_ppto: z.number().nullable(),
  toneladas_estimadas: z.number().nullable(),
  responsable_zona: z.string().nullable(),
  tecnico: z.string().nullable(),
  empresa: z.string().nullable(),
});
export type SuerteMaestro = z.infer<typeof suerteMaestroSchema>;

/** Mapa `sec_ste` → datos del maestro. */
export const maestroSchema = z.record(z.string(), suerteMaestroSchema);
export type Maestro = z.infer<typeof maestroSchema>;

/** Días promedio por mes (para edad fraccionaria, como el maestro). */
const DIAS_MES = 30.4375;

/**
 * Edad de la suerte en meses, **calculada en vivo**: meses transcurridos desde
 * la fecha de referencia (el último corte; o la siembra para caña planta) hasta
 * `hoy`. Devuelve null si no hay fecha. Nunca negativa.
 */
export function edadMeses(
  refISO: string | null,
  hoy: Date = new Date(),
): number | null {
  if (!refISO) return null;
  const [y, m, d] = refISO.split("-").map(Number);
  if (!y || !m || !d) return null;
  const ref = new Date(y, m - 1, d);
  const dias = (hoy.getTime() - ref.getTime()) / 86_400_000;
  return Math.max(0, Math.round((dias / DIAS_MES) * 10) / 10);
}
