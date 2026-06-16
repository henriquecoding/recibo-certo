"use client";

import { m, AnimatePresence } from "motion/react";
import { resolveQuizIcon } from "./icon-map";
import {
  META_CATEGORIA_QUIZ,
  type QuizCategoria,
} from "@/lib/quiz-fiscal";
import {
  Check, Close, Clock, ArrowRight, ExternalLink, Scale, Sparkle, Eye, LayoutGrid,
} from "@/components/ui/Icons";
import type { VantagensEstado, SessaoPergunta } from "@/hooks/useQuizFiscal";
import type { QuizOpcao } from "@/lib/quiz-fiscal";
import QuizHeader from "./QuizHeader";
import QuizMobileNav from "./QuizMobileNav";

const LETRAS = ["A", "B", "C", "D"];

const CATEGORIAS_SIDEBAR: { key: QuizCategoria | "todas"; label: string; iconName: string }[] = [
  { key: "todas", label: "Todas", iconName: "LayoutGrid" },
  { key: "iva", label: "IVA", iconName: "Scale" },
  { key: "retencao", label: "IRS", iconName: "Wallet" },
  { key: "seguranca_social", label: "Seg. Social", iconName: "ShieldCheck" },
  { key: "regime_simplificado", label: "Regime Simpl.", iconName: "ChartProjection" },
  { key: "atividades", label: "Atividades", iconName: "Briefcase" },
  { key: "categoria_f", label: "Cat. F", iconName: "Home" },
  { key: "prazos", label: "Prazos", iconName: "Calendar" },
];

export type OpcaoEstado = "default" | "selecionada" | "correta" | "errada" | "apagada" | "eliminada";

interface QuizBookShellProps {
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

export default function QuizBookShell(props: QuizBookShellProps) {
  const {
    categoriaAtiva, indice, total, pergunta, opcoes, opcaoEstados,
    onOpcaoClick, respondida, acertou,
    tempoRestante, tempoTotal,
    vantagens, modo, onEliminar2, onDica, onTempoExtra, onExplicacao,
    dicaVisivel, legalBasis,
    mostrarExplicacao, explicacaoCorreta, explicacoesErradas,
    fonteLabel, fonteUrl,
    onSeguinte, onSair, ultimaPergunta,
    podeConfirmar, onConfirmar,
    acertosAteAgora, errosAteAgora, vantagensUsadas,
  } = props;

  const tPct = tempoRestante != null && tempoTotal ? (tempoRestante / tempoTotal) * 100 : null;
  const pontos = (indice + 1) * 40;

  return (
    <div className="flex min-h-screen flex-col bg-quiz-leather-dark pb-0 dark:bg-[#1a2318]">
      {/* ── Header (Etapa 1) ── */}
      <div className="sticky top-0 z-30">
        <QuizHeader onSair={onSair} onMenuToggle={() => {}} />
        {/* Stats row — placeholder until Etapa 5 (footer dark bar) */}
        <div className="flex items-center justify-center gap-5 border-b border-quiz-forest/40 bg-quiz-forest px-4 py-1.5 text-xs font-semibold text-quiz-parchment sm:gap-8">
          <StatItem icon={<Check size={12} />} label="Acertos" value={String(acertosAteAgora)} />
          {tempoRestante != null && (
            <StatItem icon={<Clock size={12} />} label="Tempo" value={`${tempoRestante}s`} />
          )}
          <StatItem icon={<Sparkle size={12} />} label="Vantagens" value={String(vantagensUsadas)} />
          <StatItem icon={<Close size={12} />} label="Erros" value={String(errosAteAgora)} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        {/* ── Book container ── */}
        <div className="relative overflow-hidden rounded-2xl border-4 border-quiz-leather bg-quiz-leather shadow-2xl sm:rounded-3xl dark:border-quiz-olive/60 dark:bg-quiz-olive/40">
          {/* Leather texture grain overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-multiply" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          }} />

          {/* ── Inner book pages ── */}
          <div className="relative flex min-h-[520px] flex-col lg:flex-row">
            {/* ▸ Left page — categories sidebar (desktop only) */}
            <aside className="hidden shrink-0 border-r-2 border-quiz-leather-dark/30 bg-quiz-parchment px-4 py-5 lg:block lg:w-52 dark:border-quiz-olive/30 dark:bg-quiz-forest/80">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-quiz-sage">Categorias</span>
                <div className="ml-auto h-5 w-3 rounded-sm bg-quiz-olive/60 dark:bg-quiz-sage-dark/60" />
              </div>
              <nav className="flex flex-col gap-1">
                {CATEGORIAS_SIDEBAR.map(({ key, label, iconName }) => {
                  const Icon = resolveQuizIcon(iconName);
                  const ativo = key === "todas"
                    ? !categoriaAtiva
                    : categoriaAtiva === key;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        ativo
                          ? "bg-quiz-sage-light text-quiz-forest-deep dark:bg-quiz-olive/40 dark:text-quiz-parchment"
                          : "text-quiz-sage-dark hover:bg-quiz-parchment-warm dark:text-quiz-sage dark:hover:bg-quiz-olive/20"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </div>
                  );
                })}
              </nav>
            </aside>

            {/* ▸ Center spine */}
            <div className="hidden w-2 bg-gradient-to-r from-quiz-leather-dark/20 via-quiz-leather-dark/40 to-quiz-leather-dark/20 lg:block dark:from-black/20 dark:via-black/40 dark:to-black/20" />

            {/* ▸ Right page — question area */}
            <div className="flex flex-1 flex-col bg-quiz-parchment dark:bg-quiz-forest/80">
              {/* Question header */}
              <div className="flex flex-wrap items-center gap-3 border-b border-quiz-parchment-border px-4 py-3 sm:px-6 dark:border-quiz-olive/30">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-quiz-sage-border bg-quiz-sage-light px-3 py-1 text-xs font-bold text-quiz-forest-deep dark:border-quiz-olive dark:bg-quiz-olive/30 dark:text-quiz-sage-light">
                  Pergunta {indice + 1}/{total}
                </span>

                {/* Timer / progress bar */}
                {tPct != null && (
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-quiz-parchment-border dark:bg-quiz-olive/40">
                      <m.div
                        className={`h-full rounded-full transition-colors ${
                          tPct > 60 ? "bg-quiz-olive" : tPct > 30 ? "bg-quiz-leather" : "bg-clay"
                        }`}
                        animate={{ width: `${tPct}%` }}
                        transition={{ duration: 0.9, ease: "linear" }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-quiz-sage dark:text-quiz-sage">
                      {tempoRestante}s
                    </span>
                  </div>
                )}

                <span className="ml-auto flex items-center gap-1 text-sm font-bold text-quiz-leather-dark dark:text-quiz-leather">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-quiz-leather"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  {pontos} pts
                </span>
              </div>

              {/* Vantagens bar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-quiz-parchment-border/60 px-4 py-2 sm:px-6 dark:border-quiz-olive/20">
                <span className="text-[10px] font-bold uppercase tracking-widest text-quiz-sage">Vantagens</span>
                <VantagemPill label="Eliminar 2" usada={vantagens.eliminar2} disabled={respondida} icon={<Close size={12} />} onClick={onEliminar2} />
                <VantagemPill label="Dica" usada={vantagens.dica} disabled={respondida} icon={<Sparkle size={12} />} onClick={onDica} />
                {modo === "normal" && (
                  <>
                    <VantagemPill label="+Tempo" usada={vantagens.tempoExtra} disabled={respondida} icon={<Clock size={12} />} onClick={onTempoExtra} />
                    <VantagemPill label="Explicar" usada={vantagens.explicacao} disabled={respondida} icon={<Eye size={12} />} onClick={onExplicacao} />
                  </>
                )}
              </div>

              {/* Dica hint */}
              <AnimatePresence>
                {dicaVisivel && !respondida && (
                  <m.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-4 my-2 flex items-start gap-2.5 rounded-xl border-2 border-quiz-sage/30 bg-quiz-sage-light/60 p-3 text-sm sm:mx-6 dark:border-quiz-sage-dark/30 dark:bg-quiz-olive/20">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-quiz-sage text-white">
                        <Sparkle size={14} />
                      </span>
                      <div>
                        <span className="font-bold text-quiz-forest-deep dark:text-quiz-sage-light">Dica Fiscal</span>
                        <p className="mt-0.5 text-xs text-quiz-sage-dark dark:text-quiz-sage">{legalBasis}</p>
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>

              {/* Question text */}
              <div className="px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
                <p className="font-display text-lg font-semibold leading-relaxed text-quiz-forest-deep dark:text-quiz-parchment sm:text-xl">
                  {pergunta}
                </p>
              </div>

              {/* Options grid */}
              <div className="flex flex-col gap-2 px-4 pb-4 sm:px-6">
                {opcoes.map((opcao, idx) => {
                  const estado = opcaoEstados[idx];
                  if (!estado) return null;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={respondida || estado === "eliminada"}
                      onClick={() => onOpcaoClick(idx)}
                      className={opcaoBtnClass(estado)}
                    >
                      <span className={letraBadgeClass(estado)}>
                        {estado === "correta" ? <Check size={16} /> : estado === "errada" ? <Close size={16} /> : LETRAS[idx]}
                      </span>
                      <span className="flex-1 text-sm font-medium leading-snug sm:text-base">{opcao.texto}</span>
                      {estado === "correta" && (
                        <Check size={18} className="shrink-0 text-quiz-sage-dark" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Confirm / Next button area */}
              <div className="mt-auto border-t border-quiz-parchment-border px-4 py-3 sm:px-6 dark:border-quiz-olive/30">
                <div className="flex items-center justify-between">
                  {/* Progress dots (mobile) */}
                  <div className="flex gap-1 lg:hidden">
                    {Array.from({ length: total }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i === indice ? "w-4 bg-quiz-olive" : i < indice ? "w-1.5 bg-quiz-olive/40" : "w-1.5 bg-quiz-parchment-border"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="ml-auto">
                    {!respondida && modo === "guiado" ? (
                      <button
                        type="button"
                        disabled={!podeConfirmar}
                        onClick={onConfirmar}
                        className="inline-flex items-center gap-2 rounded-xl bg-quiz-forest px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-quiz-forest-deep active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-quiz-olive dark:hover:bg-quiz-sage-dark"
                      >
                        Responder
                      </button>
                    ) : respondida ? (
                      <button
                        type="button"
                        onClick={onSeguinte}
                        className="inline-flex items-center gap-2 rounded-xl bg-quiz-forest px-6 py-2.5 text-base font-bold text-white shadow-lg transition-all hover:bg-quiz-forest-deep active:scale-[0.97] dark:bg-quiz-olive dark:hover:bg-quiz-sage-dark"
                      >
                        {ultimaPergunta ? "Ver resultado" : "Proxima"}
                        <ArrowRight size={18} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* ▸ Explanation panel (right side, appears after answering — desktop) */}
            <AnimatePresence>
              {mostrarExplicacao && respondida && (
                <m.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="hidden overflow-hidden border-l-2 border-quiz-leather-dark/30 bg-quiz-parchment lg:block dark:border-quiz-olive/30 dark:bg-quiz-forest/80"
                >
                  <div className="w-72 px-4 py-5 xl:w-80">
                    <div className="mb-3 inline-flex items-center gap-1 rounded-lg bg-quiz-olive px-3 py-1.5 text-xs font-bold text-white dark:bg-quiz-sage-dark">
                      Explicacao Fiscal
                    </div>

                    {/* Correct/wrong badge */}
                    <div className={`mt-2 flex items-center gap-2 rounded-xl border-2 p-2.5 text-sm font-bold ${
                      acertou
                        ? "border-quiz-sage-border bg-quiz-sage-light text-quiz-forest-deep dark:border-quiz-sage-dark/40 dark:bg-quiz-olive/20 dark:text-quiz-sage-light"
                        : "border-clay-border bg-clay-bg text-clay-text"
                    }`}>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${acertou ? "bg-quiz-sage-dark text-white" : "bg-clay text-white"}`}>
                        {acertou ? <Check size={12} /> : <Close size={12} />}
                      </span>
                      {acertou ? "Resposta Correta" : "Resposta Incorreta"}
                    </div>

                    {/* Correct explanation */}
                    {explicacaoCorreta && (
                      <p className="mt-3 text-sm leading-relaxed text-quiz-forest-deep/80 dark:text-quiz-parchment/80">
                        {explicacaoCorreta}
                      </p>
                    )}

                    {/* Legal basis */}
                    <div className="mt-3 flex items-start gap-2">
                      <Scale size={14} className="mt-0.5 shrink-0 text-quiz-sage" />
                      <div className="text-xs">
                        <span className="font-bold text-quiz-forest-deep dark:text-quiz-parchment">Base legal:</span>
                        <p className="mt-0.5 text-quiz-sage-dark dark:text-quiz-sage">{legalBasis}</p>
                      </div>
                    </div>

                    {/* Why others wrong */}
                    {explicacoesErradas && explicacoesErradas.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-bold text-quiz-forest-deep dark:text-quiz-parchment">Porque as outras estao erradas?</p>
                        <ul className="mt-2 space-y-2">
                          {explicacoesErradas.map((e) => (
                            <li key={e.letra} className="flex items-start gap-1.5 text-xs text-quiz-sage-dark dark:text-quiz-sage">
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-quiz-leather-dark" />
                              <span><strong>{e.texto}</strong> — {e.porque}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Source link */}
                    {fonteUrl && (
                      <a
                        href={fonteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1 rounded-lg border border-quiz-parchment-mid bg-quiz-parchment-warm px-3 py-1.5 text-xs font-semibold text-quiz-olive transition-colors hover:bg-quiz-parchment-border dark:border-quiz-olive/30 dark:bg-quiz-olive/20 dark:text-quiz-sage-light"
                      >
                        <Scale size={12} />
                        Ver legislacao
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Below-book: Explanation (mobile only) ── */}
        <AnimatePresence>
          {mostrarExplicacao && respondida && (
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 lg:hidden"
            >
              <div className="rounded-2xl border-2 border-quiz-parchment-mid bg-quiz-parchment p-4 shadow-lg dark:border-quiz-olive/40 dark:bg-quiz-forest/80">
                <div className={`flex items-center gap-2 rounded-xl border-2 p-2.5 text-sm font-bold ${
                  acertou
                    ? "border-quiz-sage-border bg-quiz-sage-light text-quiz-forest-deep dark:border-quiz-sage-dark/40 dark:bg-quiz-olive/20 dark:text-quiz-sage-light"
                    : "border-clay-border bg-clay-bg text-clay-text"
                }`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${acertou ? "bg-quiz-sage-dark text-white" : "bg-clay text-white"}`}>
                    {acertou ? <Check size={12} /> : <Close size={12} />}
                  </span>
                  {acertou ? "Resposta Correta!" : "Resposta Incorreta"}
                </div>

                {explicacaoCorreta && (
                  <p className="mt-3 text-sm leading-relaxed text-quiz-forest-deep/80 dark:text-quiz-parchment/80">
                    {explicacaoCorreta}
                  </p>
                )}

                <div className="mt-3 flex items-start gap-2">
                  <Scale size={14} className="mt-0.5 shrink-0 text-quiz-sage" />
                  <div className="text-xs">
                    <span className="font-bold text-quiz-forest-deep dark:text-quiz-parchment">Base legal:</span>
                    <p className="mt-0.5 text-quiz-sage-dark dark:text-quiz-sage">{legalBasis}</p>
                  </div>
                </div>

                {explicacoesErradas && explicacoesErradas.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-quiz-forest-deep dark:text-quiz-parchment">Porque as outras estao erradas?</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {explicacoesErradas.map((e) => (
                        <li key={e.letra} className="flex items-start gap-1.5 text-xs text-quiz-sage-dark dark:text-quiz-sage">
                          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-quiz-leather-dark" />
                          <span><strong>{e.texto}</strong> — {e.porque}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fonteUrl && (
                  <a
                    href={fonteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-quiz-olive hover:underline dark:text-quiz-sage-light"
                  >
                    {fonteLabel}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile bottom nav (Etapa 1) ── */}
      <div className="mt-auto lg:hidden">
        <QuizMobileNav activeTab="home" onHome={onSair} />
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="opacity-60">{icon}</span>
      <span className="hidden text-quiz-parchment/60 sm:inline">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function VantagemPill({ label, usada, disabled, icon, onClick }: {
  label: string; usada: boolean; disabled: boolean; icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={usada || disabled}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-all ${
        usada
          ? "border-quiz-parchment-mid bg-quiz-parchment text-quiz-sage/50 dark:border-quiz-olive/20 dark:bg-quiz-forest/40 dark:text-quiz-sage/40"
          : disabled
          ? "border-quiz-parchment-mid bg-quiz-parchment-warm text-quiz-sage/60 dark:border-quiz-olive/20 dark:bg-quiz-forest/40 dark:text-quiz-sage/50"
          : "border-quiz-sage/30 bg-quiz-parchment-warm text-quiz-forest-deep shadow-sm hover:border-quiz-sage hover:shadow-md active:scale-[0.96] dark:border-quiz-sage-dark/40 dark:bg-quiz-olive/20 dark:text-quiz-parchment"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {usada && <span className="text-[9px] opacity-50">usado</span>}
    </button>
  );
}

function opcaoBtnClass(estado: OpcaoEstado): string {
  const base = "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200";
  switch (estado) {
    case "correta":
      return `${base} border-quiz-sage-border bg-quiz-sage-light text-quiz-forest-deep dark:border-quiz-sage-dark/60 dark:bg-quiz-olive/30 dark:text-quiz-parchment`;
    case "errada":
      return `${base} border-clay-border bg-clay-bg text-clay-text`;
    case "apagada":
      return `${base} border-quiz-parchment-mid bg-quiz-parchment opacity-50 dark:border-quiz-olive/20 dark:bg-quiz-forest/30`;
    case "eliminada":
      return `${base} border-quiz-parchment-mid bg-quiz-parchment opacity-25 line-through dark:border-quiz-olive/20 dark:bg-quiz-forest/30`;
    case "selecionada":
      return `${base} border-quiz-olive bg-quiz-sage-light/60 ring-2 ring-quiz-olive/20 dark:border-quiz-sage-dark dark:bg-quiz-olive/30`;
    default:
      return `${base} border-quiz-parchment-mid bg-quiz-parchment-warm hover:border-quiz-sage/50 hover:shadow-md active:scale-[0.99] dark:border-quiz-olive/30 dark:bg-quiz-forest/50 dark:hover:border-quiz-sage/40`;
  }
}

function letraBadgeClass(estado: OpcaoEstado): string {
  const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold";
  switch (estado) {
    case "correta":
      return `${base} bg-quiz-sage-dark text-white`;
    case "errada":
      return `${base} bg-clay text-white`;
    case "apagada":
    case "eliminada":
      return `${base} bg-quiz-parchment-border text-quiz-sage/60 dark:bg-quiz-olive/20`;
    case "selecionada":
      return `${base} bg-quiz-olive text-white dark:bg-quiz-sage-dark`;
    default:
      return `${base} bg-quiz-sage text-white`;
  }
}
