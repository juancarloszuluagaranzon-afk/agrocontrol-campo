"use client";

import { useEffect, useRef, useState } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { plantaConfig } from "@/lib/plantas";
import {
  KB_POR_TESELA,
  cajasDeColeccion,
  teselasDeCajas,
  urlTeselaEsri,
  urlsGlifos,
} from "@/lib/geo/teselas";
import {
  borrarDelCache,
  cacheDisponible,
  contarGuardadas,
  descargarAlCache,
  guardarEstadoDescarga,
  leerEstadoDescarga,
  pedirAlmacenamientoPersistente,
  type EstadoDescarga,
  type Progreso,
} from "@/lib/offline/mapaOffline";
import { t } from "@/lib/i18n/es-CO";

const num = (n: number) => n.toLocaleString("es-CO");
/** Porcentaje entero; con algo ya bajado nunca muestra "0 %". */
const pct = (a: number, b: number) =>
  b > 0 && a > 0 ? Math.max(1, Math.floor((a / b) * 100)) : 0;

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Fase = "inactivo" | "descargando" | "cancelado" | "terminado";

/**
 * "Mapa sin señal" (ADR-0036): descarga el satélite alrededor de las suertes de
 * la planta (zoom 10–18) y los glifos de las etiquetas, para verlos y ubicarse
 * sin señal como con un mapa descargado de Avenza.
 */
export function MapaOfflineControl() {
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const planta = usePlantaStore((s) => s.planta);
  const cfg = plantaConfig(planta);

  const [urls, setUrls] = useState<string[] | null>(null);
  const [errorDatos, setErrorDatos] = useState(false);
  const [guardadas, setGuardadas] = useState(0);
  // El panel solo se monta en el cliente (se abre desde el menú) y MapScreen se
  // remonta al cambiar de planta: se puede leer localStorage al iniciar.
  const [estado, setEstado] = useState<EstadoDescarga | null>(() =>
    leerEstadoDescarga(cfg.id),
  );
  const [fase, setFase] = useState<Fase>("inactivo");
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const abort = useRef<AbortController | null>(null);
  const soportado = cacheDisponible();

  useEffect(() => {
    const actualizar = () => setOnline(navigator.onLine);
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  }, []);

  // Lista de teselas de la planta (a partir de sus suertes) y cuántas ya están.
  useEffect(() => {
    let vivo = true;
    fetch(cfg.tablones)
      .then((r) => r.json() as Promise<Parameters<typeof cajasDeColeccion>[0]>)
      .then(async (fc) => {
        const lista = [
          ...urlsGlifos(),
          ...teselasDeCajas(cajasDeColeccion(fc)).map(urlTeselaEsri),
        ];
        if (!vivo) return;
        setUrls(lista);
        if (soportado) {
          const n = await contarGuardadas(lista);
          if (vivo) setGuardadas(n);
        }
      })
      .catch(() => {
        if (vivo) setErrorDatos(true);
      });
    return () => {
      vivo = false;
    };
  }, [cfg.id, cfg.tablones, soportado]);

  // Cancelar la descarga si se cierra el panel.
  useEffect(() => () => abort.current?.abort(), []);

  async function descargar() {
    if (!urls) return;
    const ctl = new AbortController();
    abort.current = ctl;
    setFase("descargando");
    setProgreso({ hechas: 0, total: urls.length, fallidas: 0 });
    void pedirAlmacenamientoPersistente();
    const p = await descargarAlCache(urls, {
      signal: ctl.signal,
      onProgreso: setProgreso,
    });
    setGuardadas(await contarGuardadas(urls));
    if (ctl.signal.aborted) {
      setFase("cancelado");
      return;
    }
    setProgreso(p);
    setFase("terminado");
    if (p.fallidas === 0) {
      const e = {
        fecha: new Date().toISOString(),
        total: urls.length,
        guardadas: urls.length,
      };
      guardarEstadoDescarga(cfg.id, e);
      setEstado(e);
    }
  }

  async function borrar() {
    if (!urls) return;
    await borrarDelCache(urls);
    guardarEstadoDescarga(cfg.id, null);
    setEstado(null);
    setGuardadas(0);
    setProgreso(null);
    setFase("inactivo");
  }

  const total = urls?.length ?? 0;
  const completo = urls != null && total > 0 && guardadas >= total;
  const descargando = fase === "descargando";

  return (
    <div
      role="region"
      aria-label={t.mapaOffline.menu}
      className="pointer-events-auto w-72 max-w-[calc(100vw-1rem)] rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t.mapaOffline.titulo}</span>
        <button
          type="button"
          onClick={() => setActiveTool("none")}
          aria-label="Cerrar"
          className="rounded px-1 text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>

      <p className="mt-1 text-[12px] text-slate-600">
        {t.mapaOffline.ayuda(cfg.nombre)}
      </p>

      {!soportado ? (
        <p className="mt-2 text-[12px] text-amber-700">
          {t.mapaOffline.noSoportado}
        </p>
      ) : errorDatos ? (
        <p className="mt-2 text-[12px] text-red-700">
          {t.mapaOffline.errorDatos}
        </p>
      ) : urls == null ? (
        <p className="mt-2 text-[12px] text-slate-500">
          {t.mapaOffline.calculando}
        </p>
      ) : (
        <>
          <p className="mt-2 text-[12px] text-slate-500 tabular-nums">
            {t.mapaOffline.tamano(
              num(total),
              num(Math.round((total * KB_POR_TESELA) / 1024)),
            )}
          </p>

          <p
            className="mt-2 text-[13px] font-medium"
            data-testid="mapa-offline-estado"
            hidden={descargando}
          >
            {completo
              ? t.mapaOffline.listo(
                  estado ? fechaCorta(estado.fecha) : t.mapaOffline.menu,
                )
              : guardadas > 0
                ? t.mapaOffline.parcial(pct(guardadas, total))
                : t.mapaOffline.nada}
          </p>

          {descargando && progreso && (
            <div className="mt-2">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progreso.total}
                aria-valuenow={progreso.hechas}
                className="h-2 overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className="h-full bg-emerald-600 transition-[width]"
                  style={{ width: `${pct(progreso.hechas, progreso.total)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                {t.mapaOffline.progreso(
                  num(progreso.hechas),
                  num(progreso.total),
                  pct(progreso.hechas, progreso.total),
                )}
              </p>
            </div>
          )}

          {fase === "terminado" && progreso && progreso.fallidas > 0 && (
            <p className="mt-2 text-[12px] text-amber-700">
              {t.mapaOffline.faltaron(num(progreso.fallidas))}
            </p>
          )}
          {fase === "cancelado" && (
            <p className="mt-2 text-[12px] text-slate-600">
              {t.mapaOffline.cancelado}
            </p>
          )}
          {!online && !descargando && !completo && (
            <p className="mt-2 text-[12px] text-amber-700">
              {t.mapaOffline.sinSenal}
            </p>
          )}

          {!completo && !descargando && (
            <p className="mt-2 text-[11px] text-slate-500">
              {t.mapaOffline.consejo}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {descargando ? (
              <button
                type="button"
                onClick={() => abort.current?.abort()}
                className="flex-1 rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold"
              >
                {t.mapaOffline.cancelar}
              </button>
            ) : (
              !completo && (
                <button
                  type="button"
                  onClick={() => void descargar()}
                  disabled={!online}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {guardadas > 0
                    ? t.mapaOffline.completar
                    : t.mapaOffline.descargar}
                </button>
              )
            )}
            {!descargando && guardadas > 0 && (
              <button
                type="button"
                onClick={() => void borrar()}
                className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                {t.mapaOffline.borrar}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
