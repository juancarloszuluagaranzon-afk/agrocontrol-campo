import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { t } from "@/lib/i18n/es-CO";

export const metadata: Metadata = {
  applicationName: t.app.nombre,
  title: {
    default: t.app.nombre,
    template: `%s · ${t.app.nombre}`,
  },
  description: t.app.descripcion,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: t.app.nombre,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" className="h-full antialiased">
      <body className="bg-background text-foreground flex min-h-full flex-col">
        {children}
        {/* Vercel Web Analytics: conteo de visitas y páginas sin cookies. Solo
            envía en producción (en dev no hace nada) y falla en silencio sin
            red, así que no afecta el modo offline. */}
        <Analytics />
      </body>
    </html>
  );
}
