import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { Marcador } from "@/domain/marcadores/schema";
import type { Medicion } from "@/domain/mediciones/schema";
import type { Precipitacion } from "@/domain/precipitaciones/schema";
import type { LecturaHidro } from "@/domain/hidrologia/schema";
import type { RespuestaEncuesta } from "@/domain/encuesta/schema";

export interface PushResult {
  syncedIds: string[];
  error: string | null;
}

const PAGE_SIZE = 1000;

type TableName = keyof Database["public"]["Tables"];

/**
 * Trae TODAS las filas de una tabla, paginando de a `PAGE_SIZE`. PostgREST
 * limita `select("*")` a 1000 filas por defecto: sin esto, tablas
 * compartidas que crecen (precipitaciones, lecturas_hidrologicas) pierden
 * silenciosamente las filas más allá del límite al sincronizar.
 * Devuelve `null` si alguna página falla (igual que un `data` nulo).
 */
export async function fetchAllRows<T>(
  supabase: SupabaseClient<Database>,
  table: TableName,
): Promise<T[] | null> {
  const rows: T[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) return null;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
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

type LecturaHidroRow =
  Database["public"]["Tables"]["lecturas_hidrologicas"]["Insert"];

/** Mapea una lectura hidrológica local a una fila de Supabase (`autor` = dueño, RLS). */
export function lecturaHidroToRow(
  l: LecturaHidro,
  authUid: string,
): LecturaHidroRow {
  return {
    id: l.id,
    autor: authUid,
    planta: l.planta,
    punto: l.punto,
    tipo: l.tipo,
    fecha: l.fecha,
    valor: l.valor,
    nota: l.nota,
    deleted: l.deleted,
    created_at: l.created_at,
    updated_at: l.updated_at,
  };
}

/** Vacía el outbox de lecturas hidrológicas (upsert idempotente por id). */
export async function pushPendingLecturasHidro(
  supabase: SupabaseClient<Database>,
  items: LecturaHidro[],
  pendingIds: string[],
  authUid: string,
): Promise<PushResult> {
  const pendientes = items.filter((l) => pendingIds.includes(l.id));
  if (pendientes.length === 0) return { syncedIds: [], error: null };

  const rows = pendientes.map((l) => lecturaHidroToRow(l, authUid));
  const { error } = await supabase
    .from("lecturas_hidrologicas")
    .upsert(rows, { onConflict: "id" });

  if (error) return { syncedIds: [], error: error.message };
  return { syncedIds: pendientes.map((l) => l.id), error: null };
}

type EncuestaRow =
  Database["public"]["Tables"]["encuesta_satisfaccion"]["Insert"];

/** Mapea una respuesta local a una fila de Supabase (`user_id` = dueño, RLS). */
export function respuestaEncuestaToRow(
  r: RespuestaEncuesta,
  authUid: string,
): EncuestaRow {
  return {
    id: r.id,
    user_id: authUid,
    estrellas: r.estrellas,
    comentario: r.comentario,
    created_at: r.created_at,
  };
}

/**
 * Vacía el outbox de la encuesta (upsert idempotente por id). Como solo cabe
 * una respuesta por usuario (índice único `user_id`), una carrera entre dos
 * dispositivos del mismo usuario puede violar ese índice — se trata como
 * "ya sincronizado" (se limpia de `pending`) en vez de reintentar para siempre.
 */
export async function pushPendingEncuesta(
  supabase: SupabaseClient<Database>,
  items: RespuestaEncuesta[],
  pendingIds: string[],
  authUid: string,
): Promise<PushResult> {
  const pendientes = items.filter((r) => pendingIds.includes(r.id));
  if (pendientes.length === 0) return { syncedIds: [], error: null };

  const rows = pendientes.map((r) => respuestaEncuestaToRow(r, authUid));
  const { error } = await supabase
    .from("encuesta_satisfaccion")
    .upsert(rows, { onConflict: "id" });

  if (error && error.code !== "23505") {
    return { syncedIds: [], error: error.message };
  }
  return { syncedIds: pendientes.map((r) => r.id), error: null };
}
