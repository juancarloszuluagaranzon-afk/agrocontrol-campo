import { z } from "zod";

/**
 * Esquemas de autenticación (validación en el borde, §11). Puros y testeables.
 * Usados por el login ("recuperar contraseña") y por /restablecer.
 */

/** Solicitud de recuperación: solo el correo. */
export const recuperarSchema = z.object({
  email: z.string().email("Correo inválido"),
});
export type RecuperarForm = z.infer<typeof recuperarSchema>;

/** Nueva contraseña con confirmación (mismo mínimo que el registro: 6). */
export const nuevaContrasenaSchema = z
  .object({
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((d) => d.password === d.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });
export type NuevaContrasenaForm = z.infer<typeof nuevaContrasenaSchema>;

/**
 * Mensaje legible para el usuario a partir de un error de Supabase Auth en el
 * flujo de recuperación. No revela si un correo existe (Supabase tampoco).
 */
export function mensajeErrorRecuperacion(msg: string | undefined): string {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "La contraseña nueva debe ser distinta a la anterior.";
  if (m.includes("weak") || m.includes("at least"))
    return "La contraseña es muy corta o débil (mínimo 6 caracteres).";
  return "No se pudo completar. Intenta de nuevo.";
}
