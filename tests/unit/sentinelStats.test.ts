import { describe, it, expect } from "vitest";
import type { Geometry } from "geojson";
import {
  isSarIndex,
  isStatIndex,
  parseStats,
  parseStatsSeries,
  statEvalscript,
  statsBody,
} from "@/lib/geo/sentinelStats";

const geom: Geometry = {
  type: "Polygon",
  coordinates: [
    [
      [-76.1, 4.3],
      [-76.0, 4.3],
      [-76.0, 4.4],
      [-76.1, 4.4],
      [-76.1, 4.3],
    ],
  ],
};

describe("isStatIndex", () => {
  it("acepta ópticos y radar, rechaza otros", () => {
    expect(isStatIndex("NDVI")).toBe(true);
    expect(isStatIndex("NIR")).toBe(true);
    expect(isStatIndex("VV")).toBe(true);
    expect(isStatIndex("RVI")).toBe(true);
    expect(isStatIndex("TRUE-COLOR")).toBe(false);
  });
  it("isSarIndex distingue radar de óptico", () => {
    expect(isSarIndex("VH")).toBe(true);
    expect(isSarIndex("NDVI")).toBe(false);
  });
});

describe("SAR (Sentinel-1)", () => {
  it("VH emite dB (log) y RVI la razón 4·VH/(VV+VH)", () => {
    expect(statEvalscript("VH")).toContain("s.VH");
    expect(statEvalscript("VH")).toContain("Math.log");
    expect(statEvalscript("RVI")).toContain("(4 * s.VH)");
    expect(statEvalscript("VV")).toContain('input: ["VV", "VH", "dataMask"]');
  });
  it("statsBody de radar usa sentinel-1-grd con orto + GAMMA0", () => {
    const b = statsBody(geom, "2024-01-01", "2024-12-31", "VV", 60, "P30D");
    expect(b.input.data[0]?.type).toBe("sentinel-1-grd");
    expect(b.input.data[0]?.processing?.backCoeff).toBe("GAMMA0_TERRAIN");
    expect(b.aggregation.aggregationInterval.of).toBe("P30D");
  });
});

describe("statEvalscript", () => {
  it("NIR emite B08 crudo y enmascara nubes por píxel con SCL", () => {
    const s = statEvalscript("NIR");
    expect(s).toContain('"B08"');
    expect(s).toContain("index: [s.B08]");
    // SCL como entrada y su uso en la máscara de nube (ADR-0028).
    expect(s).toContain('"SCL"');
    expect(s).toContain("var clear");
    expect(s).toContain("dataMask: [s.dataMask * clear]");
  });
  it("NDVI usa B04 y B08 con la fórmula del índice", () => {
    const s = statEvalscript("NDVI");
    expect(s).toContain("(s.B08 - s.B04) / (s.B08 + s.B04)");
    expect(s).toContain('"SCL"');
  });
});

describe("statsBody", () => {
  it("arma Sentinel-2 L2A, reproyecta a 3857 y usa un intervalo del período", () => {
    const b = statsBody(geom, "2026-08-06", "2026-08-20", "NDVI");
    expect(b.input.data[0]?.type).toBe("sentinel-2-l2a");
    expect(b.input.bounds.properties.crs).toContain("3857");
    // geometría reproyectada: lon −76,1 → ~−8,47M m en Web Mercator
    const g = b.input.bounds.geometry;
    const x = g.type === "Polygon" ? (g.coordinates[0]?.[0]?.[0] ?? 0) : 0;
    expect(x).toBeLessThan(-8_000_000);
    expect(b.aggregation.timeRange.from).toBe("2026-08-06T00:00:00Z");
    expect(b.aggregation.timeRange.to).toBe("2026-08-20T23:59:59Z");
    expect(b.aggregation.aggregationInterval.of).toBe("P14D");
  });

  it("admite nubes altas por defecto (SCL enmascara) y permite override", () => {
    const def = statsBody(geom, "2026-08-06", "2026-08-20", "NDVI");
    expect(def.input.data[0]?.dataFilter.maxCloudCoverage).toBe(60);
    const hi = statsBody(geom, "2026-08-06", "2026-08-20", "NDVI", 90);
    expect(hi.input.data[0]?.dataFilter.maxCloudCoverage).toBe(90);
  });

  it("con `interval` usa ese paso (serie), no un único intervalo del período", () => {
    const b = statsBody(geom, "2026-01-01", "2026-12-31", "NDVI", 60, "P30D");
    expect(b.aggregation.aggregationInterval.of).toBe("P30D");
  });
});

describe("parseStatsSeries", () => {
  it("devuelve un punto por intervalo, con huecos como stats null", () => {
    const json = {
      data: [
        {
          interval: {
            from: "2026-01-01T00:00:00Z",
            to: "2026-02-01T00:00:00Z",
          },
          outputs: {
            index: {
              bands: { B0: { stats: { mean: 0.3, sampleCount: 100 } } },
            },
          },
        },
        {
          interval: {
            from: "2026-02-01T00:00:00Z",
            to: "2026-03-01T00:00:00Z",
          },
          outputs: {
            index: {
              bands: { B0: { stats: { mean: "NaN", sampleCount: 100 } } },
            },
          },
        },
      ],
    };
    const s = parseStatsSeries(json);
    expect(s).toHaveLength(2);
    expect(s[0]?.from).toBe("2026-01-01T00:00:00Z");
    expect(s[0]?.stats?.mean).toBe(0.3);
    expect(s[1]?.stats).toBeNull(); // intervalo todo-nube → hueco
    expect(parseStatsSeries({})).toEqual([]);
  });
});

describe("parseStats", () => {
  it("extrae media/mín/máx del primer intervalo con datos", () => {
    const json = {
      data: [
        {
          outputs: {
            index: {
              bands: {
                B0: {
                  stats: {
                    min: 0.1,
                    max: 0.9,
                    mean: 0.55,
                    stDev: 0.2,
                    sampleCount: 4200,
                  },
                },
              },
            },
          },
        },
      ],
    };
    expect(parseStats(json)).toEqual({
      mean: 0.55,
      min: 0.1,
      max: 0.9,
      stDev: 0.2,
      samples: 4200,
    });
  });

  it("devuelve null si no hay muestras válidas (nubes)", () => {
    const json = {
      data: [
        {
          outputs: { index: { bands: { B0: { stats: { sampleCount: 0 } } } } },
        },
      ],
    };
    expect(parseStats(json)).toBeNull();
    expect(parseStats({})).toBeNull();
  });

  it('trata "NaN" (todo nube tras SCL, con sampleCount>0) como sin dato', () => {
    const json = {
      data: [
        {
          outputs: {
            index: {
              bands: {
                B0: {
                  stats: {
                    mean: "NaN",
                    min: "NaN",
                    max: "NaN",
                    stDev: "NaN",
                    sampleCount: 1121,
                  },
                },
              },
            },
          },
        },
      ],
    };
    expect(parseStats(json)).toBeNull();
  });
});
