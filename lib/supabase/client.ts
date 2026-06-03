import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

type Client = ReturnType<typeof createBrowserClient<Database>>;

let cached: Client | null = null;

/**
 * Cliente de Supabase para el navegador (componentes cliente), memoizado para no
 * crear múltiples instancias de Auth. Tipado end-to-end; el acceso lo controla
 * RLS (§12). La sesión se persiste localmente (soporte offline, §14).
 */
export function createClient(): Client {
  if (cached) return cached;
  const env = requireSupabaseEnv();
  cached = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return cached;
}
