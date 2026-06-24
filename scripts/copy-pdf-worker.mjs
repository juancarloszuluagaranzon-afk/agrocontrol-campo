// Copia el worker de pdf.js a public/pdf/ para auto-alojarlo (offline-first, sin
// CDN, y sin que webpack/turbopack resuelvan `new URL(...)` de forma distinta).
// Se ejecuta en predev/prebuild. Mantiene el worker sincronizado con la versión
// instalada de pdfjs-dist.
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(
  root,
  "node_modules",
  "pdfjs-dist",
  "build",
  "pdf.worker.min.mjs",
);
const destDir = join(root, "public", "pdf");
const dest = join(destDir, "pdf.worker.min.mjs");

await mkdir(destDir, { recursive: true });
await copyFile(src, dest);
console.log("pdf.worker copiado ->", dest);
