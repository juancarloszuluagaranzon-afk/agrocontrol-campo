import { describe, it, expect, beforeEach } from "vitest";
import { nivelAlerta } from "@/domain/hidrologia/schema";
import { lecturaHidroToRow } from "@/lib/sync/syncManager";
import type { LecturaHidro } from "@/domain/hidrologia/schema";
import { useHidrologiaStore } from "@/lib/store/hidrologiaStore";

const puntoConUmbrales = {
  tipo: "nivel_rio" as const,
  alerta: 916.5,
  critico: 917.0,
  emergencia: 917.5,
};

describe("nivelAlerta", () => {
  it("da 'normal' por debajo de la alerta", () => {
    expect(nivelAlerta(908.7, puntoConUmbrales)).toBe("normal");
  });

  it("da 'alerta' al alcanzar el umbral de alerta", () => {
    expect(nivelAlerta(916.5, puntoConUmbrales)).toBe("alerta");
    expect(nivelAlerta(916.8, puntoConUmbrales)).toBe("alerta");
  });

  it("da 'critico' al alcanzar el umbral crítico", () => {
    expect(nivelAlerta(917.0, puntoConUmbrales)).toBe("critico");
  });

  it("da 'emergencia' al alcanzar el umbral de emergencia", () => {
    expect(nivelAlerta(917.5, puntoConUmbrales)).toBe("emergencia");
    expect(nivelAlerta(920, puntoConUmbrales)).toBe("emergencia");
  });

  it("sin umbrales definidos, siempre da 'normal'", () => {
    const sinUmbrales = {
      tipo: "nivel_rio" as const,
      alerta: null,
      critico: null,
      emergencia: null,
    };
    expect(nivelAlerta(950, sinUmbrales)).toBe("normal");
  });

  it("la evaporación nunca genera alerta (no es nivel_rio)", () => {
    expect(
      nivelAlerta(950, {
        tipo: "evaporacion" as const,
        alerta: 1,
        critico: 2,
        emergencia: 3,
      }),
    ).toBe("normal");
  });
});

describe("lecturaHidroToRow", () => {
  it("fija el autor al uid autenticado y mapea los campos", () => {
    const l: LecturaHidro = {
      id: "abc",
      autor: "",
      planta: "riopaila",
      punto: "Nivel Río Cauca Luisa 1",
      tipo: "nivel_rio",
      fecha: "2026-07-05",
      valor: 908.7,
      nota: "",
      deleted: false,
      created_at: "2026-07-05T10:00:00.000Z",
      updated_at: "2026-07-05T10:00:00.000Z",
    };
    const row = lecturaHidroToRow(l, "uid-123");
    expect(row.autor).toBe("uid-123");
    expect(row.punto).toBe("Nivel Río Cauca Luisa 1");
    expect(row.tipo).toBe("nivel_rio");
    expect(row.valor).toBe(908.7);
  });
});

describe("setLectura (anti-duplicado en la planilla)", () => {
  beforeEach(() => {
    useHidrologiaStore.setState({ items: [], pending: [], userId: "u1" });
  });

  it("actualiza la lectura propia del mismo punto+fecha en vez de duplicar", () => {
    const s = useHidrologiaStore.getState();
    s.setLectura(
      "riopaila",
      "Nivel Río Cauca Luisa 1",
      "nivel_rio",
      "2026-07-05",
      908.2,
    );
    s.setLectura(
      "riopaila",
      "Nivel Río Cauca Luisa 1",
      "nivel_rio",
      "2026-07-05",
      908.7,
    );
    const st = useHidrologiaStore.getState();
    const activas = st.items.filter((l) => !l.deleted);
    expect(activas).toHaveLength(1);
    expect(activas[0]?.valor).toBe(908.7);
  });

  it("crea una lectura nueva para otro punto", () => {
    const s = useHidrologiaStore.getState();
    s.setLectura("riopaila", "Mateo", "nivel_rio", "2026-07-05", 914.7);
    s.setLectura("riopaila", "Andres Mesa", "evaporacion", "2026-07-05", 4.27);
    expect(useHidrologiaStore.getState().items).toHaveLength(2);
  });
});
