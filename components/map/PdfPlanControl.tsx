"use client";

import { useRef, useState } from "react";
import { parseGeoRef } from "@/lib/geo/geopdf";
import { rasterizarPagina1 } from "@/lib/geo/pdfRender";
import { extraerPuntosMuestreo } from "@/lib/geo/pdfPoints";
import { distanciaMetros } from "@/lib/geo/gps";
import { formatMetros } from "@/lib/geo/format";
import { putImage, deleteImage } from "@/lib/storage/imageBlobStore";
import { usePlanoStore } from "@/lib/store/planoStore";
import { useMapStore } from "@/lib/store/mapStore";
import { planoMetaSchema } from "@/domain/plano/schema";
import { t } from "@/lib/i18n/es-CO";

const campo = "rounded-lg ring-1 ring-black/15 px-3 py-2 text-sm";

/**
 * Panel "Plano de campo" (§ ADR-0008): sube un GeoPDF de muestreo, lo muestra como
 * backdrop georreferenciado (con opacidad ajustable) y deja caminar a los puntos
 * con el GPS. Ocasional, por dispositivo, sin BD.
 */
export function PdfPlanControl() {
  const plano = usePlanoStore((s) => s.plano);
  const opacity = usePlanoStore((s) => s.opacity);
  const cargar = usePlanoStore((s) => s.cargar);
  const setOpacity = usePlanoStore((s) => s.setOpacity);
  const toggleMuestreado = usePlanoStore((s) => s.toggleMuestreado);
  const addPunto = usePlanoStore((s) => s.addPunto);
  const quitar = usePlanoStore((s) => s.quitar);
  const gps = useMapStore((s) => s.gps);
  const flyTo = useMapStore((s) => s.flyTo);
  const mapCenter = useMapStore((s) => s.mapCenter);
  const [estado, setEstado] = useState<"idle" | "leyendo">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-subir el mismo archivo
    if (!file) return;
    setError(null);
    setEstado("leyendo");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ref = parseGeoRef(bytes);
      if (!ref) {
        setError(t.plano.sinGeo);
        setEstado("idle");
        return;
      }
      const { blob } = await rasterizarPagina1(bytes);
      const imageKey = crypto.randomUUID();
      await putImage(imageKey, blob);
      // Quita la imagen anterior (si se reemplaza) para no dejar basura.
      const previo = usePlanoStore.getState().plano?.imageKey;
      if (previo && previo !== imageKey) await deleteImage(previo);

      // Extrae los puntos de muestreo de la capa del PDF (puede dar []).
      const puntos = await extraerPuntosMuestreo(bytes, ref);

      const meta = planoMetaSchema.parse({
        nombre: file.name,
        imageKey,
        coordinates: ref.coordinates,
        bbox: ref.bbox,
        opacity: 0.85,
        puntos,
      });
      cargar(meta);
    } catch {
      setError(t.plano.error);
    } finally {
      setEstado("idle");
    }
  }

  async function onQuitar() {
    const key = usePlanoStore.getState().plano?.imageKey;
    quitar();
    if (key) await deleteImage(key);
  }

  return (
    <div className="pointer-events-auto w-64 max-w-[calc(100vw-1rem)] rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10">
      <span className="text-sm font-semibold">🗺️ {t.plano.titulo}</span>

      {!plano ? (
        <>
          <p className="mt-1 text-[12px] text-slate-500">{t.plano.ayuda}</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={estado === "leyendo"}
            className="bg-primary text-accent mt-2 w-full rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {estado === "leyendo" ? t.plano.leyendo : `📄 ${t.plano.subir}`}
          </button>
        </>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="truncate text-[13px] font-medium" title={plano.nombre}>
            {plano.nombre}
          </p>
          <p className="text-[11px] text-slate-500">
            {plano.puntos.length > 0
              ? t.plano.muestreados(
                  plano.puntos.filter((p) => p.muestreado).length,
                  plano.puntos.length,
                )
              : t.plano.sinPuntos}
          </p>
          <label className="block text-[11px] text-slate-500">
            {t.plano.opacidad}
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full"
            />
          </label>

          {/* Checklist de puntos: distancia (GPS) + marcar muestreado + ir. */}
          {plano.puntos.length > 0 && (
            <ul className="max-h-44 space-y-0.5 overflow-y-auto border-t border-black/5 pt-1">
              {plano.puntos.map((p) => {
                const dist = gps
                  ? distanciaMetros(gps.lon, gps.lat, p.lon, p.lat)
                  : null;
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"
                  >
                    <button
                      type="button"
                      onClick={() => toggleMuestreado(p.id)}
                      aria-label={`Marcar ${p.id}`}
                      className="shrink-0 text-base"
                    >
                      {p.muestreado ? "✅" : "⬜"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        flyTo({ lon: p.lon, lat: p.lat, tabId: "" })
                      }
                      className={`min-w-0 flex-1 text-left text-sm ${
                        p.muestreado ? "text-slate-400 line-through" : ""
                      }`}
                    >
                      {p.id}
                    </button>
                    <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
                      {dist != null ? formatMetros(dist) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={() =>
              addPunto({
                id: `M${(plano.puntos.length + 1).toString()}`,
                lon: mapCenter[0],
                lat: mapCenter[1],
                muestreado: false,
              })
            }
            className={`${campo} w-full`}
          >
            ➕ Punto en el centro
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={estado === "leyendo"}
              className={`${campo} flex-1 disabled:opacity-50`}
            >
              {estado === "leyendo" ? t.plano.leyendo : t.plano.reemplazar}
            </button>
            <button
              type="button"
              onClick={onQuitar}
              className={`${campo} text-red-600 hover:bg-red-50`}
            >
              {t.plano.quitar}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={onFile}
        className="hidden"
        aria-label={t.plano.subir}
      />
    </div>
  );
}
