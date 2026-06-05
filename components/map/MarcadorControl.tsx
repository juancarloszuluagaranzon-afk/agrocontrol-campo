"use client";

/*
 * React Hook Form usa una API imperativa que el React Compiler no memoiza; el
 * aviso es benigno (solo se pierde la auto-memoización). Se silencia por archivo.
 */
/* eslint-disable react-hooks/incompatible-library */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MARCADOR_COLORS,
  marcadorInputSchema,
  type MarcadorInput,
} from "@/domain/marcadores/schema";
import { activos, useMarcadoresStore } from "@/lib/store/marcadoresStore";
import { useMapStore } from "@/lib/store/mapStore";

const campo =
  "rounded-lg ring-1 ring-black/15 px-3 py-2 text-sm w-full bg-white";

export function MarcadorControl() {
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const items = useMarcadoresStore((s) => s.items);
  const addMarcador = useMarcadoresStore((s) => s.addMarcador);
  const removeMarcador = useMarcadoresStore((s) => s.removeMarcador);
  const setPlacingMarker = useMapStore((s) => s.setPlacingMarker);
  const flyTo = useMapStore((s) => s.flyTo);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MarcadorInput>({
    resolver: zodResolver(marcadorInputSchema),
    defaultValues: { nombre: "", nota: "", color: MARCADOR_COLORS[0] },
  });
  const color = watch("color");

  const lista = activos(items);

  function iniciarCreacion() {
    reset({ nombre: "", nota: "", color: MARCADOR_COLORS[0] });
    setCreando(true);
    setPlacingMarker(true);
  }

  function cancelarCreacion() {
    setCreando(false);
    setPlacingMarker(false);
  }

  function guardar(values: MarcadorInput) {
    const c = useMapStore.getState().mapCenter;
    addMarcador(values, c);
    cancelarCreacion();
  }

  function cerrar() {
    cancelarCreacion();
    setAbierto(false);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="pointer-events-auto rounded-full bg-white px-3 py-2 text-sm font-medium shadow ring-1 ring-black/10"
      >
        📍 Marcadores
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-64 rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">📍 Mis marcadores</span>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="rounded px-1 text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>

      {creando ? (
        <form onSubmit={handleSubmit(guardar)} className="mt-2 space-y-2">
          <p className="rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
            Centra la cruz ✛ donde quieras el punto y guarda.
          </p>
          <div>
            <input
              {...register("nombre")}
              placeholder="Nombre del punto"
              className={campo}
              autoFocus
            />
            {errors.nombre && (
              <p className="mt-0.5 text-[11px] text-red-600">
                {errors.nombre.message}
              </p>
            )}
          </div>
          <textarea
            {...register("nota")}
            placeholder="Nota (opcional)"
            rows={2}
            className={campo}
          />
          <div className="flex items-center gap-1.5">
            {MARCADOR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue("color", c)}
                aria-label={`Color ${c}`}
                className={`size-6 rounded-full ring-2 ${
                  color === c ? "ring-slate-800" : "ring-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-primary flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white"
            >
              Guardar aquí
            </button>
            <button
              type="button"
              onClick={cancelarCreacion}
              className="rounded-lg px-3 py-2 text-sm ring-1 ring-black/15"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <button
            type="button"
            onClick={iniciarCreacion}
            className="bg-primary mt-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
          >
            ➕ Nuevo marcador
          </button>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {lista.length === 0 && (
              <li className="px-1 py-2 text-[12px] text-slate-500">
                Aún no tienes marcadores. Solo tú los ves.
              </li>
            )}
            {lista.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: m.color }}
                />
                <button
                  type="button"
                  onClick={() => flyTo({ lon: m.lon, lat: m.lat, tabId: "" })}
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  title={m.nota || m.nombre}
                >
                  {m.nombre}
                </button>
                <button
                  type="button"
                  onClick={() => removeMarcador(m.id)}
                  aria-label={`Borrar ${m.nombre}`}
                  className="rounded px-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
