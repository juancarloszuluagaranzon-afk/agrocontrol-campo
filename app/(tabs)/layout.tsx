import { SyncStatus } from "@/components/SyncStatus";
import { SyncRunner } from "@/components/SyncRunner";
import { AuthGate } from "@/components/auth/AuthGate";
import { UserMenu } from "@/components/auth/UserMenu";
import { PlantaSwitch } from "@/components/PlantaSwitch";
import { t } from "@/lib/i18n/es-CO";

/**
 * Shell de la app: cabecera compacta con marca + estado + usuario y el mapa a
 * pantalla completa. Sin barra inferior (la app es de una sola sección, §5).
 * Protegido por AuthGate.
 */
export default function TabsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-dvh flex-col">
      <a href="#contenido" className="skip-link print:hidden">
        Saltar al contenido
      </a>
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
        <AuthGate>{children}</AuthGate>
      </main>
      <SyncRunner />
    </div>
  );
}
