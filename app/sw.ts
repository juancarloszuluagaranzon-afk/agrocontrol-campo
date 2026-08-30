import { defaultCache } from "@serwist/next/worker";
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

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
    // Worker de pdf.js (Plano de campo): cache-first para usarlo offline.
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/pdf/"),
    handler: new CacheFirst({
      cacheName: "agrocontrol-pdfjs",
      plugins: [
        new ExpirationPlugin({ maxEntries: 4, purgeOnQuotaError: true }),
      ],
    }),
  },
  {
    // Iconos de la app (logo del sello de "Foto de campo"): cache-first offline.
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/icons/"),
    handler: new CacheFirst({
      cacheName: "agrocontrol-iconos",
      plugins: [
        new ExpirationPlugin({ maxEntries: 8, purgeOnQuotaError: true }),
      ],
    }),
  },
  {
    // Fechas del catálogo Sentinel (ruta propia): stale-while-revalidate para
    // ver las últimas fechas conocidas sin señal y refrescarlas al reconectar.
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/api/sentinel-dates"),
    handler: new StaleWhileRevalidate({
      cacheName: "agrocontrol-sentinel-fechas",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 8,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    }),
  },
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
  {
    // Tiles Sentinel-2 (EOX): cache-first, para verlos sin re-descargar y offline
    // en las zonas ya navegadas (ADR-0021).
    matcher: ({ url }) => url.hostname.endsWith("maps.eox.at"),
    handler: new CacheFirst({
      cacheName: "agrocontrol-tiles-sentinel",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 1500,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    }),
  },
  {
    // Tiles Sentinel Hub (CDSE): stale-while-revalidate — sirve la cacheada al
    // instante (offline en zonas ya navegadas) y refresca en segundo plano,
    // porque es la "última imagen", no un mosaico fijo (ADR-0022). Expiración
    // corta para no anclar una imagen vieja.
    matcher: ({ url }) => url.hostname.endsWith("dataspace.copernicus.eu"),
    handler: new StaleWhileRevalidate({
      cacheName: "agrocontrol-tiles-sentinelhub",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 1500,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    }),
  },
];

/**
 * Navegaciones de documento (§14, ADR-0020). Con señal se piden **siempre a la
 * red** (para recibir el último despliegue). Sin señal, `NetworkOnly` falla y el
 * plugin de `fallbacks` sirve el shell precacheado `/~offline` —consistente con
 * los chunks del build— en vez de un HTML viejo con chunks purgados (pantalla en
 * blanco). Va ANTES de `defaultCache`, cuyo NetworkFirst devolvería HTML viejo
 * (éxito) sin llegar nunca al fallback.
 */
const navigationCaching: RuntimeCaching[] = [
  {
    matcher: ({ request }) => request.mode === "navigate",
    handler: new NetworkOnly({ networkTimeoutSeconds: 3 }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...campoCaching, ...navigationCaching, ...defaultCache],
  // Respaldo offline: ante un error en una navegación de documento, sirve el
  // shell `/~offline` precacheado (ADR-0020).
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
