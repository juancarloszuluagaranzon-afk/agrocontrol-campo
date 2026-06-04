import { z } from "zod";

/**
 * Esquemas de la capa de **tablones** (§8, §11). Una suerte (`sec_ste`) está
 * compuesta por uno o varios tablones; el tablón es la unidad de trabajo.
 * El área oficial es por tablón; la de la suerte = suma de sus tablones.
 */

/** Atributos de un tablón (properties del GeoJSON principal). */
export const tablonPropertiesSchema = z.object({
  tab_id: z.string(), // PK, ej. "3111-020-T3"
  sec_ste: z.string(), // suerte a la que pertenece, ej. "3111-020"
  suerte: z.string(),
  sector: z.string(),
  hacienda: z.string(),
  planta: z.string(),
  supervisor: z.string(),
  jefe_zona: z.string(),
  tablon: z.number(), // número del tablón dentro de la suerte (1..N)
  tablon_total: z.number(), // total de tablones de la suerte
  ha_oficial: z.number(), // área oficial del tablón
  lat: z.number(),
  lon: z.number(),
});
export type TablonProperties = z.infer<typeof tablonPropertiesSchema>;

/** Entrada del catálogo ligero (sin geometría) para buscador/autocompletar. */
export const catalogoEntrySchema = z.object({
  tab_id: z.string(),
  sec_ste: z.string(),
  hacienda: z.string(),
  sector: z.string(),
  tablon: z.number(),
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

export const tablonesGeojsonSchema = featureCollectionSchema(
  tablonPropertiesSchema,
);
