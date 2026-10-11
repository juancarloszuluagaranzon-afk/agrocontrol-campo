import type { AuthError, Session, User } from "@supabase/supabase-js";

/**
 * Último usuario con sesión, para abrir la app al instante sin señal
 * (ADR-0036). Con el token vencido y sin red, Supabase reintenta renovar la
 * sesión ~30 s y al final responde "sin sesión" aunque la sesión siga guardada:
 * el técnico quedaba en "Cargando…" o fuera de la app. Solo controla qué se
 * muestra; los datos del servidor los sigue protegiendo RLS con el token real.
 */

const CLAVE = "agrocontrol-usuario";

export function leerUsuarioGuardado(): User | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (
      v &&
      typeof v === "object" &&
      typeof (v as { id?: unknown }).id === "string"
    )
      return v as User;
    return null;
  } catch {
    return null;
  }
}

export function guardarUsuario(user: User | null): void {
  try {
    if (user) {
      // Solo lo que se muestra: identidad y nombre, nada de tokens.
      const { id, email, user_metadata } = user;
      localStorage.setItem(CLAVE, JSON.stringify({ id, email, user_metadata }));
    } else {
      localStorage.removeItem(CLAVE);
    }
  } catch {
    // Sin almacenamiento (modo privado): se sigue sin el atajo offline.
  }
}

/** Falla de red al renovar la sesión (no significa que la sesión sea inválida). */
export function esFallaDeRed(error: AuthError | null | undefined): boolean {
  return error?.name === "AuthRetryableFetchError";
}

export type DecisionSesion =
  | { tipo: "usuario"; user: User }
  | { tipo: "mantener" }
  | { tipo: "sinSesion" };

/**
 * Qué hacer con el resultado de `getSession()`:
 * - con sesión → ese usuario;
 * - sin sesión por falla de red → mantener el usuario guardado (sin señal);
 * - sin sesión por cualquier otra causa → de verdad no hay sesión (ir a entrar).
 */
export function decidirSesion(
  session: Session | null,
  error: AuthError | null | undefined,
): DecisionSesion {
  if (session) return { tipo: "usuario", user: session.user };
  if (esFallaDeRed(error)) return { tipo: "mantener" };
  return { tipo: "sinSesion" };
}
