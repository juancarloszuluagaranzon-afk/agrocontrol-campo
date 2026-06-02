"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n/es-CO";

const tabs = [
  { href: "/mapa", label: t.tabs.mapa, icon: "🗺️" },
  { href: "/maquinaria", label: t.tabs.maquinaria, icon: "🚜" },
] as const;

/**
 * Navegación inferior entre las dos pestañas (§5). Objetivos táctiles grandes
 * (h-16) y alto contraste para uso con guantes bajo sol (§13).
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="border-accent/10 bg-background grid grid-cols-2 border-t"
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-0.5 text-sm font-semibold transition-colors ${
              active
                ? "text-primary border-primary border-t-2"
                : "text-accent/60"
            }`}
          >
            <span aria-hidden className="text-xl">
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
