"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n/es-CO";

/**
 * Indicador permanente de estado de conexión (§14).
 *
 * En Fase 0 solo refleja online/offline del navegador. En la Fase 4 se
 * conectará al SyncManager para mostrar "sincronizando" y el número de
 * escrituras pendientes en la cola outbox.
 */
export function SyncStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        online
          ? "bg-emerald-100 text-emerald-900"
          : "bg-amber-100 text-amber-900"
      }`}
    >
      <span
        aria-hidden
        className={`size-2 rounded-full ${online ? "bg-emerald-600" : "bg-amber-600"}`}
      />
      {online ? t.sync.enLinea : t.sync.sinConexion}
    </span>
  );
}
