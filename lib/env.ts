import { z } from "zod";

/**
 * Validación de variables de entorno en el borde (§11, §12).
 *
 * Las claves de Supabase aún no existen (no hay instancia en Fase 0), por eso
 * se validan de forma perezosa: el build y el dev no fallan por su ausencia,
 * pero cualquier intento de crear un cliente sin configurarlas lanza un error
 * claro. La `anon key` es pública (RLS controla el acceso, §12).
 */
const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

let cached: SupabaseEnv | null = null;

/** Devuelve las variables de Supabase validadas, o lanza un error legible. */
export function requireSupabaseEnv(): SupabaseEnv {
  if (cached) return cached;
  const parsed = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      "Variables de entorno de Supabase ausentes o inválidas. " +
        "Copia .env.example a .env.local y complétalas. " +
        z.prettifyError(parsed.error),
    );
  }
  cached = parsed.data;
  return cached;
}
