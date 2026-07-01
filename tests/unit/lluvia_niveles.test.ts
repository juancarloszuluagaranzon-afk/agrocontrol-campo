import { describe, it, expect } from "vitest";
import { NIVELES_LLUVIA, nivelLluvia, iconoGotaStep } from "@/lib/geo/lluvia";

describe("nivelLluvia", () => {
  it("ubica cada mm en su nivel de intensidad", () => {
    expect(nivelLluvia(0).icon).toBe("gota-0"); // sin lluvia
    expect(nivelLluvia(5).icon).toBe("gota-1"); // ligera
    expect(nivelLluvia(12).icon).toBe("gota-2"); // moderada
    expect(nivelLluvia(30).icon).toBe("gota-3"); // fuerte
    expect(nivelLluvia(80).icon).toBe("gota-4"); // extrema
  });

  it("los límites son exclusivos hacia arriba", () => {
    expect(nivelLluvia(0.1).icon).toBe("gota-1");
    expect(nivelLluvia(10).icon).toBe("gota-2");
    expect(nivelLluvia(50).icon).toBe("gota-4");
  });
});

describe("iconoGotaStep", () => {
  it("arma una expresión step con los mismos umbrales que NIVELES_LLUVIA", () => {
    const expr = iconoGotaStep() as unknown[];
    expect(expr[0]).toBe("step");
    expect(expr[2]).toBe(NIVELES_LLUVIA[0]!.icon);
    // Pares (umbral, icono) para los niveles 1..n.
    expect(expr[3]).toBe(NIVELES_LLUVIA[0]!.max);
    expect(expr[4]).toBe(NIVELES_LLUVIA[1]!.icon);
    expect(expr[5]).toBe(NIVELES_LLUVIA[1]!.max);
    expect(expr[6]).toBe(NIVELES_LLUVIA[2]!.icon);
  });
});
