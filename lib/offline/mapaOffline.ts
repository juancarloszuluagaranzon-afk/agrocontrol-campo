import type { PlantaId } from "@/lib/plantas";

/**
 * "Mapa sin señal" (ADR-0036): descarga el satélite de las fincas a un caché
 * propio que el service worker consulta primero. Va aparte del caché "al vuelo"
 * de teselas (tope de 3.000 entradas que se van reemplazando) para que lo
 * descargado no se pierda al navegar otras zonas.
 */

/** Caché del mapa descargado (lo lee también `app/sw.ts`). */
export const CACHE_MAPA_OFFLINE = "agrocontrol-mapa-offline";
/**
 * Marca en la URL de las peticiones de descarga: el service worker las deja
 * pasar directo a la red, para no duplicarlas en el caché al vuelo. Se guardan
 * bajo la URL limpia, que es la que pide el mapa.
 */
export const PARAM_DESCARGA = "riomap-descarga";

const CLAVE_ESTADO = "agrocontrol-mapa-offline";

export interface EstadoDescarga {
  /** ISO de la última descarga completa. */
  fecha: string;
  total: number;
  guardadas: number;
}

type Estados = Partial<Record<PlantaId, EstadoDescarga>>;

function leerEstados(): Estados {
  try {
    const raw = localStorage.getItem(CLAVE_ESTADO);
    const v: unknown = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" ? (v as Estados) : {};
  } catch {
    return {};
  }
}

export function leerEstadoDescarga(planta: PlantaId): EstadoDescarga | null {
  const e = leerEstados()[planta];
  return e && typeof e.fecha === "string" && typeof e.total === "number"
    ? e
    : null;
}

export function guardarEstadoDescarga(
  planta: PlantaId,
  estado: EstadoDescarga | null,
): void {
  try {
    const todos = leerEstados();
    if (estado) todos[planta] = estado;
    else delete todos[planta];
    localStorage.setItem(CLAVE_ESTADO, JSON.stringify(todos));
  } catch {
    // Sin almacenamiento (modo privado): la descarga sirve igual, solo no se
    // recuerda la fecha.
  }
}

export function cacheDisponible(): boolean {
  return typeof caches !== "undefined";
}

export interface Progreso {
  hechas: number;
  total: number;
  fallidas: number;
}

export interface OpcionesDescarga {
  onProgreso?: (p: Progreso) => void;
  signal?: AbortSignal;
  /** Peticiones simultáneas (por defecto 6, como un navegador por dominio). */
  concurrencia?: number;
}

function conMarca(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${PARAM_DESCARGA}=1`;
}

/**
 * Descarga `urls` al caché del mapa. Salta las que ya están (re-intentar
 * continúa donde quedó) y reintenta una vez cada falla. Cancelable con
 * `signal`; lo descargado hasta ahí queda guardado.
 */
export async function descargarAlCache(
  urls: string[],
  { onProgreso, signal, concurrencia = 6 }: OpcionesDescarga = {},
): Promise<Progreso> {
  const cache = await caches.open(CACHE_MAPA_OFFLINE);
  const p: Progreso = { hechas: 0, total: urls.length, fallidas: 0 };
  let siguiente = 0;

  async function bajar(url: string): Promise<boolean> {
    if (await cache.match(url)) return true;
    for (let intento = 0; intento < 2; intento++) {
      if (signal?.aborted) return false;
      try {
        const res = await fetch(conMarca(url), { mode: "cors", signal });
        if (res.ok) {
          await cache.put(url, res);
          return true;
        }
      } catch {
        // Red caída o cancelada: se reintenta una vez y si no, cuenta como falla.
      }
    }
    return false;
  }

  async function trabajador(): Promise<void> {
    while (!signal?.aborted && siguiente < urls.length) {
      const url = urls[siguiente++];
      if (url === undefined) break;
      const ok = await bajar(url);
      if (signal?.aborted) break;
      p.hechas++;
      if (!ok) p.fallidas++;
      onProgreso?.({ ...p });
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, concurrencia) }, () => trabajador()),
  );
  return p;
}

/** Cuántas de `urls` ya están guardadas (para mostrar el estado real). */
export async function contarGuardadas(urls: string[]): Promise<number> {
  const cache = await caches.open(CACHE_MAPA_OFFLINE);
  const guardadas = new Set((await cache.keys()).map((r) => r.url));
  return urls.filter((u) => guardadas.has(u)).length;
}

/** Borra del caché las `urls` (solo las de una planta; la otra se conserva). */
export async function borrarDelCache(urls: string[]): Promise<void> {
  const cache = await caches.open(CACHE_MAPA_OFFLINE);
  await Promise.all(urls.map((u) => cache.delete(u)));
}

/**
 * Pide al navegador no borrar el almacenamiento de la app cuando falte espacio
 * (sin esto, Chrome puede desalojar el mapa descargado). Es una petición: el
 * navegador puede negarla sin avisar.
 */
export async function pedirAlmacenamientoPersistente(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // No soportado: se sigue igual.
  }
}
