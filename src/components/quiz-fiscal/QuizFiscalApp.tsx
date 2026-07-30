"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuizFiscal } from "@/hooks/useQuizFiscal";
import { useQuizProgresso } from "@/lib/store/quiz-progresso";
import { useAuth } from "@/lib/supabase/auth";
import { registarSessaoDesafio, type CupaoQuiz } from "@/lib/supabase/quiz-achievements";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ChevronRight } from "@/components/ui/Icons";
import SelecaoModo from "./SelecaoModo";
import NiveisDesafio from "./NiveisDesafio";
import QuizNormal from "./QuizNormal";
import QuizGuiado from "./QuizGuiado";
import Resultado from "./Resultado";
import type { QuizFiscalConfig } from "@/hooks/useQuizFiscal";
import type { RegistrarSessaoResult } from "@/lib/store/quiz-progresso";

const BODY_PLAYING_CLASS = "quiz-playing";

export default function QuizFiscalApp() {
  const quiz = useQuizFiscal();
  const progresso = useQuizProgresso();
  const { user } = useAuth();

  useEffect(() => {
    const playing = quiz.status === "jogando";
    document.body.classList.toggle(BODY_PLAYING_CLASS, playing);
    return () => { document.body.classList.remove(BODY_PLAYING_CLASS); };
  }, [quiz.status]);

  // Evita registar a mesma sessão mais do que uma vez
  const sessaoRegistadaRef = useRef<string | null>(null);
  const [resultadoSessao, setResultadoSessao] = useState<RegistrarSessaoResult | null>(null);
  const [cupaoGanho, setCupaoGanho] = useState<CupaoQuiz | null>(null);

  // Quando o quiz termina, regista a sessão na persistência + verifica desafio
  useEffect(() => {
    if (quiz.status !== "resultado" || !quiz.resultado) return;
    // A chave é o ID da sessão, não o seu RESULTADO. Com a chave anterior
    // (`modo-acertos-total-pontos`), dois 8/10 seguidos com a mesma pontuação
    // contavam como a mesma sessão — e `jogarNovamente()` nem sequer passa
    // por «selecao», que era o único sítio onde a chave se limpava.
    if (!quiz.sessaoId || sessaoRegistadaRef.current === quiz.sessaoId) return;
    sessaoRegistadaRef.current = quiz.sessaoId;

    progresso.registrarSessao(
      quiz.resultado,
      quiz.resultado.pontos,
      quiz.resultado.streakMaximo,
      quiz.resultado.tempoTotalSeg
    ).then(setResultadoSessao).catch(() => {/* noop */});

    if (user && quiz.config?.dificuldade) {
      // Envia-se o que o utilizador ESCOLHEU, traduzido para os índices do
      // banco — nunca o número de acertos. Quem apura o resultado é o
      // servidor, que é o único lado que conhece as respostas certas sem
      // depender do que o cliente afirma.
      const respostasParaVerificacao = quiz.resultado.respostas.map((r) => {
        const item = quiz.sessao.find((s) => s.pergunta.id === r.perguntaId);
        const original =
          item && r.opcaoSelecionada !== null
            ? item.indicesOriginais[r.opcaoSelecionada] ?? null
            : null;
        return { perguntaId: r.perguntaId, opcaoSelecionada: original };
      });
      registarSessaoDesafio(respostasParaVerificacao, quiz.config.dificuldade)
        .then((r) => {
          if (r.cupaoGerado) setCupaoGanho(r.cupaoGerado);
        })
        .catch(() => {/* noop */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.status, quiz.resultado, quiz.sessaoId]);

  useEffect(() => {
    if (quiz.status === "selecao") {
      sessaoRegistadaRef.current = null;
      setResultadoSessao(null);
      setCupaoGanho(null);
    }
  }, [quiz.status]);

  const handleIniciar = async (cfg: QuizFiscalConfig) => {
    if (!progresso.consumirEnergia()) return;
    await quiz.iniciar(cfg);
  };

  /**
   * «Jogar novamente» a partir do ecrã de resultado chamava
   * `quiz.jogarNovamente()` diretamente, sem passar por aqui — ou seja, sem
   * consumir energia. Bastava não voltar ao menu para jogar sessões
   * ilimitadas. Se a energia é uma alavanca de conversão, tem de ser cobrada
   * em todos os caminhos que iniciam uma sessão.
   *
   * Cobrar não chegava: `consumirEnergia()` limitava-se a travar em zero e
   * não dizia nada a quem a chamava, por isso a sessão começava na mesma. A
   * zero, o caminho fecha-se aqui — e o botão no ecrã de resultado aparece
   * desativado, para a recusa ser visível antes do clique e não depois.
   */
  const handleJogarNovamente = async () => {
    if (!progresso.consumirEnergia()) return;
    quiz.jogarNovamente();
  };

  const semEnergia = progresso.energiaRestante <= 0 && !progresso.energiaIlimitada;

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
          <>
            <SelecaoModo
              onComecar={handleIniciar}
              energiaRestante={progresso.energiaRestante}
              energiaTotal={progresso.energiaTotal}
              energiaIlimitada={progresso.energiaIlimitada}
              sessoes={progresso.sessoes}
            />
            <NiveisDesafio />
          </>
        )}
        {quiz.status === "resultado" && (
          <Resultado
            quiz={quiz}
            xpGanho={resultadoSessao?.xpGanho ?? 0}
            levelUp={resultadoSessao?.levelUp ?? false}
            nivelNovo={resultadoSessao?.nivelNovo}
            cupaoGanho={cupaoGanho}
            onJogarNovamente={handleJogarNovamente}
            semEnergia={semEnergia}
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
