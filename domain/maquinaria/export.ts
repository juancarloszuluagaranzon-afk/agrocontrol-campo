import { z } from "zod";
import {
  auditEntrySchema,
  programacionItemSchema,
  type AuditEntry,
  type ProgramacionItem,
} from "@/domain/maquinaria/schema";

/** Estructura del archivo de respaldo/intercambio (JSON). */
export const exportBundleSchema = z.object({
  version: z.literal(1),
  items: z.array(programacionItemSchema),
  audit: z.array(auditEntrySchema),
});
export type ExportBundle = z.infer<typeof exportBundleSchema>;

export function buildExport(
  items: ProgramacionItem[],
  audit: AuditEntry[],
): ExportBundle {
  return { version: 1, items, audit };
}

/** Valida y normaliza un archivo importado (validación en el borde, §11). */
export function parseImport(data: unknown): ExportBundle {
  return exportBundleSchema.parse(data);
}

const COLUMNS = [
  "fecha",
  "tipo",
  "identificacion",
  "operador",
  "tab_id",
  "sec_ste",
  "tablon",
  "hacienda",
  "labor",
  "zona",
  "avance",
  "observaciones",
] as const;

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Exporta los equipos activos a CSV (separador `;`, abre en Excel es-CO).
 * Sólo registros no borrados.
 */
export function itemsToCSV(items: ProgramacionItem[]): string {
  const rows = items
    .filter((i) => !i.deleted)
    .map((i) => COLUMNS.map((c) => csvCell(i[c])).join(";"));
  return [COLUMNS.join(";"), ...rows].join("\r\n");
}
