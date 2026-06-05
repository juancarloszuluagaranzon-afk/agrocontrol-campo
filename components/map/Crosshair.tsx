"use client";

import { useMapStore } from "@/lib/store/mapStore";

/**
 * Retícula fija al centro para marcado preciso (§5). El usuario alinea el mapa
 * bajo la cruz y marca; el punto se coloca en el centro exacto (no bajo el dedo).
 * Visible mientras se mide o se coloca un marcador.
 */
export function Crosshair({ visible }: { visible: boolean }) {
  const c = useMapStore((s) => s.mapCenter);
  if (!visible) return null;
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="relative size-10">
          <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white shadow" />
          <div className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-white shadow" />
          <div className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-orange-500" />
        </div>
      </div>
      <div className="pointer-events-none absolute top-[calc(50%+1.5rem)] left-1/2 z-10 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white tabular-nums">
        {c[1].toFixed(5)}, {c[0].toFixed(5)}
      </div>
    </>
  );
}
