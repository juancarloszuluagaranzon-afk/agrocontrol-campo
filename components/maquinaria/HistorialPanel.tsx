"use client";

import type { AuditEntry } from "@/domain/maquinaria/schema";

const ACCION_LABEL: Record<AuditEntry["accion"], string> = {
  insert: "Creó",
  update: "Editó",
  delete: "Eliminó",
};

const ACCION_COLOR: Record<AuditEntry["accion"], string> = {
  insert: "text-emerald-700",
  update: "text-amber-700",
  delete: "text-red-600",
};

function resumen(e: AuditEntry): string {
  const src = (e.despues ?? e.antes) as {
    tipo?: string;
    identificacion?: string;
    sec_ste?: string;
  } | null;
  if (!src) return e.registro_id;
  return `${src.tipo ?? ""} ${src.identificacion ?? ""} · ${src.sec_ste ?? ""}`.trim();
}

/**
 * Historial auditable de cambios (§10): autor, fecha y acción. Inmutable: cada
 * inserción/edición/borrado deja rastro con antes/después.
 */
export function HistorialPanel({
  audit,
  onClose,
}: {
  audit: AuditEntry[];
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-end bg-black/40">
      <div className="bg-background max-h-[88%] w-full overflow-auto rounded-t-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Historial de cambios</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-accent/60 text-xl"
          >
            ✕
          </button>
        </div>

        {audit.length === 0 ? (
          <p className="text-accent/50 py-8 text-center text-sm">
            Sin cambios registrados.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {audit.map((e) => (
              <li
                key={e.id}
                className="border-accent/10 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    <span className={ACCION_COLOR[e.accion]}>
                      {ACCION_LABEL[e.accion]}
                    </span>{" "}
                    {resumen(e)}
                  </p>
                  <p className="text-accent/50 text-xs">
                    {e.autor} · {new Date(e.fecha).toLocaleString("es-CO")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
