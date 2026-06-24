"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { m, AnimatePresence, useReducedMotion } from "motion/react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { pct } from "@/lib/format";
import { ESCALOES_IRS } from "@/lib/fiscal-data";
import {
  Sparkle,
  Check,
  Wallet,
  Receipt,
  Scale,
  Laptop,
  Home,
  Briefcase,
  ArrowRight,
} from "@/components/ui/Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Demo "ao vivo" do resultado do Simulador de IRS — pré-visualização rica e
// animada para o hero da página. Alterna entre perfis de exemplo para dar a
// sensação de cálculo em tempo real. Os montantes são ILUSTRATIVOS (rotulados
// "Exemplo"); só os escalões/taxas marginais vêm da fonte de verdade fiscal
// (`ESCALOES_IRS`, Art. 68.º CIRS 2026) — nunca dados fiscais inventados.
//
// Paleta: exclusivamente verde da marca. O que "fica contigo" usa o verde vivo
// (`brand`); o que sai para IRS usa um verde profundo/sóbrio (`brand-deep`, com
// variante clara no modo escuro) — diferenciação por tom, sem laranja/vermelho.
// ─────────────────────────────────────────────────────────────────────────────

interface Cenario {
  persona: string;
  detalhe: string; // contexto curto (região / regime) — dá textura ao exemplo
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  rendimento: number; // rendimento global anual
  coletavel: number; // após deduções (determina o escalão)
  irs: number; // coleta de IRS
  retido: number; // retenções na fonte já feitas
}

// Cada cenário é internamente consistente: as deduções são rendimento − coletável,
// o resultado é sempre retido − coleta, e a taxa efetiva é sempre coleta / rendimento.
const CENARIOS: Cenario[] = [
  { persona: "Freelancer · solteiro", detalhe: "Lisboa · regime simplificado", Icon: Laptop, rendimento: 28_500, coletavel: 23_940, irs: 3_120, retido: 4_360 },
  { persona: "Casal · 2 dependentes", detalhe: "Tributação conjunta", Icon: Home, rendimento: 41_200, coletavel: 35_100, irs: 7_460, retido: 6_600 },
  { persona: "Recibos verdes · 1.º ano", detalhe: "Início de atividade", Icon: Receipt, rendimento: 18_000, coletavel: 9_450, irs: 980, retido: 1_820 },
  { persona: "Consultor · rendimento alto", detalhe: "Porto · escalão de topo", Icon: Briefcase, rendimento: 62_000, coletavel: 54_200, irs: 14_980, retido: 13_650 },
];

const PASSOS = ["Agregado", "Rendimentos", "Deduções", "Resultado"];

// Euro compacto (sem cêntimos) — leitura rápida nos mini-cartões.
const eur0 = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const ESC = ESCALOES_IRS.value;

// Limites reais das taxas marginais — derivados da fonte de verdade, nunca
// codificados à mão (se os escalões de 2026 mudarem, as barras acompanham).
const MARGINAL_MIN = Math.min(...ESC.map((e) => e.taxa));
const MARGINAL_MAX = Math.max(...ESC.map((e) => e.taxa));

// Altura relativa de cada barra (18%–100%) a partir da sua taxa marginal.
function alturaBarra(taxa: number): number {
  const span = MARGINAL_MAX - MARGINAL_MIN || 1;
  return 18 + ((taxa - MARGINAL_MIN) / span) * 82;
}

// Índice do escalão onde cai um rendimento coletável.
function escalaoIndex(coletavel: number): number {
  for (let k = 0; k < ESC.length; k++) {
    if (ESC[k].ate === null || coletavel <= (ESC[k].ate as number)) return k;
  }
  return ESC.length - 1;
}

// Geometria do anel (donut) — proporção do rendimento que fica contigo vs IRS.
const R = 42;
const C = 2 * Math.PI * R;
const GAP = 0.022; // folga (fração do anel) entre os dois arcos — extremos retos, segmentos limpos

export default function DemoIRS() {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [montado, setMontado] = useState(false); // dispara o desenho inicial (anel/barras via CSS)
  const reduz = useReducedMotion();
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => setMontado(true), []);

  // Auto-rotação dos perfis (pausa ao passar o rato / focar; desliga quando o
  // utilizador prefere menos movimento — fica só a navegação manual).
  useEffect(() => {
    if (pausado || reduz) return;
    timer.current = setInterval(() => setI((p) => (p + 1) % CENARIOS.length), 4800);
    return () => clearInterval(timer.current);
  }, [pausado, reduz]);

  const c = CENARIOS[i];
  const derivado = useMemo(() => {
    const taxa = c.irs / c.rendimento; // taxa efetiva
    const ficaContigo = 1 - taxa;
    const deducoes = Math.max(0, c.rendimento - c.coletavel);
    const reembolso = c.retido >= c.irs;
    const resultado = Math.abs(c.retido - c.irs);
    const escIdx = escalaoIndex(c.coletavel);
    return { taxa, ficaContigo, deducoes, reembolso, resultado, escIdx, marginal: ESC[escIdx].taxa };
  }, [c]);

  const { taxa, ficaContigo, deducoes, reembolso, resultado, escIdx, marginal } = derivado;
  const pctContigo = Math.round(ficaContigo * 100);
  // Arcos com folga: cada segmento encolhe meio-gap em cada extremo, para os dois
  // verdes se lerem como partes distintas do anel (e não um traço contínuo).
  const contigoLen = Math.max(0, ficaContigo - GAP) * C;
  const irsLen = Math.max(0, taxa - GAP) * C;

  return (
    <div
      className="relative w-full max-w-md"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      {/* Glows decorativos (clipados, não afetam tooltips) */}
      <div aria-hidden className="pointer-events-none absolute -inset-6 overflow-hidden">
        <div className="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-brand-mint/20 blur-3xl dark:bg-brand/10" />
      </div>

      <div className="grain relative rounded-4xl border border-stone-100 bg-white/95 p-5 shadow-float backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/95 sm:p-6">
        {/* Faixa "a recalcular" — varre a cada troca de perfil, vendendo o "ao vivo" */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-4xl">
          <m.div
            key={`sweep-${i}`}
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-brand to-transparent"
            initial={{ x: "-120%" }}
            animate={{ x: "420%" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* ── Cabeçalho ──────────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-dark dark:bg-brand/10 dark:text-brand">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            Demo ao vivo
          </span>
          <span className="text-[11px] font-medium text-stone-400">IRS 2026 · Exemplo</span>
        </div>

        {/* ── Perfil + seletor ───────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <AnimatePresence mode="wait">
            <m.div
              key={`persona-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="flex min-w-0 items-center gap-2.5"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                <c.Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-stone-700 dark:text-stone-200">{c.persona}</span>
                <span className="block truncate text-[11px] font-medium text-stone-400">{c.detalhe}</span>
              </span>
            </m.div>
          </AnimatePresence>
          <div className="flex flex-shrink-0 items-center gap-1.5" role="tablist" aria-label="Perfis de exemplo">
            {CENARIOS.map((cn, idx) => (
              <button
                key={cn.persona}
                type="button"
                role="tab"
                aria-selected={idx === i}
                aria-label={`Ver exemplo: ${cn.persona}`}
                onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === i ? "w-5 bg-brand" : "w-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Resultado herói + anel ─────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-wider text-stone-400">
              {reembolso ? "Reembolso estimado" : "Imposto a pagar"}
            </div>
            <AnimatePresence mode="wait">
              <m.div
                key={`valor-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`font-display text-4xl font-semibold leading-none tabular-nums sm:text-[2.6rem] ${
                  reembolso ? "text-brand" : "text-brand-deep dark:text-brand-mint"
                }`}
              >
                <AnimatedNumber value={resultado} format={eur0} />
              </m.div>
            </AnimatePresence>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              <Scale size={11} className="text-brand" />
              Taxa efetiva <span className="tabular-nums text-stone-700 dark:text-stone-100">{pct(taxa)}</span>
            </div>
          </div>

          {/* Anel: quanto de cada euro fica contigo */}
          <div className="relative h-[96px] w-[96px] flex-shrink-0" role="img" aria-label={`${pctContigo}% do rendimento fica contigo; ${pct(taxa)} é IRS`}>
            <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
              <circle cx="48" cy="48" r={R} fill="none" strokeWidth="11" className="stroke-stone-100 dark:stroke-stone-800" />
              {/* IRS — verde profundo, arco a seguir ao que fica contigo */}
              <circle
                cx="48"
                cy="48"
                r={R}
                fill="none"
                strokeWidth="11"
                strokeLinecap="butt"
                className="stroke-brand-deep dark:stroke-brand-mint"
                strokeDasharray={`${montado ? irsLen : 0} ${C}`}
                transform={`rotate(${ficaContigo * 360} 48 48)`}
                style={{ transition: reduz ? undefined : "stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)" }}
              />
              {/* Fica contigo — verde vivo, desenha-se a partir do topo (reduced-motion seguro) */}
              <circle
                cx="48"
                cy="48"
                r={R}
                fill="none"
                strokeWidth="11"
                strokeLinecap="butt"
                className="stroke-brand"
                strokeDasharray={`${montado ? contigoLen : 0} ${C}`}
                style={{ transition: reduz ? undefined : "stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-xl font-semibold leading-none tabular-nums text-stone-800 dark:text-stone-100">{pctContigo}%</span>
              <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-stone-400">contigo</span>
            </div>
          </div>
        </div>

        {/* ── Escalões de IRS (dados reais 2026) ─────────────────────── */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Onde cais nos escalões</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand-dark dark:bg-brand/10 dark:text-brand">
              marginal {pct(marginal)}
            </span>
          </div>
          {/* pt-7 reserva espaço para o tooltip do escalão mais alto (sem cortes) */}
          <div
            className="relative flex h-[68px] items-end gap-[3px] pt-7"
            role="img"
            aria-label={`Escalões de IRS 2026, de ${pct(ESC[0].taxa)} a ${pct(ESC[ESC.length - 1].taxa)}. Este perfil cai no ${escIdx + 1}.º escalão, taxa marginal ${pct(marginal)}.`}
          >
            {ESC.map((e, idx) => {
              const ativo = idx === escIdx;
              const altura = alturaBarra(e.taxa);
              return (
                <div key={idx} className="relative flex flex-1 items-end justify-center self-stretch">
                  {ativo && (
                    <m.span
                      key={`tip-${i}`}
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      style={{ bottom: `calc(${altura}% + 5px)` }}
                      className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-deep px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lift"
                    >
                      {idx + 1}.º · {pct(e.taxa)}
                      <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[3px] border-t-[3px] border-x-transparent border-t-brand-deep" />
                    </m.span>
                  )}
                  <span
                    className={`w-full rounded-t-sm transition-[height,background-color] duration-500 ${ativo ? "bg-brand" : "bg-brand/15 dark:bg-brand/25"}`}
                    style={{ height: montado ? `${altura}%` : 0, transitionDelay: reduz ? undefined : `${idx * 0.035}s`, transitionDuration: reduz ? "0ms" : undefined }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Memória de cálculo (compacta, mas com a história completa) ── */}
        <AnimatePresence mode="wait">
          <m.div
            key={`memo-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-5 space-y-px overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800"
          >
            {[
              { Icon: Wallet, l: "Rendimento global", v: eur0(c.rendimento), sub: undefined, tone: "neutro" as const },
              { Icon: Scale, l: "Rendimento coletável", v: eur0(c.coletavel), sub: `${eur0(deducoes)} em deduções`, tone: "neutro" as const },
              { Icon: Receipt, l: "Coleta de IRS", v: `− ${eur0(c.irs)}`, sub: `marginal ${pct(marginal)}`, tone: "out" as const },
              { Icon: Check, l: "Retido na fonte", v: `+ ${eur0(c.retido)}`, sub: undefined, tone: "in" as const },
            ].map((row) => (
              <div key={row.l} className="flex items-center justify-between gap-3 bg-stone-50/70 px-3 py-2 dark:bg-stone-800/40">
                <span className="flex items-center gap-2 text-[12px] text-stone-500 dark:text-stone-400">
                  <row.Icon size={12} className="text-stone-400" />
                  {row.l}
                  {row.sub && <span className="hidden text-[10px] text-stone-400 sm:inline">· {row.sub}</span>}
                </span>
                <span
                  className={`text-[12px] font-semibold tabular-nums ${
                    row.tone === "out" ? "text-brand-deep dark:text-brand-mint" : row.tone === "in" ? "text-brand-dark dark:text-brand" : "text-stone-700 dark:text-stone-200"
                  }`}
                >
                  {row.v}
                </span>
              </div>
            ))}
            <div className={`flex items-center justify-between gap-3 px-3 py-2.5 ${reembolso ? "bg-brand-light dark:bg-brand/10" : "bg-brand-deep/[0.06] dark:bg-brand/[0.08]"}`}>
              <span className={`text-[12px] font-bold ${reembolso ? "text-brand-dark" : "text-brand-deep dark:text-brand-mint"}`}>
                = {reembolso ? "Reembolso" : "A pagar"}
              </span>
              <span className={`text-[13px] font-bold tabular-nums ${reembolso ? "text-brand-dark dark:text-brand" : "text-brand-deep dark:text-brand-mint"}`}>
                {reembolso ? "+ " : "− "}{eur0(resultado)}
              </span>
            </div>
          </m.div>
        </AnimatePresence>

        {/* ── Passos do simulador ────────────────────────────────────── */}
        <div className="mt-5 flex items-center gap-1.5 border-t border-stone-100 pt-4 dark:border-stone-800">
          {PASSOS.map((p, idx) => (
            <div key={p} className="flex flex-1 items-center gap-1.5">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <Check size={9} />
              </span>
              <span className="hidden truncate text-[10px] font-medium text-stone-500 dark:text-stone-400 sm:block">{p}</span>
              {idx < PASSOS.length - 1 && <span className="hidden h-px flex-1 bg-brand/30 sm:block" />}
            </div>
          ))}
          <Sparkle size={12} className="ml-1 flex-shrink-0 text-brand" />
        </div>
      </div>

      {/* Legenda do anel (fora do cartão, discreta) */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-stone-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" /> Fica contigo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-deep dark:bg-brand-mint" /> IRS
        </span>
        <span className="inline-flex items-center gap-1 text-stone-300 dark:text-stone-600">
          <ArrowRight size={11} /> {CENARIOS.length} perfis
        </span>
      </div>
    </div>
  );
}
