"use client";

import { m, AnimatePresence } from "motion/react";
import { resolveQuizIcon } from "./icon-map";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal";
import {
  Check, Close, ArrowLeft, Settings, BellAlert,
  Zap, Coin, Fire, Lightbulb, Star, ArrowRight, BookOpen,
} from "@/components/ui/Icons";
import QuizMobileNav from "./QuizMobileNav";
import type { OpcaoEstado } from "./QuizBookShell";
import type { VantagensEstado } from "@/hooks/useQuizFiscal";
import type { QuizOpcao, QuizCategoria } from "@/lib/quiz-fiscal";

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
}

const QUIZ_DARK = "#3a5232";
const PARCHMENT = "#f5f0e8";
const CARD_BG = "#ffffff";
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
  vantagens: _vantagens,
  modo,
  onEliminar2: _onEliminar2,
  onDica: _onDica,
  onTempoExtra: _onTempoExtra,
  onExplicacao: _onExplicacao,
  dicaVisivel: _dicaVisivel,
  legalBasis,
  mostrarExplicacao,
  explicacaoCorreta,
  explicacoesErradas,
  fonteUrl,
  onSeguinte,
  onSair,
  ultimaPergunta,
  podeConfirmar,
  onConfirmar,
  acertosAteAgora,
  errosAteAgora: _errosAteAgora,
  vantagensUsadas,
}: QuizMobileProps) {
  const pontos = (indice + 1) * 40;
  const progressPct = Math.round(((indice + 1) / total) * 100);
  const tPct = tempoRestante != null && tempoTotal ? (tempoRestante / tempoTotal) * 100 : null;

  const catMeta = categoriaAtiva ? META_CATEGORIA_QUIZ[categoriaAtiva] : null;
  const CatIcon = catMeta ? resolveQuizIcon(catMeta.icon) : null;

  const streakAtual = acertosAteAgora;
  const streakRecord = Math.max(acertosAteAgora, 15);

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: PARCHMENT }}
    >
      {/* ── 1. Top bar ── */}
      <header
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ backgroundColor: "#f1e4d4", borderColor: "#d4b896" }}
      >
        <button
          type="button"
          onClick={() => {}}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded"
          style={{ border: "1px solid #b59562", color: "#b59562" }}
          aria-label="Menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#f1e4d4", border: "1.5px solid #b59562" }}
          >
            <svg width="20" height="20" viewBox="0 0 500 500" fill="none" aria-hidden>
              <path d="M401.84 287.26V79.76c0-3.85-1.53-7.54-4.25-10.26a14.52 14.52 0 00-10.26-4.26H97.87L401.84 287.26z" fill="#0F3F25" transform="matrix(1,0,0,-1,0,500)" />
              <path d="M104.23 46.99c-6.15-4.6-14.37-5.33-21.24-1.89-6.87 3.44-11.2 10.46-11.2 18.14v335.09c0 15.6 6.2 30.56 17.23 41.59 11.03 11.03 25.99 17.23 41.6 17.23h273.98c6.26 0 12.27-2.49 16.7-6.92 4.43-4.43 6.92-10.44 6.92-16.7V297.57c0-5.39-2.54-10.47-6.86-13.69C381.92 254.42 183.21 105.99 104.23 46.99z" fill="#05815F" transform="matrix(1,0,0,-1,0,500)" />
              <path d="M428.21 383.42v23.69s-220.96-104.97-241.78-114.86c-.97-.46-2.12-.37-3 .24-8.51 5.83-52.79 36.16-77.01 52.76-2.43 1.67-5.65 1.64-7.25-.08-1.6-1.15-2.67-3.18-1.88-6.02 10.67-38.41 34.93-125.74 43.75-157.52.74-2.67 2.76-4.8 5.38-5.69 2.63-.89 5.52-.44 7.73 1.22 50.19 37.83 275.67 213.09 275.67 213.09z" fill="#EAF7EB" transform="matrix(1,0,0,-1,0,500)" />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-[14px] font-bold leading-tight">
              <span style={{ color: "#145532" }}>Recibo</span>
              <span style={{ color: "#55b15a" }}> Certo</span>
            </span>
            <span className="text-[9px] font-semibold" style={{ color: "#8a7355" }}>
              Quiz Fiscal
            </span>
          </div>
        </div>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full relative"
          style={{ color: "#415439" }}
          aria-label="Notificações"
        >
          <BellAlert size={20} />
          <span
            className="absolute top-1 right-1 h-2 w-2 rounded-full"
            style={{ backgroundColor: "#55b15a" }}
          />
        </button>
      </header>

      {/* ── 2. Stats cards row ── */}
      <div className="flex gap-2 px-3 pt-3 pb-1">
        {/* Nível + XP card */}
        <div
          className="flex-1 rounded-2xl p-3"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER_COLOR}` }}
        >
          <span className="text-[10px] font-semibold" style={{ color: "#8a7355" }}>
            Nível
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold text-white"
              style={{
                backgroundColor: "#415439",
                clipPath: "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)",
              }}
            >
              12
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold truncate" style={{ color: "#415439" }}>
                Aprendiz Fiscal
              </span>
              <div
                className="mt-1 h-1.5 w-full rounded-full overflow-hidden"
                style={{ backgroundColor: "#d4c4b0" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "57%",
                    background: "linear-gradient(to right, #425c3b, #6d815a)",
                  }}
                />
              </div>
              <span className="text-[9px] tabular-nums mt-0.5" style={{ color: "#6d815a" }}>
                850 / 1500 XP
              </span>
            </div>
          </div>
        </div>

        {/* Energia card */}
        <div
          className="flex flex-col items-center justify-center rounded-2xl px-3 py-2 gap-0.5"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER_COLOR}` }}
        >
          <Zap size={20} className="text-amber-400" />
          <span className="text-[13px] font-bold" style={{ color: "#1a1a17" }}>5/5</span>
          <span className="text-[9px]" style={{ color: "#8a7355" }}>Energia</span>
          <button
            className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: "#415439" }}
            aria-label="Adicionar energia"
          >
            +
          </button>
        </div>

        {/* Pontos card */}
        <div
          className="flex flex-col items-center justify-center rounded-2xl px-3 py-2 gap-0.5"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER_COLOR}` }}
        >
          <Coin size={20} className="text-amber-500" />
          <span className="text-[13px] font-bold" style={{ color: "#1a1a17" }}>320</span>
          <span className="text-[9px]" style={{ color: "#8a7355" }}>Pontos</span>
          <button
            className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: "#415439" }}
            aria-label="Adicionar pontos"
          >
            +
          </button>
        </div>
      </div>

      {/* ── 3. Quiz section header (dark green) ── */}
      <div
        className="flex items-center px-4 py-3 mt-2 mx-3 rounded-t-2xl"
        style={{ backgroundColor: QUIZ_DARK }}
      >
        <button
          type="button"
          onClick={onSair}
          className="flex h-8 w-8 items-center justify-center rounded text-white opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Sair do Quiz"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="flex-1 text-center text-[15px] font-semibold text-white">
          Quiz Fiscal
        </span>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded text-white opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Configurações"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ── 4. Question card ── */}
      <div
        className="mx-3 rounded-b-2xl shadow-lg overflow-hidden relative"
        style={{ backgroundColor: "#faf6ef", border: `1px solid ${BORDER_COLOR}`, borderTop: "none" }}
      >
        {/* Paper clip decoration */}
        <div className="absolute -top-1 left-6 z-10" aria-hidden>
          <svg width="18" height="44" viewBox="0 0 18 44" fill="none">
            <path d="M9 4C6.2 4 4 6.2 4 9v20c0 3.9 1.7 7 5 7s5-3.1 5-7V10" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M9 14V9c0-2.8 4.5-2.8 4.5 0v19c0 6.5-9 6.5-9 0V9C4.5 2.5 13.5 2.5 13.5 9" stroke="#b0b7c0" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* Progress header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold" style={{ color: "#415439" }}>
              Pergunta {indice + 1}/{total}
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
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: "#415439",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            {tPct != null && (
              <div
                className="h-2 w-12 rounded-full overflow-hidden"
                style={{ backgroundColor: "#d4c4b0" }}
              >
                <m.div
                  className="h-full rounded-full"
                  style={{
                    background: tPct > 60 ? "#415439" : tPct > 30 ? "#b59562" : "#c2745a",
                  }}
                  animate={{ width: `${tPct}%` }}
                  transition={{ duration: 0.9, ease: "linear" }}
                />
              </div>
            )}
            <div className="flex items-center gap-1 shrink-0">
              <Star size={14} className="text-amber-400" />
              <span className="text-[12px] font-bold" style={{ color: "#6b5240" }}>
                {pontos} pts
              </span>
            </div>
          </div>
        </div>

        <div className="mx-4 h-px" style={{ backgroundColor: "#e8dcc8" }} />

        {/* Category icon + Question text */}
        <div className="px-4 py-4">
          {CatIcon && (
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: "#e8f0e4", color: "#415439" }}
              >
                <CatIcon size={22} />
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
                {estado === "correta" && (
                  <Check size={18} className="shrink-0 text-green-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Responder button (guiado mode, before answering) */}
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

      {/* ── 5. Explanation card (after answering) ── */}
      <AnimatePresence>
        {respondida && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="mx-3 mt-2 rounded-2xl overflow-hidden"
            style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER_COLOR}` }}
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
            </div>

            {mostrarExplicacao && (
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 border-t"
                style={{ borderColor: BORDER_COLOR, color: "#415439" }}
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={16} />
                  <span className="text-[13px] font-semibold">Ver explicação</span>
                </div>
                <ArrowRight size={16} />
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* ── 6. Streak + Dica row (after answering) ── */}
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
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER_COLOR}`, flex: "0 0 auto" }}
            >
              <Fire size={28} className="text-orange-500 shrink-0" />
              <div>
                <div className="text-[10px] font-semibold" style={{ color: "#8a7355" }}>
                  Sequência
                </div>
                <div className="text-[22px] font-bold leading-none" style={{ color: "#1a1a17" }}>
                  {streakAtual}
                </div>
                <div className="text-[10px]" style={{ color: "#8a7355" }}>
                  Melhor: {streakRecord}
                </div>
              </div>
            </div>

            {/* Dica Fiscal */}
            <div
              className="flex flex-1 items-start gap-2 rounded-2xl p-3"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER_COLOR}` }}
            >
              <span className="shrink-0 mt-0.5 text-[#415439]"><Lightbulb size={22} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold" style={{ color: "#1a1a17" }}>
                  Dica Fiscal
                </div>
                <p className="text-[11px] leading-snug mt-0.5 line-clamp-3" style={{ color: "#4a4a44" }}>
                  {legalBasis}
                </p>
              </div>
              <span className="shrink-0 mt-1 text-[#8a7355]"><ArrowRight size={14} /></span>
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

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── 8. Bottom nav ── */}
      <QuizMobileNav
        activeTab="home"
        onHome={onSair}
      />
    </div>
  );
}

/* ── Option styling helpers ── */

function mobileOpcaoBtnClass(estado: OpcaoEstado): string {
  const base = "flex w-full items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-150 active:scale-[0.99]";
  switch (estado) {
    case "correta":
      return `${base} border-green-300 bg-green-50`;
    case "errada":
      return `${base} border-red-200 bg-red-50`;
    case "eliminada":
      return `${base} border-stone-200 bg-stone-100 opacity-30 line-through`;
    case "apagada":
      return `${base} border-stone-200 bg-stone-50 opacity-50`;
    case "selecionada":
      return `${base} border-[#415439] bg-green-50 ring-1 ring-[#415439]/20`;
    default:
      return `${base} border-[#e2d9c8] bg-white hover:border-[#415439]/40 hover:shadow-sm`;
  }
}

function mobileLetraBadgeClass(estado: OpcaoEstado): string {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold";
  switch (estado) {
    case "correta":
      return `${base} bg-[#415439] text-white`;
    case "errada":
      return `${base} bg-[#c2745a] text-white`;
    case "eliminada":
    case "apagada":
      return `${base} bg-stone-200 text-stone-400`;
    case "selecionada":
      return `${base} bg-[#415439] text-white`;
    default:
      return `${base} bg-[#415439] text-white`;
  }
}
