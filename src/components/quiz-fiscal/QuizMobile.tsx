"use client";

import { m, AnimatePresence } from "motion/react";
import { resolveQuizIcon } from "./icon-map";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal";
import {
  Check, Close, ArrowRight, Fire, Star, PaperClip,
} from "@/components/ui/Icons";
import QuizHeader from "./QuizHeader";
import QuizMobileNav from "./QuizMobileNav";
import QuizVantagens from "./QuizVantagens";
import type { OpcaoEstado } from "./QuizBookShell";
import type { VantagensEstado } from "@/hooks/useQuizFiscal";
import type { QuizOpcao, QuizCategoria } from "@/lib/quiz-fiscal";
import type { QuizProgressoProps } from "./QuizFiscalApp";

const LETRAS = ["A", "B", "C", "D"];

interface QuizMobileProps {
  categoriaAtiva?: QuizCategoria;
  indice: number;
  total: number;
  pergunta: string;
  opcoes: QuizOpcao[];
  opcaoEstados: OpcaoEstado[];
  onOpcaoClick: (idx: number) => void;
  respondida: boolean;
  acertou: boolean | null;
  tempoRestante?: number;
  tempoTotal?: number;
  vantagens: VantagensEstado;
  modo: "normal" | "guiado";
  onEliminar2: () => void;
  onDica: () => void;
  onTempoExtra: () => void;
  onExplicacao: () => void;
  dicaVisivel: boolean;
  legalBasis: string;
  mostrarExplicacao: boolean;
  explicacaoCorreta?: string;
  explicacoesErradas?: { letra: string; texto: string; porque: string }[];
  fonteLabel?: string;
  fonteUrl?: string;
  onSeguinte: () => void;
  onSair: () => void;
  ultimaPergunta: boolean;
  podeConfirmar?: boolean;
  onConfirmar?: () => void;
  acertosAteAgora: number;
  errosAteAgora: number;
  vantagensUsadas: number;
  pontosAtuais: number;
  streakAtual: number;
  progresso: QuizProgressoProps;
}

const QUIZ_DARK = "#3a5232";
const PARCHMENT_BG = "#f5f0e8";
const CARD_BG = "#faf6ef";
const BORDER_COLOR = "#e2d9c8";

export default function QuizMobile({
  categoriaAtiva,
  indice,
  total,
  pergunta,
  opcoes,
  opcaoEstados,
  onOpcaoClick,
  respondida,
  acertou,
  tempoRestante,
  tempoTotal,
  vantagens,
  modo,
  onEliminar2,
  onDica,
  onTempoExtra,
  onExplicacao,
  dicaVisivel,
  legalBasis,
  mostrarExplicacao,
  explicacaoCorreta,
  onSeguinte,
  onSair,
  ultimaPergunta,
  podeConfirmar,
  onConfirmar,
  acertosAteAgora,
  errosAteAgora: _errosAteAgora,
  vantagensUsadas: _vantagensUsadas,
  pontosAtuais,
  streakAtual,
  progresso,
}: QuizMobileProps) {
  const progressPct = Math.round(((indice + 1) / total) * 100);
  const tPct = tempoRestante != null && tempoTotal ? (tempoRestante / tempoTotal) * 100 : null;

  const catMeta = categoriaAtiva ? META_CATEGORIA_QUIZ[categoriaAtiva] : null;
  const CatIcon = catMeta ? resolveQuizIcon(catMeta.icon) : null;

  // XP progress
  const xpNoNivel = progresso.xpAtual - progresso.xpNivelBase;
  const xpRange = progresso.xpProximo - progresso.xpNivelBase;
  const xpPct = xpRange > 0 ? Math.min(100, Math.round((xpNoNivel / xpRange) * 100)) : 100;

  return (
    <div className="flex flex-col min-h-screen pb-1" style={{ backgroundColor: PARCHMENT_BG }}>
      {/* ── 1. Header ── */}
      <QuizHeader
        onSair={onSair}
        onMenuToggle={() => {}}
        nivel={progresso.nivel}
        tituloNivel={progresso.tituloNivel}
        xpAtual={progresso.xpAtual}
        xpTotal={progresso.xpProximo}
        xpPct={xpPct}
      />

      {/* ── 2. Dark "Quiz Fiscal" bar ── */}
      <div
        className="mx-3 mt-3 rounded-t-2xl py-3 text-center"
        style={{ backgroundColor: QUIZ_DARK }}
      >
        <span className="text-[15px] font-semibold text-white">Quiz Fiscal</span>
      </div>

      {/* ── 3. Question card (with paper clip above) ── */}
      <div className="mx-3 relative" style={{ paddingTop: "18px" }}>
        <span className="absolute top-0 left-7 z-10 text-[#9ca3af]" aria-hidden>
          <PaperClip size={17} />
        </span>
        <div
          className="rounded-b-2xl shadow-md"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, borderTop: "none" }}
        >
          {/* Progress header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold" style={{ color: "#415439" }}>
                {indice + 1}/{total}
              </span>
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "#d4c4b0" }}
                role="progressbar"
                aria-valuenow={indice + 1}
                aria-valuemax={total}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progressPct}%`, backgroundColor: QUIZ_DARK, transition: "width 0.4s ease" }}
                />
              </div>
              {tPct != null && (
                <div className="h-2 w-12 rounded-full overflow-hidden" style={{ backgroundColor: "#d4c4b0" }}>
                  <m.div
                    className="h-full rounded-full"
                    style={{ background: tPct > 60 ? QUIZ_DARK : tPct > 30 ? "#b59562" : "#c2745a" }}
                    animate={{ width: `${tPct}%` }}
                    transition={{ duration: 0.9, ease: "linear" }}
                  />
                </div>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <Star size={13} className="text-amber-400" />
                <span className="text-[11px] font-bold tabular-nums" style={{ color: "#6b5240" }}>
                  {pontosAtuais}
                </span>
              </div>
            </div>
          </div>

          <div className="mx-4 h-px" style={{ backgroundColor: "#e8dcc8" }} />

          {/* Dica hint */}
          <AnimatePresence>
            {dicaVisivel && !respondida && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border p-2.5"
                  style={{ backgroundColor: "#fffbeb", borderColor: "#fbbf24" }}>
                  <p className="text-[11px] leading-snug" style={{ color: "#78350f" }}>
                    <strong>Dica: </strong>{legalBasis}
                  </p>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Category icon + Question text */}
          <div className="px-4 py-4">
            {CatIcon && (
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#e8f0e4", color: "#415439" }}
                >
                  <CatIcon size={20} />
                </div>
              </div>
            )}
            <p className="font-display text-[17px] font-bold leading-snug" style={{ color: "#1a1a17" }}>
              {pergunta}
            </p>
          </div>

          {/* Options */}
          <div className="px-3 pb-3 space-y-2">
            {opcoes.map((opcao, idx) => {
              const estado = opcaoEstados[idx];
              if (!estado) return null;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={respondida || estado === "eliminada"}
                  onClick={() => onOpcaoClick(idx)}
                  className={mobileOpcaoBtnClass(estado)}
                >
                  <span className={mobileLetraBadgeClass(estado)}>
                    {estado === "correta" ? <Check size={14} /> : estado === "errada" ? <Close size={14} /> : LETRAS[idx]}
                  </span>
                  <span className="flex-1 text-left text-[14px] font-medium leading-snug" style={{ color: "#1a1a17" }}>
                    {opcao.texto}
                  </span>
                  {estado === "correta" && <Check size={16} className="shrink-0 text-green-600" />}
                </button>
              );
            })}
          </div>

          {/* Responder button (guiado) */}
          {!respondida && modo === "guiado" && (
            <div className="px-3 pb-3">
              <button
                type="button"
                disabled={!podeConfirmar}
                onClick={onConfirmar}
                className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: QUIZ_DARK }}
              >
                Responder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Vantagens row ── */}
      {!respondida && (
        <div className="mx-3 mt-2 px-3 py-2.5 rounded-2xl flex items-center gap-2" style={{ backgroundColor: "#ffffff", border: `1px solid ${BORDER_COLOR}` }}>
          <QuizVantagens
            vantagens={vantagens}
            modo={modo}
            respondida={respondida}
            onEliminar2={onEliminar2}
            onDica={onDica}
            onTempoExtra={onTempoExtra}
            onExplicacao={onExplicacao}
            compact
          />
        </div>
      )}

      {/* ── 5. Explanation card (after answering) ── */}
      <AnimatePresence>
        {respondida && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="mx-3 mt-2 rounded-2xl overflow-hidden"
            style={{ backgroundColor: acertou ? "#e8f5e8" : "#f6e7e0", border: `1px solid ${acertou ? "#b5d4b0" : "#e6c5b7"}` }}
          >
            <div className="p-4">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: acertou ? "#415439" : "#c2745a" }}
                >
                  {acertou ? <Check size={14} className="text-white" /> : <Close size={14} className="text-white" />}
                </div>
                <span className="text-[15px] font-bold" style={{ color: acertou ? "#145532" : "#7a3c28" }}>
                  {acertou ? "Resposta correta!" : "Resposta incorreta"}
                </span>
              </div>
              {mostrarExplicacao && explicacaoCorreta && (
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#4a4a44" }}>
                  {explicacaoCorreta}
                </p>
              )}
              <p className="mt-2 text-[11px]" style={{ color: "#8a7355" }}>
                {legalBasis}
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── 6. Sequência + Pontos row ── */}
      <AnimatePresence>
        {respondida && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="mx-3 mt-2 flex gap-2"
          >
            {/* Sequência */}
            <div
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ backgroundColor: "#ffffff", border: `1px solid ${BORDER_COLOR}`, flex: "0 0 auto" }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: QUIZ_DARK }}
              >
                <Fire size={22} />
              </div>
              <div>
                <div className="text-[10px] font-semibold" style={{ color: "#8a7355" }}>Sequência</div>
                <div className="text-[22px] font-bold leading-none tabular-nums" style={{ color: "#1a1a17" }}>
                  {streakAtual}
                </div>
              </div>
            </div>

            {/* Acertos + Pontos */}
            <div
              className="flex flex-1 items-center gap-4 rounded-2xl px-4"
              style={{ backgroundColor: "#ffffff", border: `1px solid ${BORDER_COLOR}` }}
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-semibold" style={{ color: "#8a7355" }}>Acertos</span>
                <span className="text-[20px] font-bold tabular-nums" style={{ color: "#415439" }}>
                  {acertosAteAgora}
                </span>
              </div>
              <div className="h-8 w-px" style={{ backgroundColor: "#e2d9c8" }} />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-semibold" style={{ color: "#8a7355" }}>Pontos</span>
                <span className="text-[20px] font-bold tabular-nums" style={{ color: "#b59562" }}>
                  {pontosAtuais}
                </span>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── 7. Próxima button ── */}
      <AnimatePresence>
        {respondida && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.3 }}
            className="mx-3 mt-3 mb-2"
          >
            <button
              type="button"
              onClick={onSeguinte}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: QUIZ_DARK }}
            >
              {ultimaPergunta ? "Ver resultado" : "Próxima"}
              <ArrowRight size={20} />
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      {/* ── 8. Bottom nav ── */}
      <QuizMobileNav activeTab="home" onHome={onSair} />
    </div>
  );
}

function mobileOpcaoBtnClass(estado: OpcaoEstado): string {
  const base = "flex w-full items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-150 active:scale-[0.99]";
  switch (estado) {
    case "correta":   return `${base} border-green-300 bg-green-50`;
    case "errada":    return `${base} border-red-200 bg-red-50`;
    case "eliminada": return `${base} border-stone-200 bg-stone-100 opacity-30 line-through`;
    case "apagada":   return `${base} border-stone-200 bg-stone-50 opacity-50`;
    case "selecionada": return `${base} border-[#415439] bg-green-50 ring-1 ring-[#415439]/20`;
    default:          return `${base} border-[#e2d9c8] bg-white hover:border-[#415439]/40 hover:shadow-sm`;
  }
}

function mobileLetraBadgeClass(estado: OpcaoEstado): string {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold";
  switch (estado) {
    case "correta":   return `${base} bg-[#415439] text-white`;
    case "errada":    return `${base} bg-[#c2745a] text-white`;
    case "eliminada":
    case "apagada":   return `${base} bg-stone-200 text-stone-400`;
    case "selecionada": return `${base} bg-[#415439] text-white`;
    default:          return `${base} bg-[#415439] text-white`;
  }
}
