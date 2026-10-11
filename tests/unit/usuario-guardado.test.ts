import { beforeEach, describe, expect, it } from "vitest";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import {
  decidirSesion,
  esFallaDeRed,
  guardarUsuario,
  leerUsuarioGuardado,
} from "@/lib/auth/usuarioGuardado";

const user = {
  id: "u1",
  email: "tecnico@riopaila.test",
  user_metadata: { nombre: "Técnico" },
  app_metadata: { provider: "email" },
} as unknown as User;

const error = (name: string) => ({ name, message: name }) as AuthError;

describe("usuario guardado", () => {
  beforeEach(() => localStorage.clear());

  it("guarda solo identidad y nombre, y lo lee", () => {
    guardarUsuario(user);
    const raw = localStorage.getItem("agrocontrol-usuario") ?? "";
    expect(JSON.parse(raw)).toEqual({
      id: "u1",
      email: "tecnico@riopaila.test",
      user_metadata: { nombre: "Técnico" },
    });
    expect(leerUsuarioGuardado()?.id).toBe("u1");
  });

  it("se borra al cerrar sesión", () => {
    guardarUsuario(user);
    guardarUsuario(null);
    expect(leerUsuarioGuardado()).toBeNull();
  });

  it("ignora valores corruptos", () => {
    localStorage.setItem("agrocontrol-usuario", "{no json");
    expect(leerUsuarioGuardado()).toBeNull();
    localStorage.setItem("agrocontrol-usuario", '{"email":"x"}');
    expect(leerUsuarioGuardado()).toBeNull();
  });
});

describe("decidirSesion", () => {
  it("con sesión: ese usuario", () => {
    expect(decidirSesion({ user } as Session, null)).toEqual({
      tipo: "usuario",
      user,
    });
  });

  it("sin sesión por falla de red: mantener (sin señal)", () => {
    expect(esFallaDeRed(error("AuthRetryableFetchError"))).toBe(true);
    expect(decidirSesion(null, error("AuthRetryableFetchError"))).toEqual({
      tipo: "mantener",
    });
  });

  it("sin sesión por token inválido o sin error: sin sesión", () => {
    expect(decidirSesion(null, error("AuthApiError"))).toEqual({
      tipo: "sinSesion",
    });
    expect(decidirSesion(null, null)).toEqual({ tipo: "sinSesion" });
  });
});
