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
  // Precachea el documento del shell offline (`/~offline`) versionado junto a los
  // chunks del mismo build, para que la app abra sin señal (ADR-0020). Se usa
  // `manifestTransforms` y NO `additionalPrecacheEntries`: este último desactiva
  // el escaneo de `public/**` y perdería el precache de `/data/*.json` (regresión
  // offline). La revisión cambia por build (hash de webpack, o la hora como
  // respaldo) para reprecachear y purgar el viejo tras cada despliegue.
  manifestTransforms: [
    (entries, compilation) => {
      const revision =
        (compilation as { hash?: string | null } | undefined)?.hash ??
        String(Date.now());
      return Promise.resolve({
        manifest: [...entries, { url: "/~offline", revision, size: 0 }],
        warnings: [],
      });
    },
  ],
});

export default withSerwist(nextConfig);
