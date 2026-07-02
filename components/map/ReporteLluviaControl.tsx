"use client";

import { Fragment, useMemo, useState } from "react";
import { usePrecipitacionesStore } from "@/lib/store/precipitacionesStore";
import { usePluviometros } from "@/lib/data/usePluviometros";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";
import {
  construirReporteMensual,
  type ReporteFila,
} from "@/domain/precipitaciones/reporteMensual";
import { agruparPorSemana } from "@/domain/precipitaciones/semanas";
import { xlsxConsolidadoMensual } from "@/domain/precipitaciones/exportXlsx";
import { t } from "@/lib/i18n/es-CO";

/** Mes local actual en formato YYYY-MM (no UTC). */
function mesActualLocal(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 7);
}

function colorZona(zona: string | number | null): string {
  const z = String(zona ?? "");
  if (z === "1") return "bg-orange-50";
  if (z === "2") return "bg-blue-50";
  return "bg-slate-50";
}

/** Índices (dentro del arreglo de filas de una zona) donde empieza cada tramo
 * consecutivo del mismo técnico, con su alto (rowSpan), para combinar la celda. */
function tramosPorTecnico(filas: ReporteFila[]): Map<number, number> {
  const inicioAAlto = new Map<number, number>();
  let inicio = 0;
  for (let i = 1; i <= filas.length; i++) {
    const actual = filas[i]?.tecnico;
    const anterior = filas[i - 1]?.tecnico;
    if (actual !== anterior) {
      inicioAAlto.set(inicio, i - inicio);
      inicio = i;
    }
  }
  return inicioAAlto;
}

/**
 * Panel de pantalla completa "📊 Reporte de lluvia": consolidado mensual con
 * el mismo look del reporte oficial de Recursos Hídricos (zonas por color,
 * semanas agrupadas, técnico combinado, promedio/total) — abierto a cualquier
 * usuario. Incluye descarga en XLSX con el mismo formato.
 */
export function ReporteLluviaControl() {
  const planta = usePlantaStore((s) => s.planta) ?? "";
  const pluviometros = usePluviometros();
  const items = usePrecipitacionesStore((s) => s.items);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const [anioMes, setAnioMes] = useState(mesActualLocal());
  const [descargando, setDescargando] = useState(false);

  const reporte = useMemo(
    () =>
      construirReporteMensual(
        pluviometros,
        items,
        planta,
        anioMes,
        "RIOPAILA AGRICOLA S.A.",
      ),
    [pluviometros, items, planta, anioMes],
  );
  const semanas = useMemo(
    () => agruparPorSemana(anioMes, reporte.dias),
    [anioMes, reporte.dias],
  );

  async function descargar() {
    setDescargando(true);
    try {
      const blob = await xlsxConsolidadoMensual(
        pluviometros,
        items,
        planta,
        anioMes,
        "RIOPAILA AGRICOLA S.A.",
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_lluvia_${planta}_${anioMes}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDescargando(false);
    }
  }

  const th = "border border-black/10 px-1.5 py-1 text-center font-semibold";
  const td = "border border-black/10 px-1.5 py-0.5 text-center tabular-nums";

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <div>
          <h2 className="text-lg font-bold">📊 {t.reporte.titulo}</h2>
          <p className="text-xs text-slate-500">{t.reporte.subtitulo}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm">
            {t.reporte.mes}
            <input
              type="month"
              value={anioMes}
              max={mesActualLocal()}
              onChange={(e) => setAnioMes(e.target.value)}
              className="rounded-lg px-2 py-1 text-sm ring-1 ring-black/15"
            />
          </label>
          <button
            type="button"
            onClick={() => void descargar()}
            disabled={descargando || pluviometros.length === 0}
            className="bg-primary rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {descargando ? "…" : t.reporte.descargarXlsx}
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("none")}
            aria-label="Cerrar"
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      </div>

      {pluviometros.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">{t.reporte.sinDatos}</p>
      ) : (
        <div className="flex-1 overflow-auto p-2">
          <table className="border-collapse text-xs">
            <thead className="sticky top-0 bg-white">
              <tr>
                {[
                  "ZONA",
                  "HACIENDA",
                  "LOCALIZACIÓN",
                  "TÉCNICO",
                  "PLUV No",
                  "Área Ha",
                ].map((h) => (
                  <th key={h} rowSpan={2} className={th}>
                    {h}
                  </th>
                ))}
                {semanas.map((g) => (
                  <th key={g.semana} colSpan={g.cantidadDias} className={th}>
                    {t.reporte.semana(g.semana)}
                  </th>
                ))}
                <th rowSpan={2} className={th}>
                  Acumul.
                  <br />
                  MES
                </th>
                <th rowSpan={2} className={th}>
                  Acumul.
                  <br />
                  AÑO
                </th>
              </tr>
              <tr>
                {semanas.flatMap((g) =>
                  Array.from({ length: g.cantidadDias }, (_, i) => (
                    <th key={g.desde + i} className={th}>
                      {g.desde + i}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {reporte.zonas.map((z) => {
                const tramos = tramosPorTecnico(z.filas);
                return (
                  <Fragment key={z.zona}>
                    {z.filas.map((f, i) => (
                      <tr
                        key={`${z.zona}-${f.pluviometro}`}
                        className={colorZona(z.zona)}
                      >
                        {i === 0 && (
                          <td rowSpan={z.filas.length} className={td}>
                            {f.zona}
                          </td>
                        )}
                        <td className={td}>{f.hacienda ?? "—"}</td>
                        <td className={td}>{f.sitio ?? "—"}</td>
                        {tramos.has(i) && (
                          <td rowSpan={tramos.get(i)} className={td}>
                            {f.tecnico ?? "—"}
                          </td>
                        )}
                        <td className={td}>{f.pluviometro}</td>
                        <td className={td}>{f.areaHa ?? "—"}</td>
                        {f.diasMm.map((mm, di) => (
                          <td key={di} className={td}>
                            {mm ?? ""}
                          </td>
                        ))}
                        <td className={td}>{f.acumMes}</td>
                        <td className={td}>{f.acumAnio}</td>
                      </tr>
                    ))}
                    <tr
                      key={`${z.zona}-promedio`}
                      className="bg-sky-100 font-semibold"
                    >
                      <td className={td}>{z.zona}</td>
                      <td colSpan={2} className={td}>
                        {t.reporte.promedioZona(z.zona ?? "")}
                      </td>
                      <td className={td}></td>
                      <td className={td}>{z.promedio.areaHa}</td>
                      {z.promedio.diasMm.map((mm, di) => (
                        <td key={di} className={td}>
                          {mm}
                        </td>
                      ))}
                      <td className={td}>{z.promedio.acumMes}</td>
                      <td className={td}>{z.promedio.acumAnio}</td>
                    </tr>
                  </Fragment>
                );
              })}
              <tr className="bg-cyan-200 font-bold">
                <td className={td}></td>
                <td colSpan={3} className={td}>
                  {reporte.total.etiqueta}
                </td>
                <td className={td}>{reporte.total.areaHa}</td>
                {reporte.total.diasMm.map((mm, di) => (
                  <td key={di} className={td}>
                    {mm}
                  </td>
                ))}
                <td className={td}>{reporte.total.acumMes}</td>
                <td className={td}>{reporte.total.acumAnio}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
