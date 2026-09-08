import { describe, it, expect } from "vitest";
import {
  recuperarSchema,
  nuevaContrasenaSchema,
  mensajeErrorRecuperacion,
} from "@/domain/auth/schema";

describe("recuperarSchema", () => {
  it("acepta un correo válido", () => {
    expect(
      recuperarSchema.safeParse({ email: "tecnico@riopaila.com" }).success,
    ).toBe(true);
  });
  it("rechaza un correo inválido", () => {
    const r = recuperarSchema.safeParse({ email: "no-es-correo" });
    expect(r.success).toBe(false);
  });
});

describe("nuevaContrasenaSchema", () => {
  it("acepta contraseñas iguales de 6+ caracteres", () => {
    expect(
      nuevaContrasenaSchema.safeParse({
        password: "Campo2026",
        confirmar: "Campo2026",
      }).success,
    ).toBe(true);
  });
  it("rechaza contraseña corta", () => {
    const r = nuevaContrasenaSchema.safeParse({
      password: "abc",
      confirmar: "abc",
    });
    expect(r.success).toBe(false);
  });
  it("rechaza cuando no coinciden y señala el campo confirmar", () => {
    const r = nuevaContrasenaSchema.safeParse({
      password: "Campo2026",
      confirmar: "Campo2027",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "confirmar")).toBe(true);
    }
  });
});

describe("mensajeErrorRecuperacion", () => {
  it("traduce rate limit", () => {
    expect(mensajeErrorRecuperacion("email rate limit exceeded")).toMatch(
      /Demasiados/,
    );
  });
  it("traduce contraseña igual a la anterior", () => {
    expect(
      mensajeErrorRecuperacion(
        "New password should be different from the old password.",
      ),
    ).toMatch(/distinta/);
  });
  it("devuelve genérico para lo desconocido", () => {
    expect(mensajeErrorRecuperacion("boom")).toMatch(/No se pudo/);
    expect(mensajeErrorRecuperacion(undefined)).toMatch(/No se pudo/);
  });
});
