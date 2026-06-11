"use client";

import { useState } from "react";
import { PLANTA_IDS, PLANTAS, plantaConfig } from "@/lib/plantas";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { t } from "@/lib/i18n/es-CO";

/**
 * Indicador + cambio de planta en el header (§ ADR-0007). No es una herramienta
 * del mapa (no va entre los FAB): es contexto, así que vive discreto arriba.
 * Cambiar de planta es raro; al hacerlo, el mapa se reconstruye con la otra
 * cartografía (la pantalla del mapa va `key`-ada por planta).
 */
export function PlantaSwitch() {
  const planta = usePlantaStore((s) => s.planta);
  const hydrated = usePlantaStore((s) => s.hydrated);
  const setPlanta = usePlantaStore((s) => s.setPlanta);
  const [open, setOpen] = useState(false);

  // Mientras hidrata o si aún no hay planta (se ve el selector), no mostrar nada.
  if (!hydrated || !planta) return null;

  const actual = plantaConfig(planta);
  const otras = PLANTA_IDS.filter((id) => id !== planta);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.planta.cambiar}
        className="border-accent/20 hover:bg-accent/5 flex items-center gap-1 rounded-md border px-2 py-1 text-sm font-medium"
      >
        {actual.nombre}
        <span aria-hidden className="text-accent/50 text-xs">
          ▾
        </span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul
            role="menu"
            className="border-accent/15 absolute right-0 z-20 mt-1 min-w-40 overflow-hidden rounded-md border bg-white shadow-lg"
          >
            {otras.map((id) => (
              <li key={id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPlanta(id);
                    setOpen(false);
                  }}
                  className="hover:bg-accent/5 flex w-full flex-col items-start px-3 py-2 text-left"
                >
                  <span className="text-sm font-medium">
                    {t.planta.cambiarA(PLANTAS[id].nombre)}
                  </span>
                  <span className="text-accent/50 text-xs">
                    {PLANTAS[id].empresa}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
