"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  decidirSesion,
  guardarUsuario,
  leerUsuarioGuardado,
} from "@/lib/auth/usuarioGuardado";

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
 * Sesión del usuario actual (Supabase Auth). Abre al instante con el último
 * usuario guardado (sin esperar a Supabase, que sin señal puede tardar ~30 s en
 * rendirse al renovar el token), confirma con la sesión persistida (§14) y se
 * suscribe a los cambios (ADR-0036).
 */
export function useUser(): AuthState {
  const [state, setState] = useState<AuthState>(
    E2E ? { user: E2E_USER, loading: false } : { user: null, loading: true },
  );

  useEffect(() => {
    if (E2E) return;
    const supabase = createClient();
    let active = true;

    // Se lee en el efecto (no en el estado inicial) para que el primer render
    // coincida con el del servidor.
    const guardado = leerUsuarioGuardado();
    if (guardado)
      queueMicrotask(() => {
        if (active) setState({ user: guardado, loading: false });
      });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      const d = decidirSesion(data.session, error);
      if (d.tipo === "usuario") {
        guardarUsuario(d.user);
        setState({ user: d.user, loading: false });
      } else if (d.tipo === "mantener") {
        setState({ user: guardado, loading: false });
      } else {
        guardarUsuario(null);
        setState({ user: null, loading: false });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        guardarUsuario(session.user);
        setState({ user: session.user, loading: false });
      } else if (event === "SIGNED_OUT") {
        guardarUsuario(null);
        setState({ user: null, loading: false });
      }
      // INITIAL_SESSION sin sesión: lo resuelve getSession (puede ser solo
      // falta de señal, y no debe sacar al técnico de la app).
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
