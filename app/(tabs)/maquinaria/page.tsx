import type { Metadata } from "next";
import { MaquinariaScreen } from "@/components/maquinaria/MaquinariaScreen";
import { t } from "@/lib/i18n/es-CO";

export const metadata: Metadata = { title: t.tabs.maquinaria };

export default function MaquinariaPage() {
  return <MaquinariaScreen />;
}
