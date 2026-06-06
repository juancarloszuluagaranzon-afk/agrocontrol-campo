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
import { ToolsMenu } from "@/components/map/ToolsMenu";
import { Crosshair } from "@/components/map/Crosshair";
import { useMapStore } from "@/lib/store/mapStore";

/**
 * Pestaña Mapa / Campo (§5): mapa a pantalla completa. Estilo Avenza: el mapa
 * queda despejado; las herramientas (medir, marcadores, mediciones, capas) se
 * abren desde el menú ✏️📏 (abajo-izq.). Siempre visibles: buscador,
 * Satélite/Plano y "Mi ubicación".
 */
export function MapScreen() {
  const midiendo = useMapStore((s) => s.measureMode !== "off");
  const colocando = useMapStore((s) => s.placingMarker);
  const activeTool = useMapStore((s) => s.activeTool);

  return (
    <div className="absolute inset-0">
      <MapView />
      <Crosshair visible={midiendo || colocando} />
      <SearchBox />

      {/* Siempre visible (arriba-izq., bajo el buscador): conmutador de base. */}
      <div className="absolute top-14 left-2 z-10">
        <BaseToggle />
      </div>

      {/* Panel de la herramienta abierta desde el menú (arriba-izq.). */}
      {activeTool !== "none" && (
        <div className="absolute top-28 left-2 z-10 flex max-w-[calc(100vw-1rem)] flex-col items-start gap-2">
          {activeTool === "medir" && <MeasureControl />}
          {activeTool === "marcadores" && <MarcadorControl />}
          {activeTool === "mediciones" && <MedicionesControl />}
          {activeTool === "capas" && (
            <>
              <LayerToggles />
              <Legend />
            </>
          )}
        </div>
      )}

      {/* Mi ubicación (GPS): FAB propio a la derecha (alcance con el pulgar). */}
      <div className="pointer-events-auto absolute top-1/2 right-2 z-10 -translate-y-1/2">
        <GpsControl />
      </div>

      {/* Menú de herramientas (✏️📏, abajo-izquierda). */}
      <ToolsMenu />

      {midiendo ? <MeasureResult /> : <SuertePanel />}
    </div>
  );
}
