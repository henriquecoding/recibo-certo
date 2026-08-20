"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Moldura comum das ferramentas.
//
//  A LARGURA DEIXOU DE SER UMA EXCEÇÃO CODIFICADA (§P1-01). Havia isto:
//
//      const largo = pathname === "/ferramentas/simulador-irs";
//
//  — uma linha que dava espaço a uma ferramenta e espremia a 768px todas as
//  outras, incluindo o mapa, o comparador, as heranças e a empresa. A
//  largura é uma propriedade da tarefa, por isso vive no catálogo
//  (`layout: "compact" | "split" | "wide" | "map"`) e é lida daqui.
//
//  O breadcrumb também deriva do catálogo, tal como já derivava — só que
//  agora o catálogo está completo, incluindo as quatro ferramentas que
//  antes não tinham landing nenhuma.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight } from "@/components/ui/Icons";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { porHref } from "@/lib/ferramentas";
import { LARGURA_POR_LAYOUT } from "@/components/ferramentas/ToolShell";

export default function FerramentasLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ferramentaAtiva = porHref(pathname);
  // O hub tem largura própria: é uma grelha, não uma coluna de leitura.
  const largura = ferramentaAtiva
    ? LARGURA_POR_LAYOUT[ferramentaAtiva.layout]
    : "max-w-6xl";

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Início", url: "/" },
    { name: "Ferramentas", url: "/ferramentas" },
    ...(ferramentaAtiva
      ? [{ name: ferramentaAtiva.title, url: ferramentaAtiva.canonicalHref }]
      : []),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Nav />
      <div className="min-h-screen bg-cream dark:bg-stone-950">
        <div className={`mx-auto px-5 py-8 sm:px-6 ${largura}`}>
          {/* Breadcrumb */}
          <nav aria-label="Localização" className="mb-8 flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
            <Link href="/" className="transition-colors hover:text-stone-600 dark:hover:text-stone-300">Início</Link>
            <ChevronRight size={12} />
            <Link href="/ferramentas" className="transition-colors hover:text-stone-600 dark:hover:text-stone-300">Ferramentas</Link>
            {ferramentaAtiva && (
              <>
                <ChevronRight size={12} />
                <span className="text-stone-600 dark:text-stone-300">{ferramentaAtiva.title}</span>
              </>
            )}
          </nav>

          {/* ── O marco que faltava ─────────────────────────────────────
              As 48 landings de ferramenta não tinham `<main>` nenhum: a
              home e os guias tinham, estas não. Sem esse marco, um leitor
              de ecrã não consegue saltar a navegação e o breadcrumb para
              chegar à ferramenta, e a única forma de lá chegar era ouvir
              tudo desde o início. Um `<main>` é `display: block`, como o
              `<div>` que envolvia; não muda uma linha de layout. */}
          <main>{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
