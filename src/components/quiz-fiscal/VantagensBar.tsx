"use client";

import { Close, Sparkle, Clock, Eye } from "@/components/ui/Icons";
import type { VantagensEstado } from "@/hooks/useQuizFiscal";

interface VantagensBarProps {
  vantagens: VantagensEstado;
  modo: "normal" | "guiado";
  respondida: boolean;
  onEliminar2: () => void;
  onDica: () => void;
  onTempoExtra: () => void;
  onExplicacao: () => void;
}

interface VantagemBtnProps {
  label: string;
  usada: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}

function VantagemBtn({ label, usada, disabled, icon, onClick }: VantagemBtnProps) {
  return (
    <button
      type="button"
      disabled={usada || disabled}
      onClick={onClick}
      aria-label={label}
      className={`group flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all duration-200 ${
        usada
          ? "border-quiz-parchment-mid bg-quiz-parchment text-quiz-sage dark:border-quiz-olive/30 dark:bg-quiz-forest/40 dark:text-quiz-sage/60"
          : disabled
          ? "border-quiz-parchment-mid bg-quiz-parchment-warm text-quiz-sage dark:border-quiz-olive/30 dark:bg-quiz-forest/40 dark:text-quiz-sage/60"
          : "border-quiz-sage/40 bg-quiz-parchment-warm text-quiz-forest-deep shadow-md hover:border-quiz-olive hover:shadow-lg active:scale-[0.97] dark:border-quiz-sage-dark/60 dark:bg-quiz-olive/30 dark:text-quiz-parchment dark:hover:border-quiz-sage"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {usada && <span className="text-[10px] text-quiz-sage/70 dark:text-quiz-sage/50">usada</span>}
    </button>
  );
}

export default function VantagensBar({
  vantagens,
  modo,
  respondida,
  onEliminar2,
  onDica,
  onTempoExtra,
  onExplicacao,
}: VantagensBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-quiz-sage dark:text-quiz-sage">
        Vantagens
      </span>
      <VantagemBtn
        label="Eliminar 2"
        usada={vantagens.eliminar2}
        disabled={respondida}
        icon={<Close size={13} />}
        onClick={onEliminar2}
      />
      <VantagemBtn
        label="Dica Fiscal"
        usada={vantagens.dica}
        disabled={respondida}
        icon={<Sparkle size={13} />}
        onClick={onDica}
      />
      {modo === "normal" && (
        <>
          <VantagemBtn
            label="Tempo extra"
            usada={vantagens.tempoExtra}
            disabled={respondida}
            icon={<Clock size={13} />}
            onClick={onTempoExtra}
          />
          <VantagemBtn
            label="Ver explicacao"
            usada={vantagens.explicacao}
            disabled={respondida}
            icon={<Eye size={13} />}
            onClick={onExplicacao}
          />
        </>
      )}
    </div>
  );
}
