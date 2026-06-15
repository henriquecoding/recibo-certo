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
  FileSign,
  Briefcase,
  ShieldCheck,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { AuthProvider, useAuth } from "@/lib/supabase/auth";
import { SubscricaoProvider } from "@/lib/stripe/subscription";
import { verificarAdmin } from "@/lib/supabase/admin";
import AccountBox from "@/components/dashboard/AccountBox";
import type { ComponentType, ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Visão geral", short: "Início", icon: LayoutGrid },
  { href: "/dashboard/recibos", label: "Recibos", short: "Recibos", icon: Receipt },
  { href: "/dashboard/receitas", label: "Receitas", short: "Receitas", icon: History },
  { href: "/dashboard/prazos", label: "Prazos fiscais", short: "Prazos", icon: Calendar },
  { href: "/dashboard/simulador", label: "Simulador IRS", short: "IRS", icon: Calculator },
];

const NAV_RECURSOS: NavItem[] = [
  { href: "/guias", label: "Guias fiscais", short: "Guias", icon: FileSign },
  { href: "/ferramentas", label: "Ferramentas", short: "Tools", icon: Briefcase },
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
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthProvider>
      <SubscricaoProvider>
      <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[256px_1fr]">

        {/* ─── Sidebar (desktop) ─────────────────────────────────── */}
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-stone-100 bg-white lg:flex">

          {/* Logo */}
          <div className="flex-shrink-0 border-b border-stone-100 px-6 py-5">
            <Link href="/" aria-label="ReciboCerto — início">
              <Logo />
            </Link>
          </div>

          {/* Navegação principal */}
          <nav className="flex flex-1 flex-col overflow-y-auto px-3 pt-4 pb-2">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-stone-300">
              Menu
            </p>
            <ul className="flex flex-col gap-0.5">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-brand font-semibold text-white shadow-sm"
                          : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                      }`}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 mb-2">
              <div className="mx-3 border-t border-stone-100" />
            </div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-stone-300">
              Recursos
            </p>
            <ul className="flex flex-col gap-0.5">
              {NAV_RECURSOS.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-brand-light font-semibold text-brand-dark"
                          : "text-stone-400 hover:bg-stone-50 hover:text-stone-700"
                      }`}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom: conta + controlos */}
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
            <AdminLink mobile />
            <ThemeToggle />
            <Link
              href="/dashboard/conta"
              aria-label="Conta"
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

        {/* ─── Bottom nav (mobile) ───────────────────────────────── */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-stone-100 bg-white/95 backdrop-blur-xl lg:hidden"
          aria-label="Navegação principal"
        >
          {NAV.map((item) => {
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
        </nav>
      </div>
      </SubscricaoProvider>
    </AuthProvider>
  );
}
