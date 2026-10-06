"use client";

import { useMemo } from "react";
import { RANGOS_EDAD, resumirEdades } from "@/domain/maestro/edad";
import { useMaestro } from "@/lib/data/useMaestro";
import { t } from "@/lib/i18n/es-CO";
import { useMapStore } from "@/lib/store/mapStore";

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
  const maestro = useMaestro();
  const resumen = useMemo(() => resumirEdades(maestro), [maestro]);

  if (!visible) return null;
  // No encimarse con los paneles inferiores (mismo criterio que SentinelLegend).
  if (tablonSeleccionado || midiendo) return null;

  const ninguno = RANGOS_EDAD.every((r) => !rangos[r.id]);

  return (
    <section
      aria-label={t.edad.titulo}
      className="bg-background/95 pointer-events-auto w-64 rounded-xl p-2.5 text-xs shadow-lg ring-1 ring-black/10"
    >
      <p className="text-sm font-semibold">{t.edad.titulo}</p>
      <p className="text-accent/60 mb-1.5">{t.edad.ayudaFiltro}</p>
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
                  className={`min-w-0 flex-1 truncate ${on ? "" : "line-through"}`}
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
    </section>
  );
}
