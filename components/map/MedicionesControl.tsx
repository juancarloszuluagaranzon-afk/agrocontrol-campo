"use client";

import { useState } from "react";
import { activas, useMedicionesStore } from "@/lib/store/medicionesStore";
import { useMapStore } from "@/lib/store/mapStore";
import { formatHectareas, formatMetros } from "@/lib/geo/format";
import type { Medicion } from "@/domain/mediciones/schema";

function valorTexto(m: Medicion): string {
  return m.tipo === "area" ? formatHectareas(m.valor) : formatMetros(m.valor);
}

/** Lista de mediciones guardadas (privadas): ir y borrar (§5). */
export function MedicionesControl() {
  const [abierto, setAbierto] = useState(false);
  const items = useMedicionesStore((s) => s.items);
  const removeMedicion = useMedicionesStore((s) => s.removeMedicion);
  const flyTo = useMapStore((s) => s.flyTo);

  const lista = activas(items);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="pointer-events-auto rounded-full bg-white px-3 py-2 text-sm font-medium shadow ring-1 ring-black/10"
      >
        📐 Mediciones
        {lista.length > 0 && (
          <span className="ml-1 rounded-full bg-violet-600 px-1.5 text-xs font-semibold text-white">
            {lista.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-64 max-w-[calc(100vw-1rem)] rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">📐 Mis mediciones</span>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          aria-label="Cerrar"
          className="rounded px-1 text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>

      <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto">
        {lista.length === 0 && (
          <li className="px-1 py-2 text-[12px] text-slate-500">
            Aún no has guardado mediciones. Mide un área o distancia y toca 💾
            Guardar.
          </li>
        )}
        {lista.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"
          >
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm bg-violet-600"
            />
            <button
              type="button"
              onClick={() => flyTo({ lon: m.lon, lat: m.lat, tabId: "" })}
              className="min-w-0 flex-1 text-left"
              title={`${m.nombre} · ${valorTexto(m)}`}
            >
              <span className="block truncate text-sm">{m.nombre}</span>
              <span className="block text-[11px] text-slate-500 tabular-nums">
                {m.tipo === "area" ? "Área" : "Distancia"} · {valorTexto(m)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => removeMedicion(m.id)}
              aria-label={`Borrar ${m.nombre}`}
              className="rounded px-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
