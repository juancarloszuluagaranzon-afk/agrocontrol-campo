"use client";

import { useMemo, useState } from "react";
import type { CatalogoEntry } from "@/domain/suertes/schema";
import { searchCatalogo } from "@/domain/suertes/search";
import { useMapStore } from "@/lib/store/mapStore";
import { useCatalogo } from "@/lib/data/useCatalogo";

/**
 * Buscador de suertes por `sec_ste` o hacienda (§5). Carga el catálogo ligero
 * **de la planta activa**, filtra con la lógica de dominio y, al elegir, vuela
 * al lote y lo resalta.
 */
export function SearchBox() {
  const catalogo = useCatalogo();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const flyTo = useMapStore((s) => s.flyTo);

  const resultados = useMemo(
    () => searchCatalogo(catalogo, query),
    [catalogo, query],
  );

  function elegir(entry: CatalogoEntry) {
    flyTo({ lon: entry.lon, lat: entry.lat, tabId: entry.tab_id });
    setQuery(entry.tab_id);
    setOpen(false);
  }

  return (
    <div className="pointer-events-auto absolute top-2 left-1/2 z-10 w-[min(22rem,calc(100%-7rem))] -translate-x-1/2">
      <input
        type="search"
        inputMode="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar suerte o hacienda…"
        aria-label="Buscar suerte o hacienda"
        className="bg-background w-full rounded-lg px-4 py-2.5 text-sm shadow-lg ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-amber-500"
      />
      {open && resultados.length > 0 && (
        <ul className="bg-background mt-1 max-h-72 overflow-auto rounded-lg shadow-xl ring-1 ring-black/10">
          {resultados.map((r) => (
            <li key={r.tab_id}>
              <button
                type="button"
                onClick={() => elegir(r)}
                className="hover:bg-accent/5 flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm"
              >
                <span className="text-primary font-semibold tabular-nums">
                  {r.tab_id}
                </span>
                <span className="text-accent/60 truncate text-xs">
                  {r.hacienda}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
