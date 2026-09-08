"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n/es-CO";
import {
  nuevaContrasenaSchema,
  mensajeErrorRecuperacion,
  type NuevaContrasenaForm,
} from "@/domain/auth/schema";

const campo =
  "w-full rounded-lg ring-1 ring-black/15 px-3 py-2.5 text-sm bg-white";

type Estado = "verificando" | "listo" | "invalido" | "guardado";

/**
 * /restablecer — destino del enlace de recuperación de contraseña (ADR-0030).
 * Página pública (fuera de `(tabs)`): el usuario llega desde el correo sin
 * sesión normal. Supabase establece una sesión de recuperación al abrir el
 * enlace (flujo PKCE: `?code=` que se canjea; o el evento PASSWORD_RECOVERY).
 * Con sesión, se pide la nueva contraseña y se guarda con `updateUser`.
 */
export default function RestablecerPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NuevaContrasenaForm>({
    resolver: zodResolver(nuevaContrasenaSchema),
  });

  useEffect(() => {
    const supabase = createClient();
    let activo = true;

    // Si el enlace trae `?code=` (PKCE) y aún no hay sesión, se canjea.
    async function verificar() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (activo) setEstado("listo");
        return;
      }
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (activo) setEstado(error ? "invalido" : "listo");
        return;
      }
      // Sin sesión ni código: puede llegar por el evento PASSWORD_RECOVERY
      // (flujo implícito); si no llega en breve, el enlace no sirve.
      setTimeout(() => {
        if (activo) setEstado((e) => (e === "verificando" ? "invalido" : e));
      }, 2500);
    }
    void verificar();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!activo) return;
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN"))
        setEstado((e) => (e === "guardado" ? e : "listo"));
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(values: NuevaContrasenaForm) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (error) return setError(mensajeErrorRecuperacion(error.message));
    setEstado("guardado");
    // Limpia el `?code=` de la URL y entra al mapa con la sesión ya activa.
    setTimeout(() => router.replace("/mapa"), 800);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-primary text-center text-2xl font-bold">
          {t.app.nombre}
        </h1>
        <h2 className="mt-4 text-base font-semibold">
          {t.auth.restablecerTitulo}
        </h2>

        {estado === "verificando" && (
          <p className="text-accent/60 mt-2 text-sm">{t.auth.verificando}</p>
        )}

        {estado === "invalido" && (
          <div className="mt-2 flex flex-col gap-3">
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {t.auth.enlaceInvalido}
            </p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="bg-primary text-accent rounded-lg py-2.5 text-sm font-bold"
            >
              {t.auth.irAEntrar}
            </button>
          </div>
        )}

        {estado === "guardado" && (
          <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {t.auth.guardada}
          </p>
        )}

        {estado === "listo" && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-2 flex flex-col gap-3"
          >
            <p className="text-accent/60 text-sm">{t.auth.restablecerAyuda}</p>
            <div>
              <input
                className={campo}
                type="password"
                autoComplete="new-password"
                placeholder={t.auth.nueva}
                aria-label={t.auth.nueva}
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <input
                className={campo}
                type="password"
                autoComplete="new-password"
                placeholder={t.auth.confirmar}
                aria-label={t.auth.confirmar}
                {...register("confirmar")}
              />
              {errors.confirmar && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.confirmar.message}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-accent rounded-lg py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {t.auth.guardar}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
