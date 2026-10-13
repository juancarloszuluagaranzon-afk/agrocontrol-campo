"use client";

import { useMapStore } from "@/lib/store/mapStore";
import { useMarcadoresStore } from "@/lib/store/marcadoresStore";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { compartirUbicacion } from "@/lib/share/compartir";
import { formatCoordenadas } from "@/lib/geo/format";
import { plantaConfig } from "@/lib/plantas";
import { t } from "@/lib/i18n/es-CO";

function fechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Ficha de un marcador tocado en el mapa: nombre, observación completa, fecha y
 * compartir. Antes la nota solo existía como tooltip de la lista (invisible en
 * el celular).
 */
export function MarcadorCard() {
  const id = useMapStore((s) => s.marcadorAbierto);
  const cerrar = useMapStore((s) => s.setMarcadorAbierto);
  const planta = usePlantaStore((s) => s.planta);
  const m = useMarcadoresStore((s) =>
    id ? s.items.find((x) => x.id === id && !x.deleted) : undefined,
  );

  if (!m) return null;
  const nota = m.nota.trim();

  return (
    <div
      role="dialog"
      aria-label={`${t.marcador.ficha} ${m.nombre}`}
      className="bg-background safe-bottom pointer-events-auto absolute inset-x-2 z-20 mx-auto max-w-md rounded-xl p-4 shadow-2xl ring-1 ring-black/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="size-4 shrink-0 rounded-full ring-2 ring-white"
            style={{ backgroundColor: m.color }}
          />
          <h2 className="truncate text-lg font-bold">{m.nombre}</h2>
        </div>
        <button
          type="button"
          onClick={() => cerrar(null)}
          aria-label={t.marcador.cerrar}
          className="text-accent/60 hover:bg-accent/10 grid size-10 shrink-0 place-items-center rounded-lg text-xl"
        >
          ✕
        </button>
      </div>

      <p
        className={`mt-2 max-h-[35dvh] overflow-y-auto text-sm whitespace-pre-wrap ${
          nota ? "" : "text-accent/50 italic"
        }`}
      >
        {nota || t.marcador.sinNota}
      </p>

      <p className="text-accent/60 mt-3 text-xs tabular-nums">
        {fechaHora(m.created_at)} · {formatCoordenadas(m.lon, m.lat)}
      </p>

      <button
        type="button"
        onClick={() =>
          void compartirUbicacion({
            planta: plantaConfig(planta).id,
            lon: m.lon,
            lat: m.lat,
            nombre: m.nombre,
            nota: m.nota,
          })
        }
        className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
      >
        📤 {t.compartir.boton}
      </button>
    </div>
  );
}
