import { formatCoordenadas } from "@/lib/geo/format";

/**
 * "Foto de campo": sella una foto con un recuadro (marca de agua) que lleva la
 * suerte/hacienda, las coordenadas y la fecha. `lineasSello` es pura y testeable;
 * `sellarFoto` dibuja sobre un `<canvas>` (mismo patrón que pdfRender), no
 * unit-testeable.
 */

export interface DatosSello {
  secSte: string;
  hacienda: string;
  lon: number;
  lat: number;
  /** Fecha ya formateada (la arma el componente; mantiene esto puro). */
  fecha: string;
}

/** Líneas del sello, en orden: suerte·hacienda, coordenadas, fecha. */
export function lineasSello(d: DatosSello): string[] {
  const lineas: string[] = [];
  const suerte = [d.secSte, d.hacienda].filter((x) => x.trim()).join(" · ");
  if (suerte) lineas.push(suerte);
  lineas.push(formatCoordenadas(d.lon, d.lat));
  if (d.fecha.trim()) lineas.push(d.fecha);
  return lineas;
}

/** Carga un File de imagen a un HTMLImageElement (compatible con todos). */
function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

/**
 * Dibuja la foto en un canvas (reducida a ancho máx. 1600 px) con un banner
 * inferior semitransparente y las `lineas` del sello. Devuelve un Blob JPEG.
 */
export async function sellarFoto(file: File, lineas: string[]): Promise<Blob> {
  const img = await cargarImagen(file);
  const scale = Math.min(1, 1600 / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo");
  ctx.drawImage(img, 0, 0, w, h);

  const fs = Math.max(14, Math.round(w / 38));
  const pad = Math.round(fs * 0.6);
  const lh = Math.round(fs * 1.35);
  const bannerH = lineas.length * lh + pad * 2;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, h - bannerH, w, bannerH);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  lineas.forEach((linea, i) => {
    // Primera línea (suerte·hacienda) en negrita para destacar.
    ctx.font = `${i === 0 ? "bold " : ""}${fs}px sans-serif`;
    ctx.fillText(linea, pad, h - bannerH + pad + i * lh);
  });

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("No se pudo generar la imagen");
  return blob;
}
