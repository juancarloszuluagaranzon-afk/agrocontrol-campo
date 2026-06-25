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

/** Logo de Rio Map (marca del sello). Una sola carga cacheada por módulo. */
let logoPromise: Promise<HTMLImageElement | null> | null = null;

/**
 * Carga el logo `/icons/icon-512.png` (cacheado por el SW para campo offline).
 * Si falla, resuelve a `null`: un logo ausente nunca debe romper el sellado.
 */
function cargarLogo(): Promise<HTMLImageElement | null> {
  if (logoPromise) return logoPromise;
  logoPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/icons/icon-512.png";
  });
  return logoPromise;
}

/**
 * Dibuja la foto en un canvas (reducida a ancho máx. 1600 px) con un banner
 * inferior semitransparente y las `lineas` del sello. Devuelve un Blob JPEG.
 */
export async function sellarFoto(file: File, lineas: string[]): Promise<Blob> {
  const [img, logo] = await Promise.all([cargarImagen(file), cargarLogo()]);
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
  const top = h - bannerH;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, top, w, bannerH);

  // Logo de Rio Map como insignia al inicio del recuadro (marca de la app). El
  // texto se corre a su derecha; si el logo no cargó, queda en el borde (pad).
  let xTexto = pad;
  if (logo) {
    const lado = lineas.length * lh; // cuadrado, alto del bloque de texto
    ctx.drawImage(logo, pad, top + pad, lado, lado);
    xTexto = pad + lado + pad;
  }

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  lineas.forEach((linea, i) => {
    // Primera línea (suerte·hacienda) en negrita para destacar.
    ctx.font = `${i === 0 ? "bold " : ""}${fs}px sans-serif`;
    ctx.fillText(linea, xTexto, top + pad + i * lh);
  });

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("No se pudo generar la imagen");
  return blob;
}
