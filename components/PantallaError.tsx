"use client";

import { useEffect, useState } from "react";
import {
  registrarError,
  type ErrorRegistrado,
} from "@/lib/diagnostico/errores";
import { t } from "@/lib/i18n/es-CO";

/**
 * Pantalla de error propia (ADR-0039), en lugar de "This page couldn't load"
 * de Next. Estilos en línea: en `global-error` no carga el CSS de la app.
 * Muestra el detalle técnico para que una foto baste para diagnosticar.
 */
export function PantallaError({
  error,
  reset,
  donde,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  donde: string;
}) {
  const [registro, setRegistro] = useState<ErrorRegistrado | null>(null);

  useEffect(() => {
    const r = registrarError(donde, error);
    queueMicrotask(() => setRegistro(r));
    console.error(`[Rio Map] error en "${donde}":`, error);
  }, [error, donde]);

  const boton: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  };

  return (
    <div
      role="alert"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 16,
        padding: "24px 20px",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
        ⚠️ {t.errorApp.titulo}
      </h1>
      <p style={{ margin: 0, fontSize: 15, color: "#334155" }}>
        {t.errorApp.tranquilo}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          onClick={() => window.location.assign("/mapa")}
          style={{ ...boton, background: "#0f766e", color: "#ffffff" }}
        >
          {t.errorApp.volverAbrir}
        </button>
        <button
          type="button"
          onClick={reset}
          style={{ ...boton, background: "#e2e8f0", color: "#0f172a" }}
        >
          {t.errorApp.reintentar}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
        {t.errorApp.foto}
      </p>
      <details
        open
        style={{
          fontSize: 12,
          color: "#334155",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        <summary style={{ fontWeight: 600 }}>{t.errorApp.detalle}</summary>
        <pre
          style={{
            margin: "6px 0 0",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "ui-monospace, Menlo, Consolas, monospace",
          }}
        >
          {[
            `${donde} · ${registro?.version ?? ""} · ${registro?.fecha ?? ""}`,
            error.message || error.name,
            error.digest ? `digest ${error.digest}` : "",
            registro?.detalle ?? "",
          ]
            .filter(Boolean)
            .join("\n")}
        </pre>
      </details>
    </div>
  );
}
