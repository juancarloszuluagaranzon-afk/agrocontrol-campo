import { SyncStatus } from "@/components/SyncStatus";
import { TabBar } from "@/components/TabBar";
import { t } from "@/lib/i18n/es-CO";

/**
 * Shell de las pestañas: cabecera con marca + estado de conexión, contenido
 * a pantalla completa y barra de navegación inferior.
 */
export default function TabsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-accent/10 flex items-center justify-between border-b px-4 py-2">
        <span className="text-base font-bold tracking-tight">
          {t.app.nombre}
        </span>
        <SyncStatus />
      </header>
      <main className="relative flex-1 overflow-hidden">{children}</main>
      <TabBar />
    </div>
  );
}
