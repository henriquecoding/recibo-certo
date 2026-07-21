"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Secção "Ferramentas" da homepage — a montra das landings públicas, moldada ao
// perfil selecionado: uma ferramenta em DESTAQUE + grelha de 4, com transição em
// cascata a cada troca de modo (a mesma linguagem "recalculada" das demos).
// Curadoria e metadados vivem em src/lib/ferramentas-config.ts (fonte única,
// validada em ecossistema.test.ts). Leve de propósito: sem motores fiscais.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { usePerfil, type Perfil } from "@/lib/perfil";
import { ferramentasPorPerfil, type FerramentaMeta } from "@/lib/ferramentas-config";
import { FERRAMENTA_SLUGS } from "@/lib/seo";
import Reveal from "@/components/ui/Reveal";
import { ArrowRight, Check } from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";

const COPY: Record<Perfil, { h2: string; sub: string }> = {
  independente: {
    h2: "Ferramentas afinadas para recibos verdes.",
    sub: "Da classificação da tua atividade ao recibo para o Merchant of Record — cada ferramenta resolve uma dúvida concreta, com as regras de 2026.",
  },
  dependente: {
    h2: "Ferramentas para quem recebe salário.",
    sub: "Confere o líquido, audita o recibo de vencimento e percebe cada linha — com as tabelas de retenção oficiais de 2026.",
  },
  empresa: {
    h2: "Ferramentas para montar e gerir a empresa.",
    sub: "Do simulador de IRC ao preço real de um contabilista na tua região — decide com números, não com palpites.",
  },
  comparar: {
    h2: "Ferramentas para decidir com números.",
    sub: "Compara caminhos, simula o IRS ao detalhe e vê o impacto de cada escolha — tudo com base legal e dados de 2026.",
  },
};

// Chip factual do cartão de destaque, por ferramenta (nada inventado: o número
// de atividades vem do catálogo real, calculado no servidor).
function chipDestaque(slug: string, nAtividades: number): string {
  switch (slug) {
    case "classificar-atividade":
      return `${nAtividades} atividades do Art. 151.º`;
    case "recibo-vencimento":
      return "Tabelas oficiais de retenção 2026";
    case "simulador-empresa":
      return "IRC PME, derrama e dividendos";
    case "simulador-irs":
      return "Anexos A · B · E · F · G · H · J";
    default:
      return "Dados oficiais de 2026";
  }
}

const entrada = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
};

function CartaoFerramenta({ f }: { f: FerramentaMeta }) {
  return (
    <m.div variants={entrada} className="h-full">
      <Link
        href={f.href}
        className="group relative flex h-full flex-col rounded-4xl border border-stone-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white dark:bg-brand/10">
            <f.Icon size={17} />
          </span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {f.badge}
          </span>
        </div>
        <div className="text-sm font-semibold leading-snug text-stone-800 transition-colors group-hover:text-brand-dark dark:text-stone-100 dark:group-hover:text-brand">
          {f.titulo}
        </div>
        <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          {f.descricao}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand">
          Abrir
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </m.div>
  );
}

export default function FerramentasSecao({ nAtividades }: { nAtividades: number }) {
  const { perfil } = usePerfil();
  const copy = COPY[perfil] ?? COPY.independente;
  const { destaque, restantes } = ferramentasPorPerfil(perfil);

  return (
    <div className="mx-auto max-w-5xl">
      <Reveal className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="max-w-xl">
            <div className="eyebrow mb-3 text-brand">Ferramentas para o teu caminho</div>
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={perfil} variants={entrada} initial="hidden" animate="visible" exit="exit">
                <h2 className="font-display display-2 font-semibold text-ink">{copy.h2}</h2>
                <p className="mt-3 text-stone-500 dark:text-stone-400">{copy.sub}</p>
              </m.div>
            </AnimatePresence>
          </div>
          <Link
            href="/ferramentas"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            Ver as {FERRAMENTA_SLUGS.length} ferramentas
            <ArrowRight size={14} />
          </Link>
        </div>
      </Reveal>

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={perfil}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
            exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
          }}
        >
          {/* Cartão em destaque — a ferramenta certa para o perfil ativo */}
          <m.div variants={entrada}>
            <Link
              href={destaque.href}
              className="group relative mb-4 grid gap-6 rounded-4xl border border-brand/25 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-float focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:bg-stone-900 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
                    <destaque.Icon size={20} />
                  </span>
                  <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark dark:bg-brand/10 dark:text-brand">
                    Em destaque para ti
                  </span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                    {destaque.badge}
                  </span>
                </div>
                <div className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                  {destaque.titulo}
                </div>
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {destaque.descricao}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  <Check size={11} className="text-brand" />
                  {chipDestaque(destaque.slug, nAtividades)}
                </div>
              </div>
              <span className="btn-shine inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-all group-hover:-translate-y-0.5 group-hover:bg-brand-dark lg:self-center">
                Experimentar
                <ArrowRight size={14} />
              </span>
            </Link>
          </m.div>

          {/* Grelha das restantes — contagem constante para a altura não saltar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {restantes.map((f) => (
              <CartaoFerramenta key={f.slug} f={f} />
            ))}
          </div>
        </m.div>
      </AnimatePresence>
    </div>
  );
}
