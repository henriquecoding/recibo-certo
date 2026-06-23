"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { BuscaTrigger } from "@/components/busca/BuscaGlobal";
import {
  Logo,
  Menu,
  Close,
  ArrowRight,
  ChevronDown,
  BookOpen,
  BellAlert,
  Sparkle,
  User,
  LayoutGrid,
  Calculator,
  Search,
  MapPin,
  Trophy,
  Briefcase,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { EASE } from "@/lib/motion";
import { useAuth } from "@/lib/supabase/auth";
import { obterPerfil } from "@/lib/supabase/profile";

const SUBMENU_FERRAMENTAS = [
  {
    label: "Simuladores",
    desc: "IRS, recibos verdes, vencimento e empresa.",
    href: "/dashboard/simulador",
    Icon: Calculator,
  },
  {
    label: "Classificar atividade",
    desc: "Retenção, coeficiente e SS por profissão.",
    href: "/dashboard/classificar-atividade",
    Icon: Search,
  },
  {
    label: "Mapa de contabilistas",
    desc: "Preço médio por região, num mapa.",
    href: "/dashboard/mapa-contabilistas",
    Icon: MapPin,
  },
  {
    label: "Todas as ferramentas",
    desc: "12 simuladores e ferramentas num só sítio.",
    href: "/ferramentas",
    Icon: Briefcase,
  },
];

const SUBMENU_APRENDER = [
  {
    label: "Simulador de IRS",
    desc: "Página dedicada: calcula o teu IRS anual de 2026.",
    href: "/ferramentas/simulador-irs",
    Icon: Calculator,
  },
  {
    label: "Guias fiscais",
    desc: "Passo a passo para cada obrigação.",
    href: "/guias",
    Icon: BookOpen,
  },
  {
    label: "Quiz Fiscal",
    desc: "Testa os teus conhecimentos com base legal.",
    href: "/quiz-fiscal",
    Icon: Trophy,
  },
  {
    label: "Alertas de prazos",
    desc: "Nunca mais percas uma data fiscal.",
    href: "/dashboard/prazos",
    Icon: BellAlert,
  },
];

export default function Nav() {
  const { abrirModal, disponivel, user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [recursosOpen, setRecursosOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const pathname = usePathname();
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) { setAvatarUrl(""); return; }
    obterPerfil(user.id).then((p) => setAvatarUrl(p.avatarUrl));
  }, [user]);

  useEffect(() => {
    setScrolled(window.scrollY > 8);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setRecursosOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
      {/* Spacer */}
      <div className="h-14 sm:h-[72px]" aria-hidden />

      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-[border-color,background-color,box-shadow] duration-300 ${
          scrolled || open
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

          {/* ── Mobile: pesquisa + tema + hambúrguer ── */}
          <div className="flex items-center gap-1 lg:hidden">
            <BuscaTrigger compacto />
            <ThemeToggle />
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <AnimatePresence mode="wait" initial={false}>
                {open ? (
                  <m.span
                    key="close"
                    initial={{ opacity: 0, rotate: -45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                    className="flex"
                  >
                    <Close size={22} />
                  </m.span>
                ) : (
                  <m.span
                    key="menu"
                    initial={{ opacity: 0, rotate: 45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -45 }}
                    transition={{ duration: 0.15 }}
                    className="flex"
                  >
                    <Menu size={22} />
                  </m.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {open && (
          <m.div
            key="mobile-menu"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-y-0 right-0 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto border-l border-stone-100 bg-white/98 pb-8 pt-14 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/98 lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 pt-4">
              <Link
                href="/#calculadora"
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive("/#calculadora")
                    ? "bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                    : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                Simuladores
              </Link>

              {/* Recursos Fiscais expansível */}
              <div>
                <button
                  onClick={() => setRecursosOpen((o) => !o)}
                  aria-expanded={recursosOpen}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                    isRecursosActive
                      ? "bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                      : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                  }`}
                >
                  Recursos Fiscais
                  <m.span
                    animate={{ rotate: recursosOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="flex"
                  >
                    <ChevronDown size={16} />
                  </m.span>
                </button>

                <AnimatePresence>
                  {recursosOpen && (
                    <m.div
                      key="recursos-sub"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="ml-2 mt-1 flex flex-col gap-0.5">
                        <p className="px-4 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          Ferramentas
                        </p>
                        {SUBMENU_FERRAMENTAS.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                          >
                            <span className="shrink-0 text-brand">
                              <item.Icon size={15} />
                            </span>
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        ))}
                        <p className="px-4 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          Aprender
                        </p>
                        {SUBMENU_APRENDER.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                          >
                            <span className="shrink-0 text-brand">
                              <item.Icon size={15} />
                            </span>
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/precos"
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive("/precos")
                    ? "bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                    : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                Planos
              </Link>

              <div className="mt-4 flex flex-col gap-2.5 border-t border-stone-100 pt-4 dark:border-stone-800">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="flex w-full items-center gap-3 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow"
                  >
                    <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/20">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="" fill className="rounded-xl object-cover" sizes="32px" unoptimized />
                      ) : (
                        <User size={15} />
                      )}
                    </span>
                    Dashboard
                  </Link>
                ) : disponivel ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); abrirModal("entrar"); }}
                      className="flex w-full items-center justify-center rounded-2xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); abrirModal("criar"); }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow"
                    >
                      Começar Grátis
                      <ArrowRight size={13} />
                    </button>
                  </>
                ) : (
                  <Link
                    href="/dashboard"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow"
                  >
                    Começar Grátis
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
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
