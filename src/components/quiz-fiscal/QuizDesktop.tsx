"use client";

import { m, AnimatePresence } from "motion/react";
import { resolveQuizIcon } from "./icon-map";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal";
import {
  Check, Close, ArrowRight, ExternalLink, Fire, Star, Target, Zap, PaperClip,
} from "@/components/ui/Icons";
import QuizHeader from "./QuizHeader";
import QuizVantagens from "./QuizVantagens";
import type { OpcaoEstado } from "./QuizBookShell";
import type { VantagensEstado } from "@/hooks/useQuizFiscal";
import type { QuizOpcao, QuizCategoria } from "@/lib/quiz-fiscal";
import type { QuizProgressoProps } from "./QuizFiscalApp";

const LETRAS = ["A", "B", "C", "D"];

const ALL_CATEGORIES: { key: QuizCategoria | "todas"; label: string; icon: string }[] = [
  { key: "todas", label: "Todas", icon: "LayoutGrid" },
  { key: "iva", label: "IVA", icon: "Scale" },
  { key: "retencao", label: "IRS", icon: "Wallet" },
  { key: "seguranca_social", label: "Seg. Social", icon: "ShieldCheck" },
  { key: "regime_simplificado", label: "Regime Simpl.", icon: "ChartProjection" },
  { key: "atividades", label: "Atividades", icon: "Briefcase" },
  { key: "categoria_f", label: "Rendimentos Pred.", icon: "Home" },
  { key: "prazos", label: "Obrigações Fiscais", icon: "Calendar" },
];

interface QuizDesktopProps {
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
const PARCHMENT_SIDEBAR = "#f0e8d8";
const BOOK_BG = "#faf6ef";
const BORDER = "#d4c4b0";

function formatTempo(seg: number | undefined): string {
  if (seg == null) return "—";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function QuizDesktop({
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
  explicacoesErradas,
  fonteUrl,
  onSeguinte,
  onSair,
  ultimaPergunta,
  podeConfirmar,
  onConfirmar,
  acertosAteAgora,
  errosAteAgora,
  vantagensUsadas,
  pontosAtuais,
  streakAtual,
  progresso,
}: QuizDesktopProps) {
  const progressPct = Math.round(((indice + 1) / total) * 100);
  const tPct = tempoRestante != null && tempoTotal ? (tempoRestante / tempoTotal) * 100 : null;
  const acertoPct = total > 0 ? Math.round((acertosAteAgora / (indice + 1 || 1)) * 100) : 0;

  const catMeta = categoriaAtiva ? META_CATEGORIA_QUIZ[categoriaAtiva] : null;
  const CatIcon = catMeta ? resolveQuizIcon(catMeta.icon) : null;

  // XP progress within current level
  const xpNoNivel = progresso.xpAtual - progresso.xpNivelBase;
  const xpRange = progresso.xpProximo - progresso.xpNivelBase;
  const xpPct = xpRange > 0 ? Math.min(100, Math.round((xpNoNivel / xpRange) * 100)) : 100;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#6b5240" }}>
      {/* ── Header ── */}
      <QuizHeader
        onSair={onSair}
        onMenuToggle={() => {}}
        nivel={progresso.nivel}
        tituloNivel={progresso.tituloNivel}
        xpAtual={progresso.xpAtual}
        xpTotal={progresso.xpProximo}
        xpPct={xpPct}
      />

      {/* ── Main 3-column layout ── */}
      <div className="flex flex-1 items-start gap-4 p-4 mx-auto w-full max-w-screen-xl">

        {/* ── Left sidebar ── */}
        <aside className="w-60 xl:w-64 shrink-0 flex flex-col gap-3 self-start sticky top-[72px]">
          {/* Categories card */}
          <div
            className="rounded-2xl overflow-hidden shadow-md"
            style={{ backgroundColor: PARCHMENT_SIDEBAR, border: `1px solid ${BORDER}` }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: BORDER }}
            >
              <span className="text-[13px] font-semibold" style={{ color: "#415439" }}>
                Categorias
              </span>
              <div className="h-6 w-3 rounded-b" style={{ backgroundColor: "#415439" }} aria-hidden />
            </div>
            <nav className="py-1">
              {ALL_CATEGORIES.map(({ key, label, icon }) => {
                const Icon = resolveQuizIcon(icon);
                const isActive = key === "todas" ? !categoriaAtiva : categoriaAtiva === key;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors cursor-default ${
                      isActive ? "text-white" : "hover:bg-black/5"
                    }`}
                    style={isActive ? { backgroundColor: QUIZ_DARK, color: "#fff" } : { color: "#415439" }}
                  >
                    <Icon size={16} />
                    {label}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Sequência card */}
          <div
            className="rounded-2xl p-4 shadow-sm"
            style={{ backgroundColor: PARCHMENT_SIDEBAR, border: `1px solid ${BORDER}` }}
          >
            <span className="text-[12px] font-semibold" style={{ color: "#8a7355" }}>Sequência</span>
            <div className="flex items-center gap-3 mt-2">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: QUIZ_DARK }}
              >
                <Fire size={26} />
              </div>
              <div>
                <div className="text-[32px] font-bold leading-none tabular-nums" style={{ color: "#1a1a17" }}>
                  {streakAtual}
                </div>
                <div className="text-[11px]" style={{ color: "#8a7355" }}>
                  {pontosAtuais} pts acumulados
                </div>
              </div>
            </div>
          </div>

          {/* Vantagens card */}
          <div
            className="rounded-2xl p-4 shadow-sm"
            style={{ backgroundColor: PARCHMENT_SIDEBAR, border: `1px solid ${BORDER}` }}
          >
            <span className="text-[12px] font-semibold block mb-3" style={{ color: "#8a7355" }}>Vantagens</span>
            <div className="flex flex-col gap-2">
              <QuizVantagens
                vantagens={vantagens}
                modo={modo}
                respondida={respondida}
                onEliminar2={onEliminar2}
                onDica={onDica}
                onTempoExtra={onTempoExtra}
                onExplicacao={onExplicacao}
              />
            </div>
          </div>

          {/* Energia */}
          <div
            className="rounded-2xl p-4 shadow-sm"
            style={{ backgroundColor: PARCHMENT_SIDEBAR, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold" style={{ color: "#8a7355" }}>Energia</span>
              <span className="text-[12px] font-bold tabular-nums" style={{ color: "#415439" }}>
                {progresso.energiaRestante}/{progresso.energiaTotal}
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: progresso.energiaTotal }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-2 rounded-full"
                  style={{
                    backgroundColor: i < progresso.energiaRestante ? "#F59E0B" : "#d4c4b0",
                  }}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ── Center: book card + below ── */}
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          {/* Book card wrapper — relative for paper clip positioning */}
          <div className="relative" style={{ paddingTop: "22px" }}>
            <span className="absolute top-0 left-8 z-10 text-[#9ca3af]" aria-hidden>
              <PaperClip size={18} />
            </span>

            {/* Book card */}
            <div
              className="rounded-2xl shadow-xl"
              style={{ backgroundColor: BOOK_BG, border: `1px solid ${BORDER}` }}
            >
              {/* Progress header row */}
              <div className="flex items-center gap-3 px-6 py-4">
                <div
                  className="rounded-lg px-3 py-1.5 text-[12px] font-bold"
                  style={{ backgroundColor: "#e8dcc8", color: "#415439" }}
                >
                  {indice + 1}/{total}
                </div>
                <div
                  className="flex-1 h-2.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: "#d4c4b0" }}
                  role="progressbar"
                  aria-valuenow={indice + 1}
                  aria-valuemax={total}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progressPct}%`, backgroundColor: QUIZ_DARK }}
                  />
                </div>
                {tPct != null && (
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden max-w-[100px]"
                    style={{ backgroundColor: "#d4c4b0" }}
                  >
                    <m.div
                      className="h-full rounded-full"
                      style={{ background: tPct > 60 ? QUIZ_DARK : tPct > 30 ? "#b59562" : "#c2745a" }}
                      animate={{ width: `${tPct}%` }}
                      transition={{ duration: 0.9, ease: "linear" }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Star size={15} className="text-amber-400" />
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: "#6b5240" }}>
                    {pontosAtuais} pts
                  </span>
                </div>
              </div>

              <div className="mx-6 h-px" style={{ backgroundColor: "#e8dcc8" }} />

              {/* Question area */}
              <div className="px-6 py-5">
                {CatIcon && (
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "#e8f0e4", color: "#415439" }}
                    >
                      <CatIcon size={24} />
                    </div>
                  </div>
                )}
                <p className="font-display text-[20px] font-bold leading-snug" style={{ color: "#1a1a17" }}>
                  {pergunta}
                </p>
              </div>

              {/* Dica hint (when activated) */}
              <AnimatePresence>
                {dicaVisivel && !respondida && (
                  <m.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-6 mb-3 flex items-start gap-3 rounded-xl border p-3"
                      style={{ backgroundColor: "#fffbeb", borderColor: "#fbbf24" }}>
                      <span className="text-amber-500 shrink-0 mt-0.5">
                        <Star size={16} />
                      </span>
                      <p className="text-[12px] leading-snug" style={{ color: "#78350f" }}>
                        <strong className="block mb-0.5">Dica Fiscal</strong>
                        {legalBasis}
                      </p>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>

              {/* Options */}
              <div className="px-6 pb-5 space-y-2.5">
                {opcoes.map((opcao, idx) => {
                  const estado = opcaoEstados[idx];
                  if (!estado) return null;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={respondida || estado === "eliminada"}
                      onClick={() => onOpcaoClick(idx)}
                      className={desktopOpcaoBtnClass(estado)}
                    >
                      <span className={desktopLetraBadgeClass(estado)}>
                        {estado === "correta" ? <Check size={14} /> : estado === "errada" ? <Close size={14} /> : LETRAS[idx]}
                      </span>
                      <span className="flex-1 text-left text-[15px] font-medium leading-snug">
                        {opcao.texto}
                      </span>
                      {estado === "correta" && <Check size={18} className="shrink-0 text-green-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Guiado mode: Responder button */}
              {!respondida && modo === "guiado" && (
                <div className="px-6 pb-5 pt-1">
                  <button
                    type="button"
                    disabled={!podeConfirmar}
                    onClick={onConfirmar}
                    className="w-full rounded-xl py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: QUIZ_DARK }}
                  >
                    Responder
                  </button>
                </div>
              )}
            </div>
          </div>{/* end book card wrapper */}

          {/* Below book: Dica Fiscal + Próxima */}
          <AnimatePresence>
            {respondida && (
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-stretch gap-3"
              >
                {/* Dica Fiscal */}
                <div
                  className="flex flex-1 items-start gap-3 rounded-2xl p-4"
                  style={{ backgroundColor: PARCHMENT_SIDEBAR, border: `1px solid ${BORDER}` }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full self-center"
                    style={{ backgroundColor: QUIZ_DARK }}
                  >
                    <Star size={18} className="text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold" style={{ color: "#1a1a17" }}>Base Legal</div>
                    <p className="text-[12px] leading-snug mt-0.5 line-clamp-2" style={{ color: "#4a4a44" }}>
                      {legalBasis}
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] font-semibold" style={{ color: "#8a7355" }}>Vantagens</span>
                    <span className="text-[16px] font-bold" style={{ color: "#415439" }}>{vantagensUsadas}</span>
                  </div>
                </div>

                {/* Próxima button */}
                <button
                  type="button"
                  onClick={onSeguinte}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-2xl px-8 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: QUIZ_DARK, minWidth: "160px" }}
                >
                  {ultimaPergunta ? "Ver resultado" : "Próxima"}
                  <ArrowRight size={20} />
                </button>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: Explanation panel ── */}
        <AnimatePresence>
          {respondida && mostrarExplicacao && (
            <m.aside
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.3 }}
              className="relative w-60 xl:w-72 shrink-0 self-start sticky top-[72px]"
              style={{ paddingTop: "22px" }}
            >
              <span className="absolute top-0 right-6 z-10 text-[#9ca3af]" aria-hidden>
                <PaperClip size={18} />
              </span>

              <div
                className="rounded-2xl shadow-md overflow-hidden"
                style={{ backgroundColor: PARCHMENT_SIDEBAR, border: `1px solid ${BORDER}` }}
              >
                {/* Panel header */}
                <div className="px-4 py-3 text-center" style={{ backgroundColor: QUIZ_DARK }}>
                  <span className="text-[14px] font-bold text-white">Explicação Fiscal</span>
                </div>

                {/* Result badge */}
                <div className="p-4">
                  <div
                    className="flex items-center gap-2 rounded-xl py-2.5 px-3"
                    style={{
                      backgroundColor: acertou ? "#e8f0e4" : "#f6e7e0",
                      border: `1px solid ${acertou ? "#b5d4b0" : "#e6c5b7"}`,
                    }}
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: acertou ? "#415439" : "#c2745a" }}
                    >
                      {acertou ? <Check size={12} className="text-white" /> : <Close size={12} className="text-white" />}
                    </div>
                    <span className="text-[13px] font-bold" style={{ color: acertou ? "#145532" : "#7a3c28" }}>
                      {acertou ? "Resposta Correta" : "Resposta Incorreta"}
                    </span>
                  </div>

                  {explicacaoCorreta && (
                    <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "#3a3a36" }}>
                      {explicacaoCorreta}
                    </p>
                  )}

                  <div className="mt-3">
                    <span className="text-[12px] font-bold" style={{ color: "#1a1a17" }}>Base legal:</span>
                    <p className="mt-1 text-[11px]" style={{ color: "#4a4a44" }}>• {legalBasis}</p>
                  </div>

                  {explicacoesErradas && explicacoesErradas.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[12px] font-bold" style={{ color: "#1a1a17" }}>
                        Porque as outras estão erradas?
                      </p>
                      <ul className="mt-2 space-y-2">
                        {explicacoesErradas.map((e) => (
                          <li key={e.letra} className="flex items-start gap-2 text-[11px]" style={{ color: "#4a4a44" }}>
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "#c2745a" }} />
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
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "#e8dcc8", color: "#415439", border: `1px solid ${BORDER}` }}
                    >
                      <ExternalLink size={12} />
                      Ver legislação
                    </a>
                  )}
                </div>
              </div>{/* end inner card */}
            </m.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer stats bar ── */}
      <div
        className="flex items-center justify-center gap-6 px-6 py-3 xl:gap-10"
        style={{ backgroundColor: "#1d2218" }}
      >
        <FooterStat icon={<Target size={16} className="text-[#ebd4a4]" />} label="Acertos" value={`${acertoPct}%`} />
        <div className="h-5 w-px opacity-30" style={{ backgroundColor: "#ebd4a4" }} aria-hidden />
        <FooterStat icon={<Zap size={16} className="text-[#ebd4a4]" />} label="Tempo" value={formatTempo(tempoRestante)} />
        <div className="h-5 w-px opacity-30" style={{ backgroundColor: "#ebd4a4" }} aria-hidden />
        <FooterStat icon={<Star size={16} className="text-[#ebd4a4]" />} label="Pontos" value={String(pontosAtuais)} />
        <div className="h-5 w-px opacity-30" style={{ backgroundColor: "#ebd4a4" }} aria-hidden />
        <FooterStat icon={<Close size={16} className="text-[#ebd4a4]" />} label="Erros" value={String(errosAteAgora)} />
      </div>
    </div>
  );
}

function FooterStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold" style={{ color: "#ebd4a4", opacity: 0.6 }}>{label}</span>
        <span className="text-[14px] font-bold tabular-nums" style={{ color: "#ebd4a4" }}>{value}</span>
      </div>
    </div>
  );
}

function desktopOpcaoBtnClass(estado: OpcaoEstado): string {
  const base = "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 active:scale-[0.99]";
  switch (estado) {
    case "correta":   return `${base} border-green-300 bg-green-50 text-green-900`;
    case "errada":    return `${base} border-red-200 bg-red-50 text-red-900`;
    case "eliminada": return `${base} border-stone-200 bg-stone-100 text-stone-400 opacity-25 line-through`;
    case "apagada":   return `${base} border-stone-200 bg-stone-50 text-stone-400 opacity-50`;
    case "selecionada": return `${base} border-[#415439] bg-green-50 ring-2 ring-[#415439]/20 text-green-900`;
    default:          return `${base} border-[#d4c4b0] bg-white text-[#1a1a17] hover:border-[#415439]/50 hover:shadow-sm`;
  }
}

function desktopLetraBadgeClass(estado: OpcaoEstado): string {
  const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold";
  switch (estado) {
    case "correta":   return `${base} bg-[#415439] text-white`;
    case "errada":    return `${base} bg-[#c2745a] text-white`;
    case "eliminada":
    case "apagada":   return `${base} bg-stone-200 text-stone-400`;
    case "selecionada": return `${base} bg-[#415439] text-white`;
    default:          return `${base} bg-[#415439] text-white`;
  }
}
