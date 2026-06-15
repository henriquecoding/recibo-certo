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
      <div className="min-h-screen bg-quiz-parchment dark:bg-quiz-forest">
        <nav
          aria-label="Localizacao"
          className="mx-auto flex max-w-5xl items-center gap-1.5 px-4 pt-6 text-xs text-quiz-sage dark:text-quiz-sage"
        >
          <Link href="/" className="transition-colors hover:text-quiz-forest-deep dark:hover:text-quiz-parchment-border">
            Inicio
          </Link>
          <ChevronRight size={12} />
          <span className="text-quiz-forest-deep dark:text-quiz-parchment">Quiz Fiscal</span>
        </nav>
        {children}
      </div>
      <Footer />
    </>
  );
}
