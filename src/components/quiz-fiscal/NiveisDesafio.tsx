"use client";

import { NIVEIS } from "@/lib/quiz-fiscal/progresso";
import { useQuizProgresso, NIVEL_ENERGIA_ILIMITADA } from "@/lib/store/quiz-progresso";
import { Trophy, Zap, Star, Target, Fire, Gift } from "@/components/ui/Icons";

const QD = "#3a5232";
const PARCHMENT = "#F7EDE1";
const BORDER = "#E8DBCB";
const ACTIVE_BG = "#e4ede0";
const TEXT_HEAD = "#1C3A22";
const TEXT_MID = "#607757";
const TEXT_MUTED = "#8a7a6a";
const VERDE_NIVEL = "#415439";
const GOLD = "#C07828";

function HexNivel({ n, size = 36, fontSize = 13, alcancado = false }: {
  n: number; size?: number; fontSize?: number; alcancado?: boolean;
}) {
  return (
    <span className="relative inline-flex flex-shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
        <polygon
          points="50,7 88,28.5 88,71.5 50,93 12,71.5 12,28.5"
          fill={alcancado ? VERDE_NIVEL : "transparent"}
          stroke={alcancado ? VERDE_NIVEL : "#d6d3d1"}
          strokeWidth={alcancado ? 13 : 7}
          strokeLinejoin="round"
        />
      </svg>
      <span className="relative font-bold tabular-nums" style={{ fontSize, color: alcancado ? "#fff" : "#a0907a" }}>{n}</span>
    </span>
  );
}

export default function NiveisDesafio() {
  const { xp, nivel, streakRecord } = useQuizProgresso();
  const nivelAtual = nivel.nivel;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10">
      {/* ── Tabela de Níveis ── */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ border: `1px solid ${BORDER}` }}
      >
        {/* Cabeçalho */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ backgroundColor: QD }}
        >
          <Trophy size={20} className="text-amber-300" />
          <div>
            <h2 className="text-[15px] font-bold text-white">Tabela de Níveis</h2>
            <p className="text-[11px] text-white/60">Ganha XP em cada quiz para subir de nível</p>
          </div>
        </div>

        {/* Nível atual resumo */}
        <div
          className="flex items-center gap-4 px-5 py-4"
          style={{ backgroundColor: ACTIVE_BG, borderBottom: `1px solid ${BORDER}` }}
        >
          <HexNivel n={nivelAtual} size={48} fontSize={18} alcancado />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold" style={{ color: TEXT_HEAD }}>{nivel.titulo}</p>
            <p className="text-[12px]" style={{ color: TEXT_MID }}>
              {xp.toLocaleString("pt-PT")} XP acumulados
            </p>
            {nivel.xpProximo != null && (
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full"
                  style={{ backgroundColor: "#d4c4b0" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      backgroundColor: QD,
                      width: `${Math.min(100, Math.round(((xp - nivel.xpMinimo) / (nivel.xpProximo - nivel.xpMinimo)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: TEXT_MID }}>
                  {(nivel.xpProximo - xp).toLocaleString("pt-PT")} XP restantes
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lista de todos os níveis */}
        <div style={{ backgroundColor: PARCHMENT }}>
          {/* Cabeçalho da tabela */}
          <div
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-2.5"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_MUTED, width: 36 }}>
              Nível
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>
              Título
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-right" style={{ color: TEXT_MUTED }}>
              XP mínimo
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-right" style={{ color: TEXT_MUTED, width: 70 }}>
              Próximo
            </span>
          </div>

          {NIVEIS.map((n, i) => {
            const atual = n.nivel === nivelAtual;
            const alcancado = xp >= n.xpMinimo;
            const xpPara = n.xpProximo != null ? (n.xpProximo - n.xpMinimo).toLocaleString("pt-PT") : "—";
            return (
              <div
                key={n.nivel}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-2.5 transition-colors"
                style={{
                  backgroundColor: atual ? ACTIVE_BG : i % 2 === 0 ? PARCHMENT : "#f3ead9",
                  borderBottom: i < NIVEIS.length - 1 ? `1px solid ${BORDER}` : "none",
                }}
              >
                <HexNivel n={n.nivel} size={32} fontSize={12} alcancado={alcancado} />
                <div className="min-w-0">
                  <span
                    className={`text-[13px] ${atual ? "font-bold" : alcancado ? "font-semibold" : "font-medium"}`}
                    style={{ color: atual ? TEXT_HEAD : alcancado ? TEXT_MID : TEXT_MUTED }}
                  >
                    {n.titulo}
                  </span>
                  {atual && (
                    <span
                      className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: QD }}
                    >
                      Atual
                    </span>
                  )}
                  {n.nivel === NIVEL_ENERGIA_ILIMITADA && !atual && (
                    <span
                      className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: "#fef3c7", color: GOLD }}
                    >
                      <Fire size={8} /> Energia ilimitada
                    </span>
                  )}
                  {n.nivel === 10 && !atual && (
                    <span
                      className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: "#fef3c7", color: GOLD }}
                    >
                      <Star size={8} /> Plano exclusivo
                    </span>
                  )}
                </div>
                <span
                  className="text-[12px] font-bold tabular-nums text-right"
                  style={{ color: alcancado ? TEXT_HEAD : TEXT_MUTED }}
                >
                  {n.xpMinimo.toLocaleString("pt-PT")}
                </span>
                <span
                  className="text-[11px] tabular-nums text-right"
                  style={{ color: TEXT_MUTED, width: 70 }}
                >
                  {xpPara} XP
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Desafio de Cupão Pro ── */}
      <div
        className="mt-6 overflow-hidden rounded-2xl"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ backgroundColor: "#78350f" }}
        >
          <Gift size={20} className="text-amber-300" />
          <div>
            <h2 className="text-[15px] font-bold text-white">Desafio Pro</h2>
            <p className="text-[11px] text-amber-200/70">Ganha 3 meses de Pro gratuitamente</p>
          </div>
        </div>

        <div className="p-5" style={{ backgroundColor: PARCHMENT }}>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_HEAD }}>
            Prova que dominas a fiscalidade portuguesa e ganha um cupão de <strong>3 meses de Pro</strong> totalmente grátis!
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {/* Opção 1: Médio */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "#fff", border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: ACTIVE_BG, color: QD }}
                >
                  <Target size={16} />
                </span>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: TEXT_HEAD }}>Caminho Médio</p>
                  <p className="text-[10px] font-semibold" style={{ color: TEXT_MID }}>Consistência</p>
                </div>
              </div>
              <ul className="space-y-2">
                <RequisitoCupao icon={<Fire size={12} />} texto="5 quizzes consecutivos" />
                <RequisitoCupao icon={<Target size={12} />} texto="Todas as respostas corretas" />
                <RequisitoCupao icon={<Star size={12} />} texto="Dificuldade Médio" />
                <RequisitoCupao icon={<Zap size={12} />} texto="10 perguntas por quiz" />
              </ul>
            </div>

            {/* Opção 2: Difícil */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "#fff", border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "#fef3c7", color: GOLD }}
                >
                  <Trophy size={16} />
                </span>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: TEXT_HEAD }}>Caminho Difícil</p>
                  <p className="text-[10px] font-semibold" style={{ color: GOLD }}>Mestria</p>
                </div>
              </div>
              <ul className="space-y-2">
                <RequisitoCupao icon={<Fire size={12} />} texto="3 quizzes consecutivos" />
                <RequisitoCupao icon={<Target size={12} />} texto="Todas as respostas corretas" />
                <RequisitoCupao icon={<Star size={12} />} texto="Dificuldade Difícil" />
                <RequisitoCupao icon={<Zap size={12} />} texto="10 perguntas por quiz" />
              </ul>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            O cupão é gerado automaticamente quando completares o desafio. Receberás um código que poderás ativar na página da tua conta.
            A sequência é reiniciada se errares uma resposta ou mudares de dificuldade.
          </p>
        </div>
      </div>
    </div>
  );
}

function RequisitoCupao({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: ACTIVE_BG, color: QD }}
      >
        {icon}
      </span>
      <span className="text-[12px] font-medium" style={{ color: TEXT_MID }}>{texto}</span>
    </li>
  );
}
