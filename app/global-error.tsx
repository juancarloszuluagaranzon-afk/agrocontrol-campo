"use client";

import { PantallaError } from "@/components/PantallaError";

/**
 * Error en el layout raíz (ADR-0039). Reemplaza al layout, por eso trae su
 * propio `<html>`/`<body>`; la pantalla usa estilos en línea.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-CO">
      <body style={{ margin: 0 }}>
        <PantallaError error={error} reset={reset} donde="app" />
      </body>
    </html>
  );
}
