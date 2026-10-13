import { defaultCache } from "@serwist/next/worker";
import type {
  PrecacheEntry,
  RouteHandlerCallback,
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
import {
  recorteDeMadre,
  teselaDeUrlEsri,
  urlTeselaEsri,
} from "../lib/geo/teselas";
import { CACHE_MAPA_OFFLINE, PARAM_DESCARGA } from "../lib/offline/mapaOffline";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Inyectado por Serwist en build: lista de archivos a precachear (app shell).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Busca en el "Mapa sin señal" descargado por la app (ADR-0036). */
async function buscarEnMapaDescargado(url: string): Promise<Response | null> {
  const cache = await caches.open(CACHE_MAPA_OFFLINE);
  return (await cache.match(url)) ?? null;
}

// Caché "al vuelo": lo que se ve con señal fuera de lo descargado.
const esriRuntime = new CacheFirst({
  cacheName: "agrocontrol-tiles-esri",
  plugins: [
    new ExpirationPlugin({
      maxEntries: 3000,
      maxAgeSeconds: 30 * 24 * 60 * 60,
      purgeOnQuotaError: true,
    }),
  ],
});

const glifosRuntime = new CacheFirst({
  cacheName: "agrocontrol-glifos",
  plugins: [
    new ExpirationPlugin({
      maxEntries: 32,
      maxAgeSeconds: 365 * 24 * 60 * 60,
      purgeOnQuotaError: true,
    }),
  ],
});

/** Niveles de zoom hacia arriba en que se busca una tesela "madre". */
const NIVELES_MADRE = 5;

/**
 * Sin señal y sin la tesela exacta (p. ej. zoom 19, o una zona fuera de lo
 * descargado), arma una con el trozo de una tesela de menor zoom ampliado:
 * se ve más borroso, pero el técnico no queda sobre un fondo vacío.
 */
async function teselaDesdeMadre(url: string): Promise<Response | null> {
  const t = teselaDeUrlEsri(url);
  if (
    !t ||
    typeof OffscreenCanvas === "undefined" ||
    typeof createImageBitmap === "undefined"
  )
    return null;
  for (let n = 1; n <= NIVELES_MADRE; n++) {
    const r = recorteDeMadre(t, n);
    if (!r) break;
    const urlMadre = urlTeselaEsri(r.madre);
    const madre =
      (await buscarEnMapaDescargado(urlMadre)) ??
      (await caches.match(urlMadre, { cacheName: "agrocontrol-tiles-esri" }));
    if (!madre) continue;
    try {
      const bmp = await createImageBitmap(await madre.blob());
      const lienzo = new OffscreenCanvas(256, 256);
      const ctx = lienzo.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bmp, r.sx, r.sy, r.lado, r.lado, 0, 0, 256, 256);
      bmp.close();
      const blob = await lienzo.convertToBlob({
        type: "image/jpeg",
        quality: 0.9,
      });
      return new Response(blob, { headers: { "Content-Type": "image/jpeg" } });
    } catch {
      return null;
    }
  }
  return null;
}

const teselaEsri: RouteHandlerCallback = async ({ request, event }) => {
  const descargada = await buscarEnMapaDescargado(request.url);
  if (descargada) return descargada;
  try {
    return await esriRuntime.handle({ request, event });
  } catch (err) {
    const armada = await teselaDesdeMadre(request.url);
    if (armada) return armada;
    throw err;
  }
};

/**
 * Estrategias offline de campo (§14):
 *  - Datos estáticos (/data/*.geojson|json): cache-first (cambian poco; sirven sin red).
 *  - Tiles satelitales Esri: el "Mapa sin señal" descargado (caché propio, sin
 *    tope), luego cache-first al vuelo con tope de entradas y, sin red, una
 *    tesela de menor zoom ampliada (ADR-0036).
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
    // Descarga del "Mapa sin señal": directo a la red; la app guarda la
    // respuesta en su propio caché (no duplicarla en el caché al vuelo).
    matcher: ({ url }) => url.searchParams.has(PARAM_DESCARGA),
    handler: new NetworkOnly(),
  },
  {
    // Satélite Esri: primero el mapa descargado, luego el caché al vuelo / red
    // y, sin señal, una tesela de menor zoom ampliada (ADR-0036).
    matcher: ({ url }) => url.hostname.endsWith("arcgisonline.com"),
    handler: teselaEsri,
  },
  {
    // Glifos de las etiquetas: casi nunca cambian. Mapa descargado primero y
    // cache-first de larga duración (el NetworkFirst por defecto los guardaba
    // 1 h y sin señal las etiquetas desaparecían).
    matcher: ({ url }) =>
      url.hostname === "demotiles.maplibre.org" &&
      url.pathname.startsWith("/font/"),
    handler: async ({ request, event }) =>
      (await buscarEnMapaDescargado(request.url)) ??
      glifosRuntime.handle({ request, event }),
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
