import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ProgramacionItem } from "@/domain/maquinaria/schema";
import type { Marcador } from "@/domain/marcadores/schema";

type ProgramacionRow = Database["public"]["Tables"]["programacion"]["Insert"];

/**
 * Mapea un registro local a una fila de `programacion` para Supabase.
 * `created_by` se fija al uid autenticado (lo exige RLS, §12); el nombre del
 * autor se resuelve por join a `profiles` al leer. Función pura (testeable).
 */
export function itemToRow(
  item: ProgramacionItem,
  authUid: string,
): ProgramacionRow {
  return {
    id: item.id,
    fecha: item.fecha,
    tipo: item.tipo,
    identificacion: item.identificacion,
    operador: item.operador,
    tab_id: item.tab_id,
    tablon: item.tablon,
    sec_ste: item.sec_ste,
    hacienda: item.hacienda,
    lat: item.lat,
    lon: item.lon,
    labor: item.labor,
    zona: item.zona,
    avance: item.avance,
    observaciones: item.observaciones,
    deleted: item.deleted,
    created_by: authUid,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export interface PushResult {
  syncedIds: string[];
  error: string | null;
}

/**
 * Vacía el outbox: hace upsert (idempotente por `id`) de los registros pendientes
 * contra Supabase. Devuelve los ids efectivamente sincronizados.
 */
export async function pushPending(
  supabase: SupabaseClient<Database>,
  items: ProgramacionItem[],
  pendingIds: string[],
  authUid: string,
): Promise<PushResult> {
  const pendientes = items.filter((i) => pendingIds.includes(i.id));
  if (pendientes.length === 0) return { syncedIds: [], error: null };

  const rows = pendientes.map((i) => itemToRow(i, authUid));
  const { error } = await supabase
    .from("programacion")
    .upsert(rows, { onConflict: "id" });

  if (error) return { syncedIds: [], error: error.message };
  return { syncedIds: pendientes.map((i) => i.id), error: null };
}

type MarcadorRow = Database["public"]["Tables"]["marcadores"]["Insert"];

/**
 * Mapea un marcador local a una fila de Supabase. `user_id` se fija al uid
 * autenticado (lo exige RLS, §12), por si el marcador se creó antes de conocer
 * la sesión.
 */
export function marcadorToRow(m: Marcador, authUid: string): MarcadorRow {
  return {
    id: m.id,
    user_id: authUid,
    nombre: m.nombre,
    nota: m.nota,
    color: m.color,
    lat: m.lat,
    lon: m.lon,
    deleted: m.deleted,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

/** Vacía el outbox de marcadores (upsert idempotente por id). */
export async function pushPendingMarcadores(
  supabase: SupabaseClient<Database>,
  items: Marcador[],
  pendingIds: string[],
  authUid: string,
): Promise<PushResult> {
  const pendientes = items.filter((m) => pendingIds.includes(m.id));
  if (pendientes.length === 0) return { syncedIds: [], error: null };

  const rows = pendientes.map((m) => marcadorToRow(m, authUid));
  const { error } = await supabase
    .from("marcadores")
    .upsert(rows, { onConflict: "id" });

  if (error) return { syncedIds: [], error: error.message };
  return { syncedIds: pendientes.map((m) => m.id), error: null };
}
