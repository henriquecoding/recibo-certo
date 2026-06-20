"use client";

import { useEffect, useState } from "react";
import { Flag, Close, Check, Sparkle, Zap } from "@/components/ui/Icons";
import { reportarPergunta } from "@/lib/supabase/quiz-reportes";
import { useAuth } from "@/lib/supabase/auth";
import { useQuizProgresso } from "@/lib/store/quiz-progresso";

const QUIZ_DARK = "#3a5232";
const BOOK_BG = "#faf6ef";
const BORDER = "#d4c4b0";
const TEXT_HEAD = "#1C3A22";
const TEXT_MUTED = "#8a7a6a";

/** XP atribuído a quem descreve o erro (mínimo de caracteres exigido). */
const REPORT_XP = 15;
const MIN_DESCRICAO = 12;
const LS_PREMIADOS = "quiz_reportes_premiados_v1";

function lerPremiados(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_PREMIADOS);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function marcarPremiado(id: string) {
  try {
    const s = lerPremiados();
    s.add(id);
    localStorage.setItem(LS_PREMIADOS, JSON.stringify([...s]));
  } catch {
    /* noop */
  }
}

interface Props {
  perguntaId: string;
  perguntaTexto: string;
  categoria: string;
}

type Fase = "form" | "enviando" | "ok" | "erro";

export default function BotaoReportarErro({ perguntaId, perguntaTexto, categoria }: Props) {
  const { user } = useAuth();
  const { adicionarXpBonus } = useQuizProgresso();
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [fase, setFase] = useState<Fase>("form");
  const [xpGanho, setXpGanho] = useState(0);
  const [erro, setErro] = useState("");

  // Fecha com Escape.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function abrir() {
    setDescricao("");
    setFase("form");
    setXpGanho(0);
    setErro("");
    setAberto(true);
  }
  function fechar() {
    setAberto(false);
  }

  const descricaoValida = descricao.trim().length >= MIN_DESCRICAO;

  async function enviar() {
    setFase("enviando");
    setErro("");
    const desc = descricao.trim();
    const jaPremiado = lerPremiados().has(perguntaId);
    const premiar = descricaoValida && !jaPremiado;

    const { erro: erroEnvio } = await reportarPergunta({
      questionId: perguntaId,
      perguntaTexto,
      categoria,
      descricao: desc,
      userId: user?.id ?? null,
      xpAtribuido: premiar ? REPORT_XP : 0,
    });

    if (erroEnvio) {
      setErro(erroEnvio);
      setFase("erro");
      return;
    }

    if (premiar) {
      try {
        await adicionarXpBonus(REPORT_XP);
        marcarPremiado(perguntaId);
        setXpGanho(REPORT_XP);
      } catch {
        /* o reporte foi registado; falha a atribuir XP não bloqueia */
      }
    }
    setFase("ok");
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#3a5232]"
        style={{ color: TEXT_MUTED }}
        aria-haspopup="dialog"
      >
        <Flag size={12} />
        Reportar erro
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Reportar erro na pergunta"
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={fechar}
            aria-hidden="true"
          />
          <div
            className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl sm:max-w-md sm:rounded-2xl sm:pb-0"
            style={{ backgroundColor: BOOK_BG, border: `1px solid ${BORDER}` }}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "#e4ede0", color: QUIZ_DARK }}>
                  <Flag size={14} />
                </span>
                <h2 className="text-[15px] font-bold" style={{ color: TEXT_HEAD }}>
                  Reportar erro
                </h2>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                style={{ color: TEXT_MUTED }}
              >
                <Close size={16} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-5">
              {fase === "ok" ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ backgroundColor: QUIZ_DARK }}>
                    <Check size={22} />
                  </span>
                  <p className="text-[15px] font-bold" style={{ color: TEXT_HEAD }}>
                    Obrigado pelo reporte!
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: TEXT_MUTED }}>
                    A nossa equipa vai analisar esta pergunta.
                  </p>
                  {xpGanho > 0 && (
                    <span
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold text-white"
                      style={{ backgroundColor: "#C07828" }}
                    >
                      <Zap size={14} /> +{xpGanho} XP
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={fechar}
                    className="mt-5 w-full rounded-xl px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: QUIZ_DARK }}
                  >
                    Continuar
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[13px] leading-relaxed" style={{ color: TEXT_MUTED }}>
                    Encontraste algo errado nesta pergunta (resposta, valor, base legal)?
                    Descreve o que está mal e <strong style={{ color: TEXT_HEAD }}>ganhas {REPORT_XP} XP</strong> ao
                    ajudar-nos a melhorar.
                  </p>

                  <label htmlFor="reporte-descricao" className="mt-4 mb-1.5 block text-[11px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
                    Descrição do erro
                  </label>
                  <textarea
                    id="reporte-descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={4}
                    placeholder="Ex.: a resposta correta devia ser a opção B, porque a taxa de 2026 é…"
                    className="w-full resize-none rounded-xl px-3 py-2.5 text-[14px] outline-none transition-shadow focus:ring-2 focus:ring-[#3a5232]"
                    style={{ backgroundColor: "#fff", border: `1px solid ${BORDER}`, color: "#2a2a26" }}
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: TEXT_MUTED }}>
                    <span className="inline-flex items-center gap-1">
                      <Sparkle size={11} />
                      {descricaoValida
                        ? `Elegível para +${REPORT_XP} XP`
                        : `Mín. ${MIN_DESCRICAO} caracteres para ganhar XP`}
                    </span>
                    <span className="tabular-nums">{descricao.trim().length}</span>
                  </div>

                  {fase === "erro" && (
                    <p className="mt-3 rounded-lg px-3 py-2 text-[12px] font-medium" style={{ backgroundColor: "#fbe9e7", color: "#b3261e" }}>
                      {erro || "Não foi possível enviar o reporte. Tenta novamente."}
                    </p>
                  )}

                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={enviar}
                      disabled={fase === "enviando"}
                      className="w-full rounded-xl px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: QUIZ_DARK }}
                    >
                      {fase === "enviando" ? "A enviar…" : descricaoValida ? `Enviar e ganhar ${REPORT_XP} XP` : "Enviar reporte"}
                    </button>
                    <button
                      type="button"
                      onClick={fechar}
                      className="w-full rounded-xl px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-black/5"
                      style={{ color: TEXT_MUTED }}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
