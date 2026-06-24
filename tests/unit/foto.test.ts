import { describe, it, expect } from "vitest";
import { lineasSello } from "@/lib/foto/sello";

describe("lineasSello", () => {
  it("arma 3 líneas: suerte·hacienda, coordenadas y fecha", () => {
    const l = lineasSello({
      secSte: "3104-131",
      hacienda: "VALPARAISO",
      lon: -76.10389,
      lat: 4.28846,
      fecha: "24/06/2026, 10:35",
    });
    expect(l).toEqual([
      "3104-131 · VALPARAISO",
      "4.288460, -76.103890",
      "24/06/2026, 10:35",
    ]);
  });

  it("omite la línea de suerte si está fuera de cualquier lote", () => {
    const l = lineasSello({
      secSte: "",
      hacienda: "",
      lon: -76.1,
      lat: 4.3,
      fecha: "24/06/2026, 10:35",
    });
    expect(l).toHaveLength(2);
    expect(l[0]).toBe("4.300000, -76.100000");
  });
});
