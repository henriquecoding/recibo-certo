"use client";

import { Menu, Settings, LogoMark } from "@/components/ui/Icons";

interface QuizHeaderProps {
  nivel?: number;
  tituloNivel?: string;
  xpAtual?: number;
  xpTotal?: number;
  onMenuToggle?: () => void;
  onSair?: () => void;
}

export default function QuizHeader({
  nivel = 4,
  tituloNivel = "Aprendiz Fiscal",
  xpAtual = 850,
  xpTotal = 1500,
  onMenuToggle,
  onSair,
}: QuizHeaderProps) {
  const xpPct = Math.min(100, Math.round((xpAtual / xpTotal) * 100));

  return (
    <header
      className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
      style={{ backgroundColor: "#f1e4d4", borderColor: "#d4b896" }}
    >
      {/* Hamburger */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-70 active:scale-95"
        style={{ border: "1px solid #b59562", color: "#b59562" }}
        aria-label="Abrir menu de categorias"
        aria-expanded={false}
      >
        <Menu size={16} />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <LogoMark size={28} />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[13px] font-bold leading-tight tracking-tight">
            <span style={{ color: "#145532" }}>Recibo</span>
            <span style={{ color: "#55b15a" }}>Certo</span>
          </span>
          <span
            className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "#8a7355" }}
          >
            Quiz Fiscal
          </span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Level badge + XP */}
      <div className="flex items-center gap-2.5">
        {/* Hexagonal level badge */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold text-white"
          style={{
            backgroundColor: "#415439",
            clipPath:
              "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)",
          }}
          aria-label={`Nível ${nivel}`}
          title={`Nível ${nivel}`}
        >
          {nivel}
        </div>

        {/* Title + XP bar — hidden on very small screens */}
        <div className="hidden sm:flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[11px] font-semibold truncate"
            style={{ color: "#415439" }}
          >
            {tituloNivel}
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className="h-1.5 w-24 rounded-full overflow-hidden"
              style={{ backgroundColor: "#d4c4b0" }}
              role="progressbar"
              aria-valuenow={xpAtual}
              aria-valuemin={0}
              aria-valuemax={xpTotal}
              aria-label={`${xpAtual} de ${xpTotal} XP`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${xpPct}%`,
                  background: "linear-gradient(to right, #425c3b, #6d815a)",
                  transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ color: "#415439" }}
            >
              {xpAtual.toLocaleString("pt-PT")}/{xpTotal.toLocaleString("pt-PT")} XP
            </span>
          </div>
        </div>
      </div>

      {/* Settings / Sair */}
      <button
        type="button"
        onClick={onSair}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-70 active:scale-95"
        style={{ color: "#b59562" }}
        aria-label="Sair do Quiz"
        title="Sair do Quiz"
      >
        <Settings size={18} />
      </button>
    </header>
  );
}
