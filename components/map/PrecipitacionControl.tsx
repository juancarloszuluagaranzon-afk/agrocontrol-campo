"use client";

import { useState } from "react";
import { usePrecipitacionesStore } from "@/lib/store/precipitacionesStore";
import { usePluviometros } from "@/lib/data/usePluviometros";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { etiquetaPluviometro } from "@/domain/pluviometros/schema";
import {
  acumulado,
  inicioAnio,
  inicioMes,
  lecturaDelDia,
} from "@/domain/precipitaciones/acumulado";
import { csvConsolidadoMensual } from "@/domain/precipitaciones/export";
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
 * Herramienta "Lluvia (precipitación)": planilla diaria **por técnico**. Se elige
 * fecha y técnico, y se anotan los mm de cada uno de sus pluviómetros (con su
 * hacienda/sitio y el acumulado mes/año). Dato compartido, offline (ADR-0009).
 */
export function PrecipitacionControl() {
  const planta = usePlantaStore((s) => s.planta) ?? "";
  const pluviometros = usePluviometros();
  const items = usePrecipitacionesStore((s) => s.items);
  const setLectura = usePrecipitacionesStore((s) => s.setLectura);
  const setActiveTool = useMapStore((s) => s.setActiveTool);

  const hoy = hoyLocal();
  const [fecha, setFecha] = useState(hoy);
  const [tecnico, setTecnico] = useState("");
  // Valores tecleados por el usuario (pv id → texto). Vacío = sin tocar.
  const [valores, setValores] = useState<Record<number, string>>({});
  const [aviso, setAviso] = useState<string | null>(null);

  // Técnicos únicos agrupados por zona (para el <select> con optgroups).
  const porZona = new Map<string, string[]>();
  for (const p of pluviometros) {
    if (!p.tecnico) continue;
    const z = String(p.zona ?? "");
    const arr = porZona.get(z) ?? [];
    if (!arr.includes(p.tecnico)) arr.push(p.tecnico);
    porZona.set(z, arr);
  }
  const zonas = [...porZona.keys()].sort();

  const susPv = pluviometros
    .filter((p) => p.tecnico === tecnico)
    .sort((a, b) => a.id - b.id);

  /** Valor a mostrar en el input de un PV: lo tecleado, o la lectura del día. */
  function valorMostrado(id: number): string {
    if (valores[id] !== undefined) return valores[id];
    const l = lecturaDelDia(items, planta, id, fecha);
    return l ? String(l.mm) : "";
  }

  function cambiarTecnico(v: string) {
    setTecnico(v);
    setValores({});
    setAviso(null);
  }

  function cambiarFecha(v: string) {
    setFecha(v);
    setValores({});
    setAviso(null);
  }

  /** Descarga el consolidado del mes (planilla PV × días + ponderado) en CSV. */
  function descargar() {
    const anioMes = fecha.slice(0, 7);
    const csv = csvConsolidadoMensual(
      pluviometros,
      items,
      planta,
      anioMes,
      "RIOPAILA AGRICOLA S.A.",
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lluvia_${planta}_${anioMes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function guardar() {
    let n = 0;
    for (const [idStr, txt] of Object.entries(valores)) {
      const s = txt.trim();
      if (s === "") continue;
      const mm = Number(s.replace(",", "."));
      if (!Number.isFinite(mm) || mm < 0) {
        setAviso(t.lluvia.nadaQueGuardar);
        return;
      }
      setLectura(planta, Number(idStr), fecha, Math.round(mm * 10) / 10);
      n += 1;
    }
    if (n === 0) {
      setAviso(t.lluvia.nadaQueGuardar);
      return;
    }
    setValores({});
    setAviso(t.lluvia.guardado(n));
  }

  return (
    <div className="pointer-events-auto w-80 max-w-[calc(100vw-1rem)] rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10">
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

          <div className="mt-2 flex gap-2">
            <label className="w-32">
              <span className="text-[11px] text-slate-500">
                {t.lluvia.fecha}
              </span>
              <input
                type="date"
                max={hoy}
                value={fecha}
                onChange={(e) => cambiarFecha(e.target.value)}
                className={campo}
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="text-[11px] text-slate-500">
                {t.lluvia.tecnico}
              </span>
              <select
                value={tecnico}
                onChange={(e) => cambiarTecnico(e.target.value)}
                aria-label={t.lluvia.tecnico}
                className={campo}
              >
                <option value="">{t.lluvia.elegirTecnico}</option>
                {zonas.map((z) => (
                  <optgroup key={z} label={t.lluvia.zona(z)}>
                    {(porZona.get(z) ?? []).sort().map((tec) => (
                      <option key={tec} value={tec}>
                        {tec}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={descargar}
            className="mt-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-black/15 hover:bg-slate-50"
          >
            {t.lluvia.descargar}
          </button>

          {tecnico === "" ? (
            <p className="mt-3 text-[12px] text-slate-500">
              {t.lluvia.sinTecnico}
            </p>
          ) : (
            <>
              <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
                {susPv.map((p) => {
                  const mes = acumulado(
                    items,
                    planta,
                    p.id,
                    inicioMes(fecha),
                    fecha,
                  );
                  const anio = acumulado(
                    items,
                    planta,
                    p.id,
                    inicioAnio(fecha),
                    fecha,
                  );
                  return (
                    <li key={p.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {etiquetaPluviometro(p)}
                        </p>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          PV {p.id} · {t.lluvia.acumMes} {mes} mm ·{" "}
                          {t.lluvia.acumAnio} {anio} mm
                        </p>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        inputMode="decimal"
                        placeholder="—"
                        aria-label={`${t.lluvia.mm} ${etiquetaPluviometro(p)}`}
                        value={valorMostrado(p.id)}
                        onChange={(e) =>
                          setValores((v) => ({ ...v, [p.id]: e.target.value }))
                        }
                        className="w-16 rounded-lg bg-white px-2 py-1.5 text-right text-sm tabular-nums ring-1 ring-black/15"
                      />
                      <span className="text-[11px] text-slate-400">mm</span>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={guardar}
                className="bg-primary mt-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
              >
                {t.lluvia.guardar}
              </button>
              {aviso && (
                <p className="mt-1 text-center text-[11px] text-slate-600">
                  {aviso}
                </p>
              )}
            </>
          )}

          <p className="mt-3 border-t border-black/5 pt-2 text-[11px] text-slate-500">
            {t.lluvia.verCapas}
          </p>
        </>
      )}
    </div>
  );
}
