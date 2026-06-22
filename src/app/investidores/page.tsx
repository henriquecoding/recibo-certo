"use client";

import { useState, useEffect, useRef, type ReactNode, type FormEvent } from "react";
import { m } from "motion/react";
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
  Check,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "@/components/ui/Icons";
import { supabaseConfigurado } from "@/lib/supabase/client";
import { submeterProposta, type PropostaInput } from "@/lib/supabase/admin";

/* ── Tipos ────────────────────────────────────────────────────── */

interface TypingStep {
  text: string;
  delay: number;
}

interface DemoItem {
  titulo: string;
  subtitulo: string;
  icon: ReactNode;
  inputLabel: string;
  inputValor: number;
  typingSteps: TypingStep[];
  resultados: { label: string; valor: number; pct: number; hex: string; destaque?: boolean }[];
}

/* ── Contagem animada de 0 ao alvo ────────────────────────────── */

function CountUpValue({ target, delay = 0 }: { target: number; delay?: number }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf = 0;
    const timer = setTimeout(() => {
      const duration = 700;
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

  return <>{val.toLocaleString("pt-PT")} €</>;
}

/* ── Contagem animada ao entrar em view (hero) ─────────────── */

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

/* ── Donut chart animado em SVG ──────────────────────────────── */

function DonutChart({
  segments,
  show,
  centerValue,
  centerLabel,
}: {
  segments: { pct: number; hex: string; label: string }[];
  show: boolean;
  centerValue: string;
  centerLabel: string;
}) {
  const r = 38;

  let cumPct = 0;
  const segmentData = segments.map((s) => {
    const offset = cumPct;
    cumPct += s.pct;
    return { ...s, dashLen: s.pct, offset };
  });

  return (
    <div className="relative mx-auto h-28 w-28 sm:h-32 sm:w-32">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Distribuição percentual">
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          strokeWidth="10"
          className="stroke-stone-100 dark:stroke-stone-800"
        />
        {segmentData.map((s, i) => (
          <circle
            key={s.label}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={s.hex}
            strokeWidth="10"
            strokeLinecap="butt"
            pathLength={100}
            strokeDasharray={show ? `${s.dashLen} ${100 - s.dashLen}` : "0 100"}
            strokeDashoffset={-s.offset}
            style={{
              transition: show
                ? `stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15}s`
                : "stroke-dasharray 0.15s ease",
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-center transition-opacity duration-300"
          style={{ opacity: show ? 1 : 0, transitionDelay: show ? "0.3s" : "0s" }}
        >
          <div className="font-display text-xl font-bold text-brand sm:text-2xl">{centerValue}</div>
          <div className="text-[9px] font-medium uppercase tracking-wider text-stone-400">{centerLabel}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Mini simulador com digitação realista e donut chart ──────── */

function SimuladorDemo({ config, delayMs }: { config: DemoItem; delayMs: number }) {
  const [phase, setPhase] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(3);
      setTypedText(config.typingSteps[config.typingSteps.length - 1].text);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function schedule(fn: () => void, ms: number) {
      timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    }

    const CYCLE = 14000;

    function cycle() {
      if (cancelled) return;
      setPhase(0);
      setTypedText("");

      let t = 0;

      t += 900;
      schedule(() => setPhase(1), t);

      for (const step of config.typingSteps) {
        t += step.delay;
        const txt = step.text;
        schedule(() => setTypedText(txt), t);
      }

      t += 700;
      schedule(() => setPhase(2), t);

      t += 900;
      schedule(() => setPhase(3), t);

      schedule(cycle, CYCLE);
    }

    schedule(cycle, delayMs);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [delayMs, config.typingSteps]);

  const showInput = phase >= 1;
  const showChart = phase >= 2;
  const showResults = phase >= 3;

  const highlightResult = config.resultados.find((r) => r.destaque);

  return (
    <m.div
      className="h-full"
      whileHover={{ y: -4, transition: { duration: 0.3, ease: EASE } }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-4xl border border-stone-200/60 bg-white shadow-card transition-shadow hover:shadow-lift dark:border-stone-700 dark:bg-stone-900">
        <div className="h-1 w-full bg-gradient-to-r from-brand via-brand-mint to-brand/40" aria-hidden />

        <div
          className="flex flex-1 flex-col p-6 sm:p-7"
          style={{ opacity: phase === 0 ? 0.35 : 1, transition: "opacity 0.6s ease" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light to-brand/10 text-brand shadow-sm">
              {config.icon}
            </div>
            <div>
              <div className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">
                {config.titulo}
              </div>
              <div className="text-xs text-stone-400">{config.subtitulo}</div>
            </div>
          </div>

          {/* Input com cursor de digitação */}
          <div
            className={`mt-6 rounded-2xl border-2 px-4 py-4 transition-all duration-300 ${
              showInput
                ? "border-brand/30 bg-brand/[0.02] shadow-[0_0_0_4px_rgba(29,158,117,0.06)] dark:border-brand/20 dark:bg-brand/[0.04]"
                : "border-stone-100 bg-stone-50/60 dark:border-stone-700 dark:bg-stone-800/40"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              {config.inputLabel}
            </div>
            <div className="mt-1.5 flex items-baseline font-display text-[1.75rem] font-semibold tabular-nums leading-tight text-stone-800 dark:text-stone-100 sm:text-3xl">
              {typedText ? (
                <span>{typedText}</span>
              ) : (
                <span className="text-stone-300 dark:text-stone-600">0 €</span>
              )}
              {showInput && !showChart && (
                <span
                  className={`ml-0.5 inline-block h-7 w-[2px] translate-y-[1px] rounded-full bg-brand transition-opacity duration-75 sm:h-8 ${
                    cursorVisible ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden
                />
              )}
            </div>
          </div>

          {/* Donut chart */}
          <div className="mt-6 flex-shrink-0">
            <DonutChart
              segments={config.resultados.map((r) => ({ pct: r.pct, hex: r.hex, label: r.label }))}
              show={showChart}
              centerValue={highlightResult ? `${highlightResult.pct}%` : ""}
              centerLabel="líquido"
            />
          </div>

          {/* Resultados com barras de progresso */}
          <div className="mt-5 flex-1 space-y-3">
            {showResults &&
              config.resultados.map((r, i) => (
                <m.div
                  key={r.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: EASE }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: r.hex }} />
                      <span
                        className={`text-xs ${
                          r.destaque
                            ? "font-semibold text-stone-700 dark:text-stone-200"
                            : "text-stone-500 dark:text-stone-400"
                        }`}
                      >
                        {r.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm tabular-nums ${
                          r.destaque
                            ? "font-bold text-brand"
                            : "font-semibold text-stone-700 dark:text-stone-200"
                        }`}
                      >
                        <CountUpValue target={r.valor} delay={i * 100} />
                      </span>
                      <span className="w-7 text-right text-[11px] tabular-nums text-stone-400">
                        {r.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <m.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: r.hex }}
                      initial={{ width: 0 }}
                      animate={{ width: `${r.pct}%` }}
                      transition={{ delay: i * 0.1 + 0.15, duration: 0.6, ease: EASE }}
                    />
                  </div>
                </m.div>
              ))}
          </div>

          {/* Footer */}
          <div className="mt-5 border-t border-stone-100 pt-3 text-center text-[10px] text-stone-300 dark:border-stone-800 dark:text-stone-600">
            Exemplo ilustrativo · Taxas 2026
          </div>
        </div>
      </div>
    </m.div>
  );
}

/* ── Formulário de proposta de investimento ───────────────────── */

type FormTab = "essencial" | "detalhe" | "mensagem";

const INTERESSES = [
  "Investimento seed",
  "Investimento série A",
  "Parceria estratégica",
  "Mentoria + capital",
  "Outro",
];

const HORIZONTES = [
  "Curto prazo (< 1 ano)",
  "Médio prazo (1–3 anos)",
  "Longo prazo (> 3 anos)",
];

const COMO_CONHECEU = [
  "LinkedIn",
  "Recomendação pessoal",
  "Pesquisa Google",
  "Evento / conferência",
  "Imprensa",
  "Outro",
];

function PropostaForm() {
  const [tab, setTab] = useState<FormTab>("essencial");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [expandido, setExpandido] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [interesse, setInteresse] = useState(INTERESSES[0]);

  const [montanteMin, setMontanteMin] = useState("");
  const [montanteMax, setMontanteMax] = useState("");
  const [horizonte, setHorizonte] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [setores, setSetores] = useState("");
  const [comoConheceu, setComoConheceu] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [mensagem, setMensagem] = useState("");

  const camposEssenciais = nome.trim() && email.trim();
  const preenchidos = [nome, email, empresa, cargo, telefone, montanteMin, horizonte, experiencia, mensagem].filter(Boolean).length;
  const total = 9;
  const progressoPct = Math.round((preenchidos / total) * 100);

  const TABS: { key: FormTab; label: string; icon: ReactNode }[] = [
    { key: "essencial", label: "Identificação", icon: <User size={14} /> },
    { key: "detalhe", label: "Detalhes", icon: <Briefcase size={14} /> },
    { key: "mensagem", label: "Mensagem", icon: <Mail size={14} /> },
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!camposEssenciais) {
      setErro("O nome e o email são obrigatórios.");
      setTab("essencial");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErro("Endereço de email inválido.");
      setTab("essencial");
      return;
    }

    setErro("");
    setEnviando(true);

    const dados: PropostaInput = {
      nome: nome.trim(),
      email: email.trim(),
      empresa: empresa.trim() || null,
      cargo: cargo.trim() || null,
      telefone: telefone.trim() || null,
      interesse,
      montante_minimo: montanteMin ? Number(montanteMin) : null,
      montante_maximo: montanteMax ? Number(montanteMax) : null,
      horizonte: horizonte || null,
      experiencia_investimento: experiencia.trim() || null,
      setores_interesse: setores.trim() || null,
      como_conheceu: comoConheceu || null,
      website: website.trim() || null,
      linkedin: linkedin.trim() || null,
      mensagem: mensagem.trim() || null,
    };

    const { erro: e2 } = await submeterProposta(dados);
    setEnviando(false);

    if (e2) {
      setErro("Erro ao submeter. Tente novamente mais tarde.");
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="rounded-4xl border border-brand/20 bg-brand/[0.03] p-8 text-center sm:p-10"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
          <Check size={24} />
        </div>
        <h3 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
          Proposta enviada com sucesso
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
          Obrigado pelo interesse no ReciboCerto. A nossa equipa irá analisar a proposta e entrar em contacto em breve.
        </p>
      </m.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-4xl border border-stone-200/60 bg-white shadow-card dark:border-stone-700 dark:bg-stone-900">
      {/* Barra de progresso */}
      <div className="px-6 pt-5 sm:px-8">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-400">Progresso</span>
          <span className="text-xs font-bold tabular-nums text-brand">{progressoPct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
            style={{ width: `${progressoPct}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-stone-100 px-6 dark:border-stone-800 sm:px-8">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo do form */}
      <div className="p-6 sm:p-8">
        {erro && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {erro}
          </div>
        )}

        {/* Tab: Essencial */}
        {tab === "essencial" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nome *" value={nome} onChange={setNome} placeholder="Maria Silva" autoFocus />
              <FormField label="Email *" value={email} onChange={setEmail} placeholder="maria@empresa.pt" type="email" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Empresa" value={empresa} onChange={setEmpresa} placeholder="Empresa, Lda." />
              <FormField label="Cargo" value={cargo} onChange={setCargo} placeholder="CEO / Partner / …" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Telefone" value={telefone} onChange={setTelefone} placeholder="+351 912 345 678" type="tel" />
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Tipo de interesse
                </label>
                <select
                  value={interesse}
                  onChange={(e) => setInteresse(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 transition-colors focus:border-brand focus:ring-1 focus:ring-brand dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                >
                  {INTERESSES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Detalhe */}
        {tab === "detalhe" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setExpandido(!expandido)}
              className="flex w-full items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-left text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300"
            >
              <span>Campos adicionais (opcional)</span>
              {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Montante mínimo" value={montanteMin} onChange={setMontanteMin} placeholder="50 000" type="number" />
              <FormField label="Montante máximo" value={montanteMax} onChange={setMontanteMax} placeholder="200 000" type="number" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Horizonte temporal
                </label>
                <select
                  value={horizonte}
                  onChange={(e) => setHorizonte(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 transition-colors focus:border-brand focus:ring-1 focus:ring-brand dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                >
                  <option value="">Selecionar…</option>
                  {HORIZONTES.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Como nos conheceu
                </label>
                <select
                  value={comoConheceu}
                  onChange={(e) => setComoConheceu(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 transition-colors focus:border-brand focus:ring-1 focus:ring-brand dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                >
                  <option value="">Selecionar…</option>
                  {COMO_CONHECEU.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {expandido && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3, ease: EASE }}
                className="space-y-4 overflow-hidden"
              >
                <FormField label="Experiência de investimento" value={experiencia} onChange={setExperiencia} placeholder="Business angel, VC, primeiro investimento…" />
                <FormField label="Setores de interesse" value={setores} onChange={setSetores} placeholder="Fintech, SaaS, regulação…" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Website" value={website} onChange={setWebsite} placeholder="https://…" type="url" />
                  <FormField label="LinkedIn" value={linkedin} onChange={setLinkedin} placeholder="https://linkedin.com/in/…" type="url" />
                </div>
              </m.div>
            )}
          </div>
        )}

        {/* Tab: Mensagem */}
        {tab === "mensagem" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Mensagem (opcional)
              </label>
              <textarea
                rows={5}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Conte-nos sobre o seu interesse no ReciboCerto, questões que tenha, ou informação adicional que considere relevante…"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 placeholder:text-stone-300 transition-colors focus:border-brand focus:ring-1 focus:ring-brand dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:placeholder:text-stone-600"
              />
            </div>
            <p className="text-xs text-stone-400">
              Todos os dados são tratados de forma confidencial e de acordo com o RGPD. Nunca partilhamos informação com terceiros.
            </p>
          </div>
        )}

        {/* Navegação entre tabs + submit */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {tab !== "essencial" && (
              <button
                type="button"
                onClick={() => setTab(tab === "mensagem" ? "detalhe" : "essencial")}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition-all hover:border-stone-300 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300"
              >
                Anterior
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {tab !== "mensagem" && (
              <button
                type="button"
                onClick={() => setTab(tab === "essencial" ? "detalhe" : "mensagem")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition-all hover:border-stone-300 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300"
              >
                Seguinte
                <ArrowRight size={12} />
              </button>
            )}
            <button
              type="submit"
              disabled={enviando || !camposEssenciais}
              className="btn-shine inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float disabled:pointer-events-none disabled:opacity-50"
            >
              {enviando ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <ArrowRight size={14} />
              )}
              {enviando ? "A enviar…" : "Submeter proposta"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 placeholder:text-stone-300 transition-colors focus:border-brand focus:ring-1 focus:ring-brand dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:placeholder:text-stone-600"
      />
    </div>
  );
}

/* ── Dados ─────────────────────────────────────────────────────── */

const DEMOS: DemoItem[] = [
  {
    titulo: "Recibos Verdes",
    subtitulo: "Cat. B · Serviços",
    icon: <Calculator size={20} />,
    inputLabel: "Faturação mensal",
    inputValor: 2500,
    typingSteps: [
      { text: "2", delay: 200 },
      { text: "25", delay: 140 },
      { text: "253", delay: 180 },
      { text: "25", delay: 550 },
      { text: "250", delay: 160 },
      { text: "2500", delay: 130 },
      { text: "2 500 €", delay: 350 },
    ],
    resultados: [
      { label: "Líquido estimado", valor: 1857, pct: 74, hex: "#1D9E75", destaque: true },
      { label: "IRS (anualizado)", valor: 268, pct: 11, hex: "#0d9488" },
      { label: "Segurança Social", valor: 375, pct: 15, hex: "#6ee7b7" },
    ],
  },
  {
    titulo: "Recibo de Vencimento",
    subtitulo: "Solteiro · 0 dep.",
    icon: <Receipt size={20} />,
    inputLabel: "Salário bruto",
    inputValor: 1800,
    typingSteps: [
      { text: "1", delay: 180 },
      { text: "18", delay: 130 },
      { text: "180", delay: 150 },
      { text: "1800", delay: 140 },
      { text: "1 800 €", delay: 300 },
    ],
    resultados: [
      { label: "Líquido", valor: 1377, pct: 77, hex: "#1D9E75", destaque: true },
      { label: "IRS retido", valor: 225, pct: 12, hex: "#0d9488" },
      { label: "Seg. Social (11%)", valor: 198, pct: 11, hex: "#6ee7b7" },
    ],
  },
  {
    titulo: "Simulador Empresa",
    subtitulo: "Unipessoal Lda · PME",
    icon: <Building size={20} />,
    inputLabel: "Faturação anual",
    inputValor: 80000,
    typingSteps: [
      { text: "8", delay: 160 },
      { text: "80", delay: 140 },
      { text: "800", delay: 150 },
      { text: "8000", delay: 130 },
      { text: "80009", delay: 170 },
      { text: "8000", delay: 480 },
      { text: "80000", delay: 140 },
      { text: "80 000 €", delay: 400 },
    ],
    resultados: [
      { label: "Líquido p/ sócio", valor: 48096, pct: 60, hex: "#1D9E75", destaque: true },
      { label: "IRC (15% + 19%)", valor: 13200, pct: 17, hex: "#0d9488" },
      { label: "IRS dividendos", valor: 18704, pct: 23, hex: "#6ee7b7" },
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
              HERO
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
                  <span className="text-brand">
                    <CountUpOnView target={1.3} suffix=" milhões" duration={1500} decimals={1} />
                  </span>{" "}
                  de empresas portuguesas.
                </m.h1>

                <m.p variants={staggerItemVariant} className="mt-6 max-w-md text-lg leading-relaxed text-stone-500">
                  Recibos verdes, vencimentos e empresas — tudo o que o Estado obriga, simplificado numa plataforma que os portugueses já usam.
                </m.p>

                <m.div variants={staggerItemVariant} className="mt-9 flex flex-wrap gap-3">
                  <a
                    href="#produto"
                    className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float"
                  >
                    Ver o produto
                    <ArrowRight />
                  </a>
                  <a
                    href="#proposta"
                    className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                  >
                    Submeter proposta
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

              <m.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
              >
                <m.div whileHover={{ y: -4, transition: { duration: 0.3, ease: EASE } }}>
                  <div className="relative overflow-hidden rounded-4xl border border-brand bg-brand p-6 text-white shadow-glow sm:p-7">
                    <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
                    <div className="relative">
                      <div className="mb-4 flex items-center gap-2">
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
                </m.div>
              </m.div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              O PRODUTO EM AÇÃO — Demos animados dos simuladores
              ═══════════════════════════════════════════════════════ */}
          <section id="produto" className="scroll-mt-20 border-y border-stone-100 bg-white px-6 py-24 dark:border-stone-800">
            <div className="mx-auto max-w-6xl">
              <Reveal className="mb-14 max-w-2xl">
                <div className="eyebrow mb-3 text-brand">O produto em ação</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  Vê os simuladores a funcionar.
                </h2>
                <p className="mt-3 text-stone-500">
                  Os mesmos que milhares de portugueses já utilizam — recibos verdes, vencimentos e empresas.
                  Cada cálculo com base legal e taxas de 2026 verificadas.
                </p>
              </Reveal>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {DEMOS.map((d, i) => (
                  <Reveal key={d.titulo} delay={i * 0.08}>
                    <SimuladorDemo config={d} delayMs={i * 3000} />
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
                    <span className="font-semibold text-stone-700 dark:text-stone-200">
                      {" "}
                      quanto é meu, quanto reservar e quando pagar?
                    </span>
                  </p>
                </Reveal>

                <Reveal delay={0.1}>
                  <m.div whileHover={{ y: -4, transition: { duration: 0.3, ease: EASE } }}>
                    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                          Custo da omissão
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { l: "Tabelas de retenção", v: "Mudam todos os anos", icone: <Calculator size={14} /> },
                          { l: "Atividades Art. 151.º", v: "Centenas de coeficientes", icone: <Receipt size={14} /> },
                          { l: "Coimas por atraso", v: "Até 7 500 €", icone: <BellAlert size={14} /> },
                          { l: "Tempo perdido/mês", v: "~15 horas", icone: <ChartProjection size={14} /> },
                        ].map((r) => (
                          <div
                            key={r.l}
                            className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800/70"
                          >
                            <span className="text-brand">{r.icone}</span>
                            <span className="flex-1 text-xs text-stone-500 dark:text-stone-400">{r.l}</span>
                            <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </m.div>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              VISÃO — Roadmap em três fases
              ═══════════════════════════════════════════════════════ */}
          <section
            id="visao"
            className="scroll-mt-20 border-y border-stone-100 bg-white px-6 py-24 dark:border-stone-800"
          >
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
                    <m.div className="h-full" whileHover={{ y: -4, transition: { duration: 0.3, ease: EASE } }}>
                      <div
                        className={`flex h-full flex-col rounded-4xl p-6 shadow-card transition-shadow hover:shadow-lift ${
                          v.ativo
                            ? "border border-brand bg-brand text-white shadow-glow"
                            : "border border-stone-100 bg-cream dark:border-stone-800 dark:bg-stone-950"
                        }`}
                      >
                        <div
                          className={`inline-flex self-start rounded-full px-3 py-1 text-[11px] font-semibold ${
                            v.ativo ? "bg-white/20 text-white" : "bg-brand-light text-brand-dark"
                          }`}
                        >
                          {v.fase}
                        </div>
                        <h3
                          className={`mt-4 font-display text-xl font-semibold ${
                            v.ativo ? "text-white" : "text-stone-800 dark:text-stone-100"
                          }`}
                        >
                          {v.titulo}
                        </h3>
                        <p
                          className={`mt-2 flex-1 text-sm leading-relaxed ${
                            v.ativo ? "text-green-100/80" : "text-stone-400"
                          }`}
                        >
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
                    </m.div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              MODELO DE NEGÓCIO
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
                {METRICAS_MODELO.map((mt) => (
                  <StaggerItem key={mt.label}>
                    <m.div className="h-full" whileHover={{ y: -4, transition: { duration: 0.3, ease: EASE } }}>
                      <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                          {mt.label}
                        </div>
                        <div className="mt-2 font-display text-2xl font-semibold text-brand">{mt.valor}</div>
                        <p className="mt-1 text-xs text-stone-400">{mt.sub}</p>
                      </div>
                    </m.div>
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
              FORMULÁRIO DE PROPOSTA
              ═══════════════════════════════════════════════════════ */}
          <section
            id="proposta"
            className="scroll-mt-20 grain relative overflow-hidden px-6 py-24"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-24 -right-32 h-[24rem] w-[24rem] rounded-full bg-brand/20 blur-3xl" />
              <div className="absolute -bottom-16 -left-24 h-[20rem] w-[20rem] rounded-full bg-brand-mint/15 blur-3xl" />
            </div>

            <div className="mx-auto max-w-3xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">Próximo passo</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  Interessado? <span className="text-brand">Submeta uma proposta.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-md text-stone-500">
                  Preencha apenas o essencial ou adicione detalhes para acelerar o processo. Capital destinado a integrar pagamentos, expandir a equipa e acelerar a adoção.
                </p>
              </Reveal>

              <Reveal delay={0.1}>
                <PropostaForm />
              </Reveal>

              <Reveal delay={0.15} className="mt-8">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {CONFIANCA.map((c) => (
                    <span
                      key={c.texto}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500"
                    >
                      <span className="text-brand">{c.icon}</span>
                      {c.texto}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
