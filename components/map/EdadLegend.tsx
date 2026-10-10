"use client";

import { useMemo } from "react";
import { RANGOS_EDAD, resumirEdades } from "@/domain/maestro/edad";
import {
  NIVELES_LLUVIA_SUERTE,
  OPCIONES_DIAS_LLUVIA,
  ventanaLluvia,
} from "@/domain/precipitaciones/porSuerte";
import { useMaestro } from "@/lib/data/useMaestro";
import { usePluviometros } from "@/lib/data/usePluviometros";
import { t } from "@/lib/i18n/es-CO";
import { useMapStore } from "@/lib/store/mapStore";

/** "2026-10-07" → "7 oct". */
const fechaCorta = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
};

const fmtHa = (ha: number) =>
  ha.toLocaleString("es-CO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

/**
 * Leyenda de la capa "Edad de la caña" (ADR-0034): color, rango, número de
 * suertes y hectáreas de la planta activa, con la edad calculada hoy. Cada
 * rango es un interruptor: solo se pintan los encendidos. Los conteos se ven
 * siempre, aunque el rango esté apagado, para no perder el panorama.
 */
export function EdadLegend() {
  const visible = useMapStore((s) => s.edadVisible);
  const rangos = useMapStore((s) => s.edadRangos);
  const toggleRango = useMapStore((s) => s.toggleEdadRango);
  const tablonSeleccionado = useMapStore((s) => s.selected !== null);
  const midiendo = useMapStore((s) => s.measureMode !== "off");
  const modoIndice = useMapStore(
    (s) =>
      s.sentinelVisible || Object.values(s.sentinelHubVisible).some(Boolean),
  );
  const lluvia = useMapStore((s) => s.edadLluvia);
  const toggleLluvia = useMapStore((s) => s.toggleEdadLluvia);
  const dias = useMapStore((s) => s.edadLluviaDias);
  const setDias = useMapStore((s) => s.setEdadLluviaDias);
  const conRed = usePluviometros().length > 0;
  const maestro = useMaestro();
  const resumen = useMemo(() => resumirEdades(maestro), [maestro]);
  const { desde, hasta } = ventanaLluvia(new Date(), dias);

  if (!visible) return null;
  // No encimarse con los paneles inferiores (mismo criterio que SentinelLegend).
  if (tablonSeleccionado || midiendo) return null;

  const ninguno = RANGOS_EDAD.every((r) => !rangos[r.id]);

  return (
    <section
      aria-label={t.edad.titulo}
      className="bg-background/95 pointer-events-auto max-h-[calc(100dvh-13rem)] w-64 overflow-y-auto overscroll-contain rounded-xl p-2.5 text-xs shadow-lg ring-1 ring-black/10"
    >
      <p className="text-sm font-semibold">{t.edad.titulo}</p>
      <p className="text-accent/60 mb-1.5">{t.edad.ayudaFiltro}</p>
      {modoIndice && (
        <p className="mb-1.5 rounded-md bg-sky-50 px-1.5 py-1 text-sky-800">
          🛰️ {t.edad.modoIndice}
        </p>
      )}
      <ul className="space-y-0.5">
        {RANGOS_EDAD.map((r) => {
          const n = resumen.suertes[r.id].length;
          const on = rangos[r.id];
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggleRango(r.id)}
                className={`hover:bg-accent/5 flex min-h-11 w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-opacity ${
                  on ? "" : "opacity-45"
                }`}
              >
                <span
                  aria-hidden
                  className="inline-block size-3.5 shrink-0 rounded-sm ring-1 ring-black/20"
                  style={{
                    backgroundColor: on ? r.color : "transparent",
                    borderColor: r.color,
                    borderWidth: on ? 0 : 2,
                  }}
                />
                <span
                  className={`min-w-0 flex-1 leading-tight ${on ? "" : "line-through"}`}
                >
                  {r.etiqueta}
                </span>
                <span className="text-accent/70 text-right tabular-nums">
                  {t.edad.suertes(n)}
                  <br />
                  {fmtHa(resumen.hectareas[r.id])} ha
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {ninguno && (
        <p role="status" className="mt-1.5 text-amber-700">
          {t.edad.ninguno}
        </p>
      )}

      {/* Lluvia acumulada reciente sobre las suertes filtradas (ADR-0034). */}
      <div className="mt-2 border-t border-black/10 pt-2">
        {conRed ? (
          <>
            <label className="flex min-h-9 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={lluvia}
                onChange={toggleLluvia}
                className="size-4"
              />
              <span aria-hidden>🌧️</span>
              <span className="font-medium">{t.edad.lluvia}</span>
            </label>
            <div
              role="group"
              aria-label={t.edad.lluvia}
              className="mt-1 flex gap-1"
            >
              {OPCIONES_DIAS_LLUVIA.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dias === d}
                  onClick={() => setDias(d)}
                  className={`min-h-9 flex-1 rounded-md px-1 ring-1 ${
                    dias === d
                      ? "bg-primary text-accent font-semibold ring-transparent"
                      : "ring-black/15"
                  }`}
                >
                  {t.edad.dias(d)}
                </button>
              ))}
            </div>
            {lluvia && (
              <>
                <ul className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {NIVELES_LLUVIA_SUERTE.map((n) => (
                    <li key={n.id} className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-block size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: n.color }}
                      />
                      {n.etiqueta}
                    </li>
                  ))}
                </ul>
                <p className="text-accent/60 mt-1">
                  {t.edad.lluviaVentana(fechaCorta(desde), fechaCorta(hasta))}
                </p>
              </>
            )}
          </>
        ) : (
          <p className="text-accent/60">🌧️ {t.edad.lluviaSinRed}</p>
        )}
      </div>
    </section>
  );
}
