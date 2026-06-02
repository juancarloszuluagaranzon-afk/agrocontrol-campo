import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente de Supabase para Server Components / Route Handlers.
 * Mantiene la sesión a través de cookies (Supabase Auth, §12).
 */
export async function createClient() {
  const env = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `setAll` desde un Server Component: lo maneja el middleware de
            // refresco de sesión (se añadirá con Auth en la Fase 4).
          }
        },
      },
    },
  );
}
