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
import { PdfPlanControl } from "@/components/map/PdfPlanControl";
import { FotoCampoControl } from "@/components/map/FotoCampoControl";
import { PrecipitacionControl } from "@/components/map/PrecipitacionControl";
import { ReporteLluviaControl } from "@/components/map/ReporteLluviaControl";
import { ToolsMenu } from "@/components/map/ToolsMenu";
import { Crosshair } from "@/components/map/Crosshair";
import { PlantaSelector } from "@/components/PlantaSelector";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";

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
  const planta = usePlantaStore((s) => s.planta);
  const hydrated = usePlantaStore((s) => s.hydrated);

  // Aún leyendo localStorage: no parpadear el selector ni el mapa.
  if (!hydrated) return <div className="absolute inset-0" />;
  // Sin planta elegida → selector de entrada (§ ADR-0007).
  if (!planta) return <PlantaSelector />;

  // `key={planta}`: al cambiar de planta, reconstruye el mapa y sus capas con la
  // otra cartografía (universos geográficos distintos), sin estados residuales.
  return (
    <div key={planta} className="absolute inset-0">
      <MapView />
      <Crosshair visible={midiendo || colocando} />
      <SearchBox />

      {/* Siempre visible (arriba-izq., bajo el buscador): conmutador de base. */}
      <div className="absolute top-14 left-2 z-10">
        <BaseToggle />
      </div>

      {/* Panel de la herramienta abierta desde el menú (arriba-izq.). */}
      {activeTool !== "none" && activeTool !== "reporte" && (
        <div className="absolute top-28 left-2 z-10 flex max-w-[calc(100vw-1rem)] flex-col items-start gap-2">
          {activeTool === "plano" && <PdfPlanControl />}
          {activeTool === "foto" && <FotoCampoControl />}
          {activeTool === "lluvia" && <PrecipitacionControl />}
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

      {/* Reporte de lluvia: panel de pantalla completa (tabla ancha), fuera
          del recuadro flotante angosto que usan las demás herramientas. */}
      {activeTool === "reporte" && <ReporteLluviaControl />}

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
