"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMarcadoresStore } from "@/lib/store/marcadoresStore";
import { useMedicionesStore } from "@/lib/store/medicionesStore";
import { usePrecipitacionesStore } from "@/lib/store/precipitacionesStore";
import { useHidrologiaStore } from "@/lib/store/hidrologiaStore";
import { useEncuestaStore } from "@/lib/store/encuestaStore";
import { useSyncStore, type TablaIncremental } from "@/lib/store/syncStore";
import { useUser } from "@/lib/auth/useUser";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  pushPendingMarcadores,
  pushPendingMediciones,
  pushPendingPrecipitaciones,
  pushPendingLecturasHidro,
  pushPendingEncuesta,
  fetchAllRows,
  fetchRowsSince,
  type PushResult,
} from "@/lib/sync/syncManager";
import {
  cursorDesde,
  desdeConSolape,
  fusionarRemoto,
  inicioVentanaPrecipitaciones,
  podarPorFecha,
} from "@/lib/sync/incremental";
import type { Marcador } from "@/domain/marcadores/schema";
import type { Medicion } from "@/domain/mediciones/schema";
import type { Precipitacion } from "@/domain/precipitaciones/schema";
import type { LecturaHidro } from "@/domain/hidrologia/schema";
import type { RespuestaEncuesta } from "@/domain/encuesta/schema";

const E2E = process.env.NEXT_PUBLIC_E2E === "1";
/** Antes 20 s. Con descarga incremental cada ciclo pesa bytes, no megas, pero
 *  el conteo de peticiones también cuenta (logs, cuota): 60 s basta en campo. */
const INTERVALO_MS = 60_000;

/** Contrato mínimo de los stores con outbox (todos lo cumplen). */
interface StoreOutbox<T extends { id: string; updated_at: string }> {
  items: T[];
  pending: string[];
  setUserId: (id: string) => void;
  setSyncing: (v: boolean) => void;
  markSynced: (ids: string[]) => void;
  replaceAll: (items: T[]) => void;
}

type Push<T> = (
  supabase: SupabaseClient<Database>,
  items: T[],
  pendingIds: string[],
  authUid: string,
) => Promise<PushResult>;

/**
 * Sube el outbox de una tabla y baja **solo lo que cambió** desde el último
 * cursor (ADR-0033). Sin cursor (primer uso, cambio de usuario) baja la
 * ventana completa y reemplaza; con cursor, fusiona por id. El cursor solo
 * avanza si la descarga fue completa.
 */
async function sincronizarTabla<T extends { id: string; updated_at: string }>(
  supabase: SupabaseClient<Database>,
  tabla: TablaIncremental,
  leer: () => StoreOutbox<T>,
  push: Push<T>,
  uid: string,
  fechaDesde?: string,
): Promise<void> {
  const store = leer();
  store.setSyncing(true);
  store.setUserId(uid);
  if (store.pending.length > 0) {
    const res = await push(supabase, store.items, store.pending, uid);
    if (res.syncedIds.length > 0) store.markSynced(res.syncedIds);
  }
  const sync = useSyncStore.getState();
  const cursor = sync.cursores[tabla] ?? null;
  const rows = await fetchRowsSince<T>(supabase, tabla, {
    since: cursor ? desdeConSolape(cursor) : null,
    fechaDesde,
  });
  if (!rows) return;
  // Estado fresco: el push y el usuario pudieron cambiar `items`/`pending`
  // mientras bajábamos.
  const cur = leer();
  let fusion = fusionarRemoto(
    cur.items,
    rows,
    cur.pending,
    cursor ? "fusionar" : "reemplazar",
  );
  if (fechaDesde) {
    fusion = podarPorFecha(
      fusion as unknown as Array<T & { fecha: string }>,
      fechaDesde,
    ) as unknown as T[];
  }
  cur.replaceAll(fusion);
  const siguiente = cursorDesde(rows, cursor);
  if (siguiente) sync.setCursor(tabla, siguiente);
}

/**
 * Orquesta la sincronización del outbox (§14): sube pendientes y baja cambios
 * cuando hay red, sesión y la pestaña está visible. Reintenta al volver la
 * conexión, al volver a primer plano y por intervalo.
 */
export function useSync(): void {
  const { user } = useUser();
  const setSyncing = useMarcadoresStore((s) => s.setSyncing);
  const mPending = useMarcadoresStore((s) => s.pending);
  const medPending = useMedicionesStore((s) => s.pending);
  const precPending = usePrecipitacionesStore((s) => s.pending);
  const hidroPending = useHidrologiaStore((s) => s.pending);
  const encuestaPending = useEncuestaStore((s) => s.pending);
  const enCurso = useRef(false);

  const flush = useCallback(async () => {
    if (E2E || !user) return;
    if (enCurso.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    // En segundo plano (pestaña oculta, teléfono bloqueado) no vale la pena
    // gastar red ni cuota: se reanuda al volver a primer plano.
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    )
      return;
    enCurso.current = true;
    setSyncing(true);
    try {
      const supabase = createClient();
      // Si cambió el usuario, los cursores no sirven: descarga completa.
      useSyncStore.getState().prepararParaUsuario(user.id);

      await sincronizarTabla<Marcador>(
        supabase,
        "marcadores",
        () => useMarcadoresStore.getState(),
        pushPendingMarcadores,
        user.id,
      );
      await sincronizarTabla<Medicion>(
        supabase,
        "mediciones",
        () => useMedicionesStore.getState(),
        pushPendingMediciones,
        user.id,
      );
      // Precipitaciones (compartidas): solo la ventana vigente (año en curso,
      // mínimo 60 días) — el histórico completo vive en Supabase, no en el móvil.
      await sincronizarTabla<Precipitacion>(
        supabase,
        "precipitaciones",
        () => usePrecipitacionesStore.getState(),
        pushPendingPrecipitaciones,
        user.id,
        inicioVentanaPrecipitaciones(new Date()),
      );
      await sincronizarTabla<LecturaHidro>(
        supabase,
        "lecturas_hidrologicas",
        () => useHidrologiaStore.getState(),
        pushPendingLecturasHidro,
        user.id,
      );

      // Encuesta de satisfacción: subir pendiente y bajar la propia (RLS ya
      // filtra a "solo mi fila" — a lo sumo una, por el índice único). No tiene
      // `updated_at`, así que sigue con descarga completa (una fila).
      const enc = useEncuestaStore.getState();
      enc.setSyncing(true);
      enc.setUserId(user.id);
      if (enc.pending.length > 0) {
        const res = await pushPendingEncuesta(
          supabase,
          enc.items,
          enc.pending,
          user.id,
        );
        if (res.syncedIds.length > 0) enc.markSynced(res.syncedIds);
      }
      const encuesta = await fetchAllRows<RespuestaEncuesta>(
        supabase,
        "encuesta_satisfaccion",
      );
      if (encuesta) {
        const cur = useEncuestaStore.getState();
        cur.replaceAll(
          fusionarRemoto(cur.items, encuesta, cur.pending, "reemplazar"),
        );
      }
    } catch {
      /* reintenta en el próximo ciclo */
    } finally {
      enCurso.current = false;
      setSyncing(false);
      useMedicionesStore.getState().setSyncing(false);
      usePrecipitacionesStore.getState().setSyncing(false);
      useHidrologiaStore.getState().setSyncing(false);
      useEncuestaStore.getState().setSyncing(false);
      // Se marca sin importar éxito/fallo: el popup de encuesta ya puede
      // decidir si mostrarse con lo que haya en el store (§ADR-0015).
      useEncuestaStore.getState().setHydratedFromServer(true);
    }
  }, [user, setSyncing]);

  useEffect(() => {
    void flush();
    const onOnline = () => void flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    const id = setInterval(() => void flush(), INTERVALO_MS);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    flush,
    mPending.length,
    medPending.length,
    precPending.length,
    hidroPending.length,
    encuestaPending.length,
  ]);
}
