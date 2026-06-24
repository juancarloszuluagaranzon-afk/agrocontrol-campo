"use client";

import { useRef, useState } from "react";
import { plantaConfig } from "@/lib/plantas";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { useMapStore } from "@/lib/store/mapStore";
import { useCatalogo } from "@/lib/data/useCatalogo";
import { searchCatalogo } from "@/domain/suertes/search";
import { suerteEnUbicacion } from "@/lib/geo/suerteEnPunto";
import { lineasSello, sellarFoto } from "@/lib/foto/sello";
import { formatCoordenadas } from "@/lib/geo/format";
import { t } from "@/lib/i18n/es-CO";

interface Captura {
  file: File;
  preview: string;
  lon: number;
  lat: number;
  fecha: string;
}

const campo = "rounded-lg ring-1 ring-black/15 px-3 py-2 text-sm w-full";

/**
 * "Foto de campo" (§ Foto sellada): toma una foto con la cámara nativa, detecta
 * la suerte por la ubicación (editable), y genera una foto **sellada** con
 * coordenadas + suerte/hacienda + fecha para descargar/compartir. Sin BD.
 */
export function FotoCampoControl() {
  const gps = useMapStore((s) => s.gps);
  const planta = usePlantaStore((s) => s.planta);
  const catalogo = useCatalogo();
  const fileRef = useRef<HTMLInputElement>(null);

  const [captura, setCaptura] = useState<Captura | null>(null);
  const [secSte, setSecSte] = useState("");
  const [hacienda, setHacienda] = useState("");
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<"idle" | "procesando">("idle");
  const [error, setError] = useState<string | null>(null);

  function limpiar() {
    if (captura) URL.revokeObjectURL(captura.preview);
    setCaptura(null);
    setSecSte("");
    setHacienda("");
    setQuery("");
    setError(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fix = useMapStore.getState().gps;
    if (!fix) {
      setError(t.foto.sinGps);
      return;
    }
    setError(null);
    setEstado("procesando");
    const cap: Captura = {
      file,
      preview: URL.createObjectURL(file),
      lon: fix.lon,
      lat: fix.lat,
      fecha: new Intl.DateTimeFormat("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date()),
    };
    setCaptura(cap);
    // Detecta la suerte por la ubicación (editable después).
    const props = await suerteEnUbicacion(
      fix.lon,
      fix.lat,
      plantaConfig(planta).tablones,
    );
    setSecSte(props?.sec_ste ?? "");
    setHacienda(props?.hacienda ?? "");
    setQuery("");
    setEstado("idle");
  }

  function elegirSuerte(sec: string, hda: string) {
    setSecSte(sec);
    setHacienda(hda);
    setQuery("");
  }

  async function sellarYCompartir() {
    if (!captura) return;
    setEstado("procesando");
    setError(null);
    try {
      const lineas = lineasSello({
        secSte,
        hacienda,
        lon: captura.lon,
        lat: captura.lat,
        fecha: captura.fecha,
      });
      const blob = await sellarFoto(captura.file, lineas);
      const nombre = `foto-campo-${secSte || "ubicacion"}.jpg`;
      const file = new File([blob], nombre, { type: "image/jpeg" });

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: t.foto.titulo });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
      }
      limpiar();
    } catch {
      setError(t.foto.error);
    } finally {
      setEstado("idle");
    }
  }

  // Sugerencias únicas por suerte para corregir la detección.
  const sugerencias = query.trim()
    ? Array.from(
        new Map(
          searchCatalogo(catalogo, query, 30).map((c) => [c.sec_ste, c]),
        ).values(),
      ).slice(0, 6)
    : [];

  return (
    <div className="pointer-events-auto w-64 max-w-[calc(100vw-1rem)] rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10">
      <span className="text-sm font-semibold">📷 {t.foto.titulo}</span>

      {!captura ? (
        <>
          <p className="mt-1 text-[12px] text-slate-500">{t.foto.ayuda}</p>
          {!gps && (
            <p className="mt-1 text-[11px] text-amber-700">{t.foto.sinGps}</p>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!gps}
            className="bg-primary text-accent mt-2 w-full rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            📷 {t.foto.tomar}
          </button>
        </>
      ) : (
        <div className="mt-2 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview de blob local */}
          <img
            src={captura.preview}
            alt={t.foto.titulo}
            className="h-28 w-full rounded-lg object-cover"
          />
          <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
            <p className="font-medium text-slate-800">
              {secSte
                ? `${secSte}${hacienda ? " · " + hacienda : ""}`
                : t.foto.fueraDeLote}
            </p>
            <p className="tabular-nums">
              {formatCoordenadas(captura.lon, captura.lat)}
            </p>
            <p>{captura.fecha}</p>
          </div>

          {estado === "procesando" && (
            <p className="text-[11px] text-slate-500">{t.foto.detectando}</p>
          )}

          {/* Corregir la suerte detectada (autocompletar del catálogo). */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t.foto.suerte} (corregir)`}
            aria-label={t.foto.suerte}
            className={campo}
          />
          {sugerencias.length > 0 && (
            <ul className="-mt-1 max-h-32 overflow-y-auto rounded-lg ring-1 ring-black/10">
              {sugerencias.map((s) => (
                <li key={s.sec_ste}>
                  <button
                    type="button"
                    onClick={() => elegirSuerte(s.sec_ste, s.hacienda)}
                    className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                  >
                    <span>{s.sec_ste}</span>
                    <span className="text-[11px] text-slate-500">
                      {s.hacienda}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={sellarYCompartir}
              disabled={estado === "procesando"}
              className="bg-primary text-accent flex-1 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50"
            >
              {estado === "procesando" ? "…" : `✓ ${t.foto.sellar}`}
            </button>
            <button
              type="button"
              onClick={limpiar}
              className={`${campo} w-auto`}
            >
              {t.foto.otra}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
        aria-label={t.foto.tomar}
      />
    </div>
  );
}
