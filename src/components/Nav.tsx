"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { BuscaTrigger } from "@/components/busca/BuscaTrigger";
import { Logo, ArrowRight, ChevronDown, User, Megaphone } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { EASE } from "@/lib/motion";
import { useAuth } from "@/lib/supabase/auth";
import {
  NAV_FERRAMENTAS as SUBMENU_FERRAMENTAS,
  NAV_APRENDER as SUBMENU_APRENDER,
} from "@/components/nav-config";
import { abrirFeedback } from "@/components/feedback/abrir";

export default function Nav() {
  const { abrirModal, disponivel, user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const pathname = usePathname();
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) { setAvatarUrl(""); return; }
    let ativo = true;
    // Carrega o leitor de perfil (que importa o SDK do Supabase) só quando há
    // sessão — mantém o SDK fora do bundle inicial das páginas públicas.
    import("@/lib/supabase/profile").then(({ obterPerfil }) =>
      obterPerfil(user.id).then((p) => { if (ativo) setAvatarUrl(p.avatarUrl); })
    );
    return () => { ativo = false; };
  }, [user]);

  useEffect(() => {
    setScrolled(window.scrollY > 8);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  function openDropdown() {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setDropdownOpen(true);
  }

  function closeDropdown() {
    dropdownTimeoutRef.current = setTimeout(() => setDropdownOpen(false), 150);
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return pathname === "/";
    return pathname.startsWith(href);
  }

  const isRecursosActive =
    pathname.startsWith("/guias") ||
    pathname.startsWith("/quiz-fiscal") ||
    pathname.startsWith("/ferramentas") ||
    pathname.startsWith("/dashboard/prazos") ||
    pathname.startsWith("/dashboard/classificar") ||
    pathname.startsWith("/dashboard/mapa");

  return (
    <>
      {/* Spacer — só no desktop. No telemóvel o cabeçalho vive em baixo
          (ChromeMobile), por isso aqui não reservamos espaço nem mostramos
          este header (evita o "duplo header" no telemóvel). */}
      <div className="hidden h-[72px] lg:block" aria-hidden />

      <nav
        className={`fixed inset-x-0 top-0 z-50 hidden transition-[border-color,background-color,box-shadow] duration-300 lg:block ${
          scrolled
            ? "border-b border-stone-200/60 bg-white/80 shadow-sm backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/80"
            : "border-b border-transparent bg-white/60 backdrop-blur-md dark:bg-stone-950/60"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:h-[72px] sm:px-6">
          {/* Logo */}
          <Link href="/" aria-label="ReciboCerto — início" className="flex-shrink-0">
            <Logo />
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden items-center gap-0.5 lg:flex">
            <NavLink href="/#calculadora" active={isActive("/#calculadora")}>
              Simuladores
            </NavLink>

            {/* Recursos Fiscais mega-dropdown */}
            <div
              className="relative"
              onMouseEnter={openDropdown}
              onMouseLeave={closeDropdown}
            >
              <button
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                  isRecursosActive || dropdownOpen
                    ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                }`}
              >
                Recursos Fiscais
                <m.span
                  animate={{ rotate: dropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="flex"
                >
                  <ChevronDown size={13} />
                </m.span>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <m.div
                    key="dropdown"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="absolute -left-4 top-full mt-2 grid w-[480px] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 shadow-float dark:border-stone-800 dark:bg-stone-800"
                  >
                    {/* Ferramentas */}
                    <div className="bg-white p-2 dark:bg-stone-900">
                      <p className="mb-1 px-3 pt-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        Ferramentas
                      </p>
                      {SUBMENU_FERRAMENTAS.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-start gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                            <item.Icon size={14} />
                          </span>
                          <span>
                            <span className="block text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                              {item.label}
                            </span>
                            <span className="block text-[11px] leading-snug text-stone-400">
                              {item.desc}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>

                    {/* Aprender */}
                    <div className="bg-white p-2 dark:bg-stone-900">
                      <p className="mb-1 px-3 pt-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        Aprender
                      </p>
                      {SUBMENU_APRENDER.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-start gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                            <item.Icon size={14} />
                          </span>
                          <span>
                            <span className="block text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                              {item.label}
                            </span>
                            <span className="block text-[11px] leading-snug text-stone-400">
                              {item.desc}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <NavLink href="/precos" active={isActive("/precos")}>
              Planos
            </NavLink>
          </div>

          {/* ── Desktop CTAs ── */}
          <div className="hidden items-center gap-2 lg:flex">
            <BuscaTrigger />

            <button
              type="button"
              onClick={() => abrirFeedback()}
              aria-label="Sugestões, erros e dúvidas"
              title="Sugestões, erros e dúvidas"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-brand dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <Megaphone size={17} />
            </button>

            <div className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-700" aria-hidden />

            <ThemeToggle />

            {user ? (
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center gap-2 rounded-xl bg-brand/10 py-1.5 pl-2 pr-3.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
              >
                <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-brand/15 transition-colors group-hover:bg-white/20">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" fill className="rounded-lg object-cover" sizes="28px" unoptimized />
                  ) : (
                    <User size={14} />
                  )}
                </span>
                Dashboard
              </Link>
            ) : disponivel ? (
              <>
                <button
                  type="button"
                  onClick={() => abrirModal("entrar")}
                  className="rounded-xl px-3.5 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                >
                  Entrar
                </button>
                <m.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                  <button
                    type="button"
                    onClick={() => abrirModal("criar")}
                    className="btn-shine inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
                  >
                    Começar Grátis
                    <ArrowRight size={13} />
                  </button>
                </m.div>
              </>
            ) : (
              <m.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/dashboard"
                  className="btn-shine inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
                >
                  Começar Grátis
                  <ArrowRight size={13} />
                </Link>
              </m.div>
            )}
          </div>

        </div>
      </nav>
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
          : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
      }`}
    >
      {children}
    </Link>
  );
}
