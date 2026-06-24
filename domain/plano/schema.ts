import { z } from "zod";

/** Punto geográfico [lon, lat]. */
export const lonLatSchema = z.tuple([z.number(), z.number()]);
export type LonLat = z.infer<typeof lonLatSchema>;

/** Un punto de muestreo del plano (extraído del GeoPDF o marcado a mano). */
export const puntoMuestreoSchema = z.object({
  id: z.string(),
  lat: z.number(),
  lon: z.number(),
  muestreado: z.boolean().default(false),
});
export type PuntoMuestreo = z.infer<typeof puntoMuestreoSchema>;

/**
 * Metadatos del "Plano de campo" cargado (GeoPDF de muestreo). La imagen va a
 * IndexedDB (por `imageKey`); aquí solo la metadata liviana, validada en el borde.
 */
export const planoMetaSchema = z.object({
  nombre: z.string(),
  imageKey: z.string(),
  /** 4 esquinas para el image source de MapLibre (TL, TR, BR, BL). */
  coordinates: z.tuple([
    lonLatSchema,
    lonLatSchema,
    lonLatSchema,
    lonLatSchema,
  ]),
  /** [minLon, minLat, maxLon, maxLat]. */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  opacity: z.number().min(0).max(1),
  puntos: z.array(puntoMuestreoSchema).default([]),
});
export type PlanoMeta = z.infer<typeof planoMetaSchema>;
