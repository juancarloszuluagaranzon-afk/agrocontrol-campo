"use client";

import { useMapStore } from "@/lib/store/mapStore";
import { formatHectareas } from "@/lib/geo/format";

/**
 * Panel con los atributos oficiales de la suerte tocada (§5). Aparece como
 * tarjeta inferior; alto contraste y objetivos grandes para uso en campo (§13).
 */
export function SuertePanel() {
  const selected = useMapStore((s) => s.selected);
  const setSelected = useMapStore((s) => s.setSelected);

  if (!selected) return null;

  const filas: { label: string; value: string }[] = [
    { label: "Hacienda", value: selected.hacienda ?? "—" },
    { label: "Sector", value: selected.sector ?? "—" },
    { label: "Área oficial", value: formatHectareas(selected.ha_oficial) },
    { label: "Supervisor", value: selected.supervisor ?? "—" },
    { label: "Jefe de zona", value: selected.jefe_zona ?? "—" },
  ];

  return (
    <div
      role="dialog"
      aria-label={`Suerte ${selected.sec_ste}`}
      className="bg-background pointer-events-auto absolute inset-x-2 bottom-2 z-10 rounded-xl p-4 shadow-2xl ring-1 ring-black/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-accent/60 text-xs font-medium">Suerte</p>
          <h2 className="text-primary text-2xl font-bold tabular-nums">
            {selected.sec_ste}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          aria-label="Cerrar"
          className="text-accent/60 hover:bg-accent/10 grid size-10 place-items-center rounded-lg text-xl"
        >
          ✕
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {filas.map((f) => (
          <div key={f.label} className="flex flex-col">
            <dt className="text-accent/60 text-xs">{f.label}</dt>
            <dd className="font-semibold">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
