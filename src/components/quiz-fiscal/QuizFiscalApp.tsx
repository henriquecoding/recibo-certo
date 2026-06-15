"use client";

import { useQuizFiscal } from "@/hooks/useQuizFiscal";
import SelecaoModo from "./SelecaoModo";
import QuizNormal from "./QuizNormal";
import QuizGuiado from "./QuizGuiado";
import Resultado from "./Resultado";

export default function QuizFiscalApp() {
  const quiz = useQuizFiscal();

  switch (quiz.status) {
    case "selecao":
      return <SelecaoModo onComecar={quiz.iniciar} />;

    case "jogando":
      if (quiz.config?.modo === "guiado") {
        return <QuizGuiado quiz={quiz} onSair={quiz.reiniciar} />;
      }
      return <QuizNormal quiz={quiz} onSair={quiz.reiniciar} />;

    case "resultado":
      return <Resultado quiz={quiz} />;

    default:
      return null;
  }
}
