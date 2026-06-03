"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMaquinariaStore } from "@/lib/store/maquinariaStore";
import { useUser } from "@/lib/auth/useUser";
import { createClient } from "@/lib/supabase/client";
import { pushPending } from "@/lib/sync/syncManager";

const E2E = process.env.NEXT_PUBLIC_E2E === "1";
const INTERVALO_MS = 20_000;

/**
 * Orquesta la sincronización del outbox (§14): cuando hay red y sesión, vacía los
 * pendientes contra Supabase. Reintenta al volver la conexión, por intervalo y al
 * cambiar el outbox. Pensado para montarse una sola vez (ver SyncRunner).
 */
export function useSync(): void {
  const { user } = useUser();
  const setSyncing = useMaquinariaStore((s) => s.setSyncing);
  const markSynced = useMaquinariaStore((s) => s.markSynced);
  const pending = useMaquinariaStore((s) => s.pending);
  const enCurso = useRef(false);

  const flush = useCallback(async () => {
    if (E2E || !user) return;
    if (enCurso.current) return;
    const { items, pending } = useMaquinariaStore.getState();
    if (pending.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    enCurso.current = true;
    setSyncing(true);
    try {
      const res = await pushPending(createClient(), items, pending, user.id);
      if (res.syncedIds.length > 0) markSynced(res.syncedIds);
    } catch {
      /* reintenta en el próximo ciclo */
    } finally {
      enCurso.current = false;
      setSyncing(false);
    }
  }, [user, setSyncing, markSynced]);

  useEffect(() => {
    void flush();
    const onOnline = () => void flush();
    const id = setInterval(() => void flush(), INTERVALO_MS);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, [flush, pending.length]);
}
