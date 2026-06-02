import { z } from "zod";

/**
 * Esquemas de validación de la capa de suertes y el catálogo (§8, §11).
 *
 * Se usan para validar en el borde los GeoJSON/JSON estáticos antes de pintarlos
 * o cargarlos a Supabase. Los tipos de dominio se derivan de estos esquemas
 * (única fuente de verdad).
 */

/** Atributos oficiales de una suerte (properties del GeoJSON principal). */
export const suertePropertiesSchema = z.object({
  sec_ste: z.string(), // PK, ej. "3110-090"
  suerte: z.string().nullable(),
  sector: z.string().nullable(),
  hacienda: z.string().nullable(),
  planta: z.string().nullable(),
  supervisor: z.string().nullable(),
  jefe_zona: z.string().nullable(),
  ha_oficial: z.number(), // autoridad de área
  ha_geom: z.number().optional(),
  lat: z.number(),
  lon: z.number(),
});
export type SuerteProperties = z.infer<typeof suertePropertiesSchema>;

/** Entrada del catálogo ligero (sin geometría) para buscador/autocompletar. */
export const catalogoEntrySchema = z.object({
  sec_ste: z.string(),
  hacienda: z.string(),
  sector: z.string(),
  ha: z.number(),
  lat: z.number(),
  lon: z.number(),
});
export type CatalogoEntry = z.infer<typeof catalogoEntrySchema>;

export const catalogoSchema = z.array(catalogoEntrySchema);

/**
 * Validación ligera de una FeatureCollection GeoJSON. No valida la geometría a
 * fondo (eso lo hace MapLibre/Turf); sólo garantiza la forma básica y permite
 * tipar las `properties` por capa.
 */
export function featureCollectionSchema<P extends z.ZodTypeAny>(properties: P) {
  return z.object({
    type: z.literal("FeatureCollection"),
    name: z.string().optional(),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        properties,
        geometry: z.object({
          type: z.string(),
          coordinates: z.unknown(),
        }),
      }),
    ),
  });
}

export const suertesGeojsonSchema = featureCollectionSchema(
  suertePropertiesSchema,
);
