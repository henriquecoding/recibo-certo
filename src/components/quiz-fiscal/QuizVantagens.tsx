"use client";

import { Zap, Lightbulb, Clock, Eye } from "@/components/ui/Icons";
import type { VantagensEstado } from "@/hooks/useQuizFiscal";

interface QuizVantagensProps {
  vantagens: VantagensEstado;
  modo: "normal" | "guiado";
  respondida: boolean;
  onEliminar2: () => void;
  onDica: () => void;
  onTempoExtra: () => void;
  onExplicacao: () => void;
  compact?: boolean; // para mobile
}

interface PillProps {
  label: string;
  icon: React.ReactNode;
  usada: boolean;
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}

function VantagemPill({ label, icon, usada, disabled, onClick, compact }: PillProps) {
  const ativo = !usada && !disabled;
  return (
    <button
      type="button"
      disabled={usada || disabled}
      onClick={onClick}
      title={label}
      aria-label={usada ? `${label} (já usada)` : label}
      aria-pressed={usada}
      className={`
        flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold
        transition-all duration-150 active:scale-[0.95]
        ${compact ? "px-2 py-1.5 text-[11px]" : ""}
        ${usada
          ? "border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed opacity-60"
          : disabled
          ? "border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed opacity-50"
          : "border-[#b59562]/40 bg-[#f0e8d8] text-[#415439] shadow-sm hover:border-[#b59562] hover:shadow-md cursor-pointer"
        }
      `}
    >
      <span className={ativo ? "text-[#415439]" : "text-stone-400"}>{icon}</span>
      {!compact && <span>{label}</span>}
      {compact && <span className="sr-only">{label}</span>}
      {usada && !compact && (
        <span className="ml-0.5 text-[9px] font-normal opacity-60">usada</span>
      )}
    </button>
  );
}

export default function QuizVantagens({
  vantagens,
  modo,
  respondida,
  onEliminar2,
  onDica,
  onTempoExtra,
  onExplicacao,
  compact = false,
}: QuizVantagensProps) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "flex-wrap" : ""}`} role="group" aria-label="Vantagens">
      {!compact && (
        <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: "#8a7355" }}>
          Vantagens
        </span>
      )}
      <VantagemPill
        label="Eliminar 2"
        icon={<Zap size={compact ? 14 : 13} />}
        usada={vantagens.eliminar2}
        disabled={respondida}
        onClick={onEliminar2}
        compact={compact}
      />
      <VantagemPill
        label="Dica"
        icon={<Lightbulb size={compact ? 14 : 13} />}
        usada={vantagens.dica}
        disabled={respondida}
        onClick={onDica}
        compact={compact}
      />
      {modo === "normal" && (
        <>
          <VantagemPill
            label="+10s"
            icon={<Clock size={compact ? 14 : 13} />}
            usada={vantagens.tempoExtra}
            disabled={respondida}
            onClick={onTempoExtra}
            compact={compact}
          />
          <VantagemPill
            label="Explicar"
            icon={<Eye size={compact ? 14 : 13} />}
            usada={vantagens.explicacao}
            disabled={respondida}
            onClick={onExplicacao}
            compact={compact}
          />
        </>
      )}
    </div>
  );
}
