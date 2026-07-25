"use client";

import { useState } from "react";
import { useUser } from "@/lib/auth/useUser";
import { useEncuestaStore } from "@/lib/store/encuestaStore";
import { t } from "@/lib/i18n/es-CO";

/**
 * Popup de calificación (1-5 estrellas + comentario opcional), obligatorio y
 * de una sola vez por usuario (§ADR-0015). Sin botón de cerrar ni
 * click-outside: bloquea la pantalla hasta que se envía una respuesta.
 */
export function EncuestaSatisfaccion() {
  const { user } = useUser();
  const hydratedFromServer = useEncuestaStore((s) => s.hydratedFromServer);
  const respondida = useEncuestaStore((s) => s.items.length > 0);
  const addRespuesta = useEncuestaStore((s) => s.addRespuesta);

  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [aviso, setAviso] = useState(false);

  if (!user || !hydratedFromServer || respondida) return null;

  function enviar() {
    if (estrellas < 1) {
      setAviso(true);
      return;
    }
    addRespuesta(estrellas, comentario.trim());
  }

  const mostrado = hover || estrellas;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.encuesta.titulo}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-center text-lg font-semibold">
          {t.encuesta.titulo}
        </h2>
        <p className="text-accent/70 mt-1 text-center text-sm">
          {t.encuesta.pregunta}
        </p>

        <div className="mt-4 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={t.encuesta.estrellaLabel(n)}
              aria-pressed={n <= estrellas}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => {
                setEstrellas(n);
                setAviso(false);
              }}
              className="p-1 text-3xl leading-none"
            >
              <span
                className={n <= mostrado ? "text-amber-400" : "text-black/15"}
              >
                ★
              </span>
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="text-accent/70 text-xs font-medium">
            {t.encuesta.comentarioLabel}
          </span>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={t.encuesta.comentarioPlaceholder}
            rows={3}
            className="mt-1 w-full resize-none rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/15 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </label>

        {aviso && (
          <p className="mt-2 text-center text-xs text-red-600">
            {t.encuesta.obligatorio}
          </p>
        )}

        <button
          type="button"
          onClick={enviar}
          disabled={estrellas < 1}
          className="bg-primary mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {t.encuesta.enviar}
        </button>
      </div>
    </div>
  );
}
