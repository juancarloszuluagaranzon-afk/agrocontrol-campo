"use client";

import { MapView } from "@/components/map/MapView";
import { SearchBox } from "@/components/map/SearchBox";
import { LayerToggles } from "@/components/map/LayerToggles";
import { SuertePanel } from "@/components/map/SuertePanel";

/** Pestaña Mapa / Campo (§5): mapa a pantalla completa con controles superpuestos. */
export function MapScreen() {
  return (
    <div className="absolute inset-0">
      <MapView />
      <LayerToggles />
      <SearchBox />
      <SuertePanel />
    </div>
  );
}
