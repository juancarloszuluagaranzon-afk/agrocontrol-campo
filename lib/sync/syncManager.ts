import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { Marcador } from "@/domain/marcadores/schema";

export interface PushResult {
  syncedIds: string[];
  error: string | null;
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
