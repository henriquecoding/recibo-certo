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
      className={`group flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
        usada
          ? "border-stone-100 bg-stone-50 text-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-600"
          : disabled
          ? "border-stone-200 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500"
          : "border-brand/30 bg-white text-brand-dark shadow-card hover:border-brand hover:shadow-lift active:scale-[0.97] dark:border-brand/20 dark:bg-stone-900 dark:text-brand-light"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {usada && <span className="text-[10px] text-stone-400 dark:text-stone-600">usada</span>}
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
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
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
