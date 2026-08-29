import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  sentinelHubConfig,
  sentinelHubMapId,
  sentinelHubTilesUrl,
  sentinelHubTimeParam,
} from "@/lib/geo/sentinelHub";

const ENV_KEYS = [
  "NEXT_PUBLIC_SENTINELHUB_INSTANCE_ID",
  "NEXT_PUBLIC_SENTINELHUB_LAYERS",
  "NEXT_PUBLIC_SENTINELHUB_LAYER",
  "NEXT_PUBLIC_SENTINELHUB_MAXCC",
] as const;

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

describe("sentinelHubConfig", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("devuelve null sin instance ID (capa opcional, no requisito)", () => {
    expect(sentinelHubConfig()).toBeNull();
  });

  it("expone NDVI + NDMI y 20 % de nubes por defecto", () => {
    process.env.NEXT_PUBLIC_SENTINELHUB_INSTANCE_ID = "abc-123";
    const cfg = sentinelHubConfig();
    expect(cfg?.instanceId).toBe("abc-123");
    expect(cfg?.maxCloudCoverage).toBe(20);
    expect(cfg?.layers.map((l) => l.id)).toEqual(["NDVI", "NDMI"]);
  });

  it("pone etiquetas amigables por defecto", () => {
    process.env.NEXT_PUBLIC_SENTINELHUB_INSTANCE_ID = "abc-123";
    const cfg = sentinelHubConfig();
    expect(cfg?.layers).toEqual([
      { id: "NDVI", label: "NDVI (vegetación)" },
      { id: "NDMI", label: "NDMI (humedad)" },
    ]);
  });

  it("respeta la lista y las etiquetas 'ID:Etiqueta' de _LAYERS", () => {
    process.env.NEXT_PUBLIC_SENTINELHUB_INSTANCE_ID = "abc-123";
    process.env.NEXT_PUBLIC_SENTINELHUB_LAYERS =
      "TRUE-COLOR,NDMI:Humedad del cultivo";
    const cfg = sentinelHubConfig();
    expect(cfg?.layers).toEqual([
      { id: "TRUE-COLOR", label: "Color real" },
      { id: "NDMI", label: "Humedad del cultivo" },
    ]);
  });

  it("mantiene compatibilidad con _LAYER (singular)", () => {
    process.env.NEXT_PUBLIC_SENTINELHUB_INSTANCE_ID = "abc-123";
    process.env.NEXT_PUBLIC_SENTINELHUB_LAYER = "NDVI";
    expect(sentinelHubConfig()?.layers).toEqual([
      { id: "NDVI", label: "NDVI (vegetación)" },
    ]);
  });

  it("un MAXCC inválido cae al 20 % en vez de anular las capas", () => {
    process.env.NEXT_PUBLIC_SENTINELHUB_INSTANCE_ID = "abc-123";
    process.env.NEXT_PUBLIC_SENTINELHUB_MAXCC = "no-es-numero";
    expect(sentinelHubConfig()?.maxCloudCoverage).toBe(20);
  });
});

describe("sentinelHubMapId", () => {
  it("prefija el id de capa para MapLibre", () => {
    expect(sentinelHubMapId("NDVI")).toBe("sentinel-hub-NDVI");
    expect(sentinelHubMapId("NDMI")).toBe("sentinel-hub-NDMI");
  });
});

describe("sentinelHubTilesUrl", () => {
  const opts = { instanceId: "abc-123", layer: "NDMI", maxCloudCoverage: 20 };

  it("apunta al endpoint OGC de CDSE con el instance ID en la ruta", () => {
    expect(sentinelHubTilesUrl(opts)).toContain(
      "https://sh.dataspace.copernicus.eu/ogc/wms/abc-123?",
    );
  });

  it("pide WMS 1.1.1 en EPSG:3857 con la capa y la nubosidad", () => {
    const url = sentinelHubTilesUrl(opts);
    expect(url).toContain("VERSION=1.1.1");
    expect(url).toContain("SRS=EPSG%3A3857");
    expect(url).toContain("LAYERS=NDMI");
    expect(url).toContain("MAXCC=20");
  });

  it("deja el marcador {bbox-epsg-3857} sin escapar para MapLibre", () => {
    const url = sentinelHubTilesUrl(opts);
    expect(url).toContain("&BBOX={bbox-epsg-3857}");
    expect(url).not.toContain("%7Bbbox");
  });

  it("sin time no incluye TIME (imagen más reciente)", () => {
    expect(sentinelHubTilesUrl(opts)).not.toContain("TIME=");
  });

  it("con time añade el rango TIME sin escapar el '/' del rango", () => {
    const url = sentinelHubTilesUrl({ ...opts, time: "2026-08-06/2026-08-20" });
    expect(url).toContain("&TIME=2026-08-06/2026-08-20");
    // el '/' del rango de TIME queda crudo (no %2F) para CDSE
    expect(url).not.toContain("2026-08-06%2F");
    // TIME va antes del marcador de BBOX
    expect(url.indexOf("TIME=")).toBeLessThan(url.indexOf("BBOX="));
  });
});

describe("sentinelHubTimeParam", () => {
  it("null/indefinido → undefined (más reciente)", () => {
    expect(sentinelHubTimeParam(null)).toBeUndefined();
    expect(sentinelHubTimeParam(undefined)).toBeUndefined();
    expect(sentinelHubTimeParam("")).toBeUndefined();
  });

  it("fecha inválida → undefined", () => {
    expect(sentinelHubTimeParam("no-es-fecha")).toBeUndefined();
  });

  it("arma una ventana que termina en la fecha y abarca 14 días atrás", () => {
    expect(sentinelHubTimeParam("2026-08-20")).toBe("2026-08-06/2026-08-20");
  });

  it("respeta una ventana personalizada", () => {
    expect(sentinelHubTimeParam("2026-08-20", 5)).toBe("2026-08-15/2026-08-20");
  });
});
