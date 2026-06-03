"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n/es-CO";
import { useMaquinariaStore } from "@/lib/store/maquinariaStore";

/**
 * Indicador permanente de estado de conexión y sincronización (§14): en línea /
 * sin conexión, sincronizando, y número de cambios pendientes por enviar.
 */
export function SyncStatus() {
  const [online, setOnline] = useState(true);
  const pendientes = useMaquinariaStore((s) => s.pending.length);
  const syncing = useMaquinariaStore((s) => s.syncing);

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

  let texto: string;
  let tono: string;
  if (!online) {
    texto =
      pendientes > 0
        ? `${t.sync.sinConexion} · ${t.sync.pendientes(pendientes)}`
        : t.sync.sinConexion;
    tono = "bg-amber-100 text-amber-900";
  } else if (syncing) {
    texto = t.sync.sincronizando;
    tono = "bg-sky-100 text-sky-900";
  } else if (pendientes > 0) {
    texto = t.sync.pendientes(pendientes);
    tono = "bg-amber-100 text-amber-900";
  } else {
    texto = t.sync.sincronizado;
    tono = "bg-emerald-100 text-emerald-900";
  }

  const punto = !online
    ? "bg-amber-600"
    : syncing
      ? "bg-sky-600"
      : pendientes > 0
        ? "bg-amber-600"
        : "bg-emerald-600";

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${tono}`}
    >
      <span aria-hidden className={`size-2 rounded-full ${punto}`} />
      {texto}
    </span>
  );
}
