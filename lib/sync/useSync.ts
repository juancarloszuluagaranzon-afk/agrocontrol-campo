"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMarcadoresStore } from "@/lib/store/marcadoresStore";
import { useUser } from "@/lib/auth/useUser";
import { createClient } from "@/lib/supabase/client";
import { pushPendingMarcadores } from "@/lib/sync/syncManager";
import type { Marcador } from "@/domain/marcadores/schema";

const E2E = process.env.NEXT_PUBLIC_E2E === "1";
const INTERVALO_MS = 20_000;

/**
 * Orquesta la sincronización del outbox de marcadores (§14). Cuando hay red y
 * sesión, sube los pendientes y baja los marcadores del usuario (para verlos en
 * cualquier dispositivo). Reintenta al volver la conexión y por intervalo.
 */
export function useSync(): void {
  const { user } = useUser();
  const setSyncing = useMarcadoresStore((s) => s.setSyncing);
  const pending = useMarcadoresStore((s) => s.pending);
  const enCurso = useRef(false);

  const flush = useCallback(async () => {
    if (E2E || !user) return;
    if (enCurso.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    enCurso.current = true;
    setSyncing(true);
    try {
      const supabase = createClient();

      // Marcadores: subir pendientes…
      const mar = useMarcadoresStore.getState();
      mar.setUserId(user.id);
      if (mar.pending.length > 0) {
        const res = await pushPendingMarcadores(
          supabase,
          mar.items,
          mar.pending,
          user.id,
        );
        if (res.syncedIds.length > 0) mar.markSynced(res.syncedIds);
      }
      // …y bajar los del usuario (merge con los locales pendientes).
      const { data } = await supabase.from("marcadores").select("*");
      if (data) {
        const cur = useMarcadoresStore.getState();
        const localPending = cur.items.filter((m) =>
          cur.pending.includes(m.id),
        );
        const byId = new Map<string, Marcador>();
        for (const m of data as Marcador[]) byId.set(m.id, m);
        for (const m of localPending) byId.set(m.id, m);
        cur.replaceAll([...byId.values()]);
      }
    } catch {
      /* reintenta en el próximo ciclo */
    } finally {
      enCurso.current = false;
      setSyncing(false);
    }
  }, [user, setSyncing]);

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
