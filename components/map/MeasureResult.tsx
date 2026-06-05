"use client";

import { useMapStore } from "@/lib/store/mapStore";
import {
  polygonAreaHa,
  polygonPerimeterM,
  lineLengthM,
} from "@/lib/geo/measure";
import {
  formatHectareas,
  formatMetros,
  errorRelativoPct,
} from "@/lib/geo/format";

/**
 * Panel inferior con el resultado de la medición en vivo (§5): área + perímetro
 * o distancia, con el área oficial de contraste y acciones (GPS, deshacer, limpiar).
 */
export function MeasureResult() {
  const mode = useMapStore((s) => s.measureMode);
  const vertices = useMapStore((s) => s.vertices);
  const gps = useMapStore((s) => s.gps);
  const official = useMapStore((s) => s.measureOfficial);
  const addVertex = useMapStore((s) => s.addVertex);
  const undoVertex = useMapStore((s) => s.undoVertex);
  const clearVertices = useMapStore((s) => s.clearVertices);
  const markVertexAtCenter = useMapStore((s) => s.markVertexAtCenter);

  if (mode === "off") return null;

  const areaHa = polygonAreaHa(vertices);
  const esArea = mode === "area";

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background pointer-events-auto absolute inset-x-2 bottom-2 z-10 rounded-xl p-3 shadow-2xl ring-1 ring-black/10"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-accent/60 text-xs font-medium">
            {esArea ? "Medir área" : "Medir distancia"} ·{" "}
            <span data-testid="vertex-count">{vertices.length}</span>{" "}
            {vertices.length === 1 ? "punto" : "puntos"}
          </p>
          {esArea ? (
            <p className="text-2xl font-bold tabular-nums">
              {vertices.length >= 3 ? (
                formatHectareas(areaHa)
              ) : (
                <span className="text-accent/40 text-base font-normal">
                  Marca al menos 3 puntos
                </span>
              )}
            </p>
          ) : (
            <p className="text-2xl font-bold tabular-nums">
              {vertices.length >= 2 ? (
                formatMetros(lineLengthM(vertices))
              ) : (
                <span className="text-accent/40 text-base font-normal">
                  Marca al menos 2 puntos
                </span>
              )}
            </p>
          )}
          {esArea && vertices.length >= 2 && (
            <p className="text-accent/60 text-xs">
              Perímetro {formatMetros(polygonPerimeterM(vertices))}
            </p>
          )}
          {esArea && official && vertices.length >= 3 && (
            <p className="mt-1 text-xs text-emerald-700">
              Oficial {official.label}: {formatHectareas(official.haOficial)} (Δ{" "}
              {errorRelativoPct(areaHa, official.haOficial).toFixed(1)}%)
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <button
            type="button"
            onClick={markVertexAtCenter}
            className="bg-primary text-accent rounded-lg px-2.5 py-2 text-xs font-bold"
          >
            ✛ Marcar
          </button>
          <button
            type="button"
            onClick={() => gps && addVertex([gps.lon, gps.lat])}
            disabled={!gps}
            className="bg-accent/5 rounded-lg px-2.5 py-2 text-xs font-semibold disabled:opacity-40"
          >
            + GPS
          </button>
          <button
            type="button"
            onClick={undoVertex}
            disabled={vertices.length === 0}
            className="bg-accent/5 rounded-lg px-2.5 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={clearVertices}
            disabled={vertices.length === 0}
            className="bg-accent/5 rounded-lg px-2.5 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
