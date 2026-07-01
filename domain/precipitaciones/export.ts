import type { Precipitacion } from "@/domain/precipitaciones/schema";
import type { PluviometroRef } from "@/domain/pluviometros/schema";
import {
  acumulado,
  inicioAnio,
  lecturaDelDia,
} from "@/domain/precipitaciones/acumulado";

/**
 * Genera el CSV del **consolidado mensual** de precipitación (para que Recursos
 * Hídricos actualice su acumulado), con el mismo formato de su Excel:
 *   - pluviómetros en filas (zona, hacienda, localización, técnico, PLUV No, área)
 *   - los días del mes en columnas (mm de cada día)
 *   - `Acumul. MES` y `Acumul. AÑO`
 *   - por cada zona una fila **"Promedio Zona X"** y al final el **total** de la
 *     planta: el promedio **ponderado por área de influencia** (Thiessen).
 * Formato es-CO: separador `;` y decimales con coma; lleva BOM para los acentos.
 *
 * Nota: `Acumul. AÑO` refleja solo lo registrado en la app (el histórico 2026 se
 * importa aparte); crece a medida que se cargan lecturas.
 */

/** Días que tiene el mes `YYYY-MM`. */
export function diasDelMes(anioMes: string): number {
  const [y, m] = anioMes.split("-").map(Number);
  if (!y || !m) return 0;
  return new Date(y, m, 0).getDate();
}

/** Número con coma decimal (es-CO), sin separador de miles. */
function numCSV(n: number): string {
  return String(n).replace(".", ",");
}

/** Celda de texto entre comillas, escapando las comillas internas. */
function txtCSV(v: string | number | null): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function zonaOrden(z: PluviometroRef["zona"]): number {
  const n = Number(z);
  return Number.isFinite(n) ? n : 999;
}

function redondea1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Promedio ponderado por área: Σ(valor·área)/Σ(área). Sin área → 0. */
function ponderado(pares: { valor: number; area: number }[]): number {
  const sumaArea = pares.reduce((s, p) => s + p.area, 0);
  if (sumaArea === 0) return 0;
  const suma = pares.reduce((s, p) => s + p.valor * p.area, 0);
  return redondea1(suma / sumaArea);
}

/** mm de un pluviómetro en un día (0 si no hay lectura), para el ponderado. */
function mmDia(
  items: Precipitacion[],
  planta: string,
  pv: number,
  fecha: string,
): number {
  return lecturaDelDia(items, planta, pv, fecha)?.mm ?? 0;
}

export function csvConsolidadoMensual(
  pluviometros: PluviometroRef[],
  items: Precipitacion[],
  planta: string,
  anioMes: string,
  nombrePlanta = "Total",
): string {
  const dias = diasDelMes(anioMes);
  const fechaDe = (d: number) => `${anioMes}-${String(d).padStart(2, "0")}`;
  const desdeMes = `${anioMes}-01`;
  const hastaMes = fechaDe(dias);
  const desdeAnio = inicioAnio(desdeMes);

  const cabecera = [
    "Zona",
    "Hacienda",
    "Localización",
    "Técnico",
    "PLUV No",
    "Área influencia Ha",
    ...Array.from({ length: dias }, (_, i) => String(i + 1)),
    "Acumul. MES",
    "Acumul. AÑO",
  ].map(txtCSV);

  const ordenados = [...pluviometros].sort(
    (a, b) =>
      zonaOrden(a.zona) - zonaOrden(b.zona) ||
      (a.tecnico ?? "").localeCompare(b.tecnico ?? "") ||
      a.id - b.id,
  );

  // Fila de un pluviómetro (mm por día + acumulados propios).
  const filaPv = (p: PluviometroRef): string => {
    const cols: string[] = [
      txtCSV(p.zona),
      txtCSV(p.hacienda),
      txtCSV(p.sitio),
      txtCSV(p.tecnico),
      String(p.id),
      p.area_ha != null ? numCSV(p.area_ha) : "",
    ];
    for (let d = 1; d <= dias; d++) {
      const l = lecturaDelDia(items, planta, p.id, fechaDe(d));
      cols.push(l ? numCSV(l.mm) : "");
    }
    cols.push(numCSV(acumulado(items, planta, p.id, desdeMes, hastaMes)));
    cols.push(numCSV(acumulado(items, planta, p.id, desdeAnio, hastaMes)));
    return cols.join(";");
  };

  // Fila de promedio ponderado por área para un grupo de pluviómetros.
  const filaPonderada = (
    etiqueta: string,
    grupo: PluviometroRef[],
    zona: string | number | null,
  ): string => {
    const areaDe = (p: PluviometroRef) => p.area_ha ?? 0;
    const areaTotal = grupo.reduce((s, p) => s + areaDe(p), 0);
    const cols: string[] = [
      txtCSV(zona),
      txtCSV(etiqueta),
      "",
      "",
      "",
      numCSV(redondea1(areaTotal)),
    ];
    for (let d = 1; d <= dias; d++) {
      cols.push(
        numCSV(
          ponderado(
            grupo.map((p) => ({
              valor: mmDia(items, planta, p.id, fechaDe(d)),
              area: areaDe(p),
            })),
          ),
        ),
      );
    }
    cols.push(
      numCSV(
        ponderado(
          grupo.map((p) => ({
            valor: acumulado(items, planta, p.id, desdeMes, hastaMes),
            area: areaDe(p),
          })),
        ),
      ),
    );
    cols.push(
      numCSV(
        ponderado(
          grupo.map((p) => ({
            valor: acumulado(items, planta, p.id, desdeAnio, hastaMes),
            area: areaDe(p),
          })),
        ),
      ),
    );
    return cols.join(";");
  };

  const lineas: string[] = [cabecera.join(";")];
  // Zonas en orden; tras cada una, su promedio ponderado.
  const zonas = [...new Set(ordenados.map((p) => String(p.zona ?? "")))];
  for (const z of zonas) {
    const grupo = ordenados.filter((p) => String(p.zona ?? "") === z);
    for (const p of grupo) lineas.push(filaPv(p));
    lineas.push(filaPonderada(`Promedio Zona ${z}`, grupo, z));
  }
  lineas.push(filaPonderada(nombrePlanta, ordenados, ""));

  return "﻿" + lineas.join("\r\n"); // BOM para que Excel respete acentos
}
