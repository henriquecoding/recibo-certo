"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { Logo, Menu, Close, ArrowRight } from "@/components/ui/Icons";
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

  useEffect(() => { setOpen(false); }, [pathname]);

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
        className={`sticky top-0 z-50 px-6 py-3.5 transition-all duration-300 ${
          scrolled || open
            ? "border-b border-stone-100 bg-cream/95 shadow-card backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/95"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" aria-label="ReciboCerto — início">
            <Logo />
          </a>

          <div className="flex items-center gap-1">
            {/* Links desktop */}
            <div className="hidden items-center gap-1 sm:flex">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive(l.href)
                      ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="ml-2 hidden items-center gap-2 sm:flex">
              <ThemeToggle />
              <m.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/dashboard"
                  className="btn-shine inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
                >
                  Abrir dashboard
                  <ArrowRight size={13} />
                </Link>
              </m.div>
            </div>

            {/* Mobile: theme + hamburger */}
            <div className="flex items-center gap-1 sm:hidden">
              <ThemeToggle />
              <button
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Fechar menu" : "Abrir menu"}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                {open ? <Close size={20} /> : <Menu size={20} />}
              </button>
            </div>
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
            className="fixed inset-x-0 top-[57px] z-40 border-b border-stone-100 bg-cream/98 px-5 pb-5 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/98 sm:hidden"
          >
            <nav className="flex flex-col gap-1 pt-3">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(l.href)
                      ? "bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                      : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                <Link
                  href="/dashboard"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow"
                >
                  Abrir dashboard
                  <ArrowRight size={13} />
                </Link>
              </div>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
