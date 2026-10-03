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
 * suertes y hectáreas de la planta activa, con la edad calculada hoy.
 */
export function EdadLegend() {
  const visible = useMapStore((s) => s.edadVisible);
  const tablonSeleccionado = useMapStore((s) => s.selected !== null);
  const midiendo = useMapStore((s) => s.measureMode !== "off");
  const maestro = useMaestro();
  const resumen = useMemo(() => resumirEdades(maestro), [maestro]);

  if (!visible) return null;
  // No encimarse con los paneles inferiores (mismo criterio que SentinelLegend).
  if (tablonSeleccionado || midiendo) return null;

  return (
    <section
      aria-label={t.edad.titulo}
      className="bg-background/95 pointer-events-auto w-60 rounded-xl p-2.5 text-xs shadow-lg ring-1 ring-black/10"
    >
      <p className="mb-1.5 text-sm font-semibold">{t.edad.titulo}</p>
      <ul className="space-y-1">
        {RANGOS_EDAD.map((r) => {
          const n = resumen.suertes[r.id].length;
          return (
            <li key={r.id} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-3 shrink-0 rounded-sm ring-1 ring-black/15"
                style={{ backgroundColor: r.color }}
              />
              <span className="min-w-0 flex-1 truncate">{r.etiqueta}</span>
              <span className="text-accent/70 text-right tabular-nums">
                {t.edad.suertes(n)}
                <br />
                {fmtHa(resumen.hectareas[r.id])} ha
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
