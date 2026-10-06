import { describe, it, expect } from "vitest";
import {
  expresionColorEdad,
  rangoEdad,
  RANGOS_EDAD,
  resumirEdades,
} from "@/domain/maestro/edad";
import type { Maestro, SuerteMaestro } from "@/domain/maestro/schema";

const HOY = new Date(2026, 9, 3); // 3-oct-2026, hora local

/** Fecha local `YYYY-MM-DD` de hace `meses` (365,25/12 días por mes). */
function haceMeses(meses: number): string {
  const d = new Date(HOY.getTime() - meses * (365.25 / 12) * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function suerte(p: Partial<SuerteMaestro>): SuerteMaestro {
  return {
    variedad: "CC 01-1940",
    numero_corte: 3,
    uso: "CAÑA",
    fecha_siembra: "2018-01-01",
    fecha_ultimo_corte: null,
    fecha_proximo_corte: null,
    edad_csv: null,
    zona: null,
    zona_agroecologica: null,
    area_neta_ha: 10,
    tch_ppto: null,
    toneladas_ppto: null,
    toneladas_estimadas: null,
    responsable_zona: null,
    tecnico: null,
    empresa: null,
    ...p,
  };
}

describe("rangoEdad", () => {
  it("clasifica por meses desde el último corte", () => {
    expect(rangoEdad(suerte({ fecha_ultimo_corte: haceMeses(2) }), HOY)).toBe(
      "joven",
    );
    expect(rangoEdad(suerte({ fecha_ultimo_corte: haceMeses(7) }), HOY)).toBe(
      "media",
    );
    expect(rangoEdad(suerte({ fecha_ultimo_corte: haceMeses(12) }), HOY)).toBe(
      "madura",
    );
  });

  it("4 y 10 meses exactos van en el rango medio (inclusive)", () => {
    expect(rangoEdad(suerte({ fecha_ultimo_corte: haceMeses(4) }), HOY)).toBe(
      "media",
    );
    expect(rangoEdad(suerte({ fecha_ultimo_corte: haceMeses(10) }), HOY)).toBe(
      "media",
    );
  });

  it("caña planta usa la fecha de siembra", () => {
    expect(
      rangoEdad(
        suerte({ fecha_siembra: haceMeses(3), fecha_ultimo_corte: null }),
        HOY,
      ),
    ).toBe("joven");
  });

  it("renovación y sin fechas van a 'sinDato'", () => {
    expect(rangoEdad(suerte({ variedad: "RENOVACION" }), HOY)).toBe("sinDato");
    expect(rangoEdad(suerte({ variedad: "Renovación" }), HOY)).toBe("sinDato");
    expect(
      rangoEdad(suerte({ fecha_siembra: null, fecha_ultimo_corte: null }), HOY),
    ).toBe("sinDato");
  });

  it("lo que no es caña no tiene rango (sin color)", () => {
    expect(rangoEdad(suerte({ uso: "ARROZ" }), HOY)).toBeNull();
    expect(rangoEdad(suerte({ uso: "SEMILLA" }), HOY)).toBeNull();
    expect(rangoEdad(suerte({ uso: null }), HOY)).toBeNull();
  });
});

describe("resumirEdades / expresionColorEdad", () => {
  const maestro: Maestro = {
    "1-001": suerte({ fecha_ultimo_corte: haceMeses(1), area_neta_ha: 5 }),
    "1-002": suerte({ fecha_ultimo_corte: haceMeses(6), area_neta_ha: 7 }),
    "1-003": suerte({ fecha_ultimo_corte: haceMeses(11), area_neta_ha: 9 }),
    "1-004": suerte({ variedad: "RENOVACION", area_neta_ha: 2 }),
    "1-005": suerte({ uso: "ARROZ", area_neta_ha: 50 }),
  };

  it("agrupa suertes y suma hectáreas por rango, sin contar lo que no es caña", () => {
    const r = resumirEdades(maestro, HOY);
    expect(r.suertes).toEqual({
      joven: ["1-001"],
      media: ["1-002"],
      madura: ["1-003"],
      sinDato: ["1-004"],
    });
    expect(r.hectareas).toEqual({ joven: 5, media: 7, madura: 9, sinDato: 2 });
  });

  it("arma un match por sec_ste con el color de cada rango y transparente por defecto", () => {
    const expr = expresionColorEdad(resumirEdades(maestro, HOY)) as unknown[];
    expect(expr[0]).toBe("match");
    expect(expr[1]).toEqual(["get", "sec_ste"]);
    const color = (id: string) => RANGOS_EDAD.find((x) => x.id === id)?.color;
    expect(expr.slice(2, 4)).toEqual([["1-001"], color("joven")]);
    expect(expr.slice(4, 6)).toEqual([["1-002"], color("media")]);
    expect(expr.slice(6, 8)).toEqual([["1-003"], color("madura")]);
    expect(expr.slice(8, 10)).toEqual([["1-004"], color("sinDato")]);
    expect(expr.at(-1)).toBe("rgba(0,0,0,0)");
  });

  it("omite rangos vacíos (match no admite listas vacías) y sin datos es transparente", () => {
    const solo = resumirEdades({ "1-001": maestro["1-001"]! }, HOY);
    const expr = expresionColorEdad(solo) as unknown[];
    expect(expr.length).toBe(5);
    expect(expresionColorEdad(resumirEdades({}, HOY))).toBe("rgba(0,0,0,0)");
  });
});

describe("expresionColorEdad con rangos apagados", () => {
  const maestro: Maestro = {
    "2-001": suerte({ fecha_ultimo_corte: haceMeses(1) }),
    "2-002": suerte({ fecha_ultimo_corte: haceMeses(6) }),
    "2-003": suerte({ fecha_ultimo_corte: haceMeses(11) }),
  };
  const color = (id: string) => RANGOS_EDAD.find((x) => x.id === id)?.color;

  it("solo pinta los rangos encendidos", () => {
    const expr = expresionColorEdad(resumirEdades(maestro, HOY), {
      joven: false,
      media: false,
      madura: true,
      sinDato: true,
    }) as unknown[];
    expect(expr.slice(2, 4)).toEqual([["2-003"], color("madura")]);
    expect(expr).not.toContain(color("joven"));
    expect(expr).not.toContain(color("media"));
  });

  it("sin rangos encendidos todo queda transparente", () => {
    expect(
      expresionColorEdad(resumirEdades(maestro, HOY), {
        joven: false,
        media: false,
        madura: false,
        sinDato: false,
      }),
    ).toBe("rgba(0,0,0,0)");
  });

  it("sin el parámetro, todos encendidos (compatibilidad)", () => {
    const expr = expresionColorEdad(resumirEdades(maestro, HOY)) as unknown[];
    expect(expr).toContain(color("joven"));
    expect(expr).toContain(color("madura"));
  });
});
