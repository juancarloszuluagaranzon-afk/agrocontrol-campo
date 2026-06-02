import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente de Supabase para el navegador (componentes cliente).
 * Tipado end-to-end con `Database` (§7). El acceso lo controla RLS (§12).
 */
export function createClient() {
  const env = requireSupabaseEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
