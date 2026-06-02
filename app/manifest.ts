import type { MetadataRoute } from "next";
import { t } from "@/lib/i18n/es-CO";

/**
 * Manifest PWA (§7). Genera `/manifest.webmanifest`. App instalable, orientada
 * a uso de campo en tablet/celular (standalone, retrato).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${t.app.nombre} — ${t.app.descripcion}`,
    short_name: t.app.nombre,
    description: t.app.descripcion,
    start_url: "/mapa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "es-CO",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
