"use client";

import { MapView } from "@/components/map/MapView";
import { SearchBox } from "@/components/map/SearchBox";
import { LayerToggles } from "@/components/map/LayerToggles";
import { BaseToggle } from "@/components/map/BaseToggle";
import { Legend } from "@/components/map/Legend";
import { AreaNetaPanel } from "@/components/map/AreaNetaPanel";
import { SuertePanel } from "@/components/map/SuertePanel";
import { GpsControl } from "@/components/map/GpsControl";
import { MeasureControl } from "@/components/map/MeasureControl";
import { MeasureResult } from "@/components/map/MeasureResult";
import { MarcadorControl } from "@/components/map/MarcadorControl";
import { Crosshair } from "@/components/map/Crosshair";
import { useMapStore } from "@/lib/store/mapStore";

/** Pestaña Mapa / Campo (§5): mapa a pantalla completa con controles superpuestos. */
export function MapScreen() {
  const midiendo = useMapStore((s) => s.measureMode !== "off");
  const colocando = useMapStore((s) => s.placingMarker);

  return (
    <div className="absolute inset-0">
      <MapView />
      <Crosshair visible={midiendo || colocando} />
      {/* Columna superior izquierda: capas, base, leyenda. */}
      <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-2">
        <LayerToggles />
        <BaseToggle />
        <Legend />
        <AreaNetaPanel />
      </div>
      <SearchBox />
      {/* Columna de acciones a la derecha (alcance con el pulgar). */}
      <div className="pointer-events-auto absolute top-1/2 right-2 z-10 flex -translate-y-1/2 flex-col items-end gap-2">
        <GpsControl />
        <MeasureControl />
        <MarcadorControl />
      </div>
      {midiendo ? <MeasureResult /> : <SuertePanel />}
    </div>
  );
}
