"use client";

/*
 * React Hook Form usa una API imperativa (refs/mutaciones) que el React Compiler
 * no puede memoizar, por lo que omite este componente. Es benigno (solo se pierde
 * la auto-memoización, no la correctitud). Silenciamos el aviso a nivel de archivo.
 */
/* eslint-disable react-hooks/incompatible-library */
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  equipoInputSchema,
  LABORES,
  TIPOS_MAQUINA,
  type EquipoInput,
} from "@/domain/maquinaria/schema";
import type { SuerteDerivada } from "@/domain/maquinaria/operations";
import type { CatalogoEntry } from "@/domain/suertes/schema";
import { searchCatalogo } from "@/domain/suertes/search";

interface Props {
  catalogo: CatalogoEntry[];
  initial?: EquipoInput & SuerteDerivada;
  onSubmit: (input: EquipoInput, derived: SuerteDerivada) => void;
  onCancel: () => void;
}

const campo =
  "rounded-lg ring-1 ring-black/15 px-3 py-2 text-sm w-full bg-white";

export function EquipoForm({ catalogo, initial, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EquipoInput>({
    resolver: zodResolver(equipoInputSchema),
    defaultValues: initial ?? {
      tipo: "",
      identificacion: "",
      operador: "",
      sec_ste: "",
      labor: "",
      zona: 1,
      avance: 0,
      observaciones: "",
    },
  });

  const [query, setQuery] = useState(initial?.sec_ste ?? "");
  const [abierto, setAbierto] = useState(false);
  const [derived, setDerived] = useState<SuerteDerivada | null>(
    initial
      ? { hacienda: initial.hacienda, lat: initial.lat, lon: initial.lon }
      : null,
  );

  const resultados = useMemo(
    () => searchCatalogo(catalogo, query, 8),
    [catalogo, query],
  );
  const secSte = watch("sec_ste");

  function elegirSuerte(e: CatalogoEntry) {
    setValue("sec_ste", e.sec_ste, { shouldValidate: true });
    setDerived({ hacienda: e.hacienda, lat: e.lat, lon: e.lon });
    setQuery(e.sec_ste);
    setAbierto(false);
  }

  function enviar(input: EquipoInput) {
    if (!derived) return;
    onSubmit(input, derived);
  }

  return (
    <form onSubmit={handleSubmit(enviar)} className="flex flex-col gap-3">
      {/* Suerte (autocompletar) */}
      <div className="relative">
        <label className="text-accent/70 mb-1 block text-xs font-semibold">
          Suerte
        </label>
        <input
          className={campo}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
            setDerived(null);
            setValue("sec_ste", "");
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar sec_ste o hacienda…"
          aria-label="Suerte"
        />
        {abierto && resultados.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg bg-white shadow-xl ring-1 ring-black/10">
            {resultados.map((r) => (
              <li key={r.sec_ste}>
                <button
                  type="button"
                  onClick={() => elegirSuerte(r)}
                  className="hover:bg-accent/5 flex w-full justify-between gap-2 px-3 py-2 text-left text-sm"
                >
                  <span className="font-semibold tabular-nums">
                    {r.sec_ste}
                  </span>
                  <span className="text-accent/60 text-xs">{r.hacienda}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {derived && (
          <p className="mt-1 text-xs text-emerald-700">
            {derived.hacienda} · centroide {derived.lat.toFixed(4)},{" "}
            {derived.lon.toFixed(4)}
          </p>
        )}
        {errors.sec_ste && (
          <p className="mt-1 text-xs text-red-600">{errors.sec_ste.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de máquina" error={errors.tipo?.message}>
          <select className={campo} {...register("tipo")}>
            <option value="">Selecciona…</option>
            {TIPOS_MAQUINA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Identificación" error={errors.identificacion?.message}>
          <input className={campo} {...register("identificacion")} />
        </Field>
        <Field label="Operador" error={errors.operador?.message}>
          <input className={campo} {...register("operador")} />
        </Field>
        <Field label="Labor" error={errors.labor?.message}>
          <select className={campo} {...register("labor")}>
            <option value="">Selecciona…</option>
            {LABORES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Zona" error={errors.zona?.message}>
          <select
            className={campo}
            {...register("zona", { valueAsNumber: true })}
          >
            <option value={1}>Zona 1</option>
            <option value={2}>Zona 2</option>
          </select>
        </Field>
        <Field
          label={`Avance: ${watch("avance")}%`}
          error={errors.avance?.message}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            className="w-full"
            {...register("avance", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Field label="Observaciones">
        <textarea className={campo} rows={2} {...register("observaciones")} />
      </Field>

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          disabled={!secSte || !derived}
          className="bg-primary text-accent flex-1 rounded-lg py-2.5 text-sm font-bold disabled:opacity-40"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-accent/5 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-accent/70 mb-1 block text-xs font-semibold">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}
