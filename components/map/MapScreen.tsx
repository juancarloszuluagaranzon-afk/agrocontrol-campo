"use client";

import { MapView } from "@/components/map/MapView";
import { SearchBox } from "@/components/map/SearchBox";
import { LayerToggles } from "@/components/map/LayerToggles";
import { BaseToggle } from "@/components/map/BaseToggle";
import { Legend } from "@/components/map/Legend";
import { SuertePanel } from "@/components/map/SuertePanel";
import { GpsControl } from "@/components/map/GpsControl";
import { MeasureControl } from "@/components/map/MeasureControl";
import { MeasureResult } from "@/components/map/MeasureResult";
import { MarcadorControl } from "@/components/map/MarcadorControl";
import { MedicionesControl } from "@/components/map/MedicionesControl";
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
      <SearchBox />
      {/* Columna superior izquierda (bajo el buscador): capas, base, leyenda. */}
      {/* La tabla "Área neta por hacienda" (AreaNetaPanel) se ocultó por ahora;
          el componente y su dominio siguen en el repo para reactivarla. */}
      <div className="absolute top-14 left-2 z-10 flex max-w-[calc(100vw-1rem)] flex-col items-start gap-2">
        <LayerToggles />
        <BaseToggle />
        <Legend />
      </div>
      {/* Columna de acciones a la derecha (alcance con el pulgar). */}
      <div className="pointer-events-auto absolute top-1/2 right-2 z-10 flex -translate-y-1/2 flex-col items-end gap-2">
        <GpsControl />
        <MeasureControl />
        <MarcadorControl />
        <MedicionesControl />
      </div>
      {midiendo ? <MeasureResult /> : <SuertePanel />}
    </div>
  );
}
