import { describe, it, expect } from "vitest";
import type { Geometry } from "geojson";
import {
  isStatIndex,
  parseStats,
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
  it("acepta los 4 índices y rechaza otros", () => {
    expect(isStatIndex("NDVI")).toBe(true);
    expect(isStatIndex("NIR")).toBe(true);
    expect(isStatIndex("TRUE-COLOR")).toBe(false);
  });
});

describe("statEvalscript", () => {
  it("NIR emite B08 crudo y dataMask", () => {
    const s = statEvalscript("NIR");
    expect(s).toContain('"B08"');
    expect(s).toContain("index: [s.B08]");
    expect(s).toContain("dataMask: [s.dataMask]");
  });
  it("NDVI usa B04 y B08 con la fórmula del índice", () => {
    const s = statEvalscript("NDVI");
    expect(s).toContain("(s.B08 - s.B04) / (s.B08 + s.B04)");
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
    expect(b.aggregation.aggregationInterval.of).toBe("P15D");
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
});
