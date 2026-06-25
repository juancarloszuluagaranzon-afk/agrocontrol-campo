import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { Marcador } from "@/domain/marcadores/schema";
import type { Medicion } from "@/domain/mediciones/schema";
import type { Precipitacion } from "@/domain/precipitaciones/schema";

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

type MedicionRow = Database["public"]["Tables"]["mediciones"]["Insert"];

/** Mapea una medición local a una fila de Supabase (`autor` = dueño, RLS). */
export function medicionToRow(m: Medicion, authUid: string): MedicionRow {
  return {
    id: m.id,
    autor: authUid,
    nombre: m.nombre,
    tipo: m.tipo,
    valor: m.valor,
    unidad: m.unidad,
    geom: m.geom as unknown as Json,
    lat: m.lat,
    lon: m.lon,
    deleted: m.deleted,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

/** Vacía el outbox de mediciones (upsert idempotente por id). */
export async function pushPendingMediciones(
  supabase: SupabaseClient<Database>,
  items: Medicion[],
  pendingIds: string[],
  authUid: string,
): Promise<PushResult> {
  const pendientes = items.filter((m) => pendingIds.includes(m.id));
  if (pendientes.length === 0) return { syncedIds: [], error: null };

  const rows = pendientes.map((m) => medicionToRow(m, authUid));
  const { error } = await supabase
    .from("mediciones")
    .upsert(rows, { onConflict: "id" });

  if (error) return { syncedIds: [], error: error.message };
  return { syncedIds: pendientes.map((m) => m.id), error: null };
}

type PrecipitacionRow =
  Database["public"]["Tables"]["precipitaciones"]["Insert"];

/** Mapea una lectura local a una fila de Supabase (`autor` = dueño, RLS). */
export function precipitacionToRow(
  p: Precipitacion,
  authUid: string,
): PrecipitacionRow {
  return {
    id: p.id,
    autor: authUid,
    planta: p.planta,
    pluviometro: p.pluviometro,
    fecha: p.fecha,
    mm: p.mm,
    nota: p.nota,
    deleted: p.deleted,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

/** Vacía el outbox de precipitaciones (upsert idempotente por id). */
export async function pushPendingPrecipitaciones(
  supabase: SupabaseClient<Database>,
  items: Precipitacion[],
  pendingIds: string[],
  authUid: string,
): Promise<PushResult> {
  const pendientes = items.filter((p) => pendingIds.includes(p.id));
  if (pendientes.length === 0) return { syncedIds: [], error: null };

  const rows = pendientes.map((p) => precipitacionToRow(p, authUid));
  const { error } = await supabase
    .from("precipitaciones")
    .upsert(rows, { onConflict: "id" });

  if (error) return { syncedIds: [], error: error.message };
  return { syncedIds: pendientes.map((p) => p.id), error: null };
}
