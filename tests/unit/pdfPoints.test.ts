import { describe, it, expect } from "vitest";
import { ocgIdPuntoMuestreo } from "@/lib/geo/pdfPoints";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("ocgIdPuntoMuestreo", () => {
  it("deduce el id de marked-content del OCG punto_muestreo", () => {
    const pdf =
      "1 0 obj << /Type /Catalog >> endobj\n" +
      "4 0 obj\n<< /Name (punto_muestreo) /Type /OCG >>\nendobj\n" +
      "5 0 obj << /Name (SUERTES) /Type /OCG >> endobj";
    expect(ocgIdPuntoMuestreo(bytes(pdf))).toBe("4R");
  });

  it("devuelve null si no hay capa de muestreo", () => {
    expect(ocgIdPuntoMuestreo(bytes("8 0 obj << /Name (vias) >>"))).toBeNull();
  });
});
