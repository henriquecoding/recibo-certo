"use client";

import Link from "next/link";
import { Menu, Settings, LogoMark } from "@/components/ui/Icons";

interface QuizHeaderProps {
  nivel?: number;
  tituloNivel?: string;
  xpAtual?: number;
  xpTotal?: number;
  xpPct?: number;
  onMenuToggle?: () => void;
  onSair?: () => void;
}

export default function QuizHeader({
  nivel = 1,
  tituloNivel = "Contribuinte Curioso",
  xpAtual = 0,
  xpTotal = 200,
  xpPct,
  onMenuToggle,
  onSair,
}: QuizHeaderProps) {
  const pct = xpPct != null
    ? xpPct
    : xpTotal > 0
    ? Math.min(100, Math.round((xpAtual / xpTotal) * 100))
    : 0;

  return (
    <header
      className="flex items-center gap-4 px-5 py-3.5 border-b shrink-0"
      style={{ backgroundColor: "#f0e8d8", borderColor: "#d4b896" }}
    >
      {/* Hamburger */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-70 active:scale-95"
        style={{ color: "#6b5240" }}
        aria-label="Abrir menu de categorias"
        aria-expanded={false}
      >
        <Menu size={20} />
      </button>

      {/* Logo — links to homepage */}
      <Link href="/" className="flex items-center gap-2.5 shrink-0 transition-opacity hover:opacity-80">
        <LogoMark size={34} />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-bold leading-tight tracking-tight">
            <span style={{ color: "#145532" }}>Recibo</span>
            <span style={{ color: "#55b15a" }}>Certo</span>
          </span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#8a7355" }}>
            Quiz Fiscal
          </span>
        </div>
      </Link>

      <div className="flex-1" />

      {/* Level badge + XP */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center text-[15px] font-bold text-white"
          style={{
            backgroundColor: "#415439",
            clipPath: "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)",
          }}
          aria-label={`Nivel ${nivel}`}
          title={tituloNivel}
        >
          {nivel}
        </div>

        <div className="hidden sm:flex flex-col gap-1 min-w-0">
          <span className="text-[12px] font-semibold truncate" style={{ color: "#415439" }}>
            {tituloNivel}
          </span>
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-32 rounded-full overflow-hidden"
              style={{ backgroundColor: "#d4c4b0" }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% para o proximo nivel`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(to right, #425c3b, #6d815a)",
                  transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>
            <span className="text-[11px] font-bold tabular-nums whitespace-nowrap" style={{ color: "#415439" }}>
              {xpAtual.toLocaleString("pt-PT")} XP
            </span>
          </div>
        </div>
      </div>

      {/* Sair */}
      <button
        type="button"
        onClick={onSair}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-70 active:scale-95"
        style={{ color: "#6b5240" }}
        aria-label="Sair do Quiz"
        title="Sair do Quiz"
      >
        <Settings size={20} />
      </button>
    </header>
  );
}
