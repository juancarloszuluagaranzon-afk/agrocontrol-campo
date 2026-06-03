"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n/es-CO";

const schema = z.object({
  nombre: z.string().optional(),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type Form = z.infer<typeof schema>;

const campo =
  "w-full rounded-lg ring-1 ring-black/15 px-3 py-2.5 text-sm bg-white";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

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
      router.replace("/mapa");
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
        router.replace("/mapa");
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

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
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

        <button
          type="button"
          onClick={() => {
            setModo((m) => (m === "entrar" ? "crear" : "entrar"));
            setError(null);
            setAviso(null);
          }}
          className="text-accent/60 mt-4 w-full text-center text-sm"
        >
          {modo === "entrar"
            ? "¿No tienes cuenta? Crear una"
            : "¿Ya tienes cuenta? Entrar"}
        </button>
      </div>
    </main>
  );
}
