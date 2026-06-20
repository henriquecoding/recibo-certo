"use client";

import { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import {
  Close, Settings, Check, Clock, Volume, VolumeOff, Keyboard,
  Smartphone, Repeat, LogOut, BookOpen, Eye, Zap, Star, Target,
  RotateCcw, Award, Gauge,
} from "@/components/ui/Icons";
import type { QuizConfig } from "@/hooks/useQuizConfig";
import { DEFAULT_QUIZ_CONFIG } from "@/hooks/useQuizConfig";

const QD = "#3a5232";
const PARCHMENT = "#f0e8d8";
const PARCHMENT_BG = "#faf6ef";
const BORDER = "#d4c4b0";
const BORDER_LIGHT = "#e8dcc8";
const TEXT = "#1a1a17";
const TEXT_MUTED = "#6b5240";
const TEXT_SOFT = "#8a7355";

interface QuizConfigModalProps {
  aberto: boolean;
  onFechar: () => void;
  onReiniciar: () => void;
  onSair: () => void;
  config: QuizConfig;
  onConfigChange: (updates: Partial<QuizConfig>) => void;
}

// ── Toggle switch ──────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className="relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center overflow-hidden rounded-full px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
      style={{ backgroundColor: value ? QD : BORDER, transition: "background-color .2s ease" }}
    >
      {/* Puxador — filho flex (não pode sair do trilho) */}
      <span
        className="h-6 w-6 rounded-full bg-white shadow-sm"
        style={{
          transform: value ? "translateX(20px)" : "translateX(0)",
          transition: "transform .2s cubic-bezier(.34,1.56,.64,1)",
        }}
      />
    </button>
  );
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: QD }}>{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-[.22em]" style={{ color: QD }}>
        {label}
      </span>
    </div>
  );
}

// ── Difficulty pill ────────────────────────────────────────────────────────
const DIFICULDADES: Array<{
  valor: QuizConfig["dificuldade"];
  label: string;
  sub: string;
  cor: string;
}> = [
  { valor: "facil",   label: "Fácil",  sub: "Só perguntas fáceis",    cor: "#415439" },
  { valor: "normal",  label: "Médio",  sub: "Só perguntas médias",    cor: QD },
  { valor: "dificil", label: "Difícil", sub: "Só perguntas difíceis",  cor: "#7a3c28" },
];

// ── Tempo options ──────────────────────────────────────────────────────────
const TEMPOS = [
  { valor: 0,  label: "Livre",  sub: "Sem pressão" },
  { valor: 30, label: "30 seg", sub: "Veloz" },
  { valor: 60, label: "1 min",  sub: "Padrão" },
  { valor: 90, label: "90 seg", sub: "Relaxado" },
];

// ── Perguntas options ──────────────────────────────────────────────────────
const PERGUNTAS = [5, 10, 15, 20];

// ── Preferência rows ───────────────────────────────────────────────────────
const PREFERENCIAS: Array<{
  key: keyof QuizConfig;
  label: string;
  sub: string;
  IconOn: React.ComponentType<{ size?: number; className?: string }>;
  IconOff: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { key: "somAtivo",                label: "Sons do jogo",           sub: "Feedback sonoro para acertos e erros",     IconOn: Volume,      IconOff: VolumeOff },
  { key: "animacoesAtivas",         label: "Animações e partículas", sub: "Tremor no erro, partículas no acerto",     IconOn: Zap,         IconOff: Zap },
  { key: "explicacoesAutomaticas",  label: "Explicações automáticas",sub: "Painel de explicação ao responder",        IconOn: BookOpen,    IconOff: Eye },
  { key: "atalhosTeclado",          label: "Atalhos de teclado",     sub: "Teclas A–D ou 1–4 para responder",         IconOn: Keyboard,    IconOff: Keyboard },
  { key: "vibracaoAtiva",           label: "Vibração",               sub: "Feedback háptico em dispositivos móveis", IconOn: Smartphone,  IconOff: Smartphone },
];

// ── Main component ─────────────────────────────────────────────────────────
export default function QuizConfigModal({
  aberto, onFechar, onReiniciar, onSair, config, onConfigChange,
}: QuizConfigModalProps) {
  const [local, setLocal] = useState<QuizConfig>(config);
  const [confirmSair, setConfirmSair] = useState(false);
  const firstRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (aberto) {
      setLocal(config);
      setConfirmSair(false);
      triggerRef.current = document.activeElement;
      const t = setTimeout(() => firstRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      (triggerRef.current as HTMLElement)?.focus?.();
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [aberto, onFechar]);

  const apply = () => { onConfigChange(local); onFechar(); };
  const reset = () => setLocal(DEFAULT_QUIZ_CONFIG);

  const hasChanges = JSON.stringify(local) !== JSON.stringify(config);
  const isDefaults = JSON.stringify(local) === JSON.stringify(DEFAULT_QUIZ_CONFIG);

  const activeCount =
    (local.dificuldade !== "normal" ? 1 : 0) +
    (local.tempoPorPergunta !== DEFAULT_QUIZ_CONFIG.tempoPorPergunta ? 1 : 0) +
    (local.perguntasPorSessao !== DEFAULT_QUIZ_CONFIG.perguntasPorSessao ? 1 : 0) +
    (!local.somAtivo ? 1 : 0) +
    (!local.animacoesAtivas ? 1 : 0) +
    (!local.explicacoesAutomaticas ? 1 : 0) +
    (!local.atalhosTeclado ? 1 : 0) +
    (!local.vibracaoAtiva ? 1 : 0);

  return (
    <AnimatePresence>
      {aberto && (
        <>
          {/* Overlay */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998]"
            style={{ background: "rgba(26,26,16,.6)", backdropFilter: "blur(4px)" }}
            onClick={onFechar}
            aria-hidden
          />

          {/* Drawer from right */}
          <m.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] z-[9999] flex flex-col"
            style={{ backgroundColor: PARCHMENT_BG, borderLeft: `1px solid ${BORDER}` }}
            role="dialog"
            aria-modal
            aria-labelledby="config-titulo"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ backgroundColor: QD }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,.12)" }}
                >
                  <Settings size={18} className="text-white" />
                </div>
                <div>
                  <h2
                    id="config-titulo"
                    className="text-[16px] font-bold leading-tight text-white"
                  >
                    Configurações
                  </h2>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,.6)" }}>
                    Quiz Fiscal — personalização
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <span
                    className="text-[10px] font-black px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,.18)", color: "white" }}
                  >
                    {activeCount} alteraç{activeCount !== 1 ? "ões" : "ão"}
                  </span>
                )}
                <button
                  ref={firstRef}
                  type="button"
                  onClick={onFechar}
                  className="flex h-9 w-9 items-center justify-center rounded-xl transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{ backgroundColor: "rgba(255,255,255,.12)", color: "white" }}
                  aria-label="Fechar configurações"
                >
                  <Close size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

              {/* ── Sair do quiz (no topo) ── */}
              {!confirmSair ? (
                <button
                  type="button"
                  onClick={() => setConfirmSair(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border py-3.5 text-[14px] font-semibold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2745a]"
                  style={{ color: "#7a3c28", borderColor: "#c2745a", backgroundColor: "#faf6ef", minHeight: 48 }}
                >
                  <LogOut size={15} />
                  Sair do quiz
                </button>
              ) : (
                <div className="rounded-xl border p-3" style={{ backgroundColor: "#fff0eb", borderColor: "#c2745a" }}>
                  <p className="text-[12px] font-semibold text-center mb-2.5" style={{ color: "#7a3c28" }}>
                    Confirmar saída? O progresso da sessão será perdido.
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmSair(false)} className="flex-1 rounded-lg py-2 text-[13px] font-semibold border" style={{ borderColor: BORDER, color: TEXT_MUTED, backgroundColor: PARCHMENT }}>
                      Cancelar
                    </button>
                    <button type="button" onClick={() => { onFechar(); onSair(); }} className="flex-1 rounded-lg py-2 text-[13px] font-bold text-white" style={{ backgroundColor: "#c2745a" }}>
                      Confirmar saída
                    </button>
                  </div>
                </div>
              )}

              {/* ── Dificuldade ── */}
              <section>
                <SectionHeader icon={<Gauge size={13} />} label="Dificuldade" />
                <div className="grid grid-cols-3 gap-2">
                  {DIFICULDADES.map(d => {
                    const active = local.dificuldade === d.valor;
                    return (
                      <button
                        key={d.valor}
                        type="button"
                        onClick={() => setLocal(l => ({ ...l, dificuldade: d.valor }))}
                        className="flex flex-col items-center gap-1 rounded-xl px-2 py-3 border-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a5232]"
                        style={{
                          backgroundColor: active ? "#e8f0e4" : PARCHMENT,
                          borderColor: active ? QD : BORDER,
                          boxShadow: active ? "0 0 0 3px rgba(58,82,50,.1)" : "none",
                        }}
                      >
                        <span
                          className="text-[13px] font-bold"
                          style={{ color: active ? QD : TEXT }}
                        >
                          {d.label}
                        </span>
                        <span className="text-[10px] leading-tight" style={{ color: TEXT_SOFT }}>
                          {d.sub}
                        </span>
                        {active && (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full mt-0.5"
                            style={{ backgroundColor: QD }}
                          >
                            <Check size={10} className="text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {local.dificuldade === "dificil" && (
                  <p className="mt-2 text-[11px] px-1" style={{ color: "#7a3c28" }}>
                    O quiz passa a trazer apenas perguntas difíceis. Aplica-se na próxima sessão.
                  </p>
                )}
                {local.dificuldade === "facil" && (
                  <p className="mt-2 text-[11px] px-1" style={{ color: "#415439" }}>
                    Modo fácil ativa as dicas automáticas e aumenta o tempo disponível.
                  </p>
                )}
              </section>

              <div className="h-px" style={{ backgroundColor: BORDER_LIGHT }} />

              {/* ── Tempo por Pergunta ── */}
              <section>
                <SectionHeader icon={<Clock size={13} />} label="Tempo por Pergunta" />
                <div className="grid grid-cols-2 gap-2">
                  {TEMPOS.map(t => {
                    const active = local.tempoPorPergunta === t.valor;
                    return (
                      <button
                        key={t.valor}
                        type="button"
                        onClick={() => setLocal(l => ({ ...l, tempoPorPergunta: t.valor }))}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a5232]"
                        style={{
                          backgroundColor: active ? "#e8f0e4" : PARCHMENT,
                          borderColor: active ? QD : BORDER,
                          minHeight: 48,
                        }}
                      >
                        <div>
                          <div className="text-[13px] font-bold" style={{ color: active ? QD : TEXT }}>
                            {t.label}
                          </div>
                          <div className="text-[10px]" style={{ color: TEXT_SOFT }}>{t.sub}</div>
                        </div>
                        {active && (
                          <span
                            className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: QD }}
                          >
                            <Check size={10} className="text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="h-px" style={{ backgroundColor: BORDER_LIGHT }} />

              {/* ── Perguntas por Sessão ── */}
              <section>
                <SectionHeader icon={<Award size={13} />} label="Perguntas por Sessão" />
                <div className="grid grid-cols-4 gap-2">
                  {PERGUNTAS.map(n => {
                    const active = local.perguntasPorSessao === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setLocal(l => ({ ...l, perguntasPorSessao: n }))}
                        className="flex flex-col items-center justify-center rounded-xl border-2 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a5232]"
                        style={{
                          backgroundColor: active ? "#e8f0e4" : PARCHMENT,
                          borderColor: active ? QD : BORDER,
                          minHeight: 54,
                        }}
                      >
                        <span
                          className="text-[22px] font-bold leading-none tabular-nums"
                          style={{ color: active ? QD : TEXT }}
                        >
                          {n}
                        </span>
                        {active && (
                          <span className="text-[9px] font-semibold mt-1" style={{ color: QD }}>
                            ativo
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] px-1" style={{ color: TEXT_SOFT }}>
                  Tem efeito na próxima sessão de jogo.
                </p>
              </section>

              <div className="h-px" style={{ backgroundColor: BORDER_LIGHT }} />

              {/* ── Preferências ── */}
              <section>
                <SectionHeader icon={<Settings size={13} />} label="Preferências" />
                <div className="space-y-1">
                  {PREFERENCIAS.map((pref) => {
                    const value = local[pref.key] as boolean;
                    const Icon = value ? pref.IconOn : pref.IconOff;
                    return (
                      <div
                        key={String(pref.key)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3"
                        style={{
                          backgroundColor: value ? "#e8f0e4" : PARCHMENT,
                          border: `1px solid ${value ? "#b5d4b0" : BORDER}`,
                          minHeight: 52,
                        }}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: value ? QD : BORDER,
                            color: value ? "white" : TEXT_MUTED,
                          }}
                        >
                          <Icon size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold" style={{ color: TEXT }}>
                            {pref.label}
                          </div>
                          <div className="text-[11px]" style={{ color: TEXT_SOFT }}>
                            {pref.sub}
                          </div>
                        </div>
                        <Toggle
                          value={value}
                          onChange={v => setLocal(l => ({ ...l, [pref.key]: v }))}
                          label={pref.label}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="h-px" style={{ backgroundColor: BORDER_LIGHT }} />

              {/* ── Sessão ── */}
              <section>
                <SectionHeader icon={<RotateCcw size={13} />} label="Sessão" />
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => { onConfigChange(local); onReiniciar(); }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
                    style={{ backgroundColor: QD, minHeight: 48 }}
                  >
                    <RotateCcw size={15} />
                    Reiniciar quiz
                  </button>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-3 px-5 py-4 shrink-0"
              style={{ borderTop: `1px solid ${BORDER}`, backgroundColor: PARCHMENT }}
            >
              <button
                type="button"
                onClick={reset}
                disabled={isDefaults}
                className="flex items-center gap-1.5 rounded-xl px-4 py-3 text-[13px] font-semibold border transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a5232]"
                style={{ borderColor: BORDER, color: TEXT_MUTED, backgroundColor: "transparent", minHeight: 44 }}
              >
                <RotateCcw size={13} />
                Repor
              </button>
              <button
                type="button"
                onClick={apply}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a5232]"
                style={{
                  backgroundColor: QD,
                  minHeight: 44,
                  opacity: hasChanges ? 1 : 0.75,
                }}
              >
                {hasChanges ? (
                  <>
                    <Check size={14} />
                    Guardar configurações
                  </>
                ) : (
                  "Fechar"
                )}
              </button>
            </div>
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}
