import type { Metadata } from "next";
import { MapScreen } from "@/components/map/MapScreen";
import { t } from "@/lib/i18n/es-CO";

export const metadata: Metadata = { title: t.mapa.titulo };

export default function MapaPage() {
  return <MapScreen />;
}
