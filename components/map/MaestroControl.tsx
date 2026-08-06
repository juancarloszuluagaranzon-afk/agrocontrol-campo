"use client";

import { useMemo, useState } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { plantaConfig } from "@/lib/plantas";
import { useCatalogo } from "@/lib/data/useCatalogo";
import { useMaestro } from "@/lib/data/useMaestro";
import {
  agruparSuertes,
  buscarSuertes,
  type SuerteResumen,
} from "@/domain/maestro/consulta";
import { edadSuerteMeses } from "@/domain/maestro/schema";
import { formatHectareas } from "@/lib/geo/format";
import { t } from "@/lib/i18n/es-CO";

/** Cuántas suertes se listan de una vez (la búsqueda afina). */
const LIMITE = 60;

/** Fecha ISO (aaaa-mm-dd) → dd/mm/aaaa, o "—" si falta. */
function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Número → es-CO, o "—" si es null. */
function num(v: number | null | undefined, decimales = 0): string {
  if (v == null) return "—";
  return v.toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

const campo =
  "bg-background w-full rounded-lg px-4 py-2.5 text-sm shadow-sm ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-amber-500";

/**
 * Panel "📖 Maestro de suertes" (§ ADR-0019): consulta nativa del maestro de la
 * **planta activa** dentro de Rio Map. Buscar por suerte/hacienda → lista →
 * ficha con toda la agronomía + "Ver en el mapa" (vuela a la suerte). La lista
 * se arma del catálogo (suertes con geometría), así toda suerte es ubicable.
 */
export function MaestroControl() {
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const flyTo = useMapStore((s) => s.flyTo);
  const planta = usePlantaStore((s) => s.planta);
  const catalogo = useCatalogo();
  const maestro = useMaestro();

  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const suertes = useMemo(() => agruparSuertes(catalogo), [catalogo]);
  const resultados = useMemo(
    () => buscarSuertes(suertes, query, LIMITE),
    [suertes, query],
  );

  const seleccion = sel
    ? (suertes.find((s) => s.sec_ste === sel) ?? null)
    : null;
  const info = seleccion ? maestro[seleccion.sec_ste] : undefined;

  function verEnMapa(s: SuerteResumen) {
    flyTo({ lon: s.lon, lat: s.lat, tabId: s.tabId });
    setActiveTool("none");
  }

  const edadTxt =
    info != null
      ? `${edadSuerteMeses(info).toLocaleString("es-CO", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })} meses`
      : "—";

  return (
    <div
      role="dialog"
      aria-label={t.maestro.titulo}
      className="bg-background pointer-events-auto fixed inset-0 z-30 flex flex-col"
    >
      {/* Header */}
      <div className="border-accent/10 flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-bold">📖 {t.maestro.titulo}</h2>
          <p className="text-accent/60 text-xs">
            {plantaConfig(planta).empresa}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTool("none")}
          aria-label="Cerrar"
          className="text-accent/60 hover:bg-accent/10 rounded px-2 py-1 text-xl"
        >
          ✕
        </button>
      </div>

      {seleccion ? (
        /* ── Ficha de la suerte ── */
        <div className="flex-1 overflow-auto p-4">
          <button
            type="button"
            onClick={() => setSel(null)}
            className="text-accent/60 hover:text-accent mb-3 text-sm font-medium"
          >
            ← {t.maestro.volver}
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-accent/60 text-xs font-medium">Suerte</p>
              <h3 className="text-primary text-2xl font-bold tabular-nums">
                {seleccion.sec_ste}
              </h3>
              <p className="text-accent/60 text-sm">
                {seleccion.hacienda} · Sector {seleccion.sector}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => verEnMapa(seleccion)}
            className="bg-primary mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white"
          >
            📍 {t.maestro.verEnMapa}
          </button>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Dato label="Hacienda" value={seleccion.hacienda} />
            <Dato label="Sector" value={seleccion.sector} />
            <Dato
              label="Área neta"
              value={formatHectareas(info?.area_neta_ha ?? seleccion.ha)}
            />
            <Dato label="Tablones" value={String(seleccion.tablones)} />
          </dl>

          <div className="mt-4 border-t border-black/5 pt-3">
            <p className="text-accent/50 text-[11px] font-semibold tracking-wide uppercase">
              {t.maestro.agronomia}
            </p>
            {info ? (
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Dato label="Variedad" value={info.variedad ?? "—"} />
                <Dato label="Edad" value={edadTxt} />
                <Dato label="N.º de corte" value={num(info.numero_corte)} />
                <Dato label="Uso" value={info.uso ?? "—"} />
                <Dato
                  label="Fecha de siembra"
                  value={fechaCorta(info.fecha_siembra)}
                />
                <Dato
                  label="Último corte"
                  value={fechaCorta(info.fecha_ultimo_corte)}
                />
                <Dato
                  label="Próximo corte"
                  value={fechaCorta(info.fecha_proximo_corte)}
                />
                <Dato label="Zona" value={num(info.zona)} />
                <Dato
                  label="Zona agroecológica"
                  value={info.zona_agroecologica ?? "—"}
                />
                <Dato label="TCH ppto" value={num(info.tch_ppto, 1)} />
                <Dato label="Toneladas ppto" value={num(info.toneladas_ppto)} />
                <Dato
                  label="Toneladas estimadas"
                  value={num(info.toneladas_estimadas)}
                />
                <Dato
                  label="Responsable de zona"
                  value={info.responsable_zona ?? "—"}
                />
                <Dato label="Técnico" value={info.tecnico ?? "—"} />
                <Dato label="Empresa" value={info.empresa ?? "—"} />
              </dl>
            ) : (
              <p className="text-accent/50 mt-1 text-sm">
                {t.maestro.sinDatos}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* ── Lista + buscador ── */
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-accent/10 border-b p-3">
            <input
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.maestro.buscar}
              aria-label={t.maestro.buscar}
              className={campo}
            />
            <p className="text-accent/50 mt-2 text-xs">
              {suertes.length === 0
                ? t.maestro.cargando
                : t.maestro.conteo(resultados.length, suertes.length)}
            </p>
          </div>

          {suertes.length > 0 && resultados.length === 0 ? (
            <p className="text-accent/50 p-4 text-sm">{t.maestro.vacio}</p>
          ) : (
            <ul className="flex-1 divide-y divide-black/5 overflow-y-auto">
              {resultados.map((s) => {
                const m = maestro[s.sec_ste];
                return (
                  <li key={s.sec_ste}>
                    <button
                      type="button"
                      onClick={() => setSel(s.sec_ste)}
                      className="hover:bg-accent/5 flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="text-primary block text-sm font-semibold tabular-nums">
                          {s.sec_ste}
                        </span>
                        <span className="text-accent/60 block truncate text-xs">
                          {s.hacienda}
                          {m?.variedad ? ` · ${m.variedad}` : ""}
                        </span>
                      </span>
                      <span className="text-accent/40 shrink-0 text-lg">›</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Fila etiqueta/valor de la ficha (mismo estilo que SuertePanel). */
function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-accent/60 text-xs">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
