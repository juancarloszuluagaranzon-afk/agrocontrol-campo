"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  precipitacionInputSchema,
  type PrecipitacionInput,
} from "@/domain/precipitaciones/schema";
import {
  activas,
  usePrecipitacionesStore,
} from "@/lib/store/precipitacionesStore";
import { usePluviometros } from "@/lib/data/usePluviometros";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { t } from "@/lib/i18n/es-CO";

const campo =
  "rounded-lg ring-1 ring-black/15 px-3 py-2 text-sm w-full bg-white";

/** Fecha local de hoy en formato YYYY-MM-DD (no UTC, para no saltar de día). */
function hoyLocal(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * Herramienta "Lluvia (precipitación)": el administrador registra los mm leídos
 * en un pluviómetro en una fecha. Es un dato **compartido** (toda la empresa lo
 * ve, RLS de lectura abierta). Offline-first (outbox); historial reciente debajo.
 */
export function PrecipitacionControl() {
  const planta = usePlantaStore((s) => s.planta) ?? "";
  const pluviometros = usePluviometros();
  const items = usePrecipitacionesStore((s) => s.items);
  const pending = usePrecipitacionesStore((s) => s.pending);
  const userId = usePrecipitacionesStore((s) => s.userId);
  const addLectura = usePrecipitacionesStore((s) => s.addLectura);
  const removeLectura = usePrecipitacionesStore((s) => s.removeLectura);
  const setActiveTool = useMapStore((s) => s.setActiveTool);

  const hoy = hoyLocal();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PrecipitacionInput>({
    resolver: zodResolver(precipitacionInputSchema),
    defaultValues: { fecha: hoy, nota: "" },
  });

  const lista = activas(items)
    .filter((p) => p.planta === planta)
    .sort((a, b) =>
      a.fecha === b.fecha
        ? b.created_at.localeCompare(a.created_at)
        : b.fecha.localeCompare(a.fecha),
    )
    .slice(0, 40);

  function guardar(values: PrecipitacionInput) {
    addLectura(values, planta);
    // Mantiene pluviómetro y fecha para registrar varios seguidos; limpia mm/nota.
    reset({
      pluviometro: values.pluviometro,
      fecha: values.fecha,
      mm: undefined,
      nota: "",
    });
  }

  function esMia(id: string, autor: string): boolean {
    return autor === userId || pending.includes(id);
  }

  return (
    <div className="pointer-events-auto w-72 max-w-[calc(100vw-1rem)] rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">🌧️ {t.lluvia.titulo}</span>
        <button
          type="button"
          onClick={() => setActiveTool("none")}
          aria-label="Cerrar"
          className="rounded px-1 text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>

      {pluviometros.length === 0 ? (
        <p className="mt-2 text-[12px] text-slate-500">
          {t.lluvia.sinPluviometros}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[12px] text-slate-500">{t.lluvia.ayuda}</p>
          <form onSubmit={handleSubmit(guardar)} className="mt-2 space-y-2">
            <div>
              <select
                {...register("pluviometro", { valueAsNumber: true })}
                aria-label={t.lluvia.pluviometro}
                defaultValue=""
                className={campo}
              >
                <option value="" disabled>
                  {t.lluvia.elegirPluviometro}
                </option>
                {pluviometros.map((id) => (
                  <option key={id} value={id}>
                    {t.lluvia.pluviometro} {id}
                  </option>
                ))}
              </select>
              {errors.pluviometro && (
                <p className="mt-0.5 text-[11px] text-red-600">
                  {errors.pluviometro.message}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-[11px] text-slate-500">
                  {t.lluvia.fecha}
                </span>
                <input
                  type="date"
                  max={hoy}
                  {...register("fecha")}
                  className={campo}
                />
              </label>
              <label className="w-24">
                <span className="text-[11px] text-slate-500">
                  {t.lluvia.mm}
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.0"
                  aria-label={t.lluvia.mm}
                  {...register("mm", { valueAsNumber: true })}
                  className={campo}
                />
              </label>
            </div>
            {(errors.fecha || errors.mm) && (
              <p className="text-[11px] text-red-600">
                {errors.mm?.message ?? errors.fecha?.message}
              </p>
            )}

            <textarea
              {...register("nota")}
              placeholder={t.lluvia.nota}
              rows={2}
              className={campo}
            />

            <button
              type="submit"
              className="bg-primary w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
            >
              {t.lluvia.guardar}
            </button>
          </form>

          <p className="text-accent/60 mt-3 mb-1 text-[11px] font-bold uppercase">
            {t.lluvia.historial}
          </p>
          <ul className="max-h-44 space-y-1 overflow-y-auto">
            {lista.length === 0 && (
              <li className="px-1 py-2 text-[12px] text-slate-500">
                {t.lluvia.sinLecturas}
              </li>
            )}
            {lista.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50"
                title={p.nota || undefined}
              >
                <span className="min-w-0 flex-1 truncate tabular-nums">
                  <span className="font-medium">
                    {t.lluvia.pluviometro} {p.pluviometro}
                  </span>{" "}
                  · {p.fecha} · <span className="font-semibold">{p.mm} mm</span>
                </span>
                {esMia(p.id, p.autor) && (
                  <button
                    type="button"
                    onClick={() => removeLectura(p.id)}
                    aria-label={t.lluvia.borrar(p.pluviometro, p.fecha)}
                    className="rounded px-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    🗑
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
