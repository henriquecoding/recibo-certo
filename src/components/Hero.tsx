"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { ArrowRight, ShieldCheck, Bank, FileSign, Warning, Calendar } from "@/components/ui/Icons";
import { scrollToId } from "@/lib/scroll";
import { staggerContainer, staggerItem, EASE } from "@/lib/motion";
import { usePerfil, type Perfil } from "@/lib/perfil";
import SeletorModo from "@/components/SeletorModo";
import { compararCategorias } from "@/lib/fiscal-dependente";

const TRUST = [
  { icon: <ShieldCheck size={14} />, text: "Taxas de 2026 verificadas" },
  { icon: <Bank size={14} />, text: "Fontes oficiais: AT e Segurança Social" },
  { icon: <FileSign size={14} />, text: "Base legal em cada cálculo" },
];

const eur0 = (n: number) => `${Math.round(n).toLocaleString("pt-PT")} €`;

const HERO_FAT = 30_000;
const CMP = compararCategorias({ brutoAnual: HERO_FAT, dependentes: 0 });
const EMP = {
  liquido: Math.round(CMP.empresa.liquido),
  impostos: Math.round(CMP.empresa.irc + CMP.empresa.derrama + CMP.empresa.dividendos),
  custos: Math.round(CMP.empresa.custosEmpresa),
};
const CMP_LIQ = {
  dependente: Math.round(CMP.dependente.liquido),
  freelancer: Math.round(CMP.freelancer.liquido),
  empresa: Math.round(CMP.empresa.liquido),
};
const CMP_BEST = Math.max(CMP_LIQ.dependente, CMP_LIQ.freelancer, CMP_LIQ.empresa);

interface TypingStep { text: string; delay: number }

interface CardData {
  etiqueta: string;
  heroLabel: string;
  bruto: number;
  teu: number;
  irs: number;
  ss: number;
  pctSufixo: string;
  linhas: { l: string; v: string; valor: number; strong?: boolean }[];
  box: { tom: "alerta" | "info"; titulo: string; sub: string };
  nota: string;
  typingSteps: TypingStep[];
}

const EXEMPLO: Record<
  Perfil,
  {
    h1: ReactNode;
    sub: string;
    primary: { label: string; href?: string; scrollTo?: string; setModo?: Perfil };
    secondary: { label: string; href?: string; scrollTo?: string; setModo?: Perfil };
    card: CardData;
  }
> = {
  independente: {
    h1: (
      <>
        Sabe quanto é <span className="text-brand">teu</span>, quanto reservar e quando pagar.
      </>
    ),
    sub: "O copiloto financeiro para trabalhadores independentes em Portugal — sem surpresas no fim do ano.",
    primary: { label: "Calcular o meu recibo", scrollTo: "calculadora" },
    secondary: { label: "Como funciona", scrollTo: "features" },
    card: {
      etiqueta: "Recibo de 2 000 € · Art. 151.º",
      heroLabel: "O que é mesmo teu",
      bruto: 2000,
      teu: 1241,
      irs: 460,
      ss: 299,
      pctSufixo: "deste recibo é mesmo teu",
      linhas: [
        { l: "Retenção IRS (23%)", v: "− 460 €", valor: 460 },
        { l: "Segurança Social", v: "− 299 €", valor: 299 },
        { l: "Disponível para gastar", v: "1 241 €", valor: 1241, strong: true },
      ],
      box: { tom: "alerta", titulo: "Prazo SS — 20 julho", sub: "Reserva 299 € · avisamos a tempo" },
      nota: "Atividade estabelecida (2.º ano ou seguinte). No 1.º ano de atividade, a Segurança Social é isenta e a retenção na fonte pode ser dispensada.",
      typingSteps: [
        { text: "2", delay: 320 },
        { text: "20", delay: 260 },
        { text: "200", delay: 240 },
        { text: "2003", delay: 300 },
        { text: "200", delay: 600 },
        { text: "2000", delay: 280 },
        { text: "2 000 €", delay: 500 },
      ],
    },
  },
  dependente: {
    h1: (
      <>
        Do salário bruto,
        <br />
        sabe o teu <span className="text-brand">líquido real.</span>
      </>
    ),
    sub: "Vê o que devias receber ao fim do mês — com a retenção de IRS de 2026, a Segurança Social e os subsídios de férias e de Natal. Depois compara com o teu recibo de vencimento.",
    primary: { label: "Simular o meu salário", scrollTo: "calculadora" },
    secondary: { label: "Comparar caminhos", setModo: "comparar" },
    card: {
      etiqueta: "Salário de 1 500 € · Continente",
      heroLabel: "O teu líquido",
      bruto: 1500,
      teu: 1167,
      irs: 168,
      ss: 165,
      pctSufixo: "do bruto chega ao bolso",
      linhas: [
        { l: "Retenção IRS", v: "− 168 €", valor: 168 },
        { l: "Segurança Social (11%)", v: "− 165 €", valor: 165 },
        { l: "Vencimento líquido", v: "1 167 €", valor: 1167, strong: true },
      ],
      box: { tom: "info", titulo: "14 meses por ano", sub: "Subsídios de férias e de Natal incluídos" },
      nota: "Líquido de um mês normal, sem subsídio de refeição. Tabela I (não casado, sem dependentes), Continente.",
      typingSteps: [
        { text: "1", delay: 300 },
        { text: "15", delay: 280 },
        { text: "150", delay: 260 },
        { text: "1500", delay: 240 },
        { text: "1 500 €", delay: 500 },
      ],
    },
  },
  empresa: {
    h1: (
      <>
        Vale a pena <span className="text-brand">abrir empresa?</span> Vê o líquido real.
      </>
    ),
    sub: "Simula a tua sociedade — IRC PME, derrama, tributação autónoma e distribuição de dividendos. Descobre quanto te fica no bolso e quando compensa face aos recibos verdes.",
    primary: { label: "Simular a minha empresa", scrollTo: "calculadora" },
    secondary: { label: "Comparar caminhos", setModo: "comparar" },
    card: {
      etiqueta: "Faturação 30 000 €/ano · via empresa",
      heroLabel: "Líquido pela empresa",
      bruto: HERO_FAT,
      teu: EMP.liquido,
      irs: EMP.impostos,
      ss: EMP.custos,
      pctSufixo: "fica contigo via empresa",
      linhas: [
        { l: "IRC, derrama e dividendos", v: `− ${eur0(EMP.impostos)}`, valor: EMP.impostos },
        { l: "Custos de estrutura", v: `− ${eur0(EMP.custos)}`, valor: EMP.custos },
        { l: "Líquido anual estimado", v: eur0(EMP.liquido), valor: EMP.liquido, strong: true },
      ],
      box: { tom: "info", titulo: "IRC PME a 15%", sub: "Sobre os primeiros 50 000 € de lucro tributável" },
      nota: "Estimativa para 30 000 €/ano de faturação. Modela IRC PME, derrama e dividendos a 28% — não substitui um contabilista certificado.",
      typingSteps: [
        { text: "3", delay: 280 },
        { text: "30", delay: 240 },
        { text: "300", delay: 220 },
        { text: "3000", delay: 240 },
        { text: "30009", delay: 300 },
        { text: "3000", delay: 620 },
        { text: "30000", delay: 260 },
        { text: "30 000 €", delay: 550 },
      ],
    },
  },
  comparar: {
    h1: (
      <>
        Qual o <span className="text-brand">melhor caminho</span> para o teu rendimento?
      </>
    ),
    sub: "Para o mesmo rendimento anual, compara o líquido como por conta de outrem, recibos verdes ou empresa — com o ponto de viragem e o calendário fiscal de cada cenário.",
    primary: { label: "Comparar cenários", scrollTo: "calculadora" },
    secondary: { label: "Como funciona", scrollTo: "features" },
    card: {
      etiqueta: "Mesmo rendimento · 30 000 €/ano",
      heroLabel: "Mais líquido",
      bruto: HERO_FAT,
      teu: CMP_BEST,
      irs: CMP_LIQ.freelancer,
      ss: CMP_LIQ.dependente,
      pctSufixo: "no melhor cenário",
      linhas: [
        { l: "Por conta de outrem", v: eur0(CMP_LIQ.dependente), valor: CMP_LIQ.dependente, strong: CMP.melhor === "dependente" },
        { l: "Recibos verdes", v: eur0(CMP_LIQ.freelancer), valor: CMP_LIQ.freelancer, strong: CMP.melhor === "freelancer" },
        { l: "Empresa (Lda)", v: eur0(CMP_LIQ.empresa), valor: CMP_LIQ.empresa, strong: CMP.melhor === "empresa" },
      ],
      box: { tom: "info", titulo: "Uma base, três caminhos", sub: "Vê o ponto de viragem e o calendário fiscal" },
      nota: "Estimativa para 30 000 €/ano. Ajusta o rendimento e os pressupostos na ferramenta de comparação.",
      typingSteps: [
        { text: "3", delay: 280 },
        { text: "30", delay: 240 },
        { text: "300", delay: 220 },
        { text: "3000", delay: 240 },
        { text: "30000", delay: 280 },
        { text: "30 000 €", delay: 550 },
      ],
    },
  },
};

/* ── Contagem animada suave ──────────────────────────────────── */

function CountUp({ target, delay = 0, prefix = "" }: { target: number; delay?: number; prefix?: string }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setVal(0);
    setStarted(false);
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [target, delay]);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf = 0;
    const dur = 900;
    const start = performance.now();
    function tick() {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target]);

  return <>{prefix}{val.toLocaleString("pt-PT")} €</>;
}

/* ══════════════════════════════════════════════════════════════
   Cartão hero — simulação de uso em loop contínuo
   ─────────────────────────────────────────────────────────────
   Fases: idle → focusing → typing → typed → calculating → result
   Após resultado completo: 4 s estático → fade out → reinício

   Layout reestruturado:
     «Demo ao vivo» indicador
     ┌─────────────────────────┐
     │  Cartão de simulação    │  ← sombra/borda muda por fase
     └─────────────────────────┘
     ●── Insere ──●── Calcula ──●── Resultado
                    indicador de fase
   ══════════════════════════════════════════════════════════════ */

type Phase = "idle" | "focusing" | "typing" | "typed" | "calculating" | "result";

const HOLD_MS = 4000;
const FADE_MS = 600;
const STEP_LABELS = ["Insere o valor", "Calcula", "Resultado"];

function phaseToStep(phase: Phase): number {
  if (phase === "idle") return -1;
  if (phase === "focusing" || phase === "typing" || phase === "typed") return 0;
  if (phase === "calculating") return 1;
  return 2;
}

function HeroCard({ perfil, card }: { perfil: Perfil; card: CardData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [typedText, setTypedText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [linesVisible, setLinesVisible] = useState(false);
  const [boxVisible, setBoxVisible] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [cycle, setCycle] = useState(0);

  const pctTeu = Math.round((card.teu / card.bruto) * 100);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const seg: { v: number; color?: string; cls?: string }[] = [
    { v: card.teu, color: "#1D9E75" },
    { v: card.irs, color: "#9FE1CB" },
    { v: card.ss, cls: "text-brand-deep" },
  ];
  const totalSeg = seg.reduce((s, p) => s + p.v, 0) || 1;
  const stepIndex = phaseToStep(phase);

  const isFocused = phase !== "idle";
  const showCursor = phase === "typing" || phase === "typed";
  const isCalculating = phase === "calculating";
  const isResult = phase === "result";

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      setPhase("result");
      setTypedText(card.typingSteps[card.typingSteps.length - 1].text);
      setResultVisible(true);
      setLinesVisible(true);
      setBoxVisible(true);
      setNoteVisible(true);
      setFading(false);
      return;
    }

    setPhase("idle");
    setTypedText("");
    setResultVisible(false);
    setLinesVisible(false);
    setBoxVisible(false);
    setNoteVisible(false);
    setCursorVisible(false);
    setFading(false);

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    function at(ms: number, fn: () => void) {
      timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    }

    let t = 1200;
    at(t, () => setPhase("focusing"));

    t += 300;
    at(t, () => { setPhase("typing"); setCursorVisible(true); });

    for (const step of card.typingSteps) {
      t += step.delay;
      const txt = step.text;
      at(t, () => setTypedText(txt));
    }

    t += 800;
    at(t, () => setPhase("typed"));

    t += 600;
    at(t, () => setPhase("calculating"));

    t += 700;
    at(t, () => {
      setPhase("result");
      setResultVisible(true);
    });

    t += 400;
    at(t, () => setLinesVisible(true));

    t += 800;
    at(t, () => setBoxVisible(true));

    t += 400;
    at(t, () => setNoteVisible(true));

    t += HOLD_MS;
    at(t, () => setFading(true));

    t += FADE_MS;
    at(t, () => setCycle((c) => c + 1));

    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [perfil, cycle, card.typingSteps, reducedMotion]);

  return (
    <div>
      {/* Live demo indicator */}
      <div className="mb-3 flex items-center gap-2" aria-hidden>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Demo ao vivo
        </span>
      </div>

      {/* Card — shadow/border transitions per phase */}
      <div
        className={`rounded-4xl border bg-white p-6 transition-all duration-700 dark:bg-stone-900 sm:p-7 ${
          isResult && !fading
            ? "border-brand/20 shadow-float dark:border-brand/15"
            : isFocused && !fading
              ? "border-stone-200/80 shadow-lift dark:border-stone-700"
              : "border-stone-200/80 shadow-card dark:border-stone-700"
        }`}
      >
        <div
          style={{
            opacity: fading ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease-out`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400">{card.etiqueta}</span>
            <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
              Exemplo
            </span>
          </div>

          {/* Simulated input field */}
          <div
            className={`relative mt-4 overflow-hidden rounded-2xl border-2 px-4 py-4 transition-all duration-500 ${
              isFocused
                ? "border-brand/30 bg-brand/[0.02] shadow-[0_0_0_4px_rgba(29,158,117,0.06)] dark:border-brand/20 dark:bg-brand/[0.04]"
                : "border-stone-100 bg-stone-50/60 dark:border-stone-700 dark:bg-stone-800/40"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              {card.heroLabel}
            </div>
            <div className="mt-1.5 flex items-baseline font-display text-[2.5rem] font-semibold leading-none tabular-nums sm:text-5xl">
              {isResult ? (
                <span className="text-brand">
                  <CountUp target={card.teu} delay={0} />
                </span>
              ) : isCalculating ? (
                <span className="text-stone-300 dark:text-stone-600">{typedText}</span>
              ) : typedText ? (
                <span className="text-stone-800 dark:text-stone-100">{typedText}</span>
              ) : (
                <span className="text-stone-200 dark:text-stone-700">0 €</span>
              )}
              {showCursor && (
                <span
                  className={`ml-0.5 inline-block h-9 w-[2.5px] translate-y-[2px] rounded-full bg-brand transition-opacity duration-75 sm:h-11 ${
                    cursorVisible ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden
                />
              )}
            </div>

            {/* Calculating — progress sweep at bottom of input */}
            {isCalculating && (
              <m.div
                className="absolute inset-x-0 bottom-0 h-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
              >
                <m.div
                  className="h-full bg-gradient-to-r from-brand/30 via-brand to-brand/30"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.6, ease: EASE }}
                />
              </m.div>
            )}
          </div>

          {/* Percentage badge */}
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cream px-3 py-1.5 text-xs text-stone-500 transition-all duration-500 dark:bg-stone-800 dark:text-stone-400"
            style={{
              opacity: resultVisible ? 1 : 0,
              transform: resultVisible ? "translateY(0)" : "translateY(6px)",
            }}
          >
            <span className="font-semibold tabular-nums text-stone-700 dark:text-stone-200">
              {pctTeu}% {card.pctSufixo}
            </span>
            <span className="text-stone-300 dark:text-stone-600">·</span>
            <span>o resto é do Estado</span>
          </div>

          {/* Proportion bar */}
          <div className="mt-5 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {seg.map((p, i) => (
              <div
                key={i}
                className={`transition-all duration-700 ease-out ${
                  i === 0 ? "rounded-l-full" : i === seg.length - 1 ? "rounded-r-full" : ""
                } ${p.cls ?? ""}`}
                style={{
                  background: p.cls ? "currentColor" : p.color,
                  width: resultVisible ? `${(p.v / totalSeg) * 100}%` : "0%",
                  transitionDelay: resultVisible ? `${200 + i * 150}ms` : "0ms",
                }}
              />
            ))}
          </div>

          {/* Detail lines */}
          <div className="mt-4 space-y-1.5">
            {card.linhas.map((r, i) => (
              <div
                key={r.l}
                className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-500 ease-out ${
                  r.strong ? "bg-brand-light" : "bg-stone-50 dark:bg-stone-800/50"
                }`}
                style={{
                  opacity: linesVisible ? 1 : 0,
                  transform: linesVisible ? "translateX(0)" : "translateX(-12px)",
                  transitionDelay: linesVisible ? `${i * 200}ms` : "0ms",
                }}
              >
                <span className={`text-xs ${r.strong ? "font-semibold text-brand-dark" : "text-stone-500 dark:text-stone-400"}`}>
                  {r.l}
                </span>
                <span className={`text-xs font-semibold tabular-nums ${r.strong ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>
                  {linesVisible ? (
                    r.strong
                      ? <CountUp target={r.valor} delay={i * 200} />
                      : <CountUp target={r.valor} delay={i * 200} prefix="− " />
                  ) : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Info / alert box */}
          <div
            className="transition-all duration-500 ease-out"
            style={{
              opacity: boxVisible ? 1 : 0,
              transform: boxVisible ? "translateY(0)" : "translateY(8px)",
            }}
          >
            {card.box.tom === "alerta" ? (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-alert text-alert-text">
                  <Warning size={12} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-alert-text">{card.box.titulo}</div>
                  <div className="text-xs text-alert-text/80">{card.box.sub}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-brand/20 bg-brand-light p-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <Calendar size={12} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-brand-dark">{card.box.titulo}</div>
                  <div className="text-xs text-brand-dark/80">{card.box.sub}</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <p
            className="mt-3 text-[11px] leading-relaxed text-stone-400 transition-opacity duration-500"
            style={{ opacity: noteVisible ? 1 : 0 }}
          >
            {card.nota}
          </p>
        </div>
      </div>

      {/* ── Step indicators ──────────────────────────────────── */}
      <div
        className="mt-5 flex items-center justify-center"
        style={{
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease-out`,
        }}
        aria-hidden
      >
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={`mx-1.5 h-px w-5 transition-all duration-500 sm:mx-3 sm:w-10 ${
                  i <= stepIndex ? "bg-brand" : "bg-stone-200 dark:bg-stone-700"
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2 w-2 shrink-0 rounded-full transition-all duration-500 ${
                  i === stepIndex
                    ? "bg-brand ring-[3px] ring-brand/20"
                    : i < stepIndex
                      ? "bg-brand"
                      : "bg-stone-200 dark:bg-stone-700"
                }`}
              />
              <span
                className={`whitespace-nowrap text-[10px] font-medium transition-colors duration-500 sm:text-[11px] ${
                  i === stepIndex
                    ? "text-brand"
                    : i < stepIndex
                      ? "text-stone-500 dark:text-stone-400"
                      : "text-stone-300 dark:text-stone-600"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────── */

export default function Hero() {
  const { perfil, definir } = usePerfil();
  const dados = EXEMPLO[perfil];
  const c = dados.card;

  const btnPrimario = "btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float";
  const btnSecundario = "inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200";

  return (
    <section className="grain relative overflow-hidden px-6 pt-20 pb-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute top-40 -left-32 h-[24rem] w-[24rem] rounded-full bg-brand-mint/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-5xl items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
        <m.div initial="hidden" animate="visible" variants={staggerContainer}>
          <m.div variants={staggerItem} className="mb-6">
            <SeletorModo />
          </m.div>

          <m.h1 variants={staggerItem} className="font-display display-1 text-balance font-semibold text-ink">
            {dados.h1}
          </m.h1>

          <m.p variants={staggerItem} className="mt-6 max-w-md text-lg leading-relaxed text-stone-500">
            {dados.sub}
          </m.p>

          <m.div variants={staggerItem} className="mt-9 flex flex-wrap gap-3">
            {dados.primary.setModo ? (
              <button
                type="button"
                onClick={() => {
                  definir(dados.primary.setModo!);
                  scrollToId("calculadora");
                }}
                className={btnPrimario}
              >
                {dados.primary.label}
                <ArrowRight />
              </button>
            ) : dados.primary.href ? (
              <Link href={dados.primary.href} className={btnPrimario}>
                {dados.primary.label}
                <ArrowRight />
              </Link>
            ) : (
              <button type="button" onClick={() => scrollToId(dados.primary.scrollTo!)} className={btnPrimario}>
                {dados.primary.label}
                <ArrowRight />
              </button>
            )}
            {dados.secondary.setModo ? (
              <button
                type="button"
                onClick={() => {
                  definir(dados.secondary.setModo!);
                  scrollToId("calculadora");
                }}
                className={btnSecundario}
              >
                {dados.secondary.label}
              </button>
            ) : dados.secondary.href ? (
              <Link href={dados.secondary.href} className={btnSecundario}>
                {dados.secondary.label}
              </Link>
            ) : (
              <button type="button" onClick={() => scrollToId(dados.secondary.scrollTo!)} className={btnSecundario}>
                {dados.secondary.label}
              </button>
            )}
          </m.div>

          <m.ul variants={staggerItem} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            {TRUST.map((b) => (
              <li key={b.text} className="flex items-center gap-2">
                <span className="text-brand">{b.icon}</span>
                <span className="text-xs font-medium text-stone-500">{b.text}</span>
              </li>
            ))}
          </m.ul>
        </m.div>

        <m.div
          key={perfil}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          className="relative"
        >
          <HeroCard perfil={perfil} card={c} />
        </m.div>
      </div>
    </section>
  );
}
