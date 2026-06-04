import { z } from "zod";

/** Tipos de maquinaria amarilla habituales (§19). Lista editable. */
export const TIPOS_MAQUINA = [
  "Retroexcavadora 130 (oruga)",
  "Retroexcavadora Doosan",
  "Bulldozer",
  "Motoniveladora",
  "Vibrocompactador",
  "Cargador",
] as const;

/** Labores de campo habituales (§19). */
export const LABORES = [
  "Rectificación de drenaje",
  "Limpieza de corona",
  "Construcción de canal",
  "Nivelación",
  "Adecuación de vía",
  "Descapote",
] as const;

export const ZONAS = [1, 2] as const;

/** Datos que captura el usuario en el formulario. */
export const equipoInputSchema = z.object({
  tipo: z.string().min(1, "Selecciona el tipo de máquina"),
  identificacion: z.string().min(1, "Indica la identificación/placa"),
  operador: z.string().min(1, "Indica el operador"),
  tab_id: z.string().min(1, "Selecciona el tablón"),
  labor: z.string().min(1, "Indica la labor"),
  zona: z.union([z.literal(1), z.literal(2)]),
  avance: z.number().min(0).max(100),
  observaciones: z.string(),
});
export type EquipoInput = z.infer<typeof equipoInputSchema>;

/** Atributos que se derivan del tablón elegido (suerte + centroide oficial). */
export const suerteDerivadaSchema = z.object({
  sec_ste: z.string(),
  tablon: z.number(),
  hacienda: z.string(),
  lat: z.number(),
  lon: z.number(),
});

/** Registro completo de programación (persistido). */
export const programacionItemSchema = equipoInputSchema
  .extend(suerteDerivadaSchema.shape)
  .extend({
    id: z.string(),
    fecha: z.string(), // yyyy-MM-dd
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    deleted: z.boolean().default(false),
  });
export type ProgramacionItem = z.infer<typeof programacionItemSchema>;

/** Entrada del registro de auditoría (§10). */
export const auditEntrySchema = z.object({
  id: z.string(),
  accion: z.enum(["insert", "update", "delete"]),
  registro_id: z.string(),
  autor: z.string(),
  fecha: z.string(),
  antes: z.record(z.string(), z.unknown()).nullable(),
  despues: z.record(z.string(), z.unknown()).nullable(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;
