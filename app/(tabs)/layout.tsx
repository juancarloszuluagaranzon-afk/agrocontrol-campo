import { SyncStatus } from "@/components/SyncStatus";
import { SyncRunner } from "@/components/SyncRunner";
import { TabBar } from "@/components/TabBar";
import { AuthGate } from "@/components/auth/AuthGate";
import { UserMenu } from "@/components/auth/UserMenu";
import { t } from "@/lib/i18n/es-CO";

/**
 * Shell de las pestañas: cabecera con marca + estado + usuario, contenido a
 * pantalla completa y barra de navegación inferior. Protegido por AuthGate.
 */
export default function TabsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="skip-link print:hidden">
        Saltar al contenido
      </a>
      <header className="border-accent/10 flex items-center justify-between gap-3 border-b px-4 py-2 print:hidden">
        <span className="text-base font-bold tracking-tight">
          {t.app.nombre}
        </span>
        <div className="flex items-center gap-3">
          <SyncStatus />
          <UserMenu />
        </div>
      </header>
      <main id="contenido" className="relative flex-1 overflow-hidden">
        <AuthGate>{children}</AuthGate>
      </main>
      <SyncRunner />
      <TabBar />
    </div>
  );
}
