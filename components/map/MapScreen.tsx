"use client";

import { MapView } from "@/components/map/MapView";
import { SearchBox } from "@/components/map/SearchBox";
import { IndexToggles } from "@/components/map/IndexToggles";
import { LayerToggles } from "@/components/map/LayerToggles";
import { BaseToggle } from "@/components/map/BaseToggle";
import { Legend } from "@/components/map/Legend";
import { SentinelLegend } from "@/components/map/SentinelLegend";
import { EdadLegend } from "@/components/map/EdadLegend";
import { SuertePanel } from "@/components/map/SuertePanel";
import { MarcadorCard } from "@/components/map/MarcadorCard";
import { GpsControl } from "@/components/map/GpsControl";
import { BrujulaControl } from "@/components/map/BrujulaControl";
import { MeasureControl } from "@/components/map/MeasureControl";
import { MeasureResult } from "@/components/map/MeasureResult";
import { MarcadorControl } from "@/components/map/MarcadorControl";
import { MedicionesControl } from "@/components/map/MedicionesControl";
import { PdfPlanControl } from "@/components/map/PdfPlanControl";
import { FotoCampoControl } from "@/components/map/FotoCampoControl";
import { PrecipitacionControl } from "@/components/map/PrecipitacionControl";
import { ReporteLluviaControl } from "@/components/map/ReporteLluviaControl";
import { MaestroControl } from "@/components/map/MaestroControl";
import { MapaOfflineControl } from "@/components/map/MapaOfflineControl";
import { ToolsMenu } from "@/components/map/ToolsMenu";
import { Crosshair } from "@/components/map/Crosshair";
import { PlantaSelector } from "@/components/PlantaSelector";
import { Protegido } from "@/components/Protegido";
import { t } from "@/lib/i18n/es-CO";
import { useEffect } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { usePlantaStore } from "@/lib/store/plantaStore";
import { isPlantaId } from "@/lib/plantas";

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
  const setPlanta = usePlantaStore((s) => s.setPlanta);

  // Deep-link compartido (§ADR-0018): si el link trae `?p=<planta>`, cae en esa
  // planta antes de montar el mapa (el punto puede ser de la otra empresa).
  useEffect(() => {
    if (!hydrated) return;
    const p = new URLSearchParams(window.location.search).get("p");
    if (isPlantaId(p) && p !== planta) setPlanta(p);
  }, [hydrated, planta, setPlanta]);

  // Aún leyendo localStorage: no parpadear el selector ni el mapa.
  if (!hydrated) return <div className="absolute inset-0" />;
  // Sin planta elegida → selector de entrada (§ ADR-0007).
  if (!planta) return <PlantaSelector />;

  // `key={planta}`: al cambiar de planta, reconstruye el mapa y sus capas con la
  // otra cartografía (universos geográficos distintos), sin estados residuales.
  return (
    <div key={planta} className="absolute inset-0">
      {/* Cada pieza va protegida (ADR-0039): si una falla, solo esa se oculta
          y el mapa y el GPS siguen funcionando, también sin señal. */}
      <Protegido
        nombre="mapa"
        fallback={(reintentar) => (
          <div className="bg-background absolute inset-0 grid place-items-center p-6 text-center">
            <div className="space-y-3">
              <p className="text-sm font-medium">{t.errorApp.mapa}</p>
              <button
                type="button"
                onClick={reintentar}
                className="bg-primary rounded-lg px-4 py-2 text-sm font-semibold text-white"
              >
                {t.errorApp.reintentarMapa}
              </button>
            </div>
          </div>
        )}
      >
        <MapView />
      </Protegido>
      <Crosshair visible={midiendo || colocando} />
      <Protegido nombre="buscador">
        <SearchBox />
      </Protegido>

      {/* Siempre visible (arriba-izq., bajo el buscador): conmutador de base. */}
      <div className="absolute top-14 left-2 z-10">
        <Protegido nombre="satélite/plano">
          <BaseToggle />
        </Protegido>
      </div>

      {/* Panel de la herramienta abierta desde el menú (arriba-izq.). Altura
          acotada al espacio libre sobre el FAB de Herramientas (abajo-izq.,
          z-20) con scroll interno: con varios índices Sentinel Hub el panel de
          Capas crecía hasta quedar bajo el botón y sus últimas casillas no se
          podían tocar. El margen negativo + padding evita recortar la sombra. */}
      {activeTool !== "none" &&
        activeTool !== "reporte" &&
        activeTool !== "maestro" && (
          <div className="absolute top-28 left-2 z-10 -m-3 flex max-h-[calc(100dvh-12rem-env(safe-area-inset-bottom,0px))] max-w-[calc(100vw-1rem+1.5rem)] flex-col items-start gap-2 overflow-y-auto overscroll-contain p-3">
            <Protegido key={activeTool} nombre={`herramienta ${activeTool}`}>
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
              {activeTool === "indices" && <IndexToggles />}
              {activeTool === "offline" && <MapaOfflineControl />}
            </Protegido>
          </div>
        )}

      {/* Reporte de lluvia: panel de pantalla completa (tabla ancha), fuera
          del recuadro flotante angosto que usan las demás herramientas. */}
      {activeTool === "reporte" && (
        <Protegido nombre="reporte de lluvia">
          <ReporteLluviaControl />
        </Protegido>
      )}

      {/* Maestro de suertes: panel de pantalla completa (búsqueda + ficha). */}
      {activeTool === "maestro" && (
        <Protegido nombre="maestro">
          <MaestroControl />
        </Protegido>
      )}

      {/* Brújula siempre visible, bajo los botones de zoom (arriba-der.). */}
      <div className="absolute top-[76px] right-[6px] z-10">
        <Protegido nombre="brújula">
          <BrujulaControl />
        </Protegido>
      </div>

      {/* Mi ubicación (GPS): FAB propio a la derecha (alcance con el pulgar).
          Si falla, queda un botón para volver a montarlo. */}
      <div className="pointer-events-auto absolute top-1/2 right-2 z-10 -translate-y-1/2">
        <Protegido
          nombre="gps"
          fallback={(reintentar) => (
            <button
              type="button"
              onClick={reintentar}
              className="bg-background rounded-full px-3 py-2 text-xs font-semibold text-amber-700 shadow-lg ring-1 ring-black/10"
            >
              ◎ {t.errorApp.reintentarGps}
            </button>
          )}
        >
          <GpsControl />
        </Protegido>
      </div>

      {/* Leyendas abajo-der.: edad de la caña (ADR-0034) y escala del índice
          Sentinel Hub activo (ADR-0026), apiladas para no encimarse. */}
      <div className="pointer-events-none absolute right-2 bottom-[calc(2rem+env(safe-area-inset-bottom,0px))] z-10 flex flex-col items-end gap-1.5">
        <Protegido nombre="leyenda de edad">
          <EdadLegend />
        </Protegido>
        <Protegido nombre="leyenda de índice">
          <SentinelLegend />
        </Protegido>
      </div>

      {/* Menú de herramientas (✏️📏, abajo-izquierda). */}
      <Protegido nombre="menú de herramientas">
        <ToolsMenu />
      </Protegido>

      <Protegido nombre="ficha inferior">
        {midiendo ? <MeasureResult /> : <SuertePanel />}
      </Protegido>
      {!midiendo && (
        <Protegido nombre="ficha de marcador">
          <MarcadorCard />
        </Protegido>
      )}
    </div>
  );
}
