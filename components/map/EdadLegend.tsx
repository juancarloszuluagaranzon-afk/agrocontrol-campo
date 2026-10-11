"use client";

import { useMemo, useState } from "react";
import { RANGOS_EDAD, resumirEdades } from "@/domain/maestro/edad";
import {
  NIVELES_LLUVIA_SUERTE,
  OPCIONES_DIAS_LLUVIA,
  ventanaLluvia,
} from "@/domain/precipitaciones/porSuerte";
import { useMaestro } from "@/lib/data/useMaestro";
import { usePluviometros } from "@/lib/data/usePluviometros";
import { t } from "@/lib/i18n/es-CO";
import { useMapStore } from "@/lib/store/mapStore";

/** "2026-10-07" → "7 oct". */
const fechaCorta = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
};

const fmtHa = (ha: number) =>
  ha.toLocaleString("es-CO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

/**
 * Leyenda de la capa "Edad de la caña" (ADR-0034): color, rango, número de
 * suertes y hectáreas de la planta activa, con la edad calculada hoy. Cada
 * rango es un interruptor: solo se pintan los encendidos.
 *
 * En celular (< 640 px) arranca **plegada** como una barra de una línea y, al
 * abrirla, usa fichas compactas en dos columnas con nombres cortos y no pasa
 * del 45 % de la pantalla. En pantallas grandes se ve completa, como antes.
 */
export function EdadLegend() {
  const visible = useMapStore((s) => s.edadVisible);
  const rangos = useMapStore((s) => s.edadRangos);
  const toggleRango = useMapStore((s) => s.toggleEdadRango);
  const tablonSeleccionado = useMapStore((s) => s.selected !== null);
  const midiendo = useMapStore((s) => s.measureMode !== "off");
  const modoIndice = useMapStore(
    (s) =>
      s.sentinelVisible || Object.values(s.sentinelHubVisible).some(Boolean),
  );
  const lluvia = useMapStore((s) => s.edadLluvia);
  const toggleLluvia = useMapStore((s) => s.toggleEdadLluvia);
  const dias = useMapStore((s) => s.edadLluviaDias);
  const setDias = useMapStore((s) => s.setEdadLluviaDias);
  const conRed = usePluviometros().length > 0;
  const maestro = useMaestro();
  const resumen = useMemo(() => resumirEdades(maestro), [maestro]);
  const { desde, hasta } = ventanaLluvia(new Date(), dias);
  // Solo afecta al celular: en `sm:` el cuerpo siempre se muestra.
  const [abierta, setAbierta] = useState(false);

  if (!visible) return null;
  // No encimarse con los paneles inferiores (mismo criterio que SentinelLegend).
  if (tablonSeleccionado || midiendo) return null;

  const encendidos = RANGOS_EDAD.filter((r) => rangos[r.id]).length;
  const ninguno = encendidos === 0;

  return (
    <section
      aria-label={t.edad.titulo}
      className="bg-background pointer-events-auto w-[calc(100vw-4.5rem)] max-w-80 rounded-xl text-xs shadow-lg ring-1 ring-black/10 sm:w-64"
    >
      {/* Barra plegable (solo celular). */}
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        aria-label={abierta ? t.edad.cerrar : t.edad.abrir}
        className="flex min-h-11 w-full items-center gap-2 px-2.5 py-1.5 text-left sm:hidden"
      >
        <span className="flex shrink-0 -space-x-1" aria-hidden>
          {RANGOS_EDAD.filter((r) => rangos[r.id]).map((r) => (
            <span
              key={r.id}
              className="inline-block size-3 rounded-full ring-2 ring-white"
              style={{ backgroundColor: r.color }}
            />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{t.edad.titulo}</span>
          <span className="text-accent/70">
            {" · "}
            {t.edad.resumen(encendidos, RANGOS_EDAD.length)}
            {lluvia && conRed ? ` · 🌧️ ${dias} d` : ""}
            {modoIndice ? " · 🛰️" : ""}
          </span>
        </span>
        <span aria-hidden className="text-accent/60 text-base leading-none">
          {abierta ? "▾" : "▴"}
        </span>
      </button>

      <div
        className={`${abierta ? "block" : "hidden"} max-h-[45dvh] overflow-y-auto overscroll-contain border-t border-black/10 p-2 sm:block sm:max-h-[calc(100dvh-13rem)] sm:border-t-0 sm:p-2.5`}
      >
        <div className="hidden sm:block">
          <p className="text-sm font-semibold">{t.edad.titulo}</p>
          <p className="text-accent/60 mb-1.5">{t.edad.ayudaFiltro}</p>
          {modoIndice && (
            <p className="mb-1.5 rounded-md bg-sky-50 px-1.5 py-1 text-sky-800">
              🛰️ {t.edad.modoIndice}
            </p>
          )}
        </div>

        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-1 sm:gap-0.5">
          {RANGOS_EDAD.map((r) => {
            const n = resumen.suertes[r.id].length;
            const on = rangos[r.id];
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`${r.etiqueta}: ${t.edad.suertes(n)}`}
                  onClick={() => toggleRango(r.id)}
                  className={`hover:bg-accent/5 flex min-h-10 w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left ring-1 ring-black/10 transition-opacity sm:min-h-11 sm:gap-2 sm:ring-0 ${
                    on ? "" : "opacity-45"
                  }`}
                >
                  <span
                    aria-hidden
                    className="inline-block size-3.5 shrink-0 rounded-sm ring-1 ring-black/20"
                    style={{
                      backgroundColor: on ? r.color : "transparent",
                      borderColor: r.color,
                      borderWidth: on ? 0 : 2,
                    }}
                  />
                  <span
                    aria-hidden
                    className={`min-w-0 flex-1 leading-tight ${on ? "" : "line-through"}`}
                  >
                    <span className="sm:hidden">{r.corta}</span>
                    <span className="hidden sm:inline">{r.etiqueta}</span>
                  </span>
                  <span
                    aria-hidden
                    className="text-accent/70 text-right tabular-nums"
                  >
                    {n}
                    <span className="hidden sm:inline">
                      {n === 1 ? " suerte" : " suertes"}
                      <br />
                      {fmtHa(resumen.hectareas[r.id])} ha
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {ninguno && (
          <p role="status" className="mt-1.5 text-amber-700">
            {t.edad.ninguno}
          </p>
        )}

        {/* Lluvia acumulada reciente sobre las suertes filtradas (ADR-0034). */}
        <div className="mt-2 border-t border-black/10 pt-2">
          {conRed ? (
            <>
              <div className="flex items-center gap-1.5">
                <label className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={lluvia}
                    onChange={toggleLluvia}
                    aria-label={t.edad.lluvia}
                    className="size-4"
                  />
                  <span aria-hidden>🌧️</span>
                  <span className="font-medium sm:hidden">
                    {t.edad.lluviaCorta}
                  </span>
                  <span className="hidden font-medium sm:inline">
                    {t.edad.lluvia}
                  </span>
                </label>
                <div
                  role="group"
                  aria-label={t.edad.lluvia}
                  className="flex flex-1 gap-1 sm:hidden"
                >
                  {OPCIONES_DIAS_LLUVIA.map((d) => (
                    <BotonDias
                      key={d}
                      d={d}
                      on={dias === d}
                      onClick={() => setDias(d)}
                      corto
                    />
                  ))}
                </div>
              </div>
              <div
                role="group"
                aria-label={t.edad.lluvia}
                className="mt-1 hidden gap-1 sm:flex"
              >
                {OPCIONES_DIAS_LLUVIA.map((d) => (
                  <BotonDias
                    key={d}
                    d={d}
                    on={dias === d}
                    onClick={() => setDias(d)}
                  />
                ))}
              </div>
              {lluvia && (
                <>
                  <ul className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 sm:grid sm:grid-cols-2 sm:gap-x-2">
                    {NIVELES_LLUVIA_SUERTE.map((n) => (
                      <li key={n.id} className="flex items-center gap-1">
                        <span
                          aria-hidden
                          className="inline-block size-2.5 shrink-0 rounded-full sm:size-3"
                          style={{ backgroundColor: n.color }}
                        />
                        <span className="sm:hidden">{n.corta}</span>
                        <span className="hidden sm:inline">{n.etiqueta}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-accent/60 mt-1">
                    <span className="sm:hidden">
                      {fechaCorta(desde)} – {fechaCorta(hasta)} · * faltan días
                    </span>
                    <span className="hidden sm:inline">
                      {t.edad.lluviaVentana(
                        fechaCorta(desde),
                        fechaCorta(hasta),
                      )}
                    </span>
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="text-accent/60">🌧️ {t.edad.lluviaSinRed}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function BotonDias({
  d,
  on,
  onClick,
  corto = false,
}: {
  d: number;
  on: boolean;
  onClick: () => void;
  corto?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t.edad.dias(d)}
      onClick={onClick}
      className={`min-h-9 flex-1 rounded-md px-1 ring-1 ${
        on
          ? "bg-primary text-accent font-semibold ring-transparent"
          : "ring-black/15"
      }`}
    >
      {corto ? `${d} d` : t.edad.dias(d)}
    </button>
  );
}
