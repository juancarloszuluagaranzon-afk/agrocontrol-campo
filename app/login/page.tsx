"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n/es-CO";
import {
  recuperarSchema,
  mensajeErrorRecuperacion,
  type RecuperarForm,
} from "@/domain/auth/schema";

const schema = z.object({
  nombre: z.string().optional(),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type Form = z.infer<typeof schema>;

const campo =
  "w-full rounded-lg ring-1 ring-black/15 px-3 py-2.5 text-sm bg-white";

type Modo = "entrar" | "crear" | "recuperar";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  /** Ruta de retorno tras el login (`?next=`), validada como ruta interna. */
  function destinoTrasLogin(): string {
    if (typeof window === "undefined") return "/mapa";
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") ? next : "/mapa";
  }

  function cambiarModo(m: Modo) {
    setModo(m);
    setError(null);
    setAviso(null);
  }

  async function onSubmit(values: Form) {
    setError(null);
    setAviso(null);
    const supabase = createClient();

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) return setError("Correo o contraseña incorrectos.");
      router.replace(destinoTrasLogin());
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { nombre: values.nombre ?? "" } },
      });
      if (error) return setError(error.message);
      if (!data.session) {
        setAviso(
          "Cuenta creada. Revisa tu correo para confirmarla y luego entra.",
        );
        setModo("entrar");
      } else {
        router.replace(destinoTrasLogin());
      }
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-primary text-center text-2xl font-bold">
          {t.app.nombre}
        </h1>
        <p className="text-accent/60 mb-6 text-center text-sm">
          {t.app.descripcion}
        </p>

        {modo === "recuperar" ? (
          <RecuperarContrasena onVolver={() => cambiarModo("entrar")} />
        ) : (
          <>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-3"
            >
              {modo === "crear" && (
                <input
                  className={campo}
                  placeholder="Nombre"
                  aria-label="Nombre"
                  {...register("nombre")}
                />
              )}
              <div>
                <input
                  className={campo}
                  type="email"
                  inputMode="email"
                  placeholder="Correo"
                  aria-label="Correo"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <input
                  className={campo}
                  type="password"
                  placeholder="Contraseña"
                  aria-label="Contraseña"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {aviso && <p className="text-sm text-emerald-700">{aviso}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-accent rounded-lg py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {modo === "entrar" ? "Entrar" : "Crear cuenta"}
              </button>
            </form>

            {modo === "entrar" && (
              <button
                type="button"
                onClick={() => cambiarModo("recuperar")}
                className="text-accent/60 mt-3 w-full text-center text-sm underline-offset-2 hover:underline"
              >
                {t.auth.olvide}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                cambiarModo(modo === "entrar" ? "crear" : "entrar")
              }
              className="text-accent/60 mt-4 w-full text-center text-sm"
            >
              {modo === "entrar"
                ? "¿No tienes cuenta? Crear una"
                : "¿Ya tienes cuenta? Entrar"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

/**
 * "¿Olvidaste tu contraseña?": pide el correo y Supabase envía un enlace que
 * abre /restablecer con una sesión de recuperación. El mensaje de éxito no
 * revela si el correo existe (Supabase tampoco lo hace).
 */
function RecuperarContrasena({ onVolver }: { onVolver: () => void }) {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarForm>({ resolver: zodResolver(recuperarSchema) });

  async function onSubmit(values: RecuperarForm) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/restablecer`,
    });
    if (error) return setError(mensajeErrorRecuperacion(error.message));
    setEnviado(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{t.auth.recuperarTitulo}</h2>
      <p className="text-accent/60 text-sm">{t.auth.recuperarAyuda}</p>

      {enviado ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {t.auth.enlaceEnviado}
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div>
            <input
              className={campo}
              type="email"
              inputMode="email"
              placeholder="Correo"
              aria-label="Correo"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-accent rounded-lg py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {t.auth.enviarEnlace}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onVolver}
        className="text-accent/60 mt-1 w-full text-center text-sm"
      >
        {t.auth.volverEntrar}
      </button>
    </div>
  );
}
