import { z } from "zod";

/**
 * Capas de Sentinel Hub del Copernicus Data Space Ecosystem (CDSE) — el
 * "siguiente paso" que anticipó ADR-0021 respecto al mosaico anual de EOX
 * (`s2cloudless`). A diferencia de ese compuesto sin fecha, cada tesela es la
 * **imagen Sentinel-2 más reciente** bajo el umbral de nubes configurado, y la
 * capa puede ser un índice agronómico (NDVI = vegetación, NDMI = humedad…).
 *
 * Se exponen **varias capas** (una por toggle) desde una **misma instancia**:
 * la lista se define en el entorno. El acceso OGC de CDSE se autentica con el
 * **instance ID en la URL** (no OAuth): `…/ogc/wms/<INSTANCE_ID>`. Ese id no es
 * un secreto de credencial pero **consume la cuota**, así que la configuración se
 * restringe al dominio del despliegue en el panel de CDSE (ADR-0022).
 */

/** Host OGC WMS de Sentinel Hub en el Copernicus Data Space Ecosystem. */
const WMS_HOST = "https://sh.dataspace.copernicus.eu/ogc/wms";

/** Prefijo de los ids de fuente/capa de Sentinel Hub en el estilo de MapLibre. */
const MAP_ID_PREFIX = "sentinel-hub";

/** Id de fuente/capa en MapLibre para una capa de Sentinel Hub (p. ej. NDVI). */
export function sentinelHubMapId(layer: string): string {
  return `${MAP_ID_PREFIX}-${layer}`;
}

/** Etiquetas amigables por defecto para las capas más comunes de Sentinel-2. */
const DEFAULT_LABELS: Record<string, string> = {
  NDVI: "NDVI (vegetación)",
  NDMI: "NDMI (humedad)",
  NDWI: "NDWI (agua)",
  "TRUE-COLOR": "Color real",
  "FALSE-COLOR": "Color falso",
};

export interface SentinelHubLayer {
  /** Nombre EXACTO de la capa en la instancia CDSE (parámetro LAYERS del WMS). */
  id: string;
  /** Etiqueta corta para el toggle en 🗂️ Capas. */
  label: string;
}

const layerSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const configSchema = z.object({
  /** Instance ID de la configuración OGC creada en el panel de CDSE. */
  instanceId: z.string().min(1),
  /** Nubosidad máxima admitida por tesela (0–100 %). */
  maxCloudCoverage: z.number().int().min(0).max(100),
  /** Capas a exponer, cada una con su propio toggle. */
  layers: z.array(layerSchema).min(1),
});

export type SentinelHubConfig = z.infer<typeof configSchema>;

/**
 * Parsea la lista de capas del entorno. Cada entrada es el nombre exacto de la
 * capa, opcionalmente `ID:Etiqueta` para el texto del toggle. Sin etiqueta, se
 * usa una amigable conocida o el propio id.
 *
 * `"NDVI,NDMI:Humedad"` → `[{id:"NDVI",label:"NDVI (vegetación)"},{id:"NDMI",label:"Humedad"}]`.
 */
function parseLayers(raw: string): SentinelHubLayer[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const sep = entry.indexOf(":");
      const id = (sep === -1 ? entry : entry.slice(0, sep)).trim();
      const label =
        sep === -1 ? (DEFAULT_LABELS[id] ?? id) : entry.slice(sep + 1).trim();
      return { id, label: label || id };
    });
}

/**
 * Lee la configuración de Sentinel Hub del entorno. Devuelve `null` cuando no
 * hay instance ID: las capas son **opcionales**, así que simplemente no aparecen
 * —nunca lanza (a diferencia de `requireSupabaseEnv`, que sí es requisito)—.
 *
 * `_LAYERS` (lista) tiene prioridad; `_LAYER` (singular) se mantiene por
 * compatibilidad; sin ninguno, NDVI + NDMI por defecto. Un `_MAXCC` mal escrito
 * cae al 20 % en vez de anular las capas.
 */
export function sentinelHubConfig(): SentinelHubConfig | null {
  const instanceId = process.env.NEXT_PUBLIC_SENTINELHUB_INSTANCE_ID;
  if (!instanceId) return null;

  const rawLayers =
    process.env.NEXT_PUBLIC_SENTINELHUB_LAYERS ||
    process.env.NEXT_PUBLIC_SENTINELHUB_LAYER ||
    "NDVI,NDMI";

  const maxccRaw = process.env.NEXT_PUBLIC_SENTINELHUB_MAXCC;
  const maxccNum = maxccRaw ? Number(maxccRaw) : 20;

  const parsed = configSchema.safeParse({
    instanceId,
    maxCloudCoverage: Number.isFinite(maxccNum) ? Math.round(maxccNum) : 20,
    layers: parseLayers(rawLayers),
  });
  return parsed.success ? parsed.data : null;
}

/** Días hacia atrás de la ventana de imagen al elegir una fecha (revisita S-2 ~5 d). */
export const SENTINEL_HUB_WINDOW_DAYS = 14;

/**
 * Convierte una fecha `YYYY-MM-DD` en el parámetro `TIME` del WMS: una ventana
 * `inicio/fin` que **termina en esa fecha** y abarca `windowDays` hacia atrás,
 * para que CDSE devuelva la última escena disponible **hasta** ese día (Sentinel-2
 * revisita ~cada 5 días, rara vez hay imagen del día exacto). Solo fechas (sin
 * hora) → sin `:` que escapar. `null`/fecha inválida → `undefined` (más reciente).
 */
export function sentinelHubTimeParam(
  dateISO: string | null | undefined,
  windowDays: number = SENTINEL_HUB_WINDOW_DAYS,
): string | undefined {
  if (!dateISO) return undefined;
  const end = new Date(`${dateISO}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return undefined;
  const start = new Date(end.getTime() - windowDays * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(start)}/${fmt(end)}`;
}

/**
 * Plantilla de teselas WMS para una fuente `raster` de MapLibre.
 *
 * MapLibre sustituye `{bbox-epsg-3857}` por `minX,minY,maxX,maxY`; con
 * `VERSION=1.1.1` + `SRS=EPSG:3857` el orden es x,y tradicional (el más robusto
 * para teselado, sin la inversión de ejes de 1.3.0). Con `time` (ventana
 * `YYYY-MM-DD/YYYY-MM-DD`) se fija la fecha; sin él, CDSE devuelve la imagen más
 * reciente bajo `MAXCC`.
 */
export function sentinelHubTilesUrl(opts: {
  instanceId: string;
  layer: string;
  maxCloudCoverage: number;
  time?: string;
}): string {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.1.1",
    LAYERS: opts.layer,
    FORMAT: "image/png",
    TRANSPARENT: "true",
    SRS: "EPSG:3857",
    WIDTH: "256",
    HEIGHT: "256",
    MAXCC: String(opts.maxCloudCoverage),
  });
  // `{bbox-epsg-3857}` y `TIME` se concatenan aparte: el marcador de MapLibre no
  // debe ir URL-encoded, y el rango de TIME va como en la doc de CDSE (con `/`).
  const time = opts.time ? `&TIME=${opts.time}` : "";
  return `${WMS_HOST}/${opts.instanceId}?${params.toString()}${time}&BBOX={bbox-epsg-3857}`;
}
