"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMarcadoresStore } from "@/lib/store/marcadoresStore";
import { useMedicionesStore } from "@/lib/store/medicionesStore";
import { useUser } from "@/lib/auth/useUser";
import { createClient } from "@/lib/supabase/client";
import {
  pushPendingMarcadores,
  pushPendingMediciones,
} from "@/lib/sync/syncManager";
import type { Marcador } from "@/domain/marcadores/schema";
import type { Medicion } from "@/domain/mediciones/schema";

const E2E = process.env.NEXT_PUBLIC_E2E === "1";
const INTERVALO_MS = 20_000;

/**
 * Orquesta la sincronización del outbox (§14): marcadores y mediciones privados.
 * Cuando hay red y sesión, sube los pendientes y baja los del usuario (para
 * verlos en cualquier dispositivo). Reintenta al volver la conexión y por intervalo.
 */
export function useSync(): void {
  const { user } = useUser();
  const setSyncing = useMarcadoresStore((s) => s.setSyncing);
  const mPending = useMarcadoresStore((s) => s.pending);
  const medPending = useMedicionesStore((s) => s.pending);
  const enCurso = useRef(false);

  const flush = useCallback(async () => {
    if (E2E || !user) return;
    if (enCurso.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    enCurso.current = true;
    setSyncing(true);
    try {
      const supabase = createClient();

      // Marcadores: subir pendientes y bajar los del usuario.
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
      const { data: marcadores } = await supabase
        .from("marcadores")
        .select("*");
      if (marcadores) {
        const cur = useMarcadoresStore.getState();
        const localPending = cur.items.filter((m) =>
          cur.pending.includes(m.id),
        );
        const byId = new Map<string, Marcador>();
        for (const m of marcadores as Marcador[]) byId.set(m.id, m);
        for (const m of localPending) byId.set(m.id, m);
        cur.replaceAll([...byId.values()]);
      }

      // Mediciones: subir pendientes y bajar las del usuario.
      const med = useMedicionesStore.getState();
      med.setSyncing(true);
      med.setUserId(user.id);
      if (med.pending.length > 0) {
        const res = await pushPendingMediciones(
          supabase,
          med.items,
          med.pending,
          user.id,
        );
        if (res.syncedIds.length > 0) med.markSynced(res.syncedIds);
      }
      const { data: mediciones } = await supabase
        .from("mediciones")
        .select("*");
      if (mediciones) {
        const cur = useMedicionesStore.getState();
        const localPending = cur.items.filter((m) =>
          cur.pending.includes(m.id),
        );
        const byId = new Map<string, Medicion>();
        for (const m of mediciones as unknown as Medicion[]) byId.set(m.id, m);
        for (const m of localPending) byId.set(m.id, m);
        cur.replaceAll([...byId.values()]);
      }
    } catch {
      /* reintenta en el próximo ciclo */
    } finally {
      enCurso.current = false;
      setSyncing(false);
      useMedicionesStore.getState().setSyncing(false);
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
  }, [flush, mPending.length, medPending.length]);
}
