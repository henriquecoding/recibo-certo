"use client";

import { useState, useEffect, useRef } from "react";
import { m, useMotionValue, useTransform, useSpring } from "motion/react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/ui/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";
import {
  staggerContainer,
  staggerItem as staggerItemVariant,
  fadeUp,
  inViewOnce,
  EASE,
} from "@/lib/motion";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Flag,
  Globe,
  Building,
  Wallet,
  Receipt,
  Zap,
  Target,
  ChartProjection,
  Mail,
  Calculator,
  BellAlert,
  LogoMark,
  Export,
  BarChart2,
} from "@/components/ui/Icons";

/* ── Cartão 3D com efeito tilt ao hover ────────────────────────── */

function Card3D({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  function handleMouse(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <m.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 800, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
    >
      {children}
    </m.div>
  );
}

/* ── Tipo do demo ─────────────────────────────────────────────── */

interface DemoItem {
  titulo: string;
  subtitulo: string;
  icon: ReactNode;
  inputLabel: string;
  inputValor: number;
  resultados: { label: string; valor: number; pct: number; cor: string; destaque?: boolean }[];
}

/* ── Contagem animada de 0 ao alvo ────────────────────────────── */

function CountUpValue({ target, delay = 0, suffix = " €" }: { target: number; delay?: number; suffix?: string }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf = 0;
    const timer = setTimeout(() => {
      const duration = 900;
      const start = performance.now();
      function tick() {
        const elapsed = performance.now() - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setVal(Math.round(target * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, delay]);

  return <>{val.toLocaleString("pt-PT")}{suffix}</>;
}

/* ── Contagem animada ao entrar em view (para hero) ─────────── */

function CountUpOnView({ target, suffix = "", duration = 1200, decimals = 0 }: { target: number; suffix?: string; duration?: number; decimals?: number }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf = 0;
    const factor = Math.pow(10, decimals);
    const start = performance.now();
    function tick() {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased * factor) / factor);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration, decimals]);

  return <span ref={ref}>{val.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/* ── Barra de progresso animada ao entrar em view ──────────── */

function AnimatedBar({ widthPct, delay = 0 }: { widthPct: number; delay?: number }) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex h-1.5 overflow-hidden rounded-full bg-white/15">
      <div
        className="rounded-full bg-white/70 transition-all duration-1000 ease-out"
        style={{
          width: inView ? `${widthPct}%` : "0%",
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

/* ── Barra horizontal empilhada (stacked bar chart) ────────── */

function StackedBar({ segments, animate }: { segments: { pct: number; cor: string; label: string }[]; animate: boolean }) {
  return (
    <div className="flex h-5 w-full overflow-hidden rounded-lg" role="img" aria-label="Distribuição percentual">
      {segments.map((s, i) => (
        <m.div
          key={s.label}
          className={`flex items-center justify-center text-[8px] font-bold text-white ${s.cor}`}
          initial={{ width: 0 }}
          animate={animate ? { width: `${s.pct}%` } : { width: 0 }}
          transition={{ delay: i * 0.15, duration: 0.6, ease: EASE }}
        >
          {s.pct >= 12 && animate && (
            <m.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15 + 0.4, duration: 0.3 }}
            >
              {s.pct}%
            </m.span>
          )}
        </m.div>
      ))}
    </div>
  );
}

/* ── Mini simulador com loop automático — versão expandida ──── */

function SimuladorDemo({ config, delayMs }: { config: DemoItem; delayMs: number }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(3);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function schedule(fn: () => void, ms: number) {
      timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    }

    function cycle() {
      if (cancelled) return;
      setPhase(0);
      schedule(() => setPhase(1), 800);
      schedule(() => setPhase(2), 2200);
      schedule(() => setPhase(3), 3600);
      schedule(cycle, 12000);
    }

    schedule(cycle, delayMs);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [delayMs]);

  const inputActive = phase >= 1;
  const resultsActive = phase >= 2;
  const chartActive = phase >= 3;

  const total = config.resultados.reduce((s, r) => s + r.valor, 0);

  const barSegments = config.resultados.map((r) => ({
    pct: r.pct,
    cor: r.cor,
    label: r.label,
  }));

  return (
    <Card3D className="h-full">
      <div
        className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-6 shadow-card transition-all dark:border-stone-800 dark:bg-stone-900 sm:p-7"
        style={{ opacity: phase === 0 ? 0.4 : 1, transition: "opacity 0.5s ease" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand">
            {config.icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">{config.titulo}</div>
            <div className="text-[11px] text-stone-400">{config.subtitulo}</div>
          </div>
        </div>

        {/* Input field */}
        <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50/80 px-4 py-3.5 dark:border-stone-700 dark:bg-stone-800/50">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            {config.inputLabel}
          </div>
          <div className="mt-1 font-display text-3xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {inputActive ? (
              <CountUpValue target={config.inputValor} />
            ) : (
              <span className="text-stone-300 dark:text-stone-600">0 €</span>
            )}
          </div>
        </div>

        {/* Stacked bar chart */}
        <div className="mt-5">
          {chartActive && (
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                <BarChart2 size={12} />
                Distribuição
              </div>
              <StackedBar segments={barSegments} animate={chartActive} />
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {barSegments.map((s) => (
                  <div key={s.label} className="flex items-center gap-1">
                    <div className={`h-2 w-2 rounded-full ${s.cor}`} />
                    <span className="text-[9px] text-stone-400">{s.label}</span>
                  </div>
                ))}
              </div>
            </m.div>
          )}
        </div>

        {/* Results table */}
        <div className="mt-5 flex-1">
          {resultsActive && (
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <table className="w-full" role="table">
                <thead>
                  <tr className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">
                    <th scope="col" className="pb-2 text-left font-semibold">Componente</th>
                    <th scope="col" className="pb-2 text-right font-semibold">Valor</th>
                    <th scope="col" className="pb-2 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {config.resultados.map((r, i) => (
                    <m.tr
                      key={r.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12, duration: 0.35, ease: EASE }}
                      className={`border-t border-stone-50 dark:border-stone-800 ${
                        r.destaque ? "bg-brand-light/40 dark:bg-brand/5" : ""
                      }`}
                    >
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${r.cor}`} />
                          <span className={`text-xs ${r.destaque ? "font-semibold text-stone-700 dark:text-stone-200" : "text-stone-500 dark:text-stone-400"}`}>
                            {r.label}
                          </span>
                        </div>
                      </td>
                      <td className={`py-2.5 text-right text-sm tabular-nums ${
                        r.destaque ? "font-bold text-brand" : "font-semibold text-stone-700 dark:text-stone-200"
                      }`}>
                        <CountUpValue target={r.valor} delay={i * 120} />
                      </td>
                      <td className="py-2.5 pl-2 text-right text-[11px] tabular-nums text-stone-400">
                        {r.pct}%
                      </td>
                    </m.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-200 dark:border-stone-700">
                    <td className="pt-2 text-xs font-semibold text-stone-500">Total</td>
                    <td className="pt-2 text-right text-sm font-bold tabular-nums text-stone-700 dark:text-stone-200">
                      <CountUpValue target={total} delay={400} />
                    </td>
                    <td className="pt-2 pl-2 text-right text-[11px] tabular-nums text-stone-400">100%</td>
                  </tr>
                </tfoot>
              </table>
            </m.div>
          )}
        </div>

        <div className="mt-4 text-center text-[10px] text-stone-300 dark:text-stone-600">
          Exemplo ilustrativo · Taxas 2026
        </div>
      </div>
    </Card3D>
  );
}

/* ── Dados ─────────────────────────────────────────────────────── */

const DEMOS: DemoItem[] = [
  {
    titulo: "Recibos Verdes",
    subtitulo: "Cat. B · Serviços",
    icon: <Calculator size={18} />,
    inputLabel: "Faturação mensal",
    inputValor: 2500,
    resultados: [
      { label: "Líquido estimado", valor: 1857, pct: 74, cor: "bg-brand", destaque: true },
      { label: "IRS (anualizado)", valor: 268, pct: 11, cor: "bg-emerald-800" },
      { label: "Segurança Social", valor: 375, pct: 15, cor: "bg-emerald-950" },
    ],
  },
  {
    titulo: "Recibo de Vencimento",
    subtitulo: "Solteiro · 0 dep.",
    icon: <Receipt size={18} />,
    inputLabel: "Salário bruto",
    inputValor: 1800,
    resultados: [
      { label: "Líquido", valor: 1377, pct: 77, cor: "bg-brand", destaque: true },
      { label: "IRS retido", valor: 225, pct: 12, cor: "bg-emerald-800" },
      { label: "Seg. Social (11%)", valor: 198, pct: 11, cor: "bg-emerald-950" },
    ],
  },
  {
    titulo: "Simulador Empresa",
    subtitulo: "Unipessoal Lda · PME",
    icon: <Building size={18} />,
    inputLabel: "Faturação anual",
    inputValor: 80000,
    resultados: [
      { label: "Líquido p/ sócio", valor: 48096, pct: 60, cor: "bg-brand", destaque: true },
      { label: "IRC (15% + 19%)", valor: 13200, pct: 17, cor: "bg-emerald-800" },
      { label: "IRS dividendos", valor: 18704, pct: 23, cor: "bg-emerald-950" },
    ],
  },
];

const MAIS_FEATURES = [
  { icon: <BellAlert size={12} />, label: "Alertas de prazos" },
  { icon: <Wallet size={12} />, label: "Mealheiro fiscal" },
  { icon: <ChartProjection size={12} />, label: "Comparador de cenários" },
  { icon: <Zap size={12} />, label: "Quiz Fiscal" },
  { icon: <Export size={12} />, label: "Exportação PDF e CSV" },
];

const VISAO = [
  {
    fase: "Agora",
    titulo: "Copiloto fiscal",
    desc: "Calculadoras, simuladores e alertas para trabalhadores independentes, dependentes e empresas. Plano freemium com Pro.",
    ativo: true,
  },
  {
    fase: "Próximo",
    titulo: "Pagamentos integrados",
    desc: "Links de cobrança diretos nas faturas — Multibanco, MB WAY, cartão e SEPA. Take rate transacional sobre cada pagamento.",
    ativo: false,
  },
  {
    fase: "Futuro",
    titulo: "Infraestrutura financeira",
    desc: "Reconciliação bancária via Open Banking, adiantamento de faturas e crédito integrado. De utilidade fiscal a fintech SaaS.",
    ativo: false,
  },
];

const METRICAS_MODELO = [
  { label: "Modelo", valor: "Freemium + Pro", sub: "SaaS recorrente" },
  { label: "Expansão", valor: "Take rate", sub: "Sobre pagamentos processados" },
  { label: "Retenção", valor: "Alta", sub: "Ferramenta operacional diária" },
  { label: "Distribuição", valor: "PLG + parcerias", sub: "Cada fatura = marketing" },
];

const VANTAGENS = [
  {
    icon: <Lock size={18} />,
    titulo: "Fosso regulatório",
    desc: "Certificação pela AT e conformidade fiscal portuguesa protegem contra entrantes internacionais.",
  },
  {
    icon: <Globe size={18} />,
    titulo: "Expansão europeia",
    desc: "Arquitetura preparada para regimes de faturação eletrónica semelhantes na UE e América Latina.",
  },
  {
    icon: <Zap size={18} />,
    titulo: "Product-Led Growth",
    desc: "Cada fatura e link de pagamento emitido é marketing para o recetor — CAC orgânico decrescente.",
  },
  {
    icon: <Target size={18} />,
    titulo: "1,3M de empresas",
    desc: "97% do tecido empresarial português são micro e pequenas empresas — o nosso mercado.",
  },
];

const CONFIANCA = [
  { icon: <ShieldCheck size={14} />, texto: "Taxas de 2026 verificadas com fonte AT" },
  { icon: <Flag size={14} />, texto: "Dados em servidores na UE · RGPD" },
  { icon: <Lock size={14} />, texto: "Código auditado · sem dados fiscais inventados" },
];

/* ── Componente ────────────────────────────────────────────────── */

export default function InvestidoresPage() {
  return (
    <>
      <div id="top">
        <Nav />
        <main>
          {/* ═══════════════════════════════════════════════════════
              HERO — Impacto imediato com perspetiva 3D
              ═══════════════════════════════════════════════════════ */}
          <section className="grain relative overflow-hidden px-6 pt-20 pb-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />
              <div className="absolute top-40 -left-32 h-[24rem] w-[24rem] rounded-full bg-brand-mint/20 blur-3xl" />
            </div>

            <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <m.div initial="hidden" animate="visible" variants={staggerContainer}>
                <m.div variants={staggerItemVariant} className="eyebrow mb-4 text-brand">
                  Para investidores
                </m.div>

                <m.h1
                  variants={staggerItemVariant}
                  className="font-display display-1 text-balance font-semibold text-ink"
                >
                  O copiloto financeiro de{" "}
                  <span className="text-brand"><CountUpOnView target={1.3} suffix=" milhões" duration={1500} decimals={1} /></span> de empresas portuguesas.
                </m.h1>

                <m.p variants={staggerItemVariant} className="mt-6 max-w-md text-lg leading-relaxed text-stone-500">
                  Recibos verdes, vencimentos e empresas — tudo o que o Estado obriga, simplificado numa plataforma que os portugueses já usam.
                </m.p>

                <m.div variants={staggerItemVariant} className="mt-9">
                  <a
                    href="mailto:investidores@recibocerto.pt?subject=Pedido%20de%20reuni%C3%A3o%20%E2%80%94%20ReciboCerto"
                    className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float"
                  >
                    Agendar reunião
                    <ArrowRight />
                  </a>
                </m.div>

                <m.ul variants={staggerItemVariant} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                  {CONFIANCA.map((b) => (
                    <li key={b.texto} className="flex items-center gap-2">
                      <span className="text-brand">{b.icon}</span>
                      <span className="text-xs font-medium text-stone-500">{b.texto}</span>
                    </li>
                  ))}
                </m.ul>
              </m.div>

              {/* Cartão 3D flutuante — mostra o produto real */}
              <m.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
              >
                <Card3D>
                  <div className="relative overflow-hidden rounded-4xl border border-brand bg-brand p-6 text-white shadow-glow sm:p-7">
                    <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <LogoMark size={24} />
                        <span className="text-sm font-semibold">ReciboCerto</span>
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-green-100/60">
                        Oportunidade de mercado
                      </div>
                      <div className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums">
                        <CountUpOnView target={1.3} suffix=" M" duration={1200} decimals={1} />
                      </div>
                      <div className="mt-1 text-xs text-green-100/70">
                        empresas em Portugal — 97% micro e pequenas
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-1.5">
                        <div className="rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur-sm">
                          <div className="text-[10px] leading-tight text-green-100/70">TAM</div>
                          <div className="mt-0.5 text-xs font-semibold tabular-nums">
                            <CountUpOnView target={1.3} suffix=" M" duration={1000} decimals={1} />
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur-sm">
                          <div className="text-[10px] leading-tight text-green-100/70">SAM</div>
                          <div className="mt-0.5 text-xs font-semibold tabular-nums">
                            ~<CountUpOnView target={400} suffix=" K" duration={1000} />
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur-sm">
                          <div className="text-[10px] leading-tight text-green-100/70">SOM</div>
                          <div className="mt-0.5 text-xs font-semibold tabular-nums">
                            ~<CountUpOnView target={50} suffix=" K" duration={1000} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <AnimatedBar widthPct={4} delay={600} />
                      </div>
                      <div className="mt-1 text-[11px] text-green-100/50">
                        Penetração atual — espaço massivo de crescimento
                      </div>
                    </div>
                  </div>
                </Card3D>
              </m.div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              O PRODUTO EM AÇÃO — Demos animados dos simuladores
              ═══════════════════════════════════════════════════════ */}
          <section className="border-y border-stone-100 bg-white px-6 py-24 dark:border-stone-800">
            <div className="mx-auto max-w-6xl">
              <Reveal className="mb-14 max-w-2xl">
                <div className="eyebrow mb-3 text-brand">O produto em ação</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  Vê os simuladores a funcionar.
                </h2>
                <p className="mt-3 text-stone-500">
                  Os mesmos que milhares de portugueses já utilizam — recibos verdes, vencimentos e empresas. Cada cálculo com base legal e taxas de 2026 verificadas.
                </p>
              </Reveal>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {DEMOS.map((d, i) => (
                  <Reveal key={d.titulo} delay={i * 0.08}>
                    <SimuladorDemo config={d} delayMs={i * 2500} />
                  </Reveal>
                ))}
              </div>

              <Reveal className="mt-10">
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {MAIS_FEATURES.map((f) => (
                    <span
                      key={f.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-100 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400"
                    >
                      <span className="text-brand">{f.icon}</span>
                      {f.label}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              A DOR — Porquê isto existe
              ═══════════════════════════════════════════════════════ */}
          <section className="px-6 py-24">
            <div className="mx-auto max-w-5xl">
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <Reveal>
                  <div className="eyebrow mb-3 text-stone-400">O problema</div>
                  <h2 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100 sm:text-3xl">
                    Os portugueses pagam impostos sem perceber o que pagam.
                  </h2>
                  <p className="mt-3 text-stone-500 dark:text-stone-400">
                    Recibos verdes com fórmulas que mudam todos os anos. Recibos de vencimento com linhas que ninguém explica. Prazos que, se esquecidos, custam entre 50 e 7 500 euros em coimas.
                  </p>
                  <p className="mt-3 text-stone-500 dark:text-stone-400">
                    As ferramentas existentes limitam-se a gerar faturas. Nenhuma responde à pergunta que importa:
                    <span className="font-semibold text-stone-700 dark:text-stone-200"> quanto é meu, quanto reservar e quando pagar?</span>
                  </p>
                </Reveal>

                <Reveal delay={0.1}>
                  <Card3D>
                    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Custo da omissão</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { l: "Tabelas de retenção", v: "Mudam todos os anos", icone: <Calculator size={14} /> },
                          { l: "Atividades Art. 151.º", v: "Centenas de coeficientes", icone: <Receipt size={14} /> },
                          { l: "Coimas por atraso", v: "Até 7 500 €", icone: <BellAlert size={14} /> },
                          { l: "Tempo perdido/mês", v: "~15 horas", icone: <ChartProjection size={14} /> },
                        ].map((r) => (
                          <div key={r.l} className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800/70">
                            <span className="text-brand">{r.icone}</span>
                            <span className="flex-1 text-xs text-stone-500 dark:text-stone-400">{r.l}</span>
                            <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card3D>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              VISÃO — Roadmap em três fases
              ═══════════════════════════════════════════════════════ */}
          <section id="visao" className="scroll-mt-20 border-y border-stone-100 bg-white px-6 py-24 dark:border-stone-800">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-14 max-w-2xl">
                <div className="eyebrow mb-3 text-brand">Visão</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  De copiloto fiscal a infraestrutura financeira.
                </h2>
                <p className="mt-3 text-stone-500">
                  Três fases. Cada uma constrói sobre a anterior — utilizadores, dados e confiança.
                </p>
              </Reveal>

              <div className="grid gap-4 lg:grid-cols-3">
                {VISAO.map((v, i) => (
                  <Reveal key={v.fase} delay={i * 0.08}>
                    <Card3D className="h-full">
                      <div
                        className={`flex h-full flex-col rounded-4xl p-6 shadow-card transition-shadow hover:shadow-lift ${
                          v.ativo
                            ? "border border-brand bg-brand text-white shadow-glow"
                            : "border border-stone-100 bg-cream dark:border-stone-800 dark:bg-stone-950"
                        }`}
                      >
                        <div className={`inline-flex self-start rounded-full px-3 py-1 text-[11px] font-semibold ${
                          v.ativo
                            ? "bg-white/20 text-white"
                            : "bg-brand-light text-brand-dark"
                        }`}>
                          {v.fase}
                        </div>
                        <h3 className={`mt-4 font-display text-xl font-semibold ${
                          v.ativo ? "text-white" : "text-stone-800 dark:text-stone-100"
                        }`}>
                          {v.titulo}
                        </h3>
                        <p className={`mt-2 flex-1 text-sm leading-relaxed ${
                          v.ativo ? "text-green-100/80" : "text-stone-400"
                        }`}>
                          {v.desc}
                        </p>
                        {v.ativo && (
                          <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/15">
                            <m.div
                              className="rounded-full bg-white/70"
                              initial={{ width: 0 }}
                              whileInView={{ width: "100%" }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
                            />
                          </div>
                        )}
                      </div>
                    </Card3D>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              MODELO DE NEGÓCIO — Cards com 3D
              ═══════════════════════════════════════════════════════ */}
          <section className="px-6 py-24">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-14 max-w-2xl">
                <div className="eyebrow mb-3 text-brand">Modelo de negócio</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  SaaS recorrente + take rate transacional.
                </h2>
                <p className="mt-3 text-stone-500">
                  Receita previsível de subscrições, multiplicada por uma taxa sobre cada pagamento processado na plataforma.
                </p>
              </Reveal>

              <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {METRICAS_MODELO.map((m) => (
                  <StaggerItem key={m.label}>
                    <Card3D className="h-full">
                      <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{m.label}</div>
                        <div className="mt-2 font-display text-2xl font-semibold text-brand">{m.valor}</div>
                        <p className="mt-1 text-xs text-stone-400">{m.sub}</p>
                      </div>
                    </Card3D>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              VANTAGENS COMPETITIVAS
              ═══════════════════════════════════════════════════════ */}
          <section className="border-y border-stone-100 bg-white px-6 py-24 dark:border-stone-800">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-14 max-w-2xl">
                <div className="eyebrow mb-3 text-brand">Porquê nós</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  Regulação como vantagem, não como custo.
                </h2>
              </Reveal>

              <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
                {VANTAGENS.map((v, i) => (
                  <Reveal key={v.titulo} delay={i * 0.06}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
                        {v.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{v.titulo}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-stone-400">{v.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              EQUIPA — Breve + link para mais
              ═══════════════════════════════════════════════════════ */}
          <section className="px-6 py-24">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <div className="eyebrow mb-3 text-brand">Equipa</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  Execução comprovada.
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500">
                  Experiência em engenharia de software financeiro, conformidade fiscal e crescimento de startups. Perfis completos disponíveis na sala de due diligence.
                </p>
              </Reveal>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              CTA FINAL — Mesma linguagem do hero do site
              ═══════════════════════════════════════════════════════ */}
          <section className="grain relative overflow-hidden px-6 py-24">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-24 -right-32 h-[24rem] w-[24rem] rounded-full bg-brand/20 blur-3xl" />
              <div className="absolute -bottom-16 -left-24 h-[20rem] w-[20rem] rounded-full bg-brand-mint/15 blur-3xl" />
            </div>

            <m.div
              className="mx-auto max-w-2xl text-center"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={inViewOnce}
            >
              <m.div variants={fadeUp} className="eyebrow mb-3 text-brand">
                Próximo passo
              </m.div>

              <m.h2 variants={fadeUp} className="font-display display-2 text-balance font-semibold text-ink">
                Vamos <span className="text-brand">conversar?</span>
              </m.h2>

              <m.p variants={fadeUp} className="mx-auto mt-3 max-w-md text-stone-500">
                Capital destinado a integrar pagamentos, expandir a equipa e acelerar a adoção. Projeções e documentação disponíveis sob NDA.
              </m.p>

              <m.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="mailto:investidores@recibocerto.pt?subject=Pedido%20de%20reuni%C3%A3o%20%E2%80%94%20ReciboCerto"
                  className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float"
                >
                  <Mail size={15} />
                  Agendar reunião
                </a>
                <a
                  href="mailto:investidores@recibocerto.pt?subject=Pedido%20de%20acesso%20Data%20Room%20%E2%80%94%20ReciboCerto"
                  className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50"
                >
                  <Lock size={14} />
                  Solicitar Data Room
                </a>
              </m.div>

              <m.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {CONFIANCA.map((c) => (
                  <span key={c.texto} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
                    <span className="text-brand">{c.icon}</span>
                    {c.texto}
                  </span>
                ))}
              </m.div>
            </m.div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
