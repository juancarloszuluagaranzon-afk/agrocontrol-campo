"use client";

import type { ProgramacionItem } from "@/domain/maquinaria/schema";

interface Props {
  item: ProgramacionItem;
  onEdit?: (item: ProgramacionItem) => void;
  onDelete?: (item: ProgramacionItem) => void;
}

/** Tarjeta de un equipo programado. */
export function EquipoCard({ item, onEdit, onDelete }: Props) {
  return (
    <article className="bg-background rounded-xl p-3 shadow ring-1 ring-black/10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{item.tipo}</p>
          <p className="text-accent/70 text-xs">
            {item.identificacion} · {item.operador}
          </p>
        </div>
        <span className="bg-accent/10 rounded-full px-2 py-0.5 text-xs font-bold">
          Zona {item.zona}
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <dt className="text-accent/50">Suerte</dt>
          <dd className="text-primary font-semibold tabular-nums">
            {item.sec_ste}
          </dd>
        </div>
        <div>
          <dt className="text-accent/50">Hacienda</dt>
          <dd className="font-medium">{item.hacienda}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-accent/50">Labor</dt>
          <dd className="font-medium">{item.labor}</dd>
        </div>
      </dl>

      <div className="mt-2">
        <div className="text-accent/60 mb-0.5 flex justify-between text-xs">
          <span>Avance</span>
          <span className="font-semibold tabular-nums">{item.avance}%</span>
        </div>
        <div className="bg-accent/10 h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${item.avance}%` }}
          />
        </div>
      </div>

      {item.observaciones && (
        <p className="text-accent/60 mt-2 text-xs italic">
          {item.observaciones}
        </p>
      )}

      {(onEdit || onDelete) && (
        <div className="mt-2 flex justify-end gap-2 print:hidden">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="text-accent/70 text-xs font-semibold"
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="text-xs font-semibold text-red-600"
            >
              Eliminar
            </button>
          )}
        </div>
      )}
    </article>
  );
}
