"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight } from "@/components/ui/Icons";

export default function QuizFiscalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-cream dark:bg-stone-950">
        <nav
          aria-label="Localizacao"
          className="mx-auto flex max-w-4xl items-center gap-1.5 px-4 pt-6 text-xs text-stone-400"
        >
          <Link href="/" className="transition-colors hover:text-stone-600 dark:hover:text-stone-300">
            Inicio
          </Link>
          <ChevronRight size={12} />
          <span className="text-stone-600 dark:text-stone-300">Quiz Fiscal</span>
        </nav>
        {children}
      </div>
      <Footer />
    </>
  );
}
