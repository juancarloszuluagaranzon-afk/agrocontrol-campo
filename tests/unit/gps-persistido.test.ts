import { describe, it, expect, beforeEach } from "vitest";
import {
  guardarGpsPersistido,
  leerGpsPersistido,
} from "@/lib/geo/gpsPersistido";

describe("gpsPersistido", () => {
  beforeEach(() => localStorage.clear());

  it("por defecto el GPS está apagado", () => {
    expect(leerGpsPersistido()).toEqual({ gps: false, brujula: false });
  });

  it("recuerda GPS y brújula entre recargas", () => {
    guardarGpsPersistido({ gps: true, brujula: true });
    expect(leerGpsPersistido()).toEqual({ gps: true, brujula: true });
    guardarGpsPersistido({ gps: true, brujula: false });
    expect(leerGpsPersistido()).toEqual({ gps: true, brujula: false });
  });

  it("un valor corrupto se trata como apagado", () => {
    localStorage.setItem("agrocontrol-gps-activo", "{no-es-json");
    expect(leerGpsPersistido()).toEqual({ gps: false, brujula: false });
  });
});
