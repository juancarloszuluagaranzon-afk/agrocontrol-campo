"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { nombreUsuario, useUser } from "@/lib/auth/useUser";
import { useMaquinariaStore } from "@/lib/store/maquinariaStore";

/**
 * Puerta de autenticación de las pestañas. Si no hay sesión, redirige a /login.
 * Usa la sesión persistida (tolerante a offline tras el primer login, §14) y
 * fija el autor de la auditoría con el usuario autenticado.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const setAutor = useMaquinariaStore((s) => s.setAutor);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) setAutor(nombreUsuario(user));
  }, [user, setAutor]);

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
