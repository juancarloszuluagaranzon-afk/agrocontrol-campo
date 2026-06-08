"use client";

import { useState } from "react";
import type { Geometry } from "geojson";
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
import { useMedicionesStore } from "@/lib/store/medicionesStore";
import type { MedicionDatos } from "@/domain/mediciones/schema";

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
  const setMeasureMode = useMapStore((s) => s.setMeasureMode);
  const markVertexAtCenter = useMapStore((s) => s.markVertexAtCenter);
  const addMedicion = useMedicionesStore((s) => s.addMedicion);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState("");

  if (mode === "off") return null;

  const areaHa = polygonAreaHa(vertices);
  const esArea = mode === "area";
  const puedeGuardar = esArea ? vertices.length >= 3 : vertices.length >= 2;

  /** Arma los datos de la medición en curso para persistirla. */
  function datosMedicion(): MedicionDatos {
    const cx = vertices.reduce((a, v) => a + v[0], 0) / vertices.length;
    const cy = vertices.reduce((a, v) => a + v[1], 0) / vertices.length;
    const geom: Geometry = esArea
      ? { type: "Polygon", coordinates: [[...vertices, vertices[0]!]] }
      : { type: "LineString", coordinates: vertices };
    return esArea
      ? { tipo: "area", valor: areaHa, unidad: "ha", geom, lat: cy, lon: cx }
      : {
          tipo: "distancia",
          valor: lineLengthM(vertices),
          unidad: "m",
          geom,
          lat: cy,
          lon: cx,
        };
  }

  function guardar() {
    if (!nombre.trim()) return;
    addMedicion({ nombre: nombre.trim() }, datosMedicion());
    setNombre("");
    setGuardando(false);
    clearVertices();
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background safe-bottom pointer-events-auto absolute inset-x-2 z-10 rounded-xl p-3 shadow-2xl ring-1 ring-black/10"
    >
      <button
        type="button"
        onClick={() => setMeasureMode("off")}
        aria-label="Terminar medición"
        className="text-accent/60 hover:bg-accent/10 absolute top-1 right-1 grid size-8 place-items-center rounded-lg text-lg"
      >
        ✕
      </button>
      <div className="flex flex-col gap-2">
        <div className="pr-8">
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

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={markVertexAtCenter}
            className="bg-primary text-accent rounded-lg px-2 py-2 text-xs font-bold"
          >
            ✛ Marcar
          </button>
          <button
            type="button"
            onClick={() => gps && addVertex([gps.lon, gps.lat])}
            disabled={!gps}
            className="bg-accent/5 rounded-lg px-2 py-2 text-xs font-semibold disabled:opacity-40"
          >
            + GPS
          </button>
          <button
            type="button"
            onClick={() => setGuardando(true)}
            disabled={!puedeGuardar}
            className="rounded-lg bg-violet-600 px-2 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            💾 Guardar
          </button>
          <button
            type="button"
            onClick={undoVertex}
            disabled={vertices.length === 0}
            className="bg-accent/5 rounded-lg px-2 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={clearVertices}
            disabled={vertices.length === 0}
            className="bg-accent/5 rounded-lg px-2 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>
      </div>

      {guardando && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            guardar();
          }}
          className="mt-2 flex items-center gap-2 border-t border-black/5 pt-2"
        >
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la medición"
            aria-label="Nombre de la medición"
            className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm ring-1 ring-black/15"
            autoFocus
          />
          <button
            type="submit"
            disabled={!nombre.trim()}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setGuardando(false)}
            className="rounded-lg px-3 py-2 text-sm ring-1 ring-black/15"
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
