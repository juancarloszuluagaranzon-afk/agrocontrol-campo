import { defaultCache } from "@serwist/next/worker";
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Inyectado por Serwist en build: lista de archivos a precachear (app shell).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Estrategias offline de campo (§14):
 *  - Datos estáticos (/data/*.geojson|json): cache-first (cambian poco; sirven sin red).
 *  - Tiles satelitales Esri del AOI: cache-first con tope de entradas y expiración,
 *    para "descargar el mapa" navegando una vez antes de ir a campo.
 * Van ANTES del defaultCache de @serwist/next (app shell, estáticos de Next).
 */
const campoCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/data/"),
    handler: new CacheFirst({
      cacheName: "agrocontrol-datos",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
          purgeOnQuotaError: true,
        }),
      ],
    }),
  },
  {
    matcher: ({ url }) => url.hostname.endsWith("arcgisonline.com"),
    handler: new CacheFirst({
      cacheName: "agrocontrol-tiles-esri",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 3000, // suficiente para el AOI a varios zooms
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...campoCaching, ...defaultCache],
});

serwist.addEventListeners();
