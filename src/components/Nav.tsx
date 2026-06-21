"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { EASE } from "@/lib/motion";
import { useAuth } from "@/lib/supabase/auth";

const SUBMENU_RECURSOS = [
  {
    label: "Guias de Atividade",
    desc: "Aprenda a gerir as suas obrigações fiscais passo a passo.",
    href: "/guias",
    Icon: BookOpen,
  },
  {
    label: "Quiz Fiscal",
    desc: "Teste a sua isenção de IVA e perceba que taxas se aplicam.",
    href: "/quiz-fiscal",
    Icon: Sparkle,
  },
  {
    label: "Alertas de Prazos",
    desc: "Evite coimas e saiba quando entregar a declaração.",
    href: "/dashboard/prazos",
    Icon: BellAlert,
  },
];

export default function Nav() {
  const { abrirModal, disponivel, user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [open, setOpen] = useState(false);
  const [recursosOpen, setRecursosOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const lastScrollY = useRef(0);
  const openRef = useRef(false);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    setScrolled(window.scrollY > 8);

    const onScroll = () => {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;

      setScrolled(current > 8);

      if (Math.abs(delta) >= 15) {
        if (delta > 0 && current > 80 && !openRef.current) {
          setVisible(false);
          setDropdownOpen(false);
        } else if (delta < 0) {
          setVisible(true);
        }
        lastScrollY.current = current;
      }
    };

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
    return () => {
      document.body.style.overflow = "";
    };
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
    pathname.startsWith("/dashboard/prazos");

  return (
    <>
      {/* Spacer — compensa o header fixed (desktop; no telemóvel o chrome é inferior) */}
      <div className="hidden lg:block lg:h-[72px]" aria-hidden />

      <m.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: visible ? 0 : "-100%", opacity: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        className={`fixed inset-x-0 top-0 z-50 hidden px-6 transition-[border-color,background-color,box-shadow] duration-300 lg:block ${
          scrolled || open
            ? "border-b border-stone-100 bg-cream/95 shadow-card backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/95"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between sm:h-[72px]">
          {/* Logótipo */}
          <a href="/" aria-label="ReciboCerto — início">
            <Logo />
          </a>

          {/* Links desktop */}
          <div className="hidden items-center gap-0.5 sm:flex">
            <Link
              href="/#calculadora"
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive("/#calculadora")
                  ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              }`}
            >
              Simulador
            </Link>

            {/* Recursos Fiscais com submenu */}
            <div
              className="relative"
              onMouseEnter={openDropdown}
              onMouseLeave={closeDropdown}
            >
              <button
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                  isRecursosActive
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
                  <ChevronDown size={14} />
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
                    className="absolute left-0 top-full mt-1.5 w-72 rounded-2xl border border-stone-100 bg-white p-1.5 shadow-float dark:border-stone-800 dark:bg-stone-900"
                  >
                    {SUBMENU_RECURSOS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                      >
                        <span className="mt-0.5 shrink-0 text-brand">
                          <item.Icon size={16} />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-stone-800 dark:text-stone-100">
                            {item.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                            {item.desc}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/precos"
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive("/precos")
                  ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              }`}
            >
              Planos
            </Link>
          </div>

          {/* CTAs desktop */}
          <div className="hidden items-center gap-2 sm:flex">
            <BuscaTrigger />
            <ThemeToggle />

            {/* Botão perfil — sempre visível */}
            <Link
              href="/dashboard/perfil"
              aria-label="O meu perfil"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              <User size={18} />
            </Link>

            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand/10 px-3.5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
              >
                <LayoutGrid size={15} />
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

          {/* Mobile: pesquisa + tema + hambúrguer */}
          <div className="flex items-center gap-1 sm:hidden">
            <BuscaTrigger compacto />
            <ThemeToggle />
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              className="flex h-12 w-12 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
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
      </m.nav>

      {/* Drawer mobile — desliza da direita */}
      <AnimatePresence>
        {open && (
          <m.div
            key="mobile-menu"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-y-0 right-0 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto border-l border-stone-100 bg-cream/98 pb-8 pt-14 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/98 sm:hidden"
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
                Simulador
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
                        {SUBMENU_RECURSOS.map((item) => (
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
                    className="flex w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow"
                  >
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
