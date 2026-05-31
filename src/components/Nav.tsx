"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { Logo } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { EASE } from "@/lib/motion";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <m.nav
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`sticky top-0 z-50 px-6 py-4 transition-all duration-300 ${
        scrolled ? "border-b border-stone-100 bg-cream/85 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <a href="#top" aria-label="ReciboCerto — início">
          <Logo />
        </a>
        <div className="flex items-center gap-6">
          {[
            { label: "Calculadora", href: "/#calculadora" },
            { label: "Fontes", href: "/#fontes" },
            { label: "Preços", href: "/precos" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative hidden text-sm text-stone-500 transition-colors hover:text-stone-800 sm:block"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-brand transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          <ThemeToggle />
          <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/dashboard"
              className="btn-shine inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
            >
              Abrir dashboard
            </Link>
          </m.div>
        </div>
      </div>
    </m.nav>
  );
}
