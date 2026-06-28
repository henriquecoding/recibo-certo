"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import {
  ChevronRight, Bank, Receipt, Calculator, ShieldCheck, Coin, User, Briefcase,
  Globe, FileSign, Wallet, Calendar, Clock, Building, Scale, Flag, Megaphone,
} from "@/components/ui/Icons";
import { generateBreadcrumbSchema } from "@/lib/seo";
import SimuladoresRelacionados from "@/components/guias/SimuladoresRelacionados";

type IconType = React.ComponentType<{ size?: number; className?: string }>;
type NavItem = { label: string; href: string; icon: IconType };

const INDEPENDENTES_NAV: NavItem[] = [
  { label: "Abrir atividade", href: "/guias/abrir-atividade", icon: Bank },
  { label: "Ato isolado", href: "/guias/ato-isolado", icon: Scale },
  { label: "Regime simplificado", href: "/guias/regime-simplificado", icon: Calculator },
  { label: "Despesas dedutíveis", href: "/guias/despesas-dedutiveis", icon: Coin },
  { label: "Contab. organizada", href: "/guias/contabilidade-organizada", icon: Scale },
  { label: "Retenção na fonte", href: "/guias/retencao-na-fonte", icon: ShieldCheck },
  { label: "Pagamentos por conta", href: "/guias/pagamentos-por-conta", icon: Calculator },
  { label: "IVA", href: "/guias/iva-recibos-verdes", icon: Coin },
  { label: "Segurança Social", href: "/guias/seguranca-social", icon: User },
  { label: "Acumulação c/ emprego", href: "/guias/acumulacao-emprego", icon: Briefcase },
  { label: "Clientes estrangeiros", href: "/guias/clientes-estrangeiros", icon: Globe },
  { label: "Cessar atividade", href: "/guias/cessar-atividade", icon: FileSign },
  { label: "Fatura vs recibo", href: "/guias/fatura-vs-recibo", icon: Receipt },
  { label: "Merchant of Record", href: "/guias/merchant-of-record", icon: Wallet },
];

const CONTA_OUTREM_NAV: NavItem[] = [
  { label: "Recibo de vencimento", href: "/guias/recibo-vencimento", icon: Receipt },
  { label: "Subsídios férias/Natal", href: "/guias/subsidios-ferias-natal", icon: Calendar },
  { label: "Trabalho suplementar", href: "/guias/trabalho-suplementar", icon: Clock },
];

const EMPRESAS_NAV: NavItem[] = [
  { label: "Abrir empresa", href: "/guias/abrir-empresa", icon: Building },
  { label: "Unipessoal vs. ENI", href: "/guias/unipessoal-vs-eni", icon: Building },
  { label: "IRC para PME", href: "/guias/irc", icon: Calculator },
  { label: "Tributação autónoma", href: "/guias/tributacao-autonoma", icon: Scale },
];

const TRANSVERSAL_NAV: NavItem[] = [
  { label: "Calendário fiscal", href: "/guias/calendario-fiscal", icon: Calendar },
  { label: "Escalões IRS", href: "/guias/escaloes-irs", icon: Calculator },
  { label: "IRS Jovem", href: "/guias/irs-jovem", icon: Flag },
  { label: "IFICI / NHR 2.0", href: "/guias/ifici-nhr", icon: Flag },
  { label: "Deduções à coleta", href: "/guias/deducoes-coleta", icon: Coin },
  { label: "Mais-valias", href: "/guias/mais-valias", icon: Coin },
  { label: "Tributação conjunta", href: "/guias/tributacao-conjunta", icon: User },
  { label: "Reembolso de IRS", href: "/guias/reembolso-irs", icon: Wallet },
];

const ALL_GUIAS = [...INDEPENDENTES_NAV, ...CONTA_OUTREM_NAV, ...EMPRESAS_NAV, ...TRANSVERSAL_NAV];

const SIDEBAR_SECTIONS = [
  { titulo: "Independentes", items: INDEPENDENTES_NAV },
  { titulo: "Conta de outrem", items: CONTA_OUTREM_NAV },
  { titulo: "Empresas", items: EMPRESAS_NAV },
  { titulo: "Transversal", items: TRANSVERSAL_NAV },
];

function SidebarSection({ titulo, items, pathname }: { titulo: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 px-3">
        <span className="h-px w-4 bg-brand/40" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">{titulo}</p>
      </div>
      <nav className="space-y-0.5">
        {items.map((g) => {
          const active = pathname === g.href;
          const Icon = g.icon;
          return (
            <Link
              key={g.href}
              href={g.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand font-semibold text-white shadow-card"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              }`}
            >
              <Icon size={15} className={active ? "text-white" : "text-stone-400 group-hover:text-brand"} />
              <span className="flex-1 truncate">{g.label}</span>
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

  const guiaAtivo = ALL_GUIAS.find((g) => g.href === pathname);
  const naIndex = pathname === "/guias";
  const slug = pathname.startsWith("/guias/") ? pathname.slice("/guias/".length) : "";

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
        <div className="mx-auto max-w-6xl px-6 py-8">
          {/* Breadcrumb */}
          <nav aria-label="Localização" className="mb-6 flex items-center gap-1.5 text-xs text-stone-400">
            <Link href="/" className="transition-colors hover:text-stone-600 dark:hover:text-stone-300">Início</Link>
            <ChevronRight size={12} />
            <Link href="/guias" className="transition-colors hover:text-stone-600 dark:hover:text-stone-300">Guias</Link>
            {guiaAtivo && (
              <>
                <ChevronRight size={12} />
                <span className="text-stone-600 dark:text-stone-300">{guiaAtivo.label}</span>
              </>
            )}
          </nav>

          <div className="flex gap-10">
            {/* Sidebar — oculto em mobile */}
            <aside className="hidden w-60 flex-shrink-0 lg:block">
              <div className="sticky top-24">
                {SIDEBAR_SECTIONS.map((s) => (
                  <SidebarSection key={s.titulo} titulo={s.titulo} items={s.items} pathname={pathname} />
                ))}

                {/* Cartão de ajuda */}
                <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-900">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Precisa de ajuda?</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    Faz as contas à tua situação com os nossos simuladores gratuitos, com taxas oficiais de 2026.
                  </p>
                  <Link
                    href="/dashboard/simulador"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
                  >
                    <Megaphone size={13} /> Abrir simuladores
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            </aside>

            {/* Conteúdo principal */}
            <main className="min-w-0 flex-1">
              {children}
              {!naIndex && slug && <SimuladoresRelacionados slug={slug} />}
            </main>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
