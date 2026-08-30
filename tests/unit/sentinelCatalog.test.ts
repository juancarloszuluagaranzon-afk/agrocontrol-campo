import { describe, it, expect } from "vitest";
import {
  catalogSearchBody,
  parseCatalogDates,
} from "@/lib/geo/sentinelCatalog";

describe("catalogSearchBody", () => {
  it("pide Sentinel-2 L2A en el bbox y rango, solo fecha+nubes", () => {
    const body = catalogSearchBody(
      [-76.1, 4.2, -76.0, 4.3],
      "2026-06-01",
      "2026-08-30",
    );
    expect(body.collections).toEqual(["sentinel-2-l2a"]);
    expect(body.bbox).toEqual([-76.1, 4.2, -76.0, 4.3]);
    expect(body.datetime).toBe("2026-06-01T00:00:00Z/2026-08-30T23:59:59Z");
    expect(body.fields.include).toContain("properties.eo:cloud_cover");
    expect(body.fields.exclude).toContain("geometry");
  });
});

describe("parseCatalogDates", () => {
  it("dedup por día conservando la menor nubosidad, ordenado", () => {
    const dates = parseCatalogDates([
      {
        properties: { datetime: "2026-08-20T15:10:00Z", "eo:cloud_cover": 40 },
      },
      {
        properties: { datetime: "2026-08-20T15:11:00Z", "eo:cloud_cover": 12 },
      }, // misma fecha, menos nubes
      {
        properties: { datetime: "2026-08-05T15:10:00Z", "eo:cloud_cover": 80 },
      },
    ]);
    expect(dates).toEqual([
      { date: "2026-08-05", cloud: 80 },
      { date: "2026-08-20", cloud: 12 },
    ]);
  });

  it("redondea la nubosidad y asume 100% si falta", () => {
    const dates = parseCatalogDates([
      {
        properties: {
          datetime: "2026-08-01T00:00:00Z",
          "eo:cloud_cover": 23.7,
        },
      },
      { properties: { datetime: "2026-08-10T00:00:00Z" } },
    ]);
    expect(dates).toEqual([
      { date: "2026-08-01", cloud: 24 },
      { date: "2026-08-10", cloud: 100 },
    ]);
  });

  it("ignora features sin datetime", () => {
    expect(parseCatalogDates([{ properties: {} }, {}])).toEqual([]);
  });
});
