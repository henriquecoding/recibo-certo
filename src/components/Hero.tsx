"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { m, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowRight, ShieldCheck, FileSign, Warning, Calendar, Check, Sparkle, CursorArrow } from "@/components/ui/Icons";
import { scrollToId } from "@/lib/scroll";
import { staggerContainer, staggerItem, EASE } from "@/lib/motion";
import { usePerfil, type Perfil } from "@/lib/perfil";
import { ferramentasPorPerfil } from "@/lib/ferramentas-config";
import { guiasPorPerfil } from "@/lib/guias-config";
import SeletorModo from "@/components/SeletorModo";
import type { ComparacaoCategoriasResult } from "@/lib/fiscal-dependente";

// Selos de confiança — enxutos (2). O detalhe das fontes e as contagens do
// ecossistema vivem, sem repetição, na faixa de números e na secção Fontes.
const TRUST = [
  { icon: <ShieldCheck size={14} />, text: "Taxas de 2026 verificadas" },
  { icon: <FileSign size={14} />, text: "Base legal em cada cálculo" },
];

const eur0 = (n: number) => `${Math.round(n).toLocaleString("pt-PT")} €`;

const HERO_FAT = 30_000;

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

// Os números de empresa/comparação vêm do motor verificado, mas são calculados
// no SERVIDOR (page.tsx) e entram aqui como `CMP` — assim o motor fiscal não é
// enviado para o bundle inicial do cliente. Valores idênticos, zero flash.
function criarExemplos(CMP: ComparacaoCategoriasResult): Record<
  Perfil,
  {
    h1: ReactNode;
    sub: string;
    primary: { label: string; href?: string; scrollTo?: string; setModo?: Perfil };
    secondary: { label: string; href?: string; scrollTo?: string; setModo?: Perfil };
    card: CardData;
  }
> {
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

  return {
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
}

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
   Cartão hero — demo «ao vivo»: encenação de utilização real
   ─────────────────────────────────────────────────────────────
   Coreografia por ciclo (~11 s):
     1. o cartão acorda com ESQUELETO a respirar — nunca fica em
        branco (o conteúdo real, invisível, reserva a altura);
     2. um cursor entra em cena, desliza até ao campo e CLICA
        (ripple + anel de foco) — o valor é digitado com gralha
        corrigida, como um humano;
     3. o cursor desliza até «Calcular» e clica — o botão afunda
        e passa a "a calcular";
     4. o resultado rebenta: número em contagem com pop, clarão
        da marca, faísca, barra de proporção, e cada esqueleto
        transforma-se na linha real em cascata;
     5. pausa de leitura → fade → recomeço.
   `prefers-reduced-motion`: resultado final estático, sem cursor.
   ══════════════════════════════════════════════════════════════ */

type Phase = "idle" | "focusing" | "typing" | "typed" | "calculating" | "result";

interface Ponteiro {
  x: number;
  y: number;
  op: number; // opacidade
  dur: number; // duração do deslize até este alvo
  premido: boolean; // "afunda" no clique
}

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

  // Cursor de rato encenado + ripple do clique — medidos por ciclo em relação
  // ao cartão. A altura do cartão é estável durante o ciclo (o esqueleto ocupa
  // o lugar do conteúdo real), por isso as medições não desatualizam.
  const [ponteiro, setPonteiro] = useState<Ponteiro | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const reduz = useReducedMotion();

  const pctTeu = Math.round((card.teu / card.bruto) * 100);

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
    if (reduz) return;
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, [reduz]);

  useEffect(() => {
    if (reduz) {
      setPhase("result");
      setTypedText(card.typingSteps[card.typingSteps.length - 1].text);
      setResultVisible(true);
      setLinesVisible(true);
      setBoxVisible(true);
      setNoteVisible(true);
      setFading(false);
      setPonteiro(null);
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
    setPonteiro(null);
    setRipple(null);

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    function at(ms: number, fn: () => void) {
      timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    }

    // Centro de um elemento em px, relativo ao canto do cartão.
    const rel = (el: HTMLElement | null, fx: number, fy: number) => {
      const base = cardRef.current;
      if (!el || !base) return null;
      const a = el.getBoundingClientRect();
      const b = base.getBoundingClientRect();
      return { x: a.left - b.left + a.width * fx, y: a.top - b.top + a.height * fy };
    };
    const alvoCampo = () => rel(inputRef.current, 0.34, 0.7);
    const alvoBotao = () => rel(btnRef.current, 0.5, 0.62);

    let t = 650;
    // 1 · cursor entra em cena (aparece parado, depois desliza até ao campo)
    at(t, () => {
      const base = cardRef.current;
      if (!base) return;
      setPonteiro({ x: base.offsetWidth * 0.78, y: base.offsetHeight * 0.5, op: 0, dur: 0, premido: false });
    });
    t += 60;
    at(t, () => setPonteiro((p) => (p ? { ...p, op: 1, dur: 0.25 } : p)));
    t += 260;
    at(t, () => {
      const a = alvoCampo();
      if (a) setPonteiro((p) => (p ? { ...p, ...a, dur: 0.8 } : p));
    });

    // 2 · clique no campo → foco + ripple
    t += 880;
    at(t, () => {
      setPhase("focusing");
      setPonteiro((p) => (p ? { ...p, premido: true } : p));
      const a = alvoCampo();
      if (a) setRipple({ ...a, id: t });
    });
    t += 170;
    at(t, () => setPonteiro((p) => (p ? { ...p, premido: false } : p)));

    // 3 · o rato "estaciona" (esbate-se) e a escrita começa
    t += 260;
    at(t, () => {
      setPhase("typing");
      setCursorVisible(true);
      setPonteiro((p) => (p ? { ...p, x: p.x + 110, y: p.y + 62, op: 0, dur: 0.5 } : p));
    });
    for (const step of card.typingSteps) {
      t += step.delay;
      const txt = step.text;
      at(t, () => setTypedText(txt));
    }
    t += 500;
    at(t, () => setPhase("typed"));

    // 4 · cursor regressa e desliza até «Calcular»
    t += 300;
    at(t, () => {
      const a = alvoBotao();
      if (a) setPonteiro((p) => (p ? { ...p, ...a, op: 1, dur: 0.65 } : p));
    });
    t += 760;
    at(t, () => {
      setPonteiro((p) => (p ? { ...p, premido: true } : p));
      const a = alvoBotao();
      if (a) setRipple({ ...a, id: t });
      setPhase("calculating");
    });
    t += 170;
    at(t, () => setPonteiro((p) => (p ? { ...p, premido: false } : p)));
    t += 230;
    at(t, () => setPonteiro((p) => (p ? { ...p, op: 0, dur: 0.4 } : p)));

    // 5 · resultado em cascata
    t += 480;
    at(t, () => {
      setPhase("result");
      setResultVisible(true);
    });
    t += 420;
    at(t, () => setLinesVisible(true));
    t += 750;
    at(t, () => setBoxVisible(true));
    t += 380;
    at(t, () => setNoteVisible(true));

    t += HOLD_MS;
    at(t, () => setFading(true));
    t += FADE_MS;
    at(t, () => setCycle((c) => c + 1));

    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [perfil, cycle, card.typingSteps, reduz]);

  // Estado visual do botão «Calcular» encenado.
  const btnEstado: "repouso" | "pronto" | "calc" | "feito" = isResult
    ? "feito"
    : isCalculating
      ? "calc"
      : phase === "typed"
        ? "pronto"
        : "repouso";
  const btnCls = {
    repouso: "border border-stone-200 bg-white text-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-500",
    pronto: "bg-brand text-white shadow-glow",
    calc: "bg-brand text-white",
    feito: "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand",
  }[btnEstado];
  const btnPremido = Boolean(ponteiro?.premido) && (isCalculating || phase === "typed");

  // Esqueleto: barra fantasma que respira enquanto o resultado não chega.
  const ghost = "rounded-full bg-stone-200/80 animate-pulse motion-reduce:animate-none dark:bg-stone-700";

  return (
    <div>
      {/* Indicador «Demo ao vivo» — pilha premium, coerente com o DemoIRS */}
      <div className="mb-3 flex items-center justify-between gap-3" aria-hidden>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-dark dark:bg-brand/10 dark:text-brand">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          Demo ao vivo
        </span>
        <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500">Simulação automática</span>
      </div>

      {/* Cartão — sombra/borda acompanham a fase; palco do cursor encenado */}
      <div
        ref={cardRef}
        className={`relative rounded-4xl border bg-white p-6 transition-all duration-700 dark:bg-stone-900 sm:p-7 ${
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
          {/* Cabeçalho */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400">{card.etiqueta}</span>
            <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
              Exemplo
            </span>
          </div>

          {/* Campo simulado + clarão no resultado */}
          <div className="relative mt-4">
            {isResult && !reduz && (
              <m.div
                aria-hidden
                className="pointer-events-none absolute -inset-3 rounded-3xl bg-brand/25 blur-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            )}
            <div
              ref={inputRef}
              className={`relative overflow-hidden rounded-2xl border-2 px-4 py-4 transition-all duration-500 ${
                isFocused
                  ? "border-brand/30 bg-brand/[0.02] shadow-[0_0_0_4px_rgba(29,158,117,0.06)] dark:border-brand/20 dark:bg-brand/[0.04]"
                  : "border-stone-100 bg-stone-50/60 dark:border-stone-700 dark:bg-stone-800/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  {card.heroLabel}
                </div>
                {/* Botão «Calcular» encenado — o cursor clica-o de verdade */}
                <button
                  ref={btnRef}
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  className={`pointer-events-none inline-flex h-8 min-w-[88px] flex-shrink-0 select-none items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-bold transition-all duration-300 ${btnCls}`}
                  style={{ transform: btnPremido ? "scale(0.92)" : "scale(1)" }}
                >
                  {btnEstado === "calc" ? (
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map((d) => (
                        <m.span
                          key={d}
                          className="h-1 w-1 rounded-full bg-white"
                          animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.55, repeat: Infinity, delay: d * 0.12, ease: "easeInOut" }}
                        />
                      ))}
                    </span>
                  ) : btnEstado === "feito" ? (
                    <>
                      <Check size={11} /> Calculado
                    </>
                  ) : (
                    "Calcular"
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-baseline font-display text-[2.5rem] font-semibold leading-none tabular-nums sm:text-5xl">
                {isResult ? (
                  <m.span
                    className="inline-flex items-baseline text-brand"
                    initial={reduz ? false : { opacity: 0, y: 10, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <CountUp target={card.teu} delay={0} />
                  </m.span>
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
                {isResult && !reduz && (
                  <m.span
                    aria-hidden
                    className="ml-2 self-start text-brand"
                    initial={{ opacity: 0, scale: 0, rotate: -40 }}
                    animate={{ opacity: 1, scale: [0, 1.25, 1], rotate: 0 }}
                    transition={{ duration: 0.55, delay: 0.55, ease: EASE }}
                  >
                    <Sparkle size={15} />
                  </m.span>
                )}
              </div>

              {/* A calcular — varrimento de progresso no fundo do campo */}
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
          </div>

          {/* Selo de percentagem (esqueleto → real) */}
          <div className="relative mt-3">
            <div
              className="inline-flex items-center gap-2 rounded-xl bg-cream px-3 py-1.5 text-xs text-stone-500 transition-all duration-500 dark:bg-stone-800 dark:text-stone-400"
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
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 flex items-center transition-opacity duration-300"
              style={{ opacity: resultVisible ? 0 : 1 }}
            >
              <span className={`h-3 w-44 ${ghost}`} />
            </div>
          </div>

          {/* Barra de proporção — a pista fica visível desde o início */}
          <div
            className={`mt-5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800 ${
              resultVisible ? "" : "animate-pulse motion-reduce:animate-none"
            }`}
          >
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

          {/* Linhas de detalhe — cada esqueleto transforma-se na linha real */}
          <div className="mt-4 space-y-1.5">
            {card.linhas.map((r, i) => (
              <div
                key={r.l}
                className={`relative flex min-h-[32px] items-center justify-between rounded-lg px-3 py-2 transition-colors duration-500 ${
                  r.strong && linesVisible ? "bg-brand-light" : "bg-stone-50 dark:bg-stone-800/50"
                }`}
              >
                <span
                  className={`text-xs transition-all duration-500 ease-out ${
                    r.strong ? "font-semibold text-brand-dark" : "text-stone-500 dark:text-stone-400"
                  }`}
                  style={{
                    opacity: linesVisible ? 1 : 0,
                    transform: linesVisible ? "translateX(0)" : "translateX(-10px)",
                    transitionDelay: linesVisible ? `${i * 180}ms` : "0ms",
                  }}
                >
                  {r.l}
                </span>
                <span
                  className={`text-xs font-semibold tabular-nums transition-all duration-500 ease-out ${
                    r.strong ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"
                  }`}
                  style={{
                    opacity: linesVisible ? 1 : 0,
                    transitionDelay: linesVisible ? `${i * 180}ms` : "0ms",
                  }}
                >
                  {linesVisible ? (
                    r.strong
                      ? <CountUp target={r.valor} delay={i * 180} />
                      : <CountUp target={r.valor} delay={i * 180} prefix="− " />
                  ) : "—"}
                </span>
                {/* Esqueleto da linha */}
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-between px-3 transition-opacity duration-300"
                  style={{ opacity: linesVisible ? 0 : 1, transitionDelay: linesVisible ? `${i * 180}ms` : "0ms" }}
                >
                  <span className={`h-2.5 ${i === 0 ? "w-28" : i === 1 ? "w-24" : "w-32"} ${ghost}`} />
                  <span className={`h-2.5 w-12 ${ghost}`} />
                </span>
              </div>
            ))}
          </div>

          {/* Caixa de alerta/info — nasce neutra e ganha a cor ao revelar */}
          <div
            className={`relative mt-4 flex items-center gap-2.5 rounded-xl border p-3 transition-colors duration-500 ${
              !boxVisible
                ? "border-stone-100 bg-stone-50/60 dark:border-stone-700/60 dark:bg-stone-800/40"
                : card.box.tom === "alerta"
                  ? "border-alert-border bg-alert-bg"
                  : "border-brand/20 bg-brand-light"
            }`}
          >
            <div
              className="flex w-full items-center gap-2.5 transition-all duration-500 ease-out"
              style={{
                opacity: boxVisible ? 1 : 0,
                transform: boxVisible ? "translateY(0)" : "translateY(6px)",
              }}
            >
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                  card.box.tom === "alerta" ? "bg-alert text-alert-text" : "bg-brand text-white"
                }`}
              >
                {card.box.tom === "alerta" ? <Warning size={12} /> : <Calendar size={12} />}
              </div>
              <div>
                <div className={`text-xs font-semibold ${card.box.tom === "alerta" ? "text-alert-text" : "text-brand-dark"}`}>
                  {card.box.titulo}
                </div>
                <div className={`text-xs ${card.box.tom === "alerta" ? "text-alert-text/80" : "text-brand-dark/80"}`}>
                  {card.box.sub}
                </div>
              </div>
            </div>
            {/* Esqueleto da caixa */}
            <span
              aria-hidden
              className="absolute inset-0 flex items-center gap-2.5 p-3 transition-opacity duration-300"
              style={{ opacity: boxVisible ? 0 : 1 }}
            >
              <span className="h-6 w-6 flex-shrink-0 animate-pulse rounded-full bg-stone-200/80 motion-reduce:animate-none dark:bg-stone-700" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className={`h-2.5 w-36 max-w-full ${ghost}`} />
                <span className={`h-2 w-48 max-w-full ${ghost}`} />
              </span>
            </span>
          </div>

          {/* Nota de rodapé (esqueleto → real) */}
          <div className="relative mt-3">
            <p
              className="text-[11px] leading-relaxed text-stone-400 transition-opacity duration-500"
              style={{ opacity: noteVisible ? 1 : 0 }}
            >
              {card.nota}
            </p>
            <span
              aria-hidden
              className="absolute inset-0 flex flex-col justify-center gap-1.5 transition-opacity duration-300"
              style={{ opacity: noteVisible ? 0 : 1 }}
            >
              <span className={`h-2 w-full ${ghost}`} />
              <span className={`h-2 w-2/3 ${ghost}`} />
            </span>
          </div>
        </div>

        {/* ── Cursor encenado + ripple de clique ─────────────────── */}
        {ripple && !reduz && (
          <m.span
            key={ripple.id}
            aria-hidden
            className="pointer-events-none absolute z-20 h-12 w-12 rounded-full border-2 border-brand/60"
            style={{ left: ripple.x - 24, top: ripple.y - 24 }}
            initial={{ scale: 0.15, opacity: 0.85 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
        {ponteiro && !reduz && (
          <m.div
            aria-hidden
            className="pointer-events-none absolute z-30"
            initial={false}
            animate={{
              left: ponteiro.x,
              top: ponteiro.y,
              opacity: fading ? 0 : ponteiro.op,
              scale: ponteiro.premido ? 0.8 : 1,
            }}
            transition={{
              left: { duration: ponteiro.dur, ease: EASE },
              top: { duration: ponteiro.dur, ease: EASE },
              opacity: { duration: 0.3 },
              scale: { duration: 0.14, ease: "easeOut" },
            }}
          >
            <CursorArrow size={21} className="drop-shadow-md" />
          </m.div>
        )}
      </div>

      {/* ── Indicadores de passo — linha que se preenche + vistos ── */}
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
              <div className="mx-1.5 h-px w-5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700 sm:mx-3 sm:w-10">
                <div
                  className="h-full origin-left bg-brand transition-transform duration-700 ease-out"
                  style={{ transform: `scaleX(${i <= stepIndex ? 1 : 0})` }}
                />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                <div
                  className={`flex items-center justify-center rounded-full transition-all duration-500 ${
                    i < stepIndex
                      ? "h-3.5 w-3.5 bg-brand text-white"
                      : i === stepIndex
                        ? "h-2.5 w-2.5 bg-brand ring-[3px] ring-brand/20"
                        : "h-2 w-2 bg-stone-200 dark:bg-stone-700"
                  }`}
                >
                  {i < stepIndex && <Check size={8} />}
                </div>
              </div>
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

export default function Hero({ cmp }: { cmp: ComparacaoCategoriasResult }) {
  const { perfil, definir } = usePerfil();
  const EXEMPLO = useMemo(() => criarExemplos(cmp), [cmp]);
  const dados = EXEMPLO[perfil];
  const c = dados.card;

  // Atalhos do perfil ativo — a mesma curadoria das secções (fonte única).
  const atalhoFerramenta = ferramentasPorPerfil(perfil).destaque;
  const atalhoGuia = guiasPorPerfil(perfil)[0];

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

          {/* Atalhos que se moldam ao perfil: a ferramenta certa + o guia certo */}
          <m.div variants={staggerItem} className="mt-6">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={`atalhos-${perfil}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs"
              >
                <span className="font-medium text-stone-400">Para ti:</span>
                <Link
                  href={atalhoFerramenta.href}
                  className="group inline-flex items-center gap-1.5 font-semibold text-stone-500 transition-colors hover:text-brand-dark dark:text-stone-400 dark:hover:text-brand"
                >
                  <atalhoFerramenta.Icon size={13} className="text-brand" />
                  {atalhoFerramenta.titulo}
                  <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={atalhoGuia.href}
                  className="group inline-flex items-center gap-1.5 font-semibold text-stone-500 transition-colors hover:text-brand-dark dark:text-stone-400 dark:hover:text-brand"
                >
                  <atalhoGuia.icon size={13} className="text-brand" />
                  {atalhoGuia.titulo}
                  <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </m.div>
            </AnimatePresence>
          </m.div>

          <m.ul variants={staggerItem} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
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
