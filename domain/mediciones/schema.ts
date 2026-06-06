import { z } from "zod";
import type { Geometry } from "geojson";

/** Tipos de medición que se pueden guardar (§5). */
export const MEDICION_TIPOS = ["area", "distancia"] as const;
export type MedicionTipo = (typeof MEDICION_TIPOS)[number];

/** Lo que captura el usuario al guardar. */
export const medicionInputSchema = z.object({
  nombre: z.string().min(1, "Ponle un nombre"),
});
export type MedicionInput = z.infer<typeof medicionInputSchema>;

/** Datos derivados de la medición en curso (no los teclea el usuario). */
export interface MedicionDatos {
  tipo: MedicionTipo;
  /** valor numérico (ha si área, m si distancia) */
  valor: number;
  unidad: string;
  /** geometría de la forma medida (Polygon o LineString) */
  geom: Geometry;
  /** centroide para "ir" */
  lat: number;
  lon: number;
}

/** Medición guardada (persistida). */
export const medicionSchema = z.object({
  id: z.string(),
  autor: z.string(),
  nombre: z.string(),
  tipo: z.enum(MEDICION_TIPOS),
  valor: z.number(),
  unidad: z.string(),
  geom: z.custom<Geometry>((v) => typeof v === "object" && v !== null),
  lat: z.number(),
  lon: z.number(),
  deleted: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Medicion = z.infer<typeof medicionSchema>;
