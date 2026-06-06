"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight } from "@/components/ui/Icons";

const FERRAMENTAS_NAV = [
  { label: "Ato isolado ou atividade?", href: "/ferramentas/ato-isolado" },
  { label: "Calculadora de regime simplificado", href: "/ferramentas/regime-simplificado" },
  { label: "Classificar atividade fiscal", href: "/ferramentas/classificar-atividade" },
];

export default function FerramentasLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ferramentaAtiva = FERRAMENTAS_NAV.find((f) => f.href === pathname);

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-cream dark:bg-stone-950">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Breadcrumb */}
          <nav aria-label="Localização" className="mb-8 flex items-center gap-1.5 text-xs text-stone-400">
            <Link href="/" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Início</Link>
            <ChevronRight size={12} />
            <Link href="/ferramentas" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Ferramentas</Link>
            {ferramentaAtiva && (
              <>
                <ChevronRight size={12} />
                <span className="text-stone-600 dark:text-stone-300">{ferramentaAtiva.label}</span>
              </>
            )}
          </nav>

          {children}
        </div>
      </div>
      <Footer />
    </>
  );
}
