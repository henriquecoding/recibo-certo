"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/supabase/auth";
import { verificarAdmin } from "@/lib/supabase/admin";
import { CheckTrend, LayoutGrid, Megaphone, ArrowLeft, BellAlert, ShieldCheck } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutGrid },
  { href: "/admin/anuncios", label: "Anúncios", icon: Megaphone },
  { href: "/admin/waitlist", label: "Lista de espera", icon: BellAlert },
  { href: "/admin/auditoria", label: "Auditoria fiscal", icon: ShieldCheck },
];

function AdminGuard({ children }: { children: ReactNode }) {
  const { user, carregado, sair } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  const [adminVerificado, setAdminVerificado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    if (isLoginPage) { setVerificando(false); return; }
    if (!carregado) return;

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    verificarAdmin(user.id).then((ok) => {
      if (!ok) {
        sair();
        router.replace("/admin/login");
      } else {
        setAdminVerificado(true);
      }
      setVerificando(false);
    });
  }, [carregado, user, isLoginPage, router, sair]);

  if (isLoginPage) return <>{children}</>;

  if (verificando || !adminVerificado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-pulse rounded-full bg-brand-light" />
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function AdminLayout({ children }: { children: ReactNode }) {
  const { user, sair } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="border-b border-stone-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand">
              <CheckTrend size={14} className="text-white" />
            </div>
            <div>
              <div className="font-display text-sm font-semibold text-stone-800">
                Recibo<span className="text-brand">Certo</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Admin
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3">
          <ul className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active ? "bg-brand-light text-brand-dark" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                    }`}
                  >
                    <Icon size={17} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-stone-100 p-3 space-y-1">
          {user && (
            <p className="truncate px-3 py-1 text-[11px] text-stone-400" title={user.email ?? ""}>
              {user.email}
            </p>
          )}
          <button
            type="button"
            onClick={sair}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-500 transition-all hover:bg-stone-50 hover:text-stone-800"
          >
            <ArrowLeft size={16} />
            Sair
          </button>
          <div className="flex items-center justify-between px-3">
            <Link href="/" className="text-xs text-stone-400 transition-colors hover:text-stone-600">
              Ver site público
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-stone-100 bg-cream/85 px-5 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
            <CheckTrend size={12} className="text-white" />
          </div>
          <span className="font-display text-sm font-semibold text-stone-800">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={sair}
            className="text-xs font-medium text-stone-500 transition-colors hover:text-stone-800"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-stone-100 bg-white/95 backdrop-blur-xl lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-brand" : "text-stone-400"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      <main className="min-h-screen p-5 pb-24 sm:p-6 lg:p-8 lg:pb-8">{children}</main>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}
