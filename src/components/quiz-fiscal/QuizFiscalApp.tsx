"use client";

import Link from "next/link";
import { useQuizFiscal } from "@/hooks/useQuizFiscal";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight } from "@/components/ui/Icons";
import SelecaoModo from "./SelecaoModo";
import QuizNormal from "./QuizNormal";
import QuizGuiado from "./QuizGuiado";
import Resultado from "./Resultado";

export default function QuizFiscalApp() {
  const quiz = useQuizFiscal();

  if (quiz.status === "jogando") {
    if (quiz.config?.modo === "guiado") {
      return <QuizGuiado quiz={quiz} onSair={quiz.reiniciar} />;
    }
    return <QuizNormal quiz={quiz} onSair={quiz.reiniciar} />;
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-quiz-parchment dark:bg-quiz-forest">
        <nav
          aria-label="Localizacao"
          className="mx-auto flex max-w-4xl items-center gap-1.5 px-4 pt-6 text-xs text-quiz-sage"
        >
          <Link href="/" className="transition-colors hover:text-quiz-forest-deep dark:hover:text-quiz-parchment-border">
            Inicio
          </Link>
          <ChevronRight size={12} />
          <span className="text-quiz-forest-deep dark:text-quiz-parchment">Quiz Fiscal</span>
        </nav>

        {quiz.status === "selecao" && <SelecaoModo onComecar={quiz.iniciar} />}
        {quiz.status === "resultado" && <Resultado quiz={quiz} />}
      </div>
      <Footer />
    </>
  );
}
