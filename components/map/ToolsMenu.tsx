"use client";

import { useState } from "react";
import { useMapStore, type ToolId } from "@/lib/store/mapStore";

interface Entrada {
  id: Exclude<ToolId, "none">;
  icon: string;
  label: string;
}

const ENTRADAS: Entrada[] = [
  { id: "plano", icon: "🗺️", label: "Plano de campo" },
  { id: "medir", icon: "📏", label: "Dibujar y medir" },
  { id: "marcadores", icon: "📍", label: "Marcadores" },
  { id: "mediciones", icon: "📐", label: "Mediciones guardadas" },
  { id: "capas", icon: "🗂️", label: "Capas del mapa" },
];

/**
 * Menú de herramientas tipo Avenza (§5): un único botón ✏️📏 abajo-izquierda que
 * despliega las herramientas, para mantener el mapa despejado. Al elegir una se
 * abre su panel (activeTool) y se cierra el menú.
 */
export function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const activeTool = useMapStore((s) => s.activeTool);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const measureMode = useMapStore((s) => s.measureMode);
  const tablonSeleccionado = useMapStore((s) => s.selected != null);

  function elegir(id: Entrada["id"]) {
    setActiveTool(activeTool === id ? "none" : id);
    setOpen(false);
  }

  // El menú se oculta mientras hay un panel inferior (medición o tablón) para no
  // encimarse con él; reaparece al cerrarlo.
  if (measureMode !== "off" || tablonSeleccionado) return null;

  const algoActivo = activeTool !== "none";

  return (
    <div className="pointer-events-auto absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-2 z-20 flex flex-col items-start gap-2">
      {open && (
        <ul className="bg-background overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/10">
          {ENTRADAS.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => elegir(e.id)}
                aria-pressed={activeTool === e.id}
                className={`flex w-56 items-center gap-3 px-4 py-3 text-left text-sm font-medium ${
                  activeTool === e.id ? "bg-primary/10" : "hover:bg-accent/5"
                }`}
              >
                <span aria-hidden className="text-lg">
                  {e.icon}
                </span>
                {e.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Herramientas"
        className={`grid size-12 place-items-center rounded-full text-xl shadow-lg ring-1 ring-black/10 ${
          algoActivo ? "bg-primary text-accent" : "bg-background"
        }`}
      >
        {open ? "✕" : "✏️"}
      </button>
    </div>
  );
}
