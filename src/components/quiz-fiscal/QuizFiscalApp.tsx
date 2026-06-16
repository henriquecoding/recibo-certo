"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuizFiscal } from "@/hooks/useQuizFiscal";
import { useQuizProgresso } from "@/lib/store/quiz-progresso";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight } from "@/components/ui/Icons";
import SelecaoModo from "./SelecaoModo";
import QuizNormal from "./QuizNormal";
import QuizGuiado from "./QuizGuiado";
import Resultado from "./Resultado";
import type { QuizFiscalConfig } from "@/hooks/useQuizFiscal";
import type { RegistrarSessaoResult } from "@/lib/store/quiz-progresso";

export default function QuizFiscalApp() {
  const quiz = useQuizFiscal();
  const progresso = useQuizProgresso();

  // Evita registar a mesma sessão mais do que uma vez
  const sessaoRegistadaRef = useRef<string | null>(null);
  const [resultadoSessao, setResultadoSessao] = useState<RegistrarSessaoResult | null>(null);

  // Quando o quiz termina, regista a sessão na persistência
  useEffect(() => {
    if (quiz.status !== "resultado" || !quiz.resultado) return;
    const resultadoId = `${quiz.resultado.modo}-${quiz.resultado.acertos}-${quiz.resultado.totalPerguntas}-${quiz.resultado.pontos}`;
    if (sessaoRegistadaRef.current === resultadoId) return;
    sessaoRegistadaRef.current = resultadoId;

    progresso.registrarSessao(
      quiz.resultado,
      quiz.resultado.pontos,
      quiz.resultado.streakMaximo,
      quiz.resultado.tempoTotalSeg
    ).then(setResultadoSessao).catch(() => {/* noop */});
    progresso.consumirEnergia();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.status, quiz.resultado]);

  // Limpa resultadoSessao quando volta à seleção
  useEffect(() => {
    if (quiz.status === "selecao") {
      sessaoRegistadaRef.current = null;
      setResultadoSessao(null);
    }
  }, [quiz.status]);

  const handleIniciar = (cfg: QuizFiscalConfig) => {
    quiz.iniciar(cfg);
  };

  if (quiz.status === "jogando") {
    const progressoProps = {
      nivel: progresso.nivel.nivel,
      tituloNivel: progresso.nivel.titulo,
      xpAtual: progresso.xp,
      xpProximo: progresso.nivel.xpProximo ?? progresso.xp,
      xpNivelBase: progresso.nivel.xpMinimo,
      energiaRestante: progresso.energiaRestante,
      energiaTotal: progresso.energiaTotal,
    };

    if (quiz.config?.modo === "guiado") {
      return <QuizGuiado quiz={quiz} progresso={progressoProps} onSair={quiz.reiniciar} />;
    }
    return <QuizNormal quiz={quiz} progresso={progressoProps} onSair={quiz.reiniciar} />;
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen" style={{ backgroundColor: "var(--quiz-page-bg, #FAF4EC)" }}>
        <nav
          aria-label="Localização"
          className="mx-auto flex max-w-4xl items-center gap-1.5 px-4 pt-6 text-xs text-quiz-sage"
        >
          <Link href="/" className="transition-colors hover:text-quiz-forest-deep dark:hover:text-quiz-parchment-border">
            Início
          </Link>
          <ChevronRight size={12} />
          <span className="text-quiz-forest-deep dark:text-quiz-parchment">Quiz Fiscal</span>
        </nav>

        {quiz.status === "selecao" && (
          <SelecaoModo
            onComecar={handleIniciar}
            energiaRestante={progresso.energiaRestante}
            energiaTotal={progresso.energiaTotal}
            sessoes={progresso.sessoes}
          />
        )}
        {quiz.status === "resultado" && (
          <Resultado
            quiz={quiz}
            xpGanho={resultadoSessao?.xpGanho ?? 0}
            levelUp={resultadoSessao?.levelUp ?? false}
            nivelNovo={resultadoSessao?.nivelNovo}
          />
        )}
      </div>
      <Footer />
    </>
  );
}

export type { QuizProgressoProps };

interface QuizProgressoProps {
  nivel: number;
  tituloNivel: string;
  xpAtual: number;
  xpProximo: number;
  xpNivelBase: number;
  energiaRestante: number;
  energiaTotal: number;
}
