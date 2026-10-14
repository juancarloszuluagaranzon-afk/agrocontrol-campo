"use client";

import { PantallaError } from "@/components/PantallaError";

/**
 * Error en cualquier página (ADR-0039): pantalla propia en español con el
 * detalle técnico, en vez de "This page couldn't load" de Next.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PantallaError error={error} reset={reset} donde="página" />;
}
