"use client";

import { useMapStore } from "@/lib/store/mapStore";
import { formatHectareas } from "@/lib/geo/format";
import { useMaestro } from "@/lib/data/useMaestro";
import { edadMeses } from "@/domain/maestro/schema";

/** Fecha ISO (aaaa-mm-dd) → dd/mm/aaaa, o "—" si falta. */
function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Panel con los atributos oficiales del tablón tocado (§5). Una suerte tiene
 * uno o varios tablones; cada tablón tiene su área oficial. Tarjeta inferior de
 * alto contraste para campo (§13). Suma la **agronomía** de la suerte (maestro).
 */
export function SuertePanel() {
  const selected = useMapStore((s) => s.selected);
  const setSelected = useMapStore((s) => s.setSelected);
  const maestro = useMaestro();

  if (!selected) return null;

  const info = maestro[selected.sec_ste];
  const edad = edadMeses(
    info?.fecha_ultimo_corte ?? info?.fecha_siembra ?? null,
  );
  const edadTxt =
    edad == null
      ? "—"
      : `${edad.toLocaleString("es-CO", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })} meses`;

  const filas: { label: string; value: string }[] = [
    { label: "Hacienda", value: selected.hacienda || "—" },
    { label: "Sector", value: selected.sector || "—" },
    { label: "Área del tablón", value: formatHectareas(selected.ha_oficial) },
    { label: "Supervisor", value: selected.supervisor || "—" },
    { label: "Jefe de zona", value: selected.jefe_zona || "—" },
  ];

  const agro: { label: string; value: string }[] = info
    ? [
        { label: "Variedad", value: info.variedad ?? "—" },
        { label: "Edad", value: edadTxt },
        {
          label: "N.º de corte",
          value: info.numero_corte != null ? String(info.numero_corte) : "—",
        },
        { label: "Próximo corte", value: fechaCorta(info.fecha_proximo_corte) },
      ]
    : [];

  return (
    <div
      role="dialog"
      aria-label={`Tablón ${selected.tab_id}`}
      className="bg-background safe-bottom pointer-events-auto absolute inset-x-2 z-10 rounded-xl p-4 shadow-2xl ring-1 ring-black/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-accent/60 text-xs font-medium">
            Suerte {selected.sec_ste}
          </p>
          <h2 className="text-primary text-2xl font-bold tabular-nums">
            Tablón {selected.tablon}
            <span className="text-accent/50 text-base font-medium">
              {" "}
              de {selected.tablon_total}
            </span>
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

      <div className="mt-3 border-t border-black/5 pt-3">
        <p className="text-accent/50 text-[11px] font-semibold tracking-wide uppercase">
          Agronomía
        </p>
        {info ? (
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {agro.map((f) => (
              <div key={f.label} className="flex flex-col">
                <dt className="text-accent/60 text-xs">{f.label}</dt>
                <dd className="font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-accent/50 mt-1 text-sm">Sin datos del maestro</p>
        )}
      </div>
    </div>
  );
}
