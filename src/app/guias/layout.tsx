"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight } from "@/components/ui/Icons";
import { generateBreadcrumbSchema } from "@/lib/seo";

const GUIAS_NAV = [
  { label: "Abrir atividade", href: "/guias/abrir-atividade" },
  { label: "Ato isolado", href: "/guias/ato-isolado" },
  { label: "Regime simplificado", href: "/guias/regime-simplificado" },
  { label: "Retenção na fonte", href: "/guias/retencao-na-fonte" },
  { label: "IVA", href: "/guias/iva-recibos-verdes" },
  { label: "Segurança Social", href: "/guias/seguranca-social" },
  { label: "IRS Jovem", href: "/guias/irs-jovem" },
  { label: "Escalões IRS", href: "/guias/escaloes-irs" },
  { label: "Acumulação c/ emprego", href: "/guias/acumulacao-emprego" },
  { label: "Clientes estrangeiros", href: "/guias/clientes-estrangeiros" },
  { label: "Cessar atividade", href: "/guias/cessar-atividade" },
  { label: "Deduções à coleta", href: "/guias/deducoes-coleta" },
  { label: "Fatura vs recibo", href: "/guias/fatura-vs-recibo" },
  { label: "Merchant of Record", href: "/guias/merchant-of-record" },
];

const FERRAMENTAS_NAV = [
  { label: "Ato isolado ou atividade?", href: "/ferramentas/ato-isolado" },
  { label: "Calculadora IRS", href: "/ferramentas/regime-simplificado" },
  { label: "Classificar atividade", href: "/ferramentas/classificar-atividade" },
];

export default function GuiasLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Breadcrumb: guia ativo
  const guiaAtivo = GUIAS_NAV.find((g) => g.href === pathname);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Início", url: "/" },
    { name: "Guias", url: "/guias" },
    ...(guiaAtivo ? [{ name: guiaAtivo.label, url: guiaAtivo.href }] : []),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Nav />
      <div className="min-h-screen bg-cream dark:bg-stone-950">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {/* Breadcrumb */}
          <nav aria-label="Localização" className="mb-8 flex items-center gap-1.5 text-xs text-stone-400">
            <Link href="/" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Início</Link>
            <ChevronRight size={12} />
            <Link href="/guias" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Guias</Link>
            {guiaAtivo && (
              <>
                <ChevronRight size={12} />
                <span className="text-stone-600 dark:text-stone-300">{guiaAtivo.label}</span>
              </>
            )}
          </nav>

          <div className="flex gap-12">
            {/* Sidebar — oculto em mobile */}
            <aside className="hidden lg:block w-52 flex-shrink-0">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                Todos os guias
              </p>
              <nav className="space-y-0.5">
                {GUIAS_NAV.map((g) => {
                  const active = pathname === g.href;
                  return (
                    <Link
                      key={g.href}
                      href={g.href}
                      className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-brand/8 text-brand font-semibold"
                          : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-100"
                      }`}
                    >
                      {g.label}
                    </Link>
                  );
                })}
              </nav>

              <p className="mt-6 text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                Ferramentas
              </p>
              <nav className="space-y-0.5">
                {FERRAMENTAS_NAV.map((g) => (
                  <Link
                    key={g.href}
                    href={g.href}
                    className="block rounded-xl px-3 py-2 text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-100 transition-colors"
                  >
                    {g.label}
                  </Link>
                ))}
              </nav>
            </aside>

            {/* Conteúdo principal */}
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
