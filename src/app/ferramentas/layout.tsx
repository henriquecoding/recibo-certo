"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight } from "@/components/ui/Icons";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { FERRAMENTAS } from "@/lib/ferramentas-config";

export default function FerramentasLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Derivado da fonte única — o breadcrumb cobre sempre TODAS as ferramentas
  // (o array local antigo estava incompleto: faltava o simulador de heranças).
  const ferramentaAtiva = FERRAMENTAS.find((f) => f.href === pathname);
  // O Simulador de IRS embute o simulador completo (layout largo, como a página
  // de Simuladores); as restantes ferramentas mantêm a coluna estreita de leitura.
  const largo = pathname === "/ferramentas/simulador-irs";

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Início", url: "/" },
    { name: "Ferramentas", url: "/ferramentas" },
    ...(ferramentaAtiva ? [{ name: ferramentaAtiva.titulo, url: ferramentaAtiva.href }] : []),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Nav />
      <div className="min-h-screen bg-cream dark:bg-stone-950">
        <div className={`mx-auto px-6 py-8 ${largo ? "max-w-5xl" : "max-w-3xl"}`}>
          {/* Breadcrumb */}
          <nav aria-label="Localização" className="mb-8 flex items-center gap-1.5 text-xs text-stone-400">
            <Link href="/" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Início</Link>
            <ChevronRight size={12} />
            <Link href="/ferramentas" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Ferramentas</Link>
            {ferramentaAtiva && (
              <>
                <ChevronRight size={12} />
                <span className="text-stone-600 dark:text-stone-300">{ferramentaAtiva.titulo}</span>
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
