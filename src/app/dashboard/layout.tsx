"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Logo,
  LayoutGrid,
  Receipt,
  History,
  Calendar,
  Calculator,
  ArrowLeft,
  User,
  Briefcase,
  ShieldCheck,
  Wallet,
  Building,
  Scale,
  Gauge,
  Swap,
  Search,
  MapPin,
  ShoppingBag,
  BookOpen,
  Trophy,
  Star,
  Menu,
  Close,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/supabase/auth";
import { SubscricaoProvider } from "@/lib/stripe/subscription";
import { verificarAdmin } from "@/lib/supabase/admin";
import AccountBox from "@/components/dashboard/AccountBox";
import { BuscaTrigger } from "@/components/busca/BuscaGlobal";
import type { ComponentType, ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  /** Link para fora do shell do dashboard (página de marketing/ferramenta). */
  externo?: boolean;
}
interface NavGroup {
  titulo: string;
  itens: NavItem[];
}

// ── Modelo de navegação único (cobre TODO o site) ─────────────────────────
// Usado pela sidebar (desktop) e pelo menu completo (telemóvel) → paridade.
const GRUPOS: NavGroup[] = [
  {
    titulo: "Gestão",
    itens: [
      { href: "/dashboard", label: "Visão geral", short: "Início", icon: LayoutGrid },
      { href: "/dashboard/recibos", label: "Recibos", short: "Recibos", icon: Receipt },
      { href: "/dashboard/receitas", label: "Receitas", short: "Receitas", icon: History },
      { href: "/dashboard/prazos", label: "Prazos fiscais", short: "Prazos", icon: Calendar },
    ],
  },
  {
    titulo: "Simuladores",
    itens: [
      { href: "/dashboard/simulador", label: "Simulador de IRS", short: "IRS", icon: Calculator },
      { href: "/dashboard/recibo-vencimento", label: "Recibo de vencimento", short: "Vencimento", icon: Wallet },
      { href: "/dashboard/empresa", label: "Abrir empresa", short: "Empresa", icon: Building },
      { href: "/dashboard/comparar", label: "Comparar cenários", short: "Comparar", icon: Scale },
      { href: "/dashboard/regime-simplificado", label: "Regime simplificado", short: "Simplificado", icon: Gauge },
      { href: "/dashboard/ato-isolado", label: "Ato isolado ou atividade", short: "Ato isolado", icon: Swap },
    ],
  },
  {
    titulo: "Ferramentas",
    itens: [
      { href: "/dashboard/auditoria-recibo", label: "Auditoria do recibo", short: "Auditoria", icon: ShieldCheck },
      { href: "/dashboard/classificar-atividade", label: "Classificar atividade", short: "Atividade", icon: Search },
      { href: "/dashboard/mapa-contabilistas", label: "Mapa de contabilistas", short: "Mapa", icon: MapPin },
      { href: "/ferramentas/payout-mor", label: "Recibo Merchant of Record", short: "Payout", icon: ShoppingBag, externo: true },
      { href: "/ferramentas", label: "Todas as ferramentas", short: "Tools", icon: Briefcase, externo: true },
    ],
  },
  {
    titulo: "Aprender",
    itens: [
      { href: "/guias", label: "Guias fiscais", short: "Guias", icon: BookOpen, externo: true },
      { href: "/quiz-fiscal", label: "Quiz Fiscal", short: "Quiz", icon: Trophy, externo: true },
    ],
  },
  {
    titulo: "Conta",
    itens: [
      { href: "/dashboard/perfil", label: "O meu perfil", short: "Perfil", icon: User },
      { href: "/dashboard/conta", label: "A minha conta", short: "Conta", icon: ShieldCheck },
      { href: "/dashboard/upgrade", label: "Plano e subscrição", short: "Plano", icon: Star },
    ],
  },
];

// Itens primários da barra inferior (telemóvel). O 5.º slot é o botão "Menu".
const PRIMARIOS: NavItem[] = [
  { href: "/dashboard", label: "Visão geral", short: "Início", icon: LayoutGrid },
  { href: "/dashboard/recibos", label: "Recibos", short: "Recibos", icon: Receipt },
  { href: "/dashboard/prazos", label: "Prazos fiscais", short: "Prazos", icon: Calendar },
  { href: "/dashboard/perfil", label: "O meu perfil", short: "Perfil", icon: User },
];

function AdminLink({ mobile }: { mobile?: boolean }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    verificarAdmin(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user]);

  if (!isAdmin) return null;

  if (mobile) {
    return (
      <Link
        href="/admin"
        aria-label="Painel de administração"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white"
      >
        <ShieldCheck size={16} />
      </Link>
    );
  }
  return null;
}

function isActive(pathname: string, href: string): boolean {
  if (!href.startsWith("/dashboard")) return false;
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

/** Item de navegação (linha) — partilhado pela sidebar e pelo menu móvel. */
function NavLink({
  item,
  active,
  onNavigate,
  variante = "menu",
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  variante?: "menu" | "recurso";
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-brand font-semibold text-white shadow-sm"
          : variante === "recurso"
            ? "text-stone-400 hover:bg-stone-50 hover:text-stone-700 dark:hover:bg-stone-800/60"
            : "text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:hover:bg-stone-800/60"
      }`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.externo && !active && <ArrowLeft size={13} className="flex-shrink-0 -rotate-[135deg] text-stone-300" aria-hidden />}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  // Fecha o menu ao mudar de rota.
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  // ESC fecha + bloqueia o scroll do corpo enquanto o menu está aberto.
  useEffect(() => {
    if (!menuAberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuAberto]);

  return (
    <SubscricaoProvider>
      <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[256px_1fr]">

        {/* ─── Sidebar (desktop) ─────────────────────────────────── */}
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-stone-100 bg-white lg:flex">
          <div className="flex-shrink-0 border-b border-stone-100 px-6 py-5">
            <Link href="/" aria-label="ReciboCerto — início">
              <Logo />
            </Link>
          </div>

          <div className="flex-shrink-0 px-3 pt-3">
            <BuscaTrigger />
          </div>

          <nav className="flex flex-1 flex-col overflow-y-auto px-3 pt-4 pb-2">
            {GRUPOS.slice(0, 4).map((grupo) => (
              <div key={grupo.titulo} className="mb-3">
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-stone-300">
                  {grupo.titulo}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {grupo.itens.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        active={isActive(pathname, item.href)}
                        variante={grupo.titulo === "Gestão" ? "menu" : "recurso"}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="flex-shrink-0 space-y-3 border-t border-stone-100 px-3 py-4">
            <AccountBox />
            <div className="flex items-center justify-between px-1">
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-700"
              >
                <ArrowLeft size={12} />
                Voltar ao site
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        {/* ─── Top bar (mobile) ───────────────────────────────────── */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-stone-100 bg-cream/85 px-5 py-3.5 backdrop-blur-xl lg:hidden">
          <Link href="/" aria-label="ReciboCerto — início">
            <Logo small />
          </Link>
          <div className="flex items-center gap-2">
            <BuscaTrigger compacto />
            <AdminLink mobile />
            <ThemeToggle />
            <Link
              href="/dashboard/perfil"
              aria-label="Perfil"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white"
            >
              <User size={16} />
            </Link>
          </div>
        </header>

        {/* ─── Conteúdo ─────────────────────────────────────────── */}
        <main className="min-h-screen p-5 pb-24 sm:p-6 lg:p-10 lg:pb-10">
          {children}
        </main>

        {/* ─── Bottom nav (mobile): 4 primários + Menu ───────────── */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-stone-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
          aria-label="Navegação principal"
        >
          {PRIMARIOS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-brand" : "text-stone-400 hover:text-stone-600"
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${active ? "bg-brand/10" : ""}`}>
                  <Icon size={19} />
                </span>
                {item.short}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-haspopup="dialog"
            aria-expanded={menuAberto}
            aria-label="Abrir menu completo"
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${menuAberto ? "text-brand" : "text-stone-400 hover:text-stone-600"}`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${menuAberto ? "bg-brand/10" : ""}`}>
              <Menu size={19} />
            </span>
            Menu
          </button>
        </nav>

        {/* ─── Menu completo (mobile) — folha inferior com TODOS os recursos ─── */}
        {menuAberto && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu completo">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMenuAberto(false)}
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-4xl bg-cream shadow-float">
              <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand"><Menu size={16} /></span>
                  <p className="text-sm font-semibold text-stone-800">Tudo o que tens</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuAberto(false)}
                  aria-label="Fechar menu"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <Close size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {GRUPOS.map((grupo) => (
                  <div key={grupo.titulo}>
                    <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                      {grupo.titulo}
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {grupo.itens.map((item) => (
                        <li key={item.href}>
                          <NavLink
                            item={item}
                            active={isActive(pathname, item.href)}
                            onNavigate={() => setMenuAberto(false)}
                            variante={grupo.titulo === "Gestão" ? "menu" : "recurso"}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-2xl border border-stone-100 bg-white px-4 py-3">
                  <Link href="/" onClick={() => setMenuAberto(false)} className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                    <ArrowLeft size={13} /> Voltar ao site
                  </Link>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SubscricaoProvider>
  );
}
