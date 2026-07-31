"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/useUser";

/**
 * Puerta de autenticación de las pestañas. Si no hay sesión, redirige a /login.
 * Usa la sesión persistida (tolerante a offline tras el primer login, §14).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Conserva la ruta+parámetros (p. ej. un link compartido /mapa?lat=…) para
      // volver a ella tras el login, en vez de perderla (§ADR-0018).
      const destino = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(destino)}`);
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="text-accent/50 flex h-full items-center justify-center text-sm">
        Cargando…
      </div>
    );
  }
  if (!user) return null;

  return <>{children}</>;
}
