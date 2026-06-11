"use client";

import { PLANTA_IDS, PLANTAS } from "@/lib/plantas";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { t } from "@/lib/i18n/es-CO";

/**
 * Selector de entrada (§ ADR-0007): se muestra cuando aún no hay planta elegida.
 * Al elegir, se persiste y la app entra directo a esa planta en cada reapertura.
 */
export function PlantaSelector() {
  const setPlanta = usePlantaStore((s) => s.setPlanta);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#0f172a] px-6 text-center text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.app.nombre}</h1>
        <p className="text-accent/70 mt-2 text-sm">{t.planta.elegir}</p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {PLANTA_IDS.map((id) => {
          const p = PLANTAS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPlanta(id)}
              className="flex flex-col items-start rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-left transition hover:border-white/40 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span className="text-lg font-semibold">{p.nombre}</span>
              <span className="text-sm text-white/60">{p.empresa}</span>
            </button>
          );
        })}
      </div>
      <p className="max-w-xs text-xs text-white/40">{t.planta.ayuda}</p>
    </div>
  );
}
