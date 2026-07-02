import type { Precipitacion } from "@/domain/precipitaciones/schema";
import type { PluviometroRef } from "@/domain/pluviometros/schema";
import { construirReporteMensual } from "@/domain/precipitaciones/reporteMensual";
import { agruparPorSemana } from "@/domain/precipitaciones/semanas";

/**
 * Genera el **XLSX** del consolidado mensual con el mismo look del reporte
 * oficial de Recursos Hídricos: título, logo (si hay asset), columnas
 * ZONA/HACIENDA/LOCALIZACIÓN/TECNICO/PLUV No/Área, encabezados "SEMANA N"
 * agrupando los días, celda de técnico combinada por zona, filas de zona
 * coloreadas, "Promedio Zona" y el total resaltados. `exceljs` se carga por
 * **import dinámico** (no entra al bundle inicial, como pdfjs-dist en el
 * Plano de campo, ADR-0008); todo ocurre en el navegador, sin servidor.
 */

const LOGO_PATH = "/images/logo-riopaila.png";

// Colores aproximados del reporte oficial (relleno de celda, ARGB).
const COLOR_ZONA1 = "FFF9DEC9"; // durazno claro
const COLOR_ZONA2 = "FFDCE6F1"; // azul claro
const COLOR_ZONA_OTRA = "FFF2F2F2"; // gris claro (zonas fuera de 1/2, ej. GAN)
const COLOR_PROMEDIO = "FFB8CCE4"; // azul medio
const COLOR_TOTAL = "FF9BE3E8"; // cian
const COLOR_HEADER = "FFFFFFFF";

function colorZona(zona: string | number | null): string {
  const z = String(zona ?? "");
  if (z === "1") return COLOR_ZONA1;
  if (z === "2") return COLOR_ZONA2;
  return COLOR_ZONA_OTRA;
}

let exceljsPromise: Promise<typeof import("exceljs")> | null = null;
async function cargarExceljs() {
  exceljsPromise ??= import("exceljs");
  return exceljsPromise;
}

/** Intenta cargar el logo desde `/images/logo-riopaila.png`; null si no existe. */
async function cargarLogo(): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(LOGO_PATH);
    if (!r.ok) return null;
    return await r.arrayBuffer();
  } catch {
    return null;
  }
}

export async function xlsxConsolidadoMensual(
  pluviometros: PluviometroRef[],
  items: Precipitacion[],
  planta: string,
  anioMes: string,
  nombrePlanta = "RIOPAILA AGRICOLA S.A.",
): Promise<Blob> {
  const [ExcelJS, logo] = await Promise.all([cargarExceljs(), cargarLogo()]);
  const reporte = construirReporteMensual(
    pluviometros,
    items,
    planta,
    anioMes,
    nombrePlanta,
  );
  const semanas = agruparPorSemana(anioMes, reporte.dias);

  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Reporte", {
    views: [{ state: "frozen", xSplit: 6, ySplit: 4 }],
  });

  const COL_DIAS_INICIO = 7; // A..F son fijas (1-indexado en exceljs)
  const totalCols = 6 + reporte.dias + 2;

  // Fila 1-2: título (el logo, si existe, flota sobre las 2 primeras columnas).
  hoja.mergeCells(1, 1, 2, totalCols);
  const titulo = hoja.getCell(1, 1);
  titulo.value = `${nombrePlanta}\nREPORTE DIARIO DE PRECIPITACIÓN — ${anioMes}`;
  titulo.font = { bold: true, size: 14 };
  titulo.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  hoja.getRow(1).height = 20;
  hoja.getRow(2).height = 20;

  if (logo) {
    const imageId = workbook.addImage({ buffer: logo, extension: "png" });
    hoja.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 90, height: 45 },
    });
  }

  // Fila 3-4: cabecera. Columnas fijas combinadas verticalmente; días bajo
  // "SEMANA N" (fila 3) y su número (fila 4); Acumul. MES/AÑO combinadas.
  const FILA_HDR1 = 3;
  const FILA_HDR2 = 4;
  const fijas = [
    "ZONA",
    "HACIENDA",
    "LOCALIZACIÓN",
    "TECNICO",
    "PLUV No",
    "Área influencia Ha",
  ];
  fijas.forEach((label, i) => {
    const col = i + 1;
    hoja.mergeCells(FILA_HDR1, col, FILA_HDR2, col);
    const cell = hoja.getCell(FILA_HDR1, col);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_HEADER },
    };
  });

  let colCursor = COL_DIAS_INICIO;
  for (const g of semanas) {
    if (g.cantidadDias > 1) {
      hoja.mergeCells(
        FILA_HDR1,
        colCursor,
        FILA_HDR1,
        colCursor + g.cantidadDias - 1,
      );
    }
    const semCell = hoja.getCell(FILA_HDR1, colCursor);
    semCell.value = `SEMANA ${g.semana}`;
    semCell.font = { bold: true };
    semCell.alignment = { horizontal: "center", vertical: "middle" };
    for (let d = g.desde; d <= g.hasta; d++) {
      const diaCell = hoja.getCell(FILA_HDR2, colCursor + (d - g.desde));
      diaCell.value = d;
      diaCell.font = { bold: true };
      diaCell.alignment = { horizontal: "center" };
      hoja.getColumn(colCursor + (d - g.desde)).width = 4;
    }
    colCursor += g.cantidadDias;
  }
  const colAcumMes = colCursor;
  const colAcumAnio = colCursor + 1;
  for (const [col, label] of [
    [colAcumMes, "Acumul. MES"],
    [colAcumAnio, "Acumul. AÑO"],
  ] as const) {
    hoja.mergeCells(FILA_HDR1, col, FILA_HDR2, col);
    const cell = hoja.getCell(FILA_HDR1, col);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    hoja.getColumn(col).width = 10;
  }

  hoja.getColumn(1).width = 6;
  hoja.getColumn(2).width = 16;
  hoja.getColumn(3).width = 20;
  hoja.getColumn(4).width = 16;
  hoja.getColumn(5).width = 8;
  hoja.getColumn(6).width = 10;

  // Filas de datos.
  let fila = FILA_HDR2 + 1;
  for (const z of reporte.zonas) {
    const colorFondo = colorZona(z.zona);
    const inicioZona = fila;

    for (let i = 0; i < z.filas.length; i++) {
      const f = z.filas[i]!;
      const r = hoja.getRow(fila);
      r.getCell(1).value = f.zona;
      r.getCell(2).value = f.hacienda ?? "";
      r.getCell(3).value = f.sitio ?? "";
      r.getCell(4).value = f.tecnico ?? "";
      r.getCell(5).value = f.pluviometro;
      r.getCell(6).value = f.areaHa ?? "";
      f.diasMm.forEach((mm, di) => {
        r.getCell(COL_DIAS_INICIO + di).value = mm ?? "";
      });
      r.getCell(colAcumMes).value = f.acumMes;
      r.getCell(colAcumAnio).value = f.acumAnio;
      for (let c = 1; c <= totalCols; c++) {
        r.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colorFondo },
        };
      }
      fila++;
    }

    // Combina la columna Técnico para tramos consecutivos del mismo técnico.
    let inicio = inicioZona;
    for (let i = 1; i <= z.filas.length; i++) {
      const actual = z.filas[i]?.tecnico;
      const anterior = z.filas[i - 1]!.tecnico;
      if (actual !== anterior) {
        const finTramo = inicioZona + i - 1;
        if (finTramo > inicio) hoja.mergeCells(inicio, 4, finTramo, 4);
        inicio = inicioZona + i;
      }
    }

    // Fila "Promedio Zona".
    const rp = hoja.getRow(fila);
    rp.getCell(1).value = z.promedio.zona;
    rp.getCell(2).value = z.promedio.etiqueta;
    rp.getCell(6).value = z.promedio.areaHa;
    z.promedio.diasMm.forEach((mm, di) => {
      rp.getCell(COL_DIAS_INICIO + di).value = mm;
    });
    rp.getCell(colAcumMes).value = z.promedio.acumMes;
    rp.getCell(colAcumAnio).value = z.promedio.acumAnio;
    for (let c = 1; c <= totalCols; c++) {
      rp.getCell(c).font = { bold: true };
      rp.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLOR_PROMEDIO },
      };
    }
    fila++;
  }

  // Fila total de la planta.
  const rt = hoja.getRow(fila);
  rt.getCell(2).value = reporte.total.etiqueta;
  rt.getCell(6).value = reporte.total.areaHa;
  reporte.total.diasMm.forEach((mm, di) => {
    rt.getCell(COL_DIAS_INICIO + di).value = mm;
  });
  rt.getCell(colAcumMes).value = reporte.total.acumMes;
  rt.getCell(colAcumAnio).value = reporte.total.acumAnio;
  for (let c = 1; c <= totalCols; c++) {
    rt.getCell(c).font = { bold: true };
    rt.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_TOTAL },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
