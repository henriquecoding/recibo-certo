"use client";

import Link from "next/link";
import { m } from "motion/react";
import { PILARES } from "@/lib/navegacao";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { fadeUp, staggerContainer, staggerItem, inViewOnce } from "@/lib/motion";
import {
  Logo, ShieldCheck, Lock, Clock, CheckTrend, ArrowRight,
  Calendar, Calculator, Scale, Mail,
  Warning, Heart, BookOpen, MapPin, Zap, Briefcase,
} from "@/components/ui/Icons";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { abrirPreferenciasCookies } from "@/lib/cookie-consent";

const TRUST = [
  { icon: CheckTrend, label: "Dados " + FISCAL_YEAR, sub: "Fontes oficiais AT · SS · OE" },
  { icon: Lock, label: "100% privado", sub: "Sem conta obrigatória" },
  { icon: ShieldCheck, label: "Offline", sub: "Dados no teu dispositivo" },
  { icon: Clock, label: "Atualizado", sub: "Monitorização automática" },
];

/**
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ OS CINCO PILARES VÊM DA FONTE, E O RESTO É CURADORIA DO RODAPÉ         │
 * │                                                                       │
 * │ O rodapé é a terceira superfície de navegação (com a cápsula e a       │
 * │ barra do telemóvel) e era a única que não sabia disso: tinha a sua     │
 * │ própria lista, escrita à mão, onde a primeira entrada — «Calculadora   │
 * │ de recibos verdes» — apontava para `/#calculadora`, o TOPO da          │
 * │ homepage. É o defeito P0-02 outra vez: um destino que não é uma        │
 * │ página, numa lista que promete páginas.                                │
 * │                                                                       │
 * │ Os cinco pilares passam a derivar de `lib/navegacao.ts`, com o         │
 * │ canónico verdadeiro de cada um. O que vem a seguir continua a ser      │
 * │ curadoria editorial do rodapé — e é legítimo que seja: um rodapé pode  │
 * │ dizer mais do que uma barra. O que não pode é dizer OUTRA coisa.       │
 * └───────────────────────────────────────────────────────────────────────┘
 */
const NAV_FERRAMENTAS = [
  ...PILARES.map((p) => ({ label: p.label, href: p.href, Icon: iconeDe(p.icone) })),
  { label: "Simulador de IRS anual", href: "/ferramentas/simulador-irs", Icon: Calculator },
  { label: "Comparador de regimes", href: "/ferramentas/comparar-regimes", Icon: Scale },
  { label: "Mapa de preços por região", href: "/ferramentas/mapa-contabilistas", Icon: MapPin },
  { label: "Prazos fiscais", href: "/dashboard/prazos", Icon: Calendar },
  { label: "Todas as ferramentas", href: "/ferramentas", Icon: Briefcase },
];

const NAV_APRENDER = [
  { label: "Guias fiscais", href: "/guias" },
  { label: "Quiz Fiscal", href: "/quiz-fiscal" },
  { label: "Abrir atividade", href: "/guias/abrir-atividade" },
  { label: "Regime simplificado", href: "/guias/regime-simplificado" },
  { label: "Escalões de IRS", href: "/guias/escaloes-irs" },
  { label: "Ato isolado", href: "/guias/ato-isolado" },
];

// As três páginas de autoridade (§10.3 do relatório estratégico) entram
// aqui, e não numa secção escondida: metodologia, cobertura dos dados e
// histórico de correções são o que sustenta tudo o resto. Um site que
// calcula impostos e não diz como o faz pede confiança sem a merecer.
const NAV_EMPRESA = [
  { label: "Metodologia", href: "/metodologia" },
  { label: "Estado dos dados", href: "/estado-dos-dados" },
  { label: "Changelog fiscal", href: "/changelog-fiscal" },
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
          {/* ── Chamada a investidores: REMOVIDA do rodapé ──────────────
              Era um banner do tamanho de uma secção, em todas as páginas do
              site, a dizer "Investe no copiloto fiscal dos independentes". Fica
              o pior dos dois mundos: ocupa a atenção de quem já é utilizador —
              e que não vai investir — e não traz descoberta externa nenhuma,
              porque a página tem `noindex`.

              A ligação continua a existir, discreta, na lista "Empresa" aqui em
              baixo. Quem procura, encontra; quem veio calcular impostos, não é
              interrompido. Repor este banner só faz sentido depois de a página
              ser pública e a comunicação estar revista. */}

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
                  Tabelas AT, taxas SS e limites do Orçamento de Estado — monitorizados automaticamente e revistos por humanos.
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
