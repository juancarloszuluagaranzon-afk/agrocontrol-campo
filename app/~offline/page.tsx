import type { Metadata } from "next";
import { MapScreen } from "@/components/map/MapScreen";
import { SyncStatus } from "@/components/SyncStatus";
import { UserMenu } from "@/components/auth/UserMenu";
import { PlantaSwitch } from "@/components/PlantaSwitch";
import { t } from "@/lib/i18n/es-CO";

/**
 * Shell offline precacheado (§14, ADR-0020). El service worker lo sirve como
 * respaldo de navegación cuando no hay red, de modo que la app **siempre abre**
 * sin señal. Comparte el grafo de chunks de `/mapa`, así que arranca desde el
 * precache (consistente con el build). Monta el mapa directamente confiando en
 * la sesión y la planta **persistidas**: NO usa AuthGate para no rebotar a
 * `/login` (que podría no estar en caché) ni depender de Supabase, que no
 * autentica offline. Estático para poder precachearse.
 */
export const dynamic = "force-static";

export const metadata: Metadata = { title: t.app.nombre };

export default function OfflineShellPage() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="border-accent/10 flex items-center justify-between gap-3 border-b px-3 py-2 print:hidden">
        <span className="truncate text-base font-bold tracking-tight">
          {t.app.nombre}
        </span>
        <div className="flex items-center gap-2">
          <PlantaSwitch />
          <SyncStatus />
          <UserMenu />
        </div>
      </header>
      <main id="contenido" className="relative flex-1 overflow-hidden">
        <MapScreen />
      </main>
    </div>
  );
}
