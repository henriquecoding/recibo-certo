"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight, ChevronDown, Menu, Megaphone } from "@/components/ui/Icons";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { GUIDE_MANIFESTS, HUB_GRUPOS, type GuideManifest, type HubGroup } from "@/lib/guias/manifests";
import { guiaSemCorpo } from "@/lib/guias/expansao/derivar";
import MotionProvider from "@/components/ui/motion/MotionProvider";
import { jsonLd } from "@/lib/jsonld";

// ─────────────────────────────────────────────────────────────────────────
//  Navegação dos Guias — DERIVADA dos manifestos.
//
//  Falha 4.5 da auditoria: este ficheiro repetia à mão a lista completa dos
//  29 Guias, o que permitia divergência entre índice, sitemap, navegação e
//  páginas. Agora um Guia novo aparece aqui só por existir o manifesto.
//
//  Os grupos passam a ser por INTENÇÃO (ponto 9.1) e não por tipo de
//  contribuinte — o filtro por categoria continua disponível no índice.
// ─────────────────────────────────────────────────────────────────────────

const SECCOES: { id: HubGroup; titulo: string; items: GuideManifest[] }[] = HUB_GRUPOS.map((g) => ({
  id: g.id,
  titulo: g.titulo,
  // Sem os andaimes da expansão: a barra lateral é para navegar em
  // conteúdo que existe, não em títulos por escrever.
  items: GUIDE_MANIFESTS.filter((m) => m.hub === g.id && m.status !== "archived" && !guiaSemCorpo(m.slug)),
})).filter((s) => s.items.length > 0);

const TODOS = SECCOES.flatMap((s) => s.items);

function SidebarSection({ titulo, items, pathname }: { titulo: string; items: GuideManifest[]; pathname: string }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 px-3">
        <span className="h-px w-4 bg-brand/40" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">{titulo}</p>
      </div>
      <nav className="space-y-0.5">
        {items.map((g) => {
          const href = `/guias/${g.slug}`;
          const active = pathname === href;
          const Icon = g.icon;
          return (
            <Link
              key={g.slug}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-[36px] items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand font-semibold text-white shadow-card"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              }`}
            >
              <Icon size={15} className={active ? "text-white" : "text-stone-400 group-hover:text-brand"} />
              <span className="flex-1 truncate">{g.navLabel}</span>
              {active && <ChevronRight size={14} className="text-white/80" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function GuiasLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const guiaAtivo = TODOS.find((g) => `/guias/${g.slug}` === pathname);
  const naIndex = pathname === "/guias";

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Início", url: "/" },
    { name: "Guias", url: "/guias" },
    ...(guiaAtivo ? [{ name: guiaAtivo.navLabel, url: `/guias/${guiaAtivo.slug}` }] : []),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      <Nav />
      <div className="min-h-screen bg-cream dark:bg-stone-950">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {/* Breadcrumb */}
          <nav aria-label="Localização" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
            <Link href="/" className="transition-colors hover:text-stone-600 dark:hover:text-stone-300">Início</Link>
            <ChevronRight size={12} />
            <Link href="/guias" className="transition-colors hover:text-stone-600 dark:hover:text-stone-300">Guias</Link>
            {guiaAtivo && (
              <>
                <ChevronRight size={12} />
                <span className="text-stone-600 dark:text-stone-300">{guiaAtivo.navLabel}</span>
              </>
            )}
          </nav>

          {/* Navegação entre guias — mobile (a sidebar é lg:block).
              Disclosure nativa, acessível por teclado, sem estado/JS. */}
          {!naIndex && (
            <details className="group mb-6 rounded-2xl border border-stone-200 bg-white shadow-card lg:hidden dark:border-stone-700 dark:bg-stone-900">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-stone-700 dark:text-stone-200 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <Menu size={16} className="text-brand" /> Todos os guias
                </span>
                <ChevronDown size={16} className="text-stone-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="max-h-[60dvh] overflow-y-auto border-t border-stone-100 px-3 py-3 dark:border-stone-800">
                {SECCOES.map((s) => (
                  <SidebarSection key={s.id} titulo={s.titulo} items={s.items} pathname={pathname} />
                ))}
              </div>
            </details>
          )}

          <div className="flex gap-10">
            {/* Sidebar — oculta em móvel E no próprio índice.
                No índice era a terceira cópia do mesmo catálogo (barra
                lateral + bloco "O que precisas de fazer?" + lista), e roubava
                240 px de largura àquilo que a página existe para mostrar.
                Nas páginas de guia continua a ser o que deve ser: navegação
                entre guias. */}
            <aside className={`w-60 flex-shrink-0 ${naIndex ? "hidden" : "hidden lg:block"}`}>
              <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-1">
                {SECCOES.map((s) => (
                  <SidebarSection key={s.id} titulo={s.titulo} items={s.items} pathname={pathname} />
                ))}

                {/* Cartão de ajuda */}
                <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-900">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Precisa de ajuda?</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    Faz as contas à tua situação com os simuladores gratuitos, com as taxas oficiais.
                  </p>
                  <Link
                    href="/#calculadora"
                    className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
                  >
                    <Megaphone size={13} /> Abrir simuladores
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            </aside>

            {/* Conteúdo principal. O rodapé editorial (ferramentas, guias
                relacionados, fontes, histórico e aviso) é responsabilidade do
                `GuiaLayout` de cada página — assim nunca fica um Guia sem ele. */}
            <main className="min-w-0 flex-1"><MotionProvider>{children}</MotionProvider></main>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
