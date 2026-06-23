"use client";

import Link from "next/link";
import { m } from "motion/react";
import { fadeUp, staggerContainer, staggerItem, inViewOnce } from "@/lib/motion";
import {
  Logo, ShieldCheck, Lock, Clock, CheckTrend, ArrowRight,
  Receipt, Calendar, Calculator, Scale, Mail,
  Warning, Heart, BookOpen, MapPin, Zap, Briefcase,
} from "@/components/ui/Icons";
import { FISCAL_YEAR } from "@/lib/fiscal-data";
import { abrirPreferenciasCookies } from "@/lib/cookie-consent";

const TRUST = [
  { icon: CheckTrend, label: "Dados " + FISCAL_YEAR, sub: "Fontes oficiais AT · SS · OE" },
  { icon: Lock, label: "100% privado", sub: "Sem conta obrigatória" },
  { icon: ShieldCheck, label: "Offline", sub: "Dados no teu dispositivo" },
  { icon: Clock, label: "Atualizado", sub: "Monitorização automática" },
];

const NAV_FERRAMENTAS = [
  { label: "Calculadora de recibos verdes", href: "/#calculadora", Icon: Receipt },
  { label: "Recibo de vencimento", href: "/ferramentas/recibo-vencimento", Icon: Briefcase },
  { label: "Comparador de regimes", href: "/dashboard/comparar", Icon: Scale },
  { label: "Simulador de empresa", href: "/dashboard/empresa", Icon: Calculator },
  { label: "Mapa de contabilistas", href: "/dashboard/mapa-contabilistas", Icon: MapPin },
  { label: "Prazos fiscais", href: "/dashboard/prazos", Icon: Calendar },
];

const NAV_APRENDER = [
  { label: "Guias fiscais", href: "/guias" },
  { label: "Quiz Fiscal", href: "/quiz-fiscal" },
  { label: "Abrir atividade", href: "/guias/abrir-atividade" },
  { label: "Regime simplificado", href: "/guias/regime-simplificado" },
  { label: "Escalões de IRS", href: "/guias/escaloes-irs" },
  { label: "Ato isolado", href: "/guias/ato-isolado" },
];

const NAV_EMPRESA = [
  { label: "Planos e preços", href: "/precos" },
  { label: "Investidores", href: "/investidores" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Perguntas frequentes", href: "/#faq" },
  { label: "Fontes fiscais", href: "/#fontes" },
  { label: "Privacidade", href: "/privacidade" },
  { label: "Termos de utilização", href: "/termos" },
];

export default function Footer() {
  return (
    <footer className="mt-auto">
      {/* ── Trust bar ── */}
      <div className="relative overflow-hidden bg-ink">
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(29,158,117,0.5) 30%, rgba(159,225,203,0.6) 50%, rgba(29,158,117,0.5) 70%, transparent)" }}
        />
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <m.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={inViewOnce}
            className="grid grid-cols-2 sm:grid-cols-4"
          >
            {TRUST.map((p) => {
              const Icon = p.icon;
              return (
                <m.div
                  key={p.label}
                  variants={staggerItem}
                  className="flex items-center gap-2.5 px-3 py-4 sm:px-4 sm:py-5"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 ring-1 ring-brand/20">
                    <Icon size={13} className="text-brand-mint" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold leading-tight text-stone-100 truncate">{p.label}</p>
                    <p className="text-[10px] font-medium leading-tight text-stone-500 truncate">{p.sub}</p>
                  </div>
                </m.div>
              );
            })}
          </m.div>
        </div>
      </div>

      {/* ── Corpo principal ── */}
      <div className="relative overflow-hidden bg-cream dark:bg-stone-950">
        <div
          className="pointer-events-none absolute -top-20 right-0 h-[500px] w-[500px] translate-x-1/4 rounded-full blur-[100px]"
          style={{ background: "rgba(29,158,117,0.04)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] -translate-x-1/4 translate-y-1/4 rounded-full blur-[80px]"
          style={{ background: "rgba(29,158,117,0.03)" }}
          aria-hidden
        />

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">
          {/* ── Chamada a investidores ── */}
          <m.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewOnce}
            className="mb-12"
          >
            <Link
              href="/investidores"
              className="group relative block overflow-hidden rounded-4xl border border-brand/30 bg-ink p-6 shadow-float transition-all hover:border-brand/50 sm:p-8"
            >
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand/15 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-brand-mint/10 blur-3xl" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand-mint ring-1 ring-brand/30">
                    <CheckTrend size={22} />
                  </span>
                  <div className="min-w-0">
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-mint">Para investidores</div>
                    <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">
                      Investe no copiloto fiscal dos independentes
                    </h3>
                    <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-stone-300">
                      O ReciboCerto transforma a complexidade fiscal portuguesa em tranquilidade para quem trabalha
                      por conta própria. Conhece a visão de produto, o mercado e a oportunidade de entrar cedo.
                    </p>
                  </div>
                </div>
                <span className="inline-flex flex-shrink-0 items-center gap-2 self-start rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all group-hover:bg-brand-dark sm:self-auto">
                  Conhecer a oportunidade
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </m.div>

          {/* ── Topo: logo + CTA ── */}
          <m.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewOnce}
            className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <div className="mb-3"><Logo /></div>
              <p className="max-w-md text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
                Copiloto financeiro para quem trabalha em Portugal — sabe quanto é teu,
                quanto reservar e quando pagar, sem surpresas.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 self-start rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-float sm:self-auto"
            >
              <Zap size={14} />
              Abrir o dashboard
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </m.div>

          {/* ── Grelha de navegação ── */}
          <m.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={inViewOnce}
            className="grid grid-cols-2 gap-8 border-t border-stone-200/60 pt-10 dark:border-stone-800 sm:grid-cols-3 lg:grid-cols-4"
          >
            {/* Ferramentas — com ícones */}
            <m.div variants={staggerItem} className="col-span-2 sm:col-span-1">
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-dark dark:text-brand-mint">
                Ferramentas
              </h3>
              <ul className="space-y-2">
                {NAV_FERRAMENTAS.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="group flex items-center gap-2 text-[12.5px] font-medium text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
                    >
                      <l.Icon size={12} className="shrink-0 text-stone-400 transition-colors group-hover:text-brand dark:text-stone-600" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </m.div>

            {/* Aprender */}
            <m.div variants={staggerItem}>
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-dark dark:text-brand-mint">
                Aprender
              </h3>
              <ul className="space-y-2">
                {NAV_APRENDER.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[12.5px] font-medium text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </m.div>

            {/* Empresa */}
            <m.div variants={staggerItem}>
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-dark dark:text-brand-mint">
                ReciboCerto
              </h3>
              <ul className="space-y-2">
                {NAV_EMPRESA.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[12.5px] font-medium text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </m.div>

            {/* Contacto + newsletter */}
            <m.div variants={staggerItem}>
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-dark dark:text-brand-mint">
                Contacto
              </h3>
              <a
                href="mailto:recibocerto.pt@gmail.com"
                className="group flex items-center gap-2 text-[12.5px] font-medium text-stone-500 transition-colors hover:text-brand dark:text-stone-400"
              >
                <Mail size={13} className="shrink-0 text-stone-400 transition-colors group-hover:text-brand dark:text-stone-600" />
                recibocerto.pt@gmail.com
              </a>

              <div className="mt-6 rounded-xl border border-stone-200/60 bg-white/60 p-4 dark:border-stone-800 dark:bg-stone-900/40">
                <p className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">Dados oficiais {FISCAL_YEAR}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
                  Tabelas AT, taxas SS e limites do Orçamento de Estado — verificados e atualizados automaticamente.
                </p>
                <Link
                  href="/#fontes"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                  Ver fontes <ArrowRight size={10} />
                </Link>
              </div>
            </m.div>
          </m.div>

          {/* ── Aviso legal ── */}
          <m.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewOnce}
            className="mt-10 flex items-start gap-3 rounded-xl border border-alert-border/60 bg-alert-bg/60 px-4 py-3.5 dark:border-stone-700 dark:bg-stone-800/40"
          >
            <Warning size={12} className="mt-0.5 shrink-0 text-alert-text dark:text-yellow-500" />
            <p className="text-[11px] leading-relaxed text-alert-text/90 dark:text-stone-400">
              <strong className="font-semibold">Não vinculativo.</strong>{" "}
              Calculadora informativa baseada nas taxas fiscais de {FISCAL_YEAR}. Não substitui
              aconselhamento de um contabilista certificado. Confirma sempre com a AT.
            </p>
          </m.div>

          {/* ── Barra inferior ── */}
          <div className="mt-8 border-t border-stone-200/50 dark:border-stone-800 pb-8 pt-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
                © {FISCAL_YEAR} ReciboCerto · Portugal
              </p>

              <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400 dark:text-stone-500">
                Feito com
                <Heart size={10} className="fill-brand/70 text-brand/70" />
                para quem trabalha em Portugal
              </div>

              <nav className="flex flex-wrap items-center justify-center gap-4" aria-label="Páginas legais">
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
                <button
                  type="button"
                  onClick={abrirPreferenciasCookies}
                  className="text-[11px] font-medium text-stone-400 transition-colors hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300"
                >
                  Cookies
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
