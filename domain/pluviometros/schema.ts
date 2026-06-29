import { z } from "zod";

/**
 * Pluviómetro de referencia (red de Riopaila): id de estación + a qué técnico,
 * zona, hacienda y sitio pertenece, su área de influencia (Thiessen) y su
 * ubicación. Generado por `scripts/convertir_pluviometros.py` (Excel + geojson).
 */
export const pluviometroRefSchema = z.object({
  id: z.number().int(),
  zona: z.union([z.number(), z.string()]).nullable(),
  tecnico: z.string().nullable(),
  hacienda: z.string().nullable(),
  sitio: z.string().nullable(),
  area_ha: z.number().nullable(),
  lat: z.number(),
  lon: z.number(),
});
export type PluviometroRef = z.infer<typeof pluviometroRefSchema>;

export const pluviometrosRefSchema = z.array(pluviometroRefSchema);

/** Etiqueta legible de un pluviómetro para la planilla: "Hacienda · Sitio". */
export function etiquetaPluviometro(p: PluviometroRef): string {
  return [p.hacienda, p.sitio].filter(Boolean).join(" · ") || `PV ${p.id}`;
}
