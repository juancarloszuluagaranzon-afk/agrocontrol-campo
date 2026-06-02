import type { Metadata } from "next";
import { t } from "@/lib/i18n/es-CO";

export const metadata: Metadata = { title: t.tabs.maquinaria };

export default function MaquinariaPage() {
  return (
    <section className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">{t.maquinaria.titulo}</h1>
      <p className="text-accent/60 max-w-sm text-balance">
        {t.maquinaria.placeholder}
      </p>
    </section>
  );
}
