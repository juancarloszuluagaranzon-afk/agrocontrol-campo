import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  MAX_ERRORES,
  leerErrores,
  registrarError,
} from "@/lib/diagnostico/errores";
import { Protegido } from "@/components/Protegido";
import { PantallaError } from "@/components/PantallaError";

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("registro local de errores (ADR-0039)", () => {
  it("guarda el más reciente primero y conserva solo los últimos", () => {
    for (let i = 0; i < MAX_ERRORES + 2; i++)
      registrarError("mapa", new Error(`falla ${i}`));
    const l = leerErrores();
    expect(l).toHaveLength(MAX_ERRORES);
    expect(l[0]?.mensaje).toBe(`falla ${MAX_ERRORES + 1}`);
    expect(l[0]?.donde).toBe("mapa");
  });

  it("acepta errores que no son Error y recorta textos largos", () => {
    const e = registrarError("gps", { codigo: 2 }, "x".repeat(5000));
    expect(e.mensaje).toBe('{"codigo":2}');
    expect(e.detalle.length).toBeLessThanOrEqual(800);
  });

  it("el detalle no repite el mensaje que ya se muestra", () => {
    const e = registrarError("mapa", new Error("x is null"));
    expect(e.detalle).not.toContain("Error: x is null");
  });

  it("ignora un registro corrupto", () => {
    localStorage.setItem("agrocontrol-errores", "{no json");
    expect(leerErrores()).toEqual([]);
  });
});

function Explota({ explotar }: { explotar: boolean }) {
  if (explotar) throw new Error("brújula rota");
  return <p>brújula ok</p>;
}

describe("Protegido", () => {
  it("si una pieza falla, solo esa cae: el resto sigue y el error queda registrado", () => {
    render(
      <div>
        <p>mapa ok</p>
        <Protegido nombre="brújula">
          <Explota explotar />
        </Protegido>
      </div>,
    );
    expect(screen.getByText("mapa ok")).toBeTruthy();
    expect(screen.queryByText("brújula ok")).toBeNull();
    expect(leerErrores()[0]).toMatchObject({
      donde: "brújula",
      mensaje: "brújula rota",
    });
  });

  it("el respaldo permite reintentar y volver a montar la pieza", () => {
    let explotar = true;
    function Pieza() {
      return <Explota explotar={explotar} />;
    }
    render(
      <Protegido
        nombre="gps"
        fallback={(reintentar) => (
          <button type="button" onClick={reintentar}>
            Reintentar GPS
          </button>
        )}
      >
        <Pieza />
      </Protegido>,
    );
    explotar = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar GPS" }));
    expect(screen.getByText("brújula ok")).toBeTruthy();
  });
});

describe("PantallaError", () => {
  it("en español, con botones para volver a abrir e intentar de nuevo, y el detalle técnico", async () => {
    const reset = vi.fn();
    render(
      <PantallaError
        error={Object.assign(new Error("x is not a function"), {
          digest: "abc123",
        })}
        reset={reset}
        donde="página"
      />,
    );
    expect(
      screen.getByRole("heading", { name: /tuvo un problema al abrir/ }),
    ).toBeTruthy();
    expect(screen.getByText(/x is not a function/)).toBeTruthy();
    expect(screen.getByText(/digest abc123/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
    expect(reset).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Volver a abrir" })).toBeTruthy();
    expect(leerErrores()[0]?.donde).toBe("página");
  });
});
