"use client";

import { useSync } from "@/lib/sync/useSync";

/** Monta la orquestación de sincronización una sola vez (sin UI). */
export function SyncRunner() {
  useSync();
  return null;
}
