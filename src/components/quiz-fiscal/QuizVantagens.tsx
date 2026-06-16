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

  const pillStyle: React.CSSProperties = usada
    ? { backgroundColor: "#e8dcc8", color: "#9a8a6a", borderColor: "#d4c4b0" }
    : disabled
    ? { backgroundColor: "#e8dcc8", color: "#9a8a6a", borderColor: "#d4c4b0" }
    : { backgroundColor: "#f0e8d8", color: "#415439", borderColor: "#c4a876" };

  return (
    <button
      type="button"
      disabled={usada || disabled}
      onClick={onClick}
      title={label}
      aria-label={usada ? `${label} (já usada)` : label}
      aria-pressed={usada}
      className={`
        flex items-center gap-1.5 rounded-xl border font-semibold
        transition-all duration-150 active:scale-[0.95]
        ${compact ? "px-2 py-1.5 text-[11px]" : "px-3 py-2 text-[12px]"}
        ${(usada || disabled) ? "cursor-not-allowed opacity-60" : "shadow-sm hover:shadow-md cursor-pointer"}
      `}
      style={pillStyle}
    >
      <span style={{ color: ativo ? "#415439" : "#9a8a6a" }}>{icon}</span>
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
    <div
      className={compact ? "flex items-center gap-2 flex-wrap" : "grid grid-cols-2 gap-1.5"}
      role="group"
      aria-label="Vantagens"
    >
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
      <VantagemPill
        label="+10s"
        icon={<Clock size={compact ? 14 : 13} />}
        usada={vantagens.tempoExtra}
        disabled={respondida || modo === "guiado"}
        onClick={onTempoExtra}
        compact={compact}
      />
      <VantagemPill
        label="Explicar"
        icon={<Eye size={compact ? 14 : 13} />}
        usada={vantagens.explicacao}
        disabled={respondida || modo === "guiado"}
        onClick={onExplicacao}
        compact={compact}
      />
    </div>
  );
}
