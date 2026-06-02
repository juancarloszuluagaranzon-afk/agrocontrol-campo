import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Inyectado por Serwist en build: lista de archivos a precachear (app shell).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Estrategias por defecto de @serwist/next (app shell, datos, estáticos).
  // Las capas GeoJSON y los tiles del AOI se afinarán en las Fases 1/4 (§14).
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
