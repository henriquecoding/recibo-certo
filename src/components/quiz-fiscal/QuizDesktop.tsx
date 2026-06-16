"use client";

import { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { resolveQuizIcon } from "./icon-map";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal";
import {
  Check, Close, ArrowRight, ExternalLink, Fire, Star, Target, Zap,
} from "@/components/ui/Icons";
import QuizHeader from "./QuizHeader";
import QuizVantagens from "./QuizVantagens";
import QuizMenuLateral from "./QuizMenuLateral";
import QuizConfigModal from "./QuizConfigModal";
import { useGameJuice } from "@/hooks/useGameJuice";
import { useQuizConfig } from "@/hooks/useQuizConfig";
import type { OpcaoEstado } from "./QuizBookShell";
import type { VantagensEstado } from "@/hooks/useQuizFiscal";
import type { QuizOpcao, QuizCategoria } from "@/lib/quiz-fiscal";
import type { QuizProgressoProps } from "./QuizFiscalApp";

const LETRAS = ["A", "B", "C", "D"];

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
  onPular,
  onDobrar,
  onSegundaChance,
  onEscudo,
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
  const { soarAcerto, soarErro, soarToque } = useGameJuice();
  const { config, updateConfig } = useQuizConfig();
  const [tremendoTela, setTremendoTela] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const prevRespondida = useRef(false);

  // Game juice ao responder
  useEffect(() => {
    if (respondida && !prevRespondida.current) {
      prevRespondida.current = true;
      if (acertou) {
        soarAcerto();
      } else {
        soarErro();
        setTremendoTela(true);
        const t = setTimeout(() => setTremendoTela(false), 500);
        return () => clearTimeout(t);
      }
    }
    if (!respondida) prevRespondida.current = false;
  }, [respondida, acertou, soarAcerto, soarErro]);

  // Atalhos de teclado: 1-4 / A-D para opções, Enter/Espaço para avançar
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
  const acertoPct = total > 0 ? Math.round((acertosAteAgora / (indice + 1 || 1)) * 100) : 0;

  const catMeta = categoriaAtiva ? META_CATEGORIA_QUIZ[categoriaAtiva] : null;
  const CatIcon = catMeta ? resolveQuizIcon(catMeta.icon) : null;

  const xpNoNivel = progresso.xpAtual - progresso.xpNivelBase;
  const xpRange = progresso.xpProximo - progresso.xpNivelBase;
  const xpPct = xpRange > 0 ? Math.min(100, Math.round((xpNoNivel / xpRange) * 100)) : 100;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#6b5240" }}>
      {/* ── Header ── */}
      <QuizHeader
        menuAberto={menuAberto}
        onMenuToggle={() => setMenuAberto(true)}
        onConfiguracoes={() => setConfigAberta(true)}
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
          {/* Sequência card */}
          <div
            className="rounded-2xl p-4 shadow-sm"
            style={{ backgroundColor: PARCHMENT_SIDEBAR, border: `1px solid ${BORDER}` }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8a7355" }}>Sequência</span>
            <div className="flex items-center gap-3 mt-2">
              <span style={{ color: "#C07828" }}><Fire size={42} /></span>
              <div>
                <div className="text-[42px] font-bold leading-none tabular-nums font-display" style={{ color: "#1a1a17" }}>
                  {streakAtual}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "#8a7355" }}>
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
            <span className="text-[12px] font-semibold block mb-2.5" style={{ color: "#8a7355" }}>Vantagens</span>
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
            />
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
                  style={{ backgroundColor: i < progresso.energiaRestante ? "#C07828" : "#d4c4b0" }}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ── Center: book card + below ── */}
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          {/* Book card wrapper — shake no erro */}
          <div>
            <m.div
              animate={tremendoTela ? { x: [0, -7, 7, -5, 5, -2, 2, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
            >
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
                    aria-label={`Pergunta ${indice + 1} de ${total}`}
                  >
                    <m.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: QUIZ_DARK }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
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
                    <span style={{ color: "#C07828" }}><Star size={15} /></span>
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

                {/* Dica hint */}
                <AnimatePresence>
                  {dicaVisivel && !respondida && (
                    <m.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-6 mb-3 flex items-start gap-3 rounded-xl border p-3"
                        style={{ backgroundColor: "#fef6e4", borderColor: "#D4A030" }}>
                        <span className="shrink-0 mt-0.5" style={{ color: "#C07828" }}>
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

                {/* Hint teclado — só aparece antes de responder */}
                {!respondida && (
                  <p className="px-6 pb-2 text-[10px] text-right" style={{ color: "#b0a090" }}>
                    Atalho: teclas A–D ou 1–4
                  </p>
                )}

                {/* Options */}
                <div className="px-6 pb-5 space-y-2.5">
                  {opcoes.map((opcao, idx) => {
                    const estado = opcaoEstados[idx];
                    if (!estado) return null;
                    const { className: btnClass, style: btnStyle } = getDesktopOpcaoProps(estado);
                    return (
                      <m.button
                        key={idx}
                        type="button"
                        disabled={respondida || estado === "eliminada"}
                        onClick={() => { soarToque(); onOpcaoClick(idx); }}
                        className={`${btnClass} relative overflow-visible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]`}
                        style={btnStyle}
                        whileHover={!respondida && estado === "default" ? { scale: 1.015, y: -1 } : undefined}
                        whileTap={!respondida && estado !== "eliminada" ? { scale: 0.96 } : undefined}
                        transition={{ type: "spring", stiffness: 500, damping: 26 }}
                        aria-label={`Opção ${LETRAS[idx]}: ${opcao.texto}`}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold"
                          style={getDesktopLetraBadgeStyle(estado)}
                        >
                          {estado === "correta" ? <Check size={14} /> : estado === "errada" ? <Close size={14} /> : LETRAS[idx]}
                        </span>
                        <span className="flex-1 text-left text-[15px] font-medium leading-snug">
                          {opcao.texto}
                        </span>
                        {estado === "correta" && <Check size={18} className="shrink-0 text-[#3a5232]" />}
                        {estado === "correta" && <ParticulasAcerto />}
                      </m.button>
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
                      className="w-full rounded-xl py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
                      style={{ backgroundColor: QUIZ_DARK }}
                    >
                      Responder
                    </button>
                  </div>
                )}
              </div>
            </m.div>
          </div>

          {/* Below book: Base Legal + Próxima */}
          <AnimatePresence>
            {respondida && (
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-stretch gap-3"
              >
                <div
                  className="flex flex-1 items-start gap-3 rounded-2xl p-4"
                  style={{ backgroundColor: PARCHMENT_SIDEBAR, border: `1px solid ${BORDER}` }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full self-center"
                    style={{ backgroundColor: "#e8dcc8" }}
                  >
                    <span style={{ color: "#C07828" }}><Star size={18} /></span>
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

                <m.button
                  type="button"
                  onClick={onSeguinte}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-2xl px-8 text-[16px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
                  style={{ backgroundColor: QUIZ_DARK, minWidth: "160px" }}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                >
                  {ultimaPergunta ? "Ver resultado" : "Próxima"}
                  <ArrowRight size={20} />
                </m.button>
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
              className="w-60 xl:w-72 shrink-0 self-start sticky top-[72px]"
            >
              <div
                className="rounded-2xl shadow-md overflow-hidden"
                style={{ backgroundColor: PARCHMENT_SIDEBAR, border: `1px solid ${BORDER}` }}
              >
                <div className="px-4 py-3 text-center" style={{ backgroundColor: QUIZ_DARK }}>
                  <span className="text-[14px] font-bold text-white">Explicação Fiscal</span>
                </div>

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
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a5232]"
                      style={{ backgroundColor: "#e8dcc8", color: "#415439", border: `1px solid ${BORDER}` }}
                    >
                      <ExternalLink size={12} />
                      Ver legislação
                    </a>
                  )}
                </div>
              </div>
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

      <QuizMenuLateral
        aberto={menuAberto}
        onFechar={() => setMenuAberto(false)}
        categoriaAtiva={categoriaAtiva}
        onSair={onSair}
        acertosAteAgora={acertosAteAgora}
        errosAteAgora={errosAteAgora}
        streakAtual={streakAtual}
        pontosAtuais={pontosAtuais}
        indice={indice}
        total={total}
      />
      <QuizConfigModal
        aberto={configAberta}
        onFechar={() => setConfigAberta(false)}
        onReiniciar={onSair}
        onSair={onSair}
        config={config}
        onConfigChange={updateConfig}
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function ParticulasAcerto() {
  const ITENS = [
    { cor: "#3a5232", dist: 48 }, { cor: "#D4A030", dist: 56 },
    { cor: "#6d815a", dist: 44 }, { cor: "#4a9e4a", dist: 60 },
    { cor: "#b59562", dist: 52 }, { cor: "#3a5232", dist: 40 },
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
            transition={{ duration: 0.55, delay: 0.04 + i * 0.025, ease: "easeOut" }}
            className="absolute h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: p.cor, left: "50%", top: "50%", marginLeft: -5, marginTop: -5 }}
          />
        );
      })}
    </div>
  );
}

function getDesktopOpcaoProps(estado: OpcaoEstado): { className: string; style: React.CSSProperties } {
  const base = "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors duration-150";
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
      return { className: base, style: { backgroundColor: "#e8f0e4", borderColor: "#3a5232", boxShadow: "0 0 0 3px rgba(58,82,50,0.1)", color: "#1a1a17" } };
    default:
      return { className: `${base} cursor-pointer hover:bg-[#f5f5f0] hover:shadow-sm`, style: { backgroundColor: "#ffffff", borderColor: "#d4c4b0", color: "#1a1a17" } };
  }
}

function getDesktopLetraBadgeStyle(estado: OpcaoEstado): React.CSSProperties {
  switch (estado) {
    case "correta":   return { backgroundColor: "#3a5232", color: "#ffffff" };
    case "errada":    return { backgroundColor: "#c2745a", color: "#ffffff" };
    case "eliminada":
    case "apagada":   return { backgroundColor: "#d4c4b0", color: "#8a7355" };
    default:          return { backgroundColor: "#3a5232", color: "#ffffff" };
  }
}
