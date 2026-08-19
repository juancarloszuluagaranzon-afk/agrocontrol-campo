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
      // Sin conexión no redirigimos a /login: Supabase no autentica offline y
      // /login podría no estar en caché. Se confía en la sesión persistida
      // (ADR-0020). Al recuperar señal, este efecto vuelve a correr y redirige
      // si de verdad no hay sesión.
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
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
  if (!user) {
    // Sin sesión y sin señal: no hay a dónde redirigir; se avisa en vez de
    // dejar la pantalla en blanco (ADR-0020).
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return (
        <div className="text-accent/60 flex h-full items-center justify-center p-6 text-center text-sm">
          Sin conexión y sin sesión guardada. Conéctate una vez para iniciar
          sesión.
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}
