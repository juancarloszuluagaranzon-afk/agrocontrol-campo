"use client";

import { useMemo, useRef, useState } from "react";
import { itemsForFecha, useMaquinariaStore } from "@/lib/store/maquinariaStore";
import { useCatalogo } from "@/lib/data/useCatalogo";
import type { ProgramacionItem } from "@/domain/maquinaria/schema";
import type { EquipoInput } from "@/domain/maquinaria/schema";
import type { SuerteDerivada } from "@/domain/maquinaria/operations";
import {
  buildExport,
  itemsToCSV,
  parseImport,
} from "@/domain/maquinaria/export";
import { EquipoCard } from "@/components/maquinaria/EquipoCard";
import { EquipoForm } from "@/components/maquinaria/EquipoForm";
import { HistorialPanel } from "@/components/maquinaria/HistorialPanel";

/** Descarga un archivo generado en el cliente (acción iniciada por el usuario). */
function descargar(nombre: string, contenido: string, mime: string) {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fecha local en formato yyyy-MM-dd. */
function hoyLocal(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function MaquinariaScreen() {
  const catalogo = useCatalogo();
  const items = useMaquinariaStore((s) => s.items);
  const audit = useMaquinariaStore((s) => s.audit);
  const addEquipo = useMaquinariaStore((s) => s.addEquipo);
  const updateEquipo = useMaquinariaStore((s) => s.updateEquipo);
  const removeEquipo = useMaquinariaStore((s) => s.removeEquipo);
  const replaceAll = useMaquinariaStore((s) => s.replaceAll);

  const [fecha, setFecha] = useState(hoyLocal);
  const [editando, setEditando] = useState<ProgramacionItem | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function sello(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  }
  function exportarJSON() {
    descargar(
      `programacion-${sello()}.json`,
      JSON.stringify(buildExport(items, audit), null, 2),
      "application/json",
    );
  }
  function exportarCSV() {
    descargar(`programacion-${sello()}.csv`, itemsToCSV(items), "text/csv");
  }
  async function importar(file: File) {
    try {
      const bundle = parseImport(JSON.parse(await file.text()));
      replaceAll(bundle.items, bundle.audit);
    } catch {
      alert("Archivo inválido: no se pudo importar la programación.");
    }
  }

  const delDia = useMemo(() => itemsForFecha(items, fecha), [items, fecha]);
  const zona1 = delDia.filter((i) => i.zona === 1).length;
  const zona2 = delDia.filter((i) => i.zona === 2).length;

  function abrirNuevo() {
    setEditando(null);
    setFormAbierto(true);
  }
  function abrirEditar(item: ProgramacionItem) {
    setEditando(item);
    setFormAbierto(true);
  }

  function guardar(input: EquipoInput, derived: SuerteDerivada) {
    if (editando) updateEquipo(editando.id, { ...input, ...derived });
    else addEquipo(input, derived, fecha);
    setFormAbierto(false);
    setEditando(null);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Barra superior: fecha + contadores */}
      <div className="border-accent/10 flex items-center justify-between gap-3 border-b px-4 py-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-accent/70 font-semibold">Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg px-2 py-1.5 text-sm ring-1 ring-black/15"
          />
        </label>
        <div className="flex gap-2 text-xs font-bold">
          <span className="bg-accent/10 rounded-full px-2.5 py-1">
            Z1: {zona1}
          </span>
          <span className="bg-accent/10 rounded-full px-2.5 py-1">
            Z2: {zona2}
          </span>
          <span className="bg-primary/20 rounded-full px-2.5 py-1">
            Total: {delDia.length}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-accent/10 flex flex-wrap gap-2 border-b px-3 py-2 text-xs font-semibold print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-accent/5 rounded-lg px-3 py-1.5"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={exportarJSON}
          className="bg-accent/5 rounded-lg px-3 py-1.5"
        >
          Exportar JSON
        </button>
        <button
          type="button"
          onClick={exportarCSV}
          className="bg-accent/5 rounded-lg px-3 py-1.5"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="bg-accent/5 rounded-lg px-3 py-1.5"
        >
          Importar
        </button>
        <button
          type="button"
          onClick={() => setHistorialAbierto(true)}
          className="bg-accent/5 rounded-lg px-3 py-1.5"
        >
          Historial ({audit.length})
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importar(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Cabecera sólo para impresión (§5: vista imprimible) */}
      <div className="hidden px-4 pt-2 print:block">
        <h1 className="text-lg font-bold">Programación Maquinaria Amarilla</h1>
        <p className="text-sm">
          Fecha {fecha} · Zona 1: {zona1} · Zona 2: {zona2} · Total:{" "}
          {delDia.length}
        </p>
      </div>

      {/* Lista */}
      <div className="flex-1 space-y-2 overflow-auto p-3 print:overflow-visible">
        {delDia.length === 0 ? (
          <p className="text-accent/50 mt-10 text-center text-sm">
            Sin equipos programados para esta fecha.
          </p>
        ) : (
          delDia.map((item) => (
            <EquipoCard
              key={item.id}
              item={item}
              onEdit={abrirEditar}
              onDelete={(i) => removeEquipo(i.id)}
            />
          ))
        )}
      </div>

      {/* Botón flotante agregar */}
      <button
        type="button"
        onClick={abrirNuevo}
        className="bg-primary text-accent absolute right-4 bottom-4 z-10 grid size-14 place-items-center rounded-full text-3xl font-bold shadow-xl"
        aria-label="Agregar equipo"
      >
        +
      </button>

      {/* Hoja del formulario */}
      {formAbierto && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/40">
          <div className="bg-background max-h-[88%] w-full overflow-auto rounded-t-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editando ? "Editar equipo" : "Nuevo equipo"}
              </h2>
              <button
                type="button"
                onClick={() => setFormAbierto(false)}
                aria-label="Cerrar"
                className="text-accent/60 text-xl"
              >
                ✕
              </button>
            </div>
            <EquipoForm
              catalogo={catalogo}
              initial={editando ?? undefined}
              onSubmit={guardar}
              onCancel={() => setFormAbierto(false)}
            />
          </div>
        </div>
      )}

      {historialAbierto && (
        <HistorialPanel
          audit={audit}
          onClose={() => setHistorialAbierto(false)}
        />
      )}
    </div>
  );
}
