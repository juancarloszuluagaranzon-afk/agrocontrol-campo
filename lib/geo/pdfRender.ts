/**
 * Rasterización de un GeoPDF a imagen, en el navegador (§ ADR-0008). pdf.js se
 * carga por **import dinámico** (no entra al bundle inicial) y su worker se
 * auto-aloja en `/pdf/pdf.worker.min.mjs` (copiado en predev/prebuild). Solo se
 * usa la página 1, con un ancho máximo para que el PNG no sea enorme.
 */

const WORKER_SRC = "/pdf/pdf.worker.min.mjs";
const ANCHO_MAX = 2048;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

/** Carga pdf.js una sola vez y fija el worker auto-alojado. */
async function cargarPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export interface PdfRaster {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Rasteriza la **página 1** del PDF a un PNG (Blob). Lanza si el PDF no se puede
 * abrir. El llamador (PdfPlanControl) ya validó la georreferencia por bytes.
 */
export async function rasterizarPagina1(bytes: Uint8Array): Promise<PdfRaster> {
  const pdfjs = await cargarPdfjs();
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(1, ANCHO_MAX / base.width) * 2; // 2x para nitidez
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo");

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/png"),
  );
  void doc.cleanup();
  if (!blob) throw new Error("No se pudo generar la imagen");
  return { blob, width: canvas.width, height: canvas.height };
}
