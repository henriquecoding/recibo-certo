"use client";

import Link from "next/link";
import { m } from "motion/react";
import { fadeUp, staggerContainer, staggerItem, inViewOnce } from "@/lib/motion";
import {
  Logo, ShieldCheck, Lock, Clock, CheckTrend, ArrowRight,
  Receipt, Calendar, Calculator, Scale, Mail, ExternalLink,
  Warning, Check, Heart,
} from "@/components/ui/Icons";
import { FISCAL_YEAR } from "@/lib/fiscal-data";

// ── Trust bar ─────────────────────────────────────────────────

const TRUST = [
  {
    icon: CheckTrend,
    label: "Dados fiscais " + FISCAL_YEAR,
    sub: "AT · SS · OE — fontes oficiais",
  },
  {
    icon: Lock,
    label: "Privacidade total",
    sub: "Sem conta obrigatória",
  },
  {
    icon: ShieldCheck,
    label: "Cálculos offline",
    sub: "Os teus dados ficam no teu dispositivo",
  },
  {
    icon: Clock,
    label: "Sempre atualizado",
    sub: "Monitorização automática de alterações",
  },
];

// ── Navegação ─────────────────────────────────────────────────

const NAV = [
  {
    heading: "Ferramenta",
    links: [
      { label: "Calculadora de recibo", href: "/#calculadora" },
      { label: "Simulador de IRS", href: "/dashboard/simulador" },
      { label: "Comparador de regimes", href: "/dashboard/comparador" },
      { label: "Prazos fiscais", href: "/dashboard/prazos" },
      { label: "Arquivo de recibos", href: "/dashboard/recibos" },
    ],
  },
  {
    heading: "Conteúdo",
    links: [
      { label: "Todos os guias", href: "/guias" },
      { label: "Abrir atividade", href: "/guias/abrir-atividade" },
      { label: "Regime simplificado", href: "/guias/regime-simplificado" },
      { label: "Decisor ato isolado", href: "/ferramentas/ato-isolado" },
      { label: "Classificar atividade", href: "/ferramentas/classificar-atividade" },
    ],
  },
  {
    heading: "Recursos",
    links: [
      { label: "Planos e preços", href: "/precos" },
      { label: "Perguntas frequentes", href: "/#faq" },
      { label: "Fontes fiscais", href: "/#fontes" },
      { label: "Política de privacidade", href: "/privacidade" },
      { label: "Termos de utilização", href: "/termos" },
    ],
  },
];

// ── Sub-componente: TrustBar ──────────────────────────────────

function TrustBar() {
  return (
    <div className="relative overflow-hidden bg-ink">
      {/* Linha superior com gradiente de marca */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(29,158,117,0.55) 30%, rgba(159,225,203,0.7) 50%, rgba(29,158,117,0.55) 70%, transparent)",
        }}
      />
      {/* Brilho ambiente */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 120% at 15% 110%, rgba(29,158,117,0.12) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <m.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={inViewOnce}
          className="flex items-stretch overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {TRUST.map((p, i) => {
            const Icon = p.icon;
            return (
              <m.div
                key={p.label}
                variants={staggerItem}
                className="group flex shrink-0 items-center gap-3 px-5 py-5 sm:px-7"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand/10 ring-1 ring-brand/20 transition-all group-hover:bg-brand/18">
                  <Icon size={15} className="text-brand-mint" />
                </div>
                <div>
                  <p className="text-[11px] font-bold leading-none text-stone-100">
                    {p.label}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium leading-none text-stone-500">
                    {p.sub}
                  </p>
                </div>
                {i < TRUST.length - 1 && (
                  <div className="ml-5 hidden h-6 w-px shrink-0 bg-stone-800 sm:block" />
                )}
              </m.div>
            );
          })}
        </m.div>
      </div>
    </div>
  );
}

// ── Footer principal ──────────────────────────────────────────

export default function Footer() {
  return (
    <footer className="mt-auto">
      {/* 1 — Trust bar */}
      <TrustBar />

      {/* 2 — Corpo principal */}
      <div className="relative overflow-hidden bg-cream dark:bg-stone-900">
        {/* Brilho ambiente quente */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/3 translate-x-1/3 rounded-full blur-3xl"
          style={{ background: "rgba(29,158,117,0.04)" }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-16">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">

            {/* ── Coluna marca ── */}
            <m.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={inViewOnce}
              className="lg:col-span-4"
            >
              {/* Logo */}
              <div className="mb-5">
                <Logo />
              </div>

              {/* Manifesto */}
              <p className="mb-2 max-w-xs text-[13px] font-medium leading-relaxed text-stone-500 dark:text-stone-400">
                Copiloto financeiro para trabalhadores independentes em Portugal.
                Sabe exatamente quanto é teu, quanto reservar e quando pagar —
                sem surpresas no fim do ano.
              </p>
              <p className="mb-8 max-w-xs text-[12px] font-medium leading-relaxed text-stone-400 dark:text-stone-500">
                Calculadora de recibos verdes, simulador de IRS, comparador de
                regimes e calendário fiscal — tudo com dados oficiais verificados.
              </p>

              {/* Contacto */}
              <div className="mb-8 space-y-2.5">
                <a
                  href="mailto:recibocerto.pt@gmail.com"
                  className="group flex items-center gap-2.5 text-[11px] font-medium text-stone-400 transition-colors hover:text-brand dark:text-stone-500 dark:hover:text-brand-mint"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-stone-100 transition-colors group-hover:bg-brand-light dark:bg-stone-800 dark:group-hover:bg-brand/20">
                    <Mail size={12} className="text-stone-400 transition-colors group-hover:text-brand dark:text-stone-500" />
                  </div>
                  recibocerto.pt@gmail.com
                </a>
                <div className="flex items-center gap-2.5 text-[11px] font-medium text-stone-400 dark:text-stone-500">
                  <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-stone-100 dark:bg-stone-800">
                    <Receipt size={12} className="text-stone-400 dark:text-stone-500" />
                  </div>
                  Recibos verdes · Portugal · {FISCAL_YEAR}
                </div>
              </div>

              {/* CTA — entrar no dashboard */}
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-float"
              >
                <CheckTrend size={14} />
                Abrir o dashboard
                <ArrowRight
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </m.div>

            {/* ── Colunas de navegação ── */}
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
              {NAV.map((col, ci) => (
                <m.div
                  key={col.heading}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={inViewOnce}
                  transition={{ delay: 0.1 + ci * 0.07 }}
                >
                  <h3
                    className="eyebrow mb-4 border-b border-stone-200 pb-2.5 text-brand-dark dark:border-stone-700 dark:text-brand-mint"
                  >
                    {col.heading}
                  </h3>
                  <ul className="space-y-2.5">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <Link
                          href={l.href}
                          className="group flex items-center gap-1.5 text-[12.5px] font-medium leading-snug text-stone-500 transition-all duration-200 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
                        >
                          <ArrowRight
                            size={10}
                            className="shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 text-brand"
                          />
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </m.div>
              ))}
            </div>
          </div>

          {/* ── Nota de aviso legal ── */}
          <m.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewOnce}
            className="mt-12 rounded-2xl border border-alert-border bg-alert-bg px-5 py-4 dark:border-stone-700 dark:bg-stone-800/60"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-alert-border/50">
                <Warning size={12} className="text-alert-text dark:text-yellow-400" />
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-alert-text dark:text-stone-400">
                <strong className="font-bold">Informação não vinculativa.</strong>{" "}
                O ReciboCerto é uma calculadora informativa baseada nas taxas
                fiscais portuguesas de {FISCAL_YEAR}. Os resultados não substituem
                o aconselhamento de um contabilista certificado nem constituem
                declaração fiscal oficial. Verifica sempre com a AT ou com o teu
                contabilista antes de tomar decisões financeiras.
              </p>
            </div>
          </m.div>

          {/* ── Divisor ── */}
          <div
            className="my-8 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(29,158,117,0.25) 25%, rgba(29,158,117,0.25) 75%, transparent)",
            }}
          />

          {/* ── Barra inferior ── */}
          <m.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewOnce}
            className="flex flex-col items-center justify-between gap-4 pb-10 sm:flex-row"
          >
            {/* Copyright */}
            <p className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
              © {FISCAL_YEAR} ReciboCerto · Portugal · Todos os direitos reservados.
            </p>

            {/* Tagline */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400 dark:text-stone-500">
              <span>Feito com</span>
              <Heart size={11} className="fill-brand text-brand" />
              <span>para independentes portugueses</span>
            </div>

            {/* Links legais */}
            <nav className="flex items-center gap-5" aria-label="Páginas legais">
              {[
                { label: "Privacidade", href: "/privacidade" },
                { label: "Termos", href: "/termos" },
                { label: "Fontes", href: "/#fontes" },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-[11px] font-medium text-stone-400 transition-colors hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </m.div>
        </div>
      </div>
    </footer>
  );
}
