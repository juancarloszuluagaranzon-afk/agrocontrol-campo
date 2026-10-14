/**
 * Registro local de errores de la app (ADR-0039). Sin red no se pueden enviar,
 * así que se guardan los últimos en el celular y la pantalla de error los
 * muestra: con una foto de esa pantalla se encuentra la causa.
 */

const CLAVE = "agrocontrol-errores";
export const MAX_ERRORES = 5;
const MAX_TEXTO = 800;

export interface ErrorRegistrado {
  /** ISO de cuándo ocurrió. */
  fecha: string;
  /** Parte de la app donde falló ("mapa", "brújula", "app"…). */
  donde: string;
  mensaje: string;
  /** Pila resumida (componentes o llamadas), para ubicar el fallo. */
  detalle: string;
  /** Versión publicada (commit corto), si se conoce. */
  version: string;
}

/** Versión publicada: commit de Vercel (corto) o "local". */
export const VERSION_APP = (
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "local"
).slice(0, 7);

function texto(v: unknown): string {
  if (v instanceof Error) return v.message || v.name;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function leerErrores(): ErrorRegistrado[] {
  try {
    const raw = localStorage.getItem(CLAVE);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v)
      ? v.filter(
          (e): e is ErrorRegistrado =>
            !!e && typeof e === "object" && typeof e.mensaje === "string",
        )
      : [];
  } catch {
    return [];
  }
}

/** Guarda un error (el más reciente primero, hasta `MAX_ERRORES`). */
export function registrarError(
  donde: string,
  error: unknown,
  pila?: string | null,
): ErrorRegistrado {
  const e: ErrorRegistrado = {
    fecha: new Date().toISOString(),
    donde,
    mensaje: texto(error).slice(0, MAX_TEXTO),
    detalle: (pila ?? (error instanceof Error ? (error.stack ?? "") : ""))
      .trim()
      .split("\n")
      // La pila repite "Error: <mensaje>" en la primera línea; ya se muestra.
      .filter(
        (l) =>
          !(error instanceof Error && l === `${error.name}: ${error.message}`),
      )
      .slice(0, 8)
      .join("\n")
      .slice(0, MAX_TEXTO),
    version: VERSION_APP,
  };
  try {
    localStorage.setItem(
      CLAVE,
      JSON.stringify([e, ...leerErrores()].slice(0, MAX_ERRORES)),
    );
  } catch {
    // Sin almacenamiento: el error igual se muestra en pantalla.
  }
  return e;
}
