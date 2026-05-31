"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, LayoutGrid, Receipt, History, Calendar, Calculator, ArrowLeft, User } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { AuthProvider } from "@/lib/supabase/auth";
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

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthProvider>
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[264px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="border-b border-stone-100 p-6">
          <Link href="/" aria-label="ReciboCerto — início">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 p-4">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      active ? "bg-brand-light text-brand-dark" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-stone-100 p-4">
          <AccountBox />
          <div className="mt-3 flex items-center justify-between px-1">
            <Link href="/" className="flex items-center gap-2 px-2.5 text-xs text-stone-400 transition-colors hover:text-stone-700">
              <ArrowLeft size={12} />
              Voltar ao site
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-stone-100 bg-cream/85 px-5 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/" aria-label="ReciboCerto — início">
          <Logo small />
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/dashboard/conta"
            aria-label="Conta na nuvem"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white"
          >
            <User size={15} />
            Conta
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="min-h-screen p-5 pb-24 sm:p-6 lg:p-10 lg:pb-10">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-stone-100 bg-white/95 backdrop-blur-xl lg:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-brand" : "text-stone-400"
              }`}
            >
              <Icon size={20} />
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
    </AuthProvider>
  );
}
