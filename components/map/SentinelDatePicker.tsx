"use client";

import { useMemo, useState } from "react";
import { monthMatrix } from "@/lib/date/calendarGrid";
import { useSentinelDates } from "@/lib/data/useSentinelDates";
import { plantaConfig } from "@/lib/plantas";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const SLOT_COLOR = { A: "#2563eb", B: "#7c3aed" } as const;

/** Color del anillo según nubosidad: verde=despejado … gris=muy nublado. */
function cloudColor(c: number): string {
  if (c <= 10) return "#16a34a";
  if (c <= 30) return "#84cc16";
  if (c <= 60) return "#f59e0b";
  return "#9ca3af";
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Calendario A/B para comparar fechas de imagen (ADR-0025). Marca con un círculo
 * los días con paso real del satélite sobre las fincas (coloreado por nubosidad);
 * si el catálogo no está configurado, sigue siendo un calendario usable.
 */
export function SentinelDatePicker() {
  const dates = useMapStore((s) => s.sentinelHubDates);
  const slot = useMapStore((s) => s.sentinelHubSlot);
  const setDate = useMapStore((s) => s.setSentinelHubDate);
  const setSlot = useMapStore((s) => s.setSentinelHubSlot);
  const planta = usePlantaStore((s) => s.planta);
  const bbox = plantaConfig(planta).aoi.bbox;

  // "Hoy" se calcula con inicializadores perezosos (el picker solo se monta tras
  // interacción, nunca en SSR → sin mismatch de hidratación).
  const [view, setView] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const range = useMemo(() => {
    const now = new Date();
    const past = new Date(now);
    past.setMonth(past.getMonth() - 6);
    return { from: isoDate(past), to: isoDate(now) };
  }, []);

  const { dates: acq, configured } = useSentinelDates(
    bbox,
    range.from,
    range.to,
    true,
  );
  const cloudByDate = useMemo(
    () => new Map(acq.map((a) => [a.date, a.cloud])),
    [acq],
  );

  const weeks = monthMatrix(view.y, view.m);
  const shift = (delta: number) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  return (
    <div className="mx-1 mt-1 rounded-md bg-black/[0.03] p-2">
      {/* Selector de slot A/B */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">
          📅 Comparar riego
        </span>
        <div className="flex overflow-hidden rounded border border-black/10 text-xs">
          {(["A", "B"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              className="px-2 py-0.5"
              style={
                slot === s
                  ? { backgroundColor: SLOT_COLOR[s], color: "#fff" }
                  : undefined
              }
            >
              {s === "A" ? "Antes" : "Después"}
            </button>
          ))}
        </div>
      </div>

      {/* Cabecera del mes */}
      <div className="mb-1 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Mes anterior"
          className="rounded px-2 text-slate-500 hover:bg-slate-100"
        >
          ‹
        </button>
        <span className="font-medium">
          {MESES[view.m]} {view.y}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Mes siguiente"
          className="rounded px-2 text-slate-500 hover:bg-slate-100"
        >
          ›
        </button>
      </div>

      {/* Rejilla */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DIAS.map((d) => (
          <div key={d} className="text-[10px] text-slate-400">
            {d}
          </div>
        ))}
        {weeks.flat().map((cell, i) => {
          if (!cell) return <div key={i} />;
          const cloud = cloudByDate.get(cell.iso);
          const isAcq = cloud !== undefined;
          const isA = dates.A === cell.iso;
          const isB = dates.B === cell.iso;
          const selected = isA || isB;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setDate(slot, cell.iso)}
              title={isAcq ? `${cell.iso} · ${cloud}% nubes` : cell.iso}
              className="flex h-7 items-center justify-center rounded-full text-xs"
              style={{
                border: isAcq
                  ? `2px solid ${cloudColor(cloud)}`
                  : "2px solid transparent",
                backgroundColor: isA
                  ? SLOT_COLOR.A
                  : isB
                    ? SLOT_COLOR.B
                    : undefined,
                color: selected ? "#fff" : undefined,
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {/* Resumen + limpiar */}
      <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
        {(["A", "B"] as const).map((s) => (
          <div key={s} className="flex items-center justify-between">
            <span>
              <span style={{ color: SLOT_COLOR[s] }}>●</span>{" "}
              {s === "A" ? "Antes" : "Después"}: {dates[s] ?? "más reciente"}
            </span>
            {dates[s] && (
              <button
                type="button"
                onClick={() => setDate(s, null)}
                className="text-slate-400 hover:text-slate-700"
                aria-label={`Quitar fecha ${s}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Leyenda / estado */}
      <p className="mt-1 text-[10px] leading-tight text-slate-500">
        {configured ? (
          <>
            Círculo = día con imagen (color = nubes: verde despejado → gris
            nublado).
          </>
        ) : (
          <>
            Elige día y compara Antes/Después. (Configura el catálogo para
            marcar los días con paso del satélite.)
          </>
        )}
      </p>
    </div>
  );
}
