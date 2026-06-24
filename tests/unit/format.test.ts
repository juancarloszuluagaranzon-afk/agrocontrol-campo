import { describe, it, expect } from "vitest";
import {
  formatHectareas,
  formatMetros,
  errorRelativoPct,
  formatCoordenadas,
} from "@/lib/geo/format";

describe("formatHectareas", () => {
  it("usa coma decimal y 3 decimales (es-CO)", () => {
    expect(formatHectareas(3.428)).toBe("3,428 ha");
  });

  it("rellena decimales faltantes", () => {
    expect(formatHectareas(1.5)).toBe("1,500 ha");
  });

  it("usa punto como separador de miles", () => {
    expect(formatHectareas(2849.12)).toBe("2.849,120 ha");
  });
});

describe("formatMetros", () => {
  it("redondea a entero por defecto", () => {
    expect(formatMetros(1234.5)).toBe("1.235 m");
  });
});

describe("formatCoordenadas", () => {
  it("muestra lat, lon con 6 decimales y punto", () => {
    expect(formatCoordenadas(-76.10389, 4.28846)).toBe("4.288460, -76.103890");
  });
});

describe("errorRelativoPct", () => {
  it("calcula el error relativo en %", () => {
    expect(errorRelativoPct(3.5, 3.428)).toBeCloseTo(2.1, 1);
  });

  it("devuelve NaN si el área oficial es 0", () => {
    expect(errorRelativoPct(1, 0)).toBeNaN();
  });
});
