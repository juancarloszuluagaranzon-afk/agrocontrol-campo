import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { edadMeses, maestroSchema } from "@/domain/maestro/schema";
import { catalogoSchema } from "@/domain/suertes/schema";

describe("edadMeses", () => {
  const hoy = new Date(2026, 5, 9); // 2026-06-09 (mes 0-indexado)

  it("cuenta meses desde la fecha de referencia (último corte)", () => {
    // 2025-08-17 → ~9.7 meses al 2026-06-09.
    expect(edadMeses("2025-08-17", hoy)).toBeCloseTo(9.7, 1);
  });

  it("devuelve null si no hay fecha", () => {
    expect(edadMeses(null, hoy)).toBeNull();
  });

  it("nunca es negativa (fecha futura → 0)", () => {
    expect(edadMeses("2027-01-01", hoy)).toBe(0);
  });
});

describe("integridad del maestro (§5)", () => {
  it("valida y cruza con la cartografía", async () => {
    const dir = join(process.cwd(), "public", "data");
    const maestro = maestroSchema.parse(
      JSON.parse(await readFile(join(dir, "maestro_suertes.json"), "utf-8")),
    );
    const catalogo = catalogoSchema.parse(
      JSON.parse(await readFile(join(dir, "tablones_catalogo.json"), "utf-8")),
    );

    const claves = Object.keys(maestro);
    expect(claves.length).toBeGreaterThan(590); // ~604 de 610 suertes

    // Toda clave del maestro existe como suerte en la cartografía.
    const suertes = new Set(catalogo.map((c) => c.sec_ste));
    for (const k of claves) expect(suertes.has(k)).toBe(true);

    // Ejemplo conocido con datos.
    const ej = maestro["3104-123"];
    expect(ej?.variedad).toBeTruthy();
    expect(ej?.numero_corte).toBeGreaterThan(0);
  });
});
