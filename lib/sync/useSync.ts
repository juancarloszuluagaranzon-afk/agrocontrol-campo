"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMarcadoresStore } from "@/lib/store/marcadoresStore";
import { useMedicionesStore } from "@/lib/store/medicionesStore";
import { usePrecipitacionesStore } from "@/lib/store/precipitacionesStore";
import { useHidrologiaStore } from "@/lib/store/hidrologiaStore";
import { useUser } from "@/lib/auth/useUser";
import { createClient } from "@/lib/supabase/client";
import {
  pushPendingMarcadores,
  pushPendingMediciones,
  pushPendingPrecipitaciones,
  pushPendingLecturasHidro,
} from "@/lib/sync/syncManager";
import type { Marcador } from "@/domain/marcadores/schema";
import type { Medicion } from "@/domain/mediciones/schema";
import type { Precipitacion } from "@/domain/precipitaciones/schema";
import type { LecturaHidro } from "@/domain/hidrologia/schema";

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
  const precPending = usePrecipitacionesStore((s) => s.pending);
  const hidroPending = useHidrologiaStore((s) => s.pending);
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

      // Precipitaciones: subir pendientes y bajar TODAS (lectura compartida).
      const prec = usePrecipitacionesStore.getState();
      prec.setSyncing(true);
      prec.setUserId(user.id);
      if (prec.pending.length > 0) {
        const res = await pushPendingPrecipitaciones(
          supabase,
          prec.items,
          prec.pending,
          user.id,
        );
        if (res.syncedIds.length > 0) prec.markSynced(res.syncedIds);
      }
      const { data: precipitaciones } = await supabase
        .from("precipitaciones")
        .select("*");
      if (precipitaciones) {
        const cur = usePrecipitacionesStore.getState();
        const localPending = cur.items.filter((p) =>
          cur.pending.includes(p.id),
        );
        const byId = new Map<string, Precipitacion>();
        for (const p of precipitaciones as unknown as Precipitacion[])
          byId.set(p.id, p);
        for (const p of localPending) byId.set(p.id, p);
        cur.replaceAll([...byId.values()]);
      }

      // Lecturas hidrológicas: subir pendientes y bajar TODAS (compartidas).
      const hidro = useHidrologiaStore.getState();
      hidro.setSyncing(true);
      hidro.setUserId(user.id);
      if (hidro.pending.length > 0) {
        const res = await pushPendingLecturasHidro(
          supabase,
          hidro.items,
          hidro.pending,
          user.id,
        );
        if (res.syncedIds.length > 0) hidro.markSynced(res.syncedIds);
      }
      const { data: lecturasHidro } = await supabase
        .from("lecturas_hidrologicas")
        .select("*");
      if (lecturasHidro) {
        const cur = useHidrologiaStore.getState();
        const localPending = cur.items.filter((l) =>
          cur.pending.includes(l.id),
        );
        const byId = new Map<string, LecturaHidro>();
        for (const l of lecturasHidro as unknown as LecturaHidro[])
          byId.set(l.id, l);
        for (const l of localPending) byId.set(l.id, l);
        cur.replaceAll([...byId.values()]);
      }
    } catch {
      /* reintenta en el próximo ciclo */
    } finally {
      enCurso.current = false;
      setSyncing(false);
      useMedicionesStore.getState().setSyncing(false);
      usePrecipitacionesStore.getState().setSyncing(false);
      useHidrologiaStore.getState().setSyncing(false);
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
  }, [
    flush,
    mPending.length,
    medPending.length,
    precPending.length,
    hidroPending.length,
  ]);
}
