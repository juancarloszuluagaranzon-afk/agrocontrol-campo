import type {
  AuditEntry,
  EquipoInput,
  ProgramacionItem,
} from "@/domain/maquinaria/schema";

export interface SuerteDerivada {
  sec_ste: string;
  tablon: number;
  hacienda: string;
  lat: number;
  lon: number;
}

/** Metadatos de una operación (inyectados: facilita pruebas deterministas). */
export interface OpMeta {
  id: string;
  now: string; // ISO
  autor: string;
}

/** Construye un registro de programación a partir del input + datos derivados. */
export function buildItem(
  input: EquipoInput,
  derived: SuerteDerivada,
  fecha: string,
  meta: OpMeta,
): ProgramacionItem {
  return {
    ...input,
    ...derived,
    id: meta.id,
    fecha,
    created_by: meta.autor,
    created_at: meta.now,
    updated_at: meta.now,
    deleted: false,
  };
}

/** Aplica un parche a un registro y devuelve el nuevo registro. */
export function patchItem(
  item: ProgramacionItem,
  patch: Partial<EquipoInput & SuerteDerivada>,
  now: string,
): ProgramacionItem {
  return { ...item, ...patch, updated_at: now };
}

function entry(
  accion: AuditEntry["accion"],
  registro_id: string,
  meta: OpMeta,
  antes: Record<string, unknown> | null,
  despues: Record<string, unknown> | null,
): AuditEntry {
  return {
    id: `a_${meta.id}`,
    accion,
    registro_id,
    autor: meta.autor,
    fecha: meta.now,
    antes,
    despues,
  };
}

export function auditInsert(item: ProgramacionItem, meta: OpMeta): AuditEntry {
  return entry("insert", item.id, meta, null, { ...item });
}

export function auditUpdate(
  before: ProgramacionItem,
  after: ProgramacionItem,
  meta: OpMeta,
): AuditEntry {
  return entry("update", before.id, meta, { ...before }, { ...after });
}

export function auditDelete(
  before: ProgramacionItem,
  meta: OpMeta,
): AuditEntry {
  return entry("delete", before.id, meta, { ...before }, null);
}
