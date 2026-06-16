"use client";

import { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { resolveQuizIcon } from "./icon-map";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal";
import {
  Check, Close, ArrowRight, Fire, Star,
} from "@/components/ui/Icons";
import QuizHeader from "./QuizHeader";
import QuizMobileNav from "./QuizMobileNav";
import QuizVantagens from "./QuizVantagens";
import { useGameJuice } from "@/hooks/useGameJuice";
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
  onPular: () => void;
  onDobrar: () => void;
  onSegundaChance: () => void;
  onEscudo: () => void;
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
  onPular,
  onDobrar,
  onSegundaChance,
  onEscudo,
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
  const { soarAcerto, soarErro, soarToque } = useGameJuice();
  const [tremendoCard, setTremendoCard] = useState(false);
  const prevRespondida = useRef(false);

  // Feedback sensorial ao responder
  useEffect(() => {
    if (respondida && !prevRespondida.current) {
      prevRespondida.current = true;
      if (acertou) {
        soarAcerto();
      } else {
        soarErro();
        setTremendoCard(true);
        const t = setTimeout(() => setTremendoCard(false), 500);
        return () => clearTimeout(t);
      }
    }
    if (!respondida) prevRespondida.current = false;
  }, [respondida, acertou, soarAcerto, soarErro]);

  // Atalhos de teclado: 1-4 / A-D, Enter para avançar
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const mapa: Record<string, number> = {
        "1": 0, "2": 1, "3": 2, "4": 3,
        "a": 0, "b": 1, "c": 2, "d": 3,
      };
      const idx = mapa[e.key.toLowerCase()];
      if (!respondida && idx !== undefined && idx < opcoes.length) {
        soarToque();
        onOpcaoClick(idx);
      }
      if ((e.key === "Enter" || e.key === " ") && respondida) {
        e.preventDefault();
        onSeguinte();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [respondida, opcoes, onOpcaoClick, onSeguinte, soarToque]);

  const progressPct = Math.round(((indice + 1) / total) * 100);
  const tPct = tempoRestante != null && tempoTotal ? (tempoRestante / tempoTotal) * 100 : null;

  const catMeta = categoriaAtiva ? META_CATEGORIA_QUIZ[categoriaAtiva] : null;
  const CatIcon = catMeta ? resolveQuizIcon(catMeta.icon) : null;

  const xpNoNivel = progresso.xpAtual - progresso.xpNivelBase;
  const xpRange = progresso.xpProximo - progresso.xpNivelBase;
  const xpPct = xpRange > 0 ? Math.min(100, Math.round((xpNoNivel / xpRange) * 100)) : 100;

  return (
    // 100dvh evita que o teclado virtual quebre o layout em iOS/Android
    <div className="flex flex-col min-h-[100dvh] pb-1" style={{ backgroundColor: PARCHMENT_BG }}>
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

      {/* ── 3. Question card com tremor no erro ── */}
      <div className="mx-3 mt-3">
        <m.div
          animate={tremendoCard ? { x: [0, -7, 7, -5, 5, -2, 2, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="rounded-2xl shadow-md overflow-hidden"
            style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER_COLOR}` }}
          >
            {/* Cabeçalho escuro do cartão */}
            <div className="py-2.5 text-center" style={{ backgroundColor: QUIZ_DARK }}>
              <span className="text-[13px] font-semibold text-white tracking-wide">Quiz Fiscal</span>
            </div>
            {/* Progress header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold" style={{ color: "#415439" }}>
                  {indice + 1}/{total}
                </span>
                <m.div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "#d4c4b0" }}
                  role="progressbar"
                  aria-valuenow={indice + 1}
                  aria-valuemax={total}
                  aria-label={`Pergunta ${indice + 1} de ${total}`}
                >
                  <m.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: QUIZ_DARK }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </m.div>
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
                  <span style={{ color: "#C07828" }}><Star size={13} /></span>
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
                    style={{ backgroundColor: "#fef6e4", borderColor: "#D4A030" }}>
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

            {/* Options — mín. 52px de altura (zona verde do polegar) */}
            <div className="px-3 pb-3 space-y-2">
              {opcoes.map((opcao, idx) => {
                const estado = opcaoEstados[idx];
                if (!estado) return null;
                const { className: btnClass, style: btnStyle } = getMobileOpcaoProps(estado);
                return (
                  <m.button
                    key={idx}
                    type="button"
                    disabled={respondida || estado === "eliminada"}
                    onClick={() => { soarToque(); onOpcaoClick(idx); }}
                    className={`${btnClass} relative overflow-visible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]`}
                    style={{ ...btnStyle, minHeight: "52px" }}
                    whileTap={!respondida && estado !== "eliminada" ? { scale: 0.96 } : undefined}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                    aria-label={`Opção ${LETRAS[idx]}: ${opcao.texto}`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold"
                      style={getMobileLetraBadgeStyle(estado)}
                    >
                      {estado === "correta" ? <Check size={14} /> : estado === "errada" ? <Close size={14} /> : LETRAS[idx]}
                    </span>
                    <span className="flex-1 text-left text-[14px] font-medium leading-snug">
                      {opcao.texto}
                    </span>
                    {estado === "correta" && <Check size={16} className="shrink-0 text-[#3a5232]" />}
                    {estado === "correta" && <ParticulasAcerto />}
                  </m.button>
                );
              })}
            </div>

            {/* Responder (guiado) */}
            {!respondida && modo === "guiado" && (
              <div className="px-3 pb-3">
                <button
                  type="button"
                  disabled={!podeConfirmar}
                  onClick={onConfirmar}
                  className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
                  style={{ backgroundColor: QUIZ_DARK }}
                >
                  Responder
                </button>
              </div>
            )}
          </div>
        </m.div>
      </div>

      {/* ── 4. Vantagens grid ── */}
      {!respondida && (
        <div className="mx-3 mt-2 rounded-2xl p-3" style={{ backgroundColor: "#ffffff", border: `1px solid ${BORDER_COLOR}` }}>
          <span className="block mb-2 text-[11px] font-semibold" style={{ color: "#8a7355" }}>Vantagens</span>
          <QuizVantagens
            vantagens={vantagens}
            modo={modo}
            respondida={respondida}
            onEliminar2={onEliminar2}
            onDica={onDica}
            onTempoExtra={onTempoExtra}
            onExplicacao={onExplicacao}
            onPular={onPular}
            onDobrar={onDobrar}
            onSegundaChance={onSegundaChance}
            onEscudo={onEscudo}
            compact
          />
        </div>
      )}

      {/* ── 5. Explicação (após responder) ── */}
      <AnimatePresence>
        {respondida && mostrarExplicacao && (
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
              {explicacaoCorreta && (
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

      {/* ── 6. Sequência + Pontos ── */}
      <AnimatePresence>
        {respondida && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="mx-3 mt-2 flex gap-2"
          >
            <div
              className="flex items-center gap-2.5 rounded-2xl p-3"
              style={{ backgroundColor: "#ffffff", border: `1px solid ${BORDER_COLOR}`, flex: "0 0 auto" }}
            >
              <span style={{ color: "#C07828" }}><Fire size={30} /></span>
              <div>
                <div className="text-[10px] font-semibold" style={{ color: "#8a7355" }}>Sequência</div>
                <div className="text-[22px] font-bold leading-none tabular-nums" style={{ color: "#1a1a17" }}>
                  {streakAtual}
                </div>
              </div>
            </div>

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

      {/* ── 7. Próxima — zona verde do polegar (inferior) ── */}
      <AnimatePresence>
        {respondida && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.3 }}
            className="mx-3 mt-3 mb-2"
          >
            <m.button
              type="button"
              onClick={onSeguinte}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
              style={{ backgroundColor: QUIZ_DARK, minHeight: "56px" }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
            >
              {ultimaPergunta ? "Ver resultado" : "Próxima"}
              <ArrowRight size={20} />
            </m.button>
          </m.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      {/* ── 8. Bottom nav ── */}
      <QuizMobileNav activeTab="home" onHome={onSair} />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ParticulasAcerto() {
  const ITENS = [
    { cor: "#3a5232", dist: 40 }, { cor: "#D4A030", dist: 48 },
    { cor: "#6d815a", dist: 36 }, { cor: "#4a9e4a", dist: 52 },
    { cor: "#b59562", dist: 44 }, { cor: "#3a5232", dist: 34 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {ITENS.map((p, i) => {
        const angulo = (i / ITENS.length) * 360;
        return (
          <m.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos((angulo * Math.PI) / 180) * p.dist,
              y: Math.sin((angulo * Math.PI) / 180) * p.dist,
              opacity: 0,
              scale: 0.2,
            }}
            transition={{ duration: 0.5, delay: 0.04 + i * 0.025, ease: "easeOut" }}
            className="absolute h-2 w-2 rounded-full"
            style={{ backgroundColor: p.cor, left: "50%", top: "50%", marginLeft: -4, marginTop: -4 }}
          />
        );
      })}
    </div>
  );
}

function getMobileOpcaoProps(estado: OpcaoEstado): { className: string; style: React.CSSProperties } {
  const base = "flex w-full items-center gap-3 rounded-xl border px-3 py-3 transition-colors duration-150";
  switch (estado) {
    case "correta":
      return { className: base, style: { backgroundColor: "#d8f5d8", borderColor: "#4a9e4a", color: "#145532" } };
    case "errada":
      return { className: base, style: { backgroundColor: "#f9e4db", borderColor: "#c2745a", color: "#7a3c28" } };
    case "eliminada":
      return { className: `${base} opacity-30 line-through pointer-events-none`, style: { backgroundColor: "#f0e8d8", borderColor: "#d4c4b0", color: "#8a7355" } };
    case "apagada":
      return { className: base, style: { backgroundColor: "#f5f0e8", borderColor: "#e2d9c8", color: "#a0907a", opacity: 0.55 } };
    case "selecionada":
      return { className: base, style: { backgroundColor: "#e8f0e4", borderColor: "#3a5232", boxShadow: "0 0 0 2px rgba(58,82,50,0.12)", color: "#1a1a17" } };
    default:
      return { className: `${base} cursor-pointer`, style: { backgroundColor: "#ffffff", borderColor: "#e2d9c8", color: "#1a1a17" } };
  }
}

function getMobileLetraBadgeStyle(estado: OpcaoEstado): React.CSSProperties {
  switch (estado) {
    case "correta":   return { backgroundColor: "#3a5232", color: "#ffffff" };
    case "errada":    return { backgroundColor: "#c2745a", color: "#ffffff" };
    case "eliminada":
    case "apagada":   return { backgroundColor: "#d4c4b0", color: "#8a7355" };
    default:          return { backgroundColor: "#3a5232", color: "#ffffff" };
  }
}
