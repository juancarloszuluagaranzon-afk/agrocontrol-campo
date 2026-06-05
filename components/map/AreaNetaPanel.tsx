"use client";

import { useMemo, useState } from "react";
import { areaPorHacienda, totalResumen } from "@/domain/suertes/resumen";
import { HACIENDA_COLORS, HACIENDA_DEFAULT } from "@/lib/geo/haciendas";
import { formatHectareas } from "@/lib/geo/format";
import { useCatalogo } from "@/lib/data/useCatalogo";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Tabla plegable de área neta (ha oficiales) agregada por hacienda. Solo en modo
 * Plano (§11), como referencia rápida del plano de Ingeniería Agrícola.
 */
export function AreaNetaPanel() {
  const baseMode = useMapStore((s) => s.baseMode);
  const [abierto, setAbierto] = useState(false);
  const catalogo = useCatalogo();
  const filas = useMemo(() => areaPorHacienda(catalogo), [catalogo]);
  const total = useMemo(() => totalResumen(filas), [filas]);

  if (baseMode !== "plano") return null;

  return (
    <div className="pointer-events-auto rounded-xl bg-white/95 shadow ring-1 ring-black/10">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium"
      >
        <span>📊 Área neta por hacienda</span>
        <span className="text-slate-400">{abierto ? "▲" : "▼"}</span>
      </button>
      {abierto && (
        <div className="max-h-72 overflow-y-auto border-t border-black/5 px-2 pb-2">
          <table className="w-full text-[12px] tabular-nums">
            <thead className="sticky top-0 bg-white text-left text-slate-500">
              <tr>
                <th className="py-1 pl-1 font-medium">Hacienda</th>
                <th className="py-1 pr-1 text-right font-medium">Área</th>
                <th className="py-1 pr-1 text-right font-medium">Tabl.</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.hacienda} className="border-t border-black/5">
                  <td className="flex items-center gap-1.5 py-1 pl-1">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-sm"
                      style={{
                        backgroundColor:
                          HACIENDA_COLORS[f.hacienda] ?? HACIENDA_DEFAULT,
                      }}
                    />
                    <span className="truncate">{f.hacienda}</span>
                  </td>
                  <td className="py-1 pr-1 text-right">
                    {formatHectareas(f.ha)}
                  </td>
                  <td className="py-1 pr-1 text-right">{f.tablones}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black/10 font-semibold">
                <td className="py-1 pl-1">Total</td>
                <td className="py-1 pr-1 text-right">
                  {formatHectareas(total.ha)}
                </td>
                <td className="py-1 pr-1 text-right">{total.tablones}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
