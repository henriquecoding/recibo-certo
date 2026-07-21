"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Spotlight do Simulador de IRS anual — a ferramenta mais completa do site, com
// a DemoIRS "ao vivo" como montra. A demo arrasta a fonte de verdade fiscal
// (fiscal-data corre asserções no import), por isso entra em chunk próprio via
// next/dynamic + usePerto — nunca pesa no arranque da homepage. A coreografia
// da DemoIRS não é tocada; só é emoldurada.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import dynamic from "next/dynamic";
import { m, AnimatePresence } from "motion/react";
import { usePerfil, type Perfil } from "@/lib/perfil";
import { usePerto } from "@/lib/use-perto";
import Reveal from "@/components/ui/Reveal";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ArrowRight, Check } from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";

function DemoSkeleton() {
  return (
    <div
      className="w-full max-w-md animate-pulse rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900"
      style={{ minHeight: 560 }}
      aria-hidden
    >
      <div className="h-6 w-32 rounded-full bg-stone-100 dark:bg-stone-800" />
      <div className="mt-6 h-10 w-40 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="mt-6 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="mt-4 h-32 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="mt-4 h-24 rounded-2xl bg-stone-50 dark:bg-stone-800/60" />
      <span className="sr-only">A carregar a demonstração…</span>
    </div>
  );
}

const DemoIRS = dynamic(() => import("@/components/simulador/DemoIRS"), {
  ssr: false,
  loading: () => <DemoSkeleton />,
});

// Uma frase de ponte por perfil — só o parágrafo muda; a demo nunca re-monta.
const PONTE: Record<Perfil, string> = {
  independente:
    "Rendimentos da categoria B, retenções na fonte e pagamentos por conta — vê o acerto final antes de a AT o fazer por ti.",
  dependente:
    "Salário, subsídios e deduções à coleta — descobre já se 2026 te traz reembolso ou imposto a pagar.",
  empresa:
    "Salário de gerência e dividendos entram no teu IRS pessoal — simula o quadro completo, não só a empresa.",
  comparar:
    "O mesmo motor que compara os teus cenários, agora ao detalhe — anexo a anexo, escalão a escalão.",
};

const BULLETS = [
  "Todas as categorias e anexos: A, B, E, F, G, H e J",
  "Tributação conjunta com quociente conjugal",
  "Memória de cálculo transparente, passo a passo",
];

export default function SimuladorIRSDestaque() {
  const { perfil } = usePerfil();
  const { ref, perto } = usePerto<HTMLDivElement>("600px 0px");

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
      <Reveal>
        <div className="eyebrow mb-3 text-brand">Simulador de IRS 2026</div>
        <h2 className="font-display display-2 font-semibold text-ink">
          O teu IRS anual,
          <br className="hidden sm:block" /> do rendimento ao reembolso.
        </h2>
        <AnimatePresence mode="wait" initial={false}>
          <m.p
            key={perfil}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-4 max-w-lg text-stone-500 dark:text-stone-400"
          >
            {PONTE[perfil] ?? PONTE.independente}
          </m.p>
        </AnimatePresence>

        <ul className="mt-6 space-y-2.5">
          {BULLETS.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-light text-brand dark:bg-brand/15">
                <Check size={10} />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/ferramentas/simulador-irs"
            className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-float"
          >
            Abrir o simulador completo
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/guias/escaloes-irs"
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
          >
            Ver os escalões de 2026
          </Link>
        </div>
      </Reveal>

      {/* A demo carrega só quando a secção se aproxima; nunca deixa a página em branco */}
      <div ref={ref} className="flex justify-center lg:justify-end">
        <ErrorBoundary etiqueta="demonstração do IRS">
          {perto ? <DemoIRS /> : <DemoSkeleton />}
        </ErrorBoundary>
      </div>
    </div>
  );
}
