"use client";

import { useRouter } from "next/navigation";
import { nombreUsuario, useUser } from "@/lib/auth/useUser";
import { createClient } from "@/lib/supabase/client";

/** Identidad del usuario + cerrar sesión, en la cabecera. */
export function UserMenu() {
  const { user } = useUser();
  const router = useRouter();

  async function salir() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-accent/70 max-w-32 truncate text-xs font-medium">
        {nombreUsuario(user)}
      </span>
      <button
        type="button"
        onClick={salir}
        className="bg-accent/5 rounded-md px-2 py-1 text-xs font-semibold"
      >
        Salir
      </button>
    </div>
  );
}
