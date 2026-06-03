"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

/** Bypass de autenticación SÓLO para e2e (nunca activo en producción). */
const E2E = process.env.NEXT_PUBLIC_E2E === "1";
const E2E_USER = {
  id: "e2e-user",
  email: "e2e@agrocontrol.test",
  user_metadata: { nombre: "Operador e2e" },
} as unknown as User;

/**
 * Sesión del usuario actual (Supabase Auth). Lee la sesión persistida (funciona
 * offline tras el primer login, §14) y se suscribe a los cambios.
 */
export function useUser(): AuthState {
  const [state, setState] = useState<AuthState>(
    E2E ? { user: E2E_USER, loading: false } : { user: null, loading: true },
  );

  useEffect(() => {
    if (E2E) return;
    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active)
        setState({ user: data.session?.user ?? null, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Nombre visible del usuario (metadato `nombre` o el correo). */
export function nombreUsuario(user: User | null): string {
  if (!user) return "—";
  const nombre = user.user_metadata?.nombre;
  return typeof nombre === "string" && nombre ? nombre : (user.email ?? "—");
}
