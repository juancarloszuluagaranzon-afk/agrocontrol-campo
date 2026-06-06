import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Serwist (modo clásico) adjunta una config de webpack para el build. Declarar
  // un objeto `turbopack` evita que `next dev` lo interprete como conflicto y
  // permite conservar Turbopack en desarrollo (ver ADR-0003).
  turbopack: {},
  // El indicador de desarrollo de Next se posiciona abajo-izquierda y tapaba el
  // botón de herramientas (✏️) en esa esquina; sólo aplica en dev (no en prod).
  devIndicators: false,
};

/**
 * PWA con Serwist (§7, §14). El service worker se compila desde `app/sw.ts`
 * y se emite a `public/sw.js`. Desactivado en desarrollo para no interferir
 * con el HMR.
 */
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
