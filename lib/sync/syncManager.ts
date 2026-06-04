import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ProgramacionItem } from "@/domain/maquinaria/schema";

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
