"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { Logo, Menu, Close } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { EASE } from "@/lib/motion";

const LINKS = [
  { label: "Calculadora", href: "/#calculadora" },
  { label: "Guias", href: "/guias" },
  { label: "Ferramentas", href: "/ferramentas" },
  { label: "Preços", href: "/precos" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fecha menu ao navegar
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloqueia scroll quando menu aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      <m.nav
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className={`sticky top-0 z-50 px-6 py-4 transition-all duration-300 ${
          scrolled || open
            ? "border-b border-stone-100 dark:border-stone-800 bg-cream/95 dark:bg-stone-950/95 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" aria-label="ReciboCerto — início">
            <Logo />
          </a>

          <div className="flex items-center gap-6">
            {/* Links desktop */}
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`group relative hidden text-sm transition-colors sm:block ${
                  isActive(l.href)
                    ? "font-semibold text-brand"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                {l.label}
                <span
                  className={`absolute -bottom-1 left-0 h-px bg-brand transition-all duration-300 ${
                    isActive(l.href) ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            ))}

            <ThemeToggle />

            {/* CTA — desktop */}
            <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="hidden sm:block">
              <Link
                href="/dashboard"
                className="btn-shine inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
              >
                Abrir dashboard
              </Link>
            </m.div>

            {/* Botão hamburger — mobile */}
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              className="flex items-center justify-center rounded-xl p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors sm:hidden"
            >
              {open ? <Close size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </m.nav>

      {/* Drawer mobile */}
      <AnimatePresence>
        {open && (
          <m.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="fixed inset-x-0 top-[65px] z-40 border-b border-stone-100 dark:border-stone-800 bg-cream/98 dark:bg-stone-950/98 backdrop-blur-xl px-6 pb-6 sm:hidden"
          >
            <nav className="flex flex-col gap-1 pt-4">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(l.href)
                      ? "bg-brand/8 text-brand font-semibold"
                      : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                <Link
                  href="/dashboard"
                  className="flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow"
                >
                  Abrir dashboard
                </Link>
              </div>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
