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
    if (!loading && !user) router.replace("/login");
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
