/**
 * Extracción de los **puntos de muestreo** de un GeoPDF (capa OCG
 * `punto_muestreo`) en el navegador (§ ADR-0008). Usa la lista de operadores de
 * pdf.js: rastrea la matriz de transformación (CTM), entra a la capa de puntos y
 * toma el centro de cada símbolo (`constructPath`), que convierte a lat/lon con la
 * georreferencia. Validado contra el PDF real (6 puntos en 3104-131).
 */
import type { GeoRef } from "@/lib/geo/geopdf";
import { pageToLonLat } from "@/lib/geo/geopdf";
import type { PuntoMuestreo } from "@/domain/plano/schema";

type Mat = [number, number, number, number, number, number];

/** Multiplica dos matrices afines (componer CTM con una transformación local). */
function mul(m: Mat, n: number[]): Mat {
  return [
    m[0] * n[0]! + m[2] * n[1]!,
    m[1] * n[0]! + m[3] * n[1]!,
    m[0] * n[2]! + m[2] * n[3]!,
    m[1] * n[2]! + m[3] * n[3]!,
    m[0] * n[4]! + m[2] * n[5]! + m[4],
    m[1] * n[4]! + m[3] * n[5]! + m[5],
  ];
}

/** Aplica una matriz afín a un punto. */
function apply(m: Mat, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Decodifica bytes a string latin1 por trozos. */
function toLatin1(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return s;
}

/**
 * Id de marked-content (estilo `"4R"`) del OCG cuyo nombre contiene "muestreo".
 * Se deduce por bytes: `N 0 obj << /Name (punto_muestreo) /Type /OCG >>` → `${N}R`.
 * Puro y testeable.
 */
export function ocgIdPuntoMuestreo(bytes: Uint8Array): string | null {
  const s = toLatin1(bytes);
  const m = s.match(/\/Name\s*\(([^)]*muestreo[^)]*)\)/i);
  if (!m) return null;
  const before = s.slice(0, m.index ?? 0);
  const objs = [...before.matchAll(/(\d+)\s+0\s+obj/g)];
  const last = objs[objs.length - 1];
  return last ? `${last[1]}R` : null;
}

/**
 * Extrae los puntos de muestreo del GeoPDF. Devuelve `[]` si no hay capa de
 * puntos (el llamador puede ofrecer marcado manual). pdf.js se importa dinámico.
 */
export async function extraerPuntosMuestreo(
  bytes: Uint8Array,
  ref: GeoRef,
): Promise<PuntoMuestreo[]> {
  const ocgId = ocgIdPuntoMuestreo(bytes);
  if (!ocgId) return [];

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await doc.getPage(1);
  const opl = await page.getOperatorList();
  const OPS = pdfjs.OPS;

  let ctm: Mat = [1, 0, 0, 1, 0, 0];
  const stack: Mat[] = [];
  const mc: boolean[] = [];
  const enPagina: [number, number][] = [];

  for (let i = 0; i < opl.fnArray.length; i++) {
    const fn = opl.fnArray[i];
    // Los args de pdf.js no están tipados a nivel de operador; se acotan aquí.
    const a = opl.argsArray[i] as unknown as number[] & Record<number, unknown>;
    if (fn === OPS.save || fn === OPS.beginGroup) {
      stack.push(ctm);
    } else if (fn === OPS.restore || fn === OPS.endGroup) {
      ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      const matrix = a[0] as number[] | undefined;
      if (matrix && matrix.length === 6) ctm = mul(ctm, matrix);
    } else if (fn === OPS.paintFormXObjectEnd) {
      ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform) {
      ctm = mul(ctm, a as number[]);
    } else if (
      fn === OPS.beginMarkedContentProps ||
      fn === OPS.beginMarkedContent
    ) {
      const props = a[1] as { id?: string } | undefined;
      mc.push(props?.id === ocgId);
    } else if (fn === OPS.endMarkedContent) {
      mc.pop();
    } else if (fn === OPS.constructPath && mc.some(Boolean)) {
      const mm = a[2] as ArrayLike<number> | undefined;
      if (mm && mm.length >= 4) {
        const cx = (mm[0]! + mm[2]!) / 2;
        const cy = (mm[1]! + mm[3]!) / 2;
        enPagina.push(apply(ctm, cx, cy));
      }
    }
  }
  void doc.cleanup();

  // Dedup: un punto puede dibujarse con varios subtrazos (< ~4 pt de página).
  const uniq: [number, number][] = [];
  for (const p of enPagina) {
    if (!uniq.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 4)) {
      uniq.push(p);
    }
  }

  return uniq.map(([px, py], i) => {
    const [lon, lat] = pageToLonLat(ref, px, py);
    return { id: `P${i + 1}`, lat, lon, muestreado: false };
  });
}
