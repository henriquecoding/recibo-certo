"use client";

import { m, AnimatePresence } from "motion/react";
import { Close, Target, Fire, Star, Check } from "@/components/ui/Icons";
import { resolveQuizIcon } from "./icon-map";
import { META_CATEGORIA_QUIZ } from "@/lib/quiz-fiscal";
import type { QuizCategoria } from "@/lib/quiz-fiscal";

const CATEGORIAS = Object.entries(META_CATEGORIA_QUIZ) as [
  QuizCategoria,
  (typeof META_CATEGORIA_QUIZ)[QuizCategoria],
][];

interface QuizMenuLateralProps {
  aberto: boolean;
  onFechar: () => void;
  categoriaAtiva?: QuizCategoria;
  onSair: () => void;
  acertosAteAgora?: number;
  errosAteAgora?: number;
  streakAtual?: number;
  pontosAtuais?: number;
  indice?: number;
  total?: number;
}

const QD = "#3a5232";
const PARCHMENT = "#f0e8d8";
const BORDER = "#d4c4b0";

export default function QuizMenuLateral({
  aberto,
  onFechar,
  categoriaAtiva,
  onSair,
  acertosAteAgora = 0,
  errosAteAgora = 0,
  streakAtual = 0,
  pontosAtuais = 0,
  indice = 0,
  total = 0,
}: QuizMenuLateralProps) {
  const respondidas = indice + 1;
  const progressPct = total > 0 ? Math.round((respondidas / total) * 100) : 0;
  const acertoPct = respondidas > 0 ? Math.round((acertosAteAgora / respondidas) * 100) : 0;

  return (
    <AnimatePresence>
      {aberto && (
        <>
          {/* Overlay */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onFechar}
            aria-hidden
          />

          {/* Drawer da esquerda */}
          <m.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col"
            style={{ backgroundColor: PARCHMENT, borderRight: `1px solid ${BORDER}` }}
            role="dialog"
            aria-modal
            aria-label="Menu da sessão"
          >
            {/* Cabeçalho */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0 border-b"
              style={{ backgroundColor: QD, borderColor: "rgba(0,0,0,0.15)" }}
            >
              <h2 className="text-[15px] font-bold text-white tracking-wide">Sessão</h2>
              <button
                type="button"
                onClick={onFechar}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Fechar menu"
              >
                <Close size={18} />
              </button>
            </div>

            {/* Stats da sessão */}
            <div className="px-4 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "#8a7355" }}>
                Estatísticas
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StatChip
                  icon={<Target size={14} />}
                  label="Acertos"
                  value={`${acertoPct}%`}
                  accent="#415439"
                  bg="#e8f0e4"
                />
                <StatChip
                  icon={<Close size={14} />}
                  label="Erros"
                  value={String(errosAteAgora)}
                  accent="#c2745a"
                  bg="#f6e7e0"
                />
                <StatChip
                  icon={<Fire size={14} />}
                  label="Sequência"
                  value={String(streakAtual)}
                  accent="#C07828"
                  bg="#fef6e4"
                />
                <StatChip
                  icon={<Star size={14} />}
                  label="Pontos"
                  value={String(pontosAtuais)}
                  accent="#b59562"
                  bg="#faf4e8"
                />
              </div>

              {/* Barra de progresso da sessão */}
              {total > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "#8a7355" }}>
                      Progresso
                    </span>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: "#415439" }}>
                      {indice + 1}/{total}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: BORDER }}
                    role="progressbar"
                    aria-valuenow={indice + 1}
                    aria-valuemax={total}
                    aria-label={`Pergunta ${indice + 1} de ${total}`}
                  >
                    <m.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: QD }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Categorias */}
            <div className="px-4 pt-3 pb-1 shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#8a7355" }}>
                Categorias
              </p>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 pb-2">
              {CATEGORIAS.map(([key, meta]) => {
                const Icon = resolveQuizIcon(meta.icon);
                const ativo = key === categoriaAtiva;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onFechar();
                      if (!ativo) onSair();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#e8dcc8] focus-visible:outline-none focus-visible:bg-[#e8dcc8]"
                    style={{
                      backgroundColor: ativo ? "#deeade" : "transparent",
                    }}
                    aria-current={ativo ? "true" : undefined}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: ativo ? QD : "#d4c4b0",
                        color: ativo ? "#fff" : "#6b5240",
                      }}
                    >
                      {Icon && <Icon size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[12px] font-semibold truncate"
                        style={{ color: ativo ? "#145532" : "#1a1a17" }}
                      >
                        {meta.label}
                      </div>
                      <div className="text-[10px] leading-snug line-clamp-1" style={{ color: "#8a7355" }}>
                        {meta.descricao}
                      </div>
                    </div>
                    {ativo && (
                      <div className="shrink-0" style={{ color: QD }}>
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Rodapé */}
            <div
              className="px-4 py-4 border-t shrink-0 flex flex-col gap-2"
              style={{ borderColor: BORDER }}
            >
              <button
                type="button"
                onClick={() => { onFechar(); onSair(); }}
                className="w-full rounded-xl py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
                style={{ backgroundColor: QD }}
              >
                Nova sessão
              </button>
              <button
                type="button"
                onClick={onFechar}
                className="w-full rounded-xl py-2.5 text-[13px] font-semibold transition-colors hover:bg-[#e8dcc8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
                style={{ color: "#6b5240", border: `1px solid ${BORDER}` }}
              >
                Continuar sessão
              </button>
            </div>
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function StatChip({
  icon,
  label,
  value,
  accent,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  bg: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{ backgroundColor: bg, border: `1px solid ${accent}22` }}
    >
      <span style={{ color: accent }}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: "#8a7355" }}>
          {label}
        </div>
        <div className="text-[16px] font-bold tabular-nums leading-tight" style={{ color: accent }}>
          {value}
        </div>
      </div>
    </div>
  );
}
