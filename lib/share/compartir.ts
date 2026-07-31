import {
  linkUbicacion,
  mensajeCompartir,
  type PuntoCompartido,
} from "@/lib/share/ubicacion";

/**
 * Comparte la ubicación de un punto (marcador o primer punto de una medición)
 * con la hoja de compartir del sistema (§ADR-0018). El técnico elige WhatsApp u
 * otra app. Fallbacks: WhatsApp Web (`wa.me`) o portapapeles.
 */
export async function compartirUbicacion(p: PuntoCompartido): Promise<void> {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://riomap.vercel.app";
  const url = linkUbicacion(origin, p);
  const text = mensajeCompartir(p);

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({ title: "Ubicación · Rio Map", text, url });
      return;
    } catch (e) {
      // El usuario canceló la hoja de compartir: no es un error a reportar.
      if (e instanceof DOMException && e.name === "AbortError") return;
      // Cualquier otro fallo: caer al método alterno.
    }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  const abierto =
    typeof window !== "undefined"
      ? window.open(wa, "_blank", "noopener")
      : null;
  if (!abierto && typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(`${text}\n${url}`);
  }
}
