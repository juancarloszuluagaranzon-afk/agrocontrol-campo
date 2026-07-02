import type { Precipitacion } from "@/domain/precipitaciones/schema";
import type { PluviometroRef } from "@/domain/pluviometros/schema";
import {
  construirReporteMensual,
  diasDelMes,
  type ReporteFila,
  type ReportePonderado,
} from "@/domain/precipitaciones/reporteMensual";

/**
 * Genera el CSV del **consolidado mensual** de precipitación (para que Recursos
 * Hídricos actualice su acumulado), con el mismo formato de su Excel:
 *   - pluviómetros en filas (zona, hacienda, localización, técnico, PLUV No, área)
 *   - los días del mes en columnas (mm de cada día)
 *   - `Acumul. MES` y `Acumul. AÑO`
 *   - por cada zona una fila **"Promedio Zona X"** y al final el **total** de la
 *     planta: el promedio **ponderado por área de influencia** (Thiessen).
 * Formato es-CO: separador `;` y decimales con coma; lleva BOM para los acentos.
 * La agregación es compartida con la tabla en pantalla y el XLSX — ver
 * `domain/precipitaciones/reporteMensual.ts`.
 *
 * Nota: `Acumul. AÑO` refleja solo lo registrado en la app (el histórico 2026 se
 * importa aparte); crece a medida que se cargan lecturas.
 */

export { diasDelMes };

/** Número con coma decimal (es-CO), sin separador de miles. */
function numCSV(n: number): string {
  return String(n).replace(".", ",");
}

/** Celda de texto entre comillas, escapando las comillas internas. */
function txtCSV(v: string | number | null): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function filaPvCSV(f: ReporteFila): string {
  const cols: string[] = [
    txtCSV(f.zona),
    txtCSV(f.hacienda),
    txtCSV(f.sitio),
    txtCSV(f.tecnico),
    String(f.pluviometro),
    f.areaHa != null ? numCSV(f.areaHa) : "",
  ];
  for (const mm of f.diasMm) cols.push(mm != null ? numCSV(mm) : "");
  cols.push(numCSV(f.acumMes));
  cols.push(numCSV(f.acumAnio));
  return cols.join(";");
}

function filaPonderadaCSV(p: ReportePonderado): string {
  const cols: string[] = [
    txtCSV(p.zona),
    txtCSV(p.etiqueta),
    "",
    "",
    "",
    numCSV(p.areaHa),
  ];
  for (const mm of p.diasMm) cols.push(numCSV(mm));
  cols.push(numCSV(p.acumMes));
  cols.push(numCSV(p.acumAnio));
  return cols.join(";");
}

export function csvConsolidadoMensual(
  pluviometros: PluviometroRef[],
  items: Precipitacion[],
  planta: string,
  anioMes: string,
  nombrePlanta = "Total",
): string {
  const reporte = construirReporteMensual(
    pluviometros,
    items,
    planta,
    anioMes,
    nombrePlanta,
  );

  const cabecera = [
    "Zona",
    "Hacienda",
    "Localización",
    "Técnico",
    "PLUV No",
    "Área influencia Ha",
    ...Array.from({ length: reporte.dias }, (_, i) => String(i + 1)),
    "Acumul. MES",
    "Acumul. AÑO",
  ].map(txtCSV);

  const lineas: string[] = [cabecera.join(";")];
  for (const z of reporte.zonas) {
    for (const f of z.filas) lineas.push(filaPvCSV(f));
    lineas.push(filaPonderadaCSV(z.promedio));
  }
  lineas.push(filaPonderadaCSV(reporte.total));

  return "﻿" + lineas.join("\r\n"); // BOM para que Excel respete acentos
}
