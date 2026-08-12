// ═══════════════════════════════════════════════════════════════════════
//  O CENTRO FISCAL — /ferramentas
//  ---------------------------------------------------------------------
//  O que existia era uma lista vertical de cartões quase iguais, dentro de
//  uma coluna de 768px, sem taxonomia, filtros, pesquisa, orientação por
//  objetivo nem continuidade. A 1920×1080 via-se o título, um parágrafo e
//  DOIS cartões; o resto do inventário ficava abaixo da dobra (P1-02).
//
//  Esta página tem três responsabilidades (§0):
//   1. ajudar a pessoa a descobrir a ferramenta certa PELO PROBLEMA;
//   2. dar acesso direto, canónico e pesquisável a todas as ferramentas;
//   3. não fingir contagens — o número vem do catálogo.
//
//  ORÇAMENTO (§13.1): Server Component por omissão. A única ilha de
//  cliente é a pesquisa/filtros. Nenhum motor fiscal, nenhum simulador e
//  nenhum mapa são importados por esta rota.
// ═══════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import { ArrowRight, BookOpen, Trophy, ShieldCheck, Check } from "@/components/ui/Icons";
import {
  FERRAMENTAS_ATIVAS, TOTAL_FERRAMENTAS, comecarPorAqui, temasDisponiveis,
  tiposDisponiveis, PERCURSOS, resolverPercurso,
} from "@/lib/ferramentas";
import { DATA_LAST_REVIEW } from "@/lib/fiscal-data";
import CartaoFerramenta from "@/components/ferramentas/CartaoFerramenta";
import HubFerramentas from "@/components/ferramentas/HubFerramentas";
import ContinuarOndeFicaste from "@/components/ferramentas/ContinuarOndeFicaste";
import AtalhosIntencao from "@/components/ferramentas/AtalhosIntencao";
import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";

export const metadata: Metadata = {
  title: `Ferramentas fiscais 2026 — ${TOTAL_FERRAMENTAS} simuladores e calculadoras | ReciboCerto`,
  description:
    "Simula, compara e confirma valores com regras portuguesas verificadas para 2026: recibos verdes, salário líquido, IRS anual, Segurança Social, empresa, heranças e mais. Grátis, sem conta e com os cálculos no teu dispositivo.",
  keywords: [
    "ferramentas fiscais Portugal 2026",
    "calculadora recibos verdes 2026",
    "simulador salário líquido 2026",
    "calculadora segurança social trabalhador independente",
    "simulador IRS 2026",
    "recibos verdes vs contrato",
  ],
  // Os filtros do hub NUNCA geram URLs indexáveis próprias (§14): o
  // canonical é sempre a página sem parâmetros.
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas" },
  openGraph: {
    title: `Centro Fiscal — ${TOTAL_FERRAMENTAS} ferramentas para resolver a tua situação | ReciboCerto`,
    description:
      "Começa pelo teu problema, não pelo nome do imposto. Simuladores, calculadoras e decisores com regras verificadas de 2026 — grátis e sem conta.",
    url: "https://www.recibocerto.pt/ferramentas",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "website",
  },
};

const dataPT = (iso: string) =>
  new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));

export default function FerramentasPage() {
  const destaques = comecarPorAqui();
  const temas = temasDisponiveis();
  const tipos = tiposDisponiveis();

  return (
    <>
      {/* ── 1. Hero operacional ──────────────────────────────────────── */}
      <Reveal className="mb-10">
        <div className="eyebrow mb-3 text-brand">Ferramentas fiscais 2026</div>
        <h1 className="font-display display-2 mb-4 font-semibold text-ink text-balance">
          Resolve a tua situação fiscal com a ferramenta certa.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-stone-500 dark:text-stone-400">
          Simula, compara e confirma valores com regras portuguesas verificadas — grátis, sem conta
          e com os cálculos no teu dispositivo.
        </p>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500 dark:text-stone-400">
          {[
            `${TOTAL_FERRAMENTAS} ferramentas`,
            "Regras verificadas para 2026",
            "Sem conta para calcular",
          ].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <Check size={15} className="text-brand" /> {t}
            </li>
          ))}
        </ul>
        <AtalhosIntencao />
      </Reveal>

      {/* ── 2. Começa por aqui ───────────────────────────────────────── */}
      <section aria-labelledby="comecar" className="mb-14">
        <h2 id="comecar" className="font-display mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100">
          Começa por aqui
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {destaques.map((f, i) => (
            <CartaoFerramenta key={f.id} ferramenta={f} destaque={i === 0} />
          ))}
        </div>
      </section>

      {/* ── 3. Todas as ferramentas (ilha de cliente) ────────────────── */}
      <HubFerramentas ferramentas={FERRAMENTAS_ATIVAS} temas={temas} tipos={tipos} />

      {/* ── 4. Percursos ─────────────────────────────────────────────── */}
      <section aria-labelledby="percursos" className="mt-14">
        <h2 id="percursos" className="font-display mb-1.5 text-xl font-semibold text-stone-800 dark:text-stone-100">
          Percursos completos
        </h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Sequências que terminam num resultado, não mais uma lista de links.
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {PERCURSOS.map((p) => {
            const passos = resolverPercurso(p);
            return (
              <div
                key={p.id}
                className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6"
              >
                <h3 className="text-[15px] font-semibold text-stone-800 dark:text-stone-100">{p.title}</h3>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{p.outcome}</p>
                <ol className="mt-4 space-y-2.5">
                  {passos.map(({ ferramenta, note }, i) => (
                    <li key={ferramenta.id} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-[11px] font-bold text-brand-dark dark:bg-brand/15 dark:text-brand"
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={ferramenta.canonicalHref}
                          className="text-sm font-semibold text-stone-700 underline-offset-2 hover:text-brand hover:underline dark:text-stone-200"
                        >
                          {ferramenta.title}
                        </Link>
                        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                          {note}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 5. Continuar onde ficaste (só com dados locais) ──────────── */}
      <ContinuarOndeFicaste />

      {/* ── 6. Aprender — separado das ferramentas ───────────────────── */}
      <section aria-labelledby="aprender" className="mt-14">
        <h2 id="aprender" className="font-display mb-1.5 text-xl font-semibold text-stone-800 dark:text-stone-100">
          Aprender e confirmar
        </h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Não são ferramentas e não entram na contagem — mas são o contexto que faz as ferramentas
          valerem alguma coisa.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/guias"
            className="group flex items-start gap-4 rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-all hover:border-brand hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
              <BookOpen size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[15px] font-semibold text-stone-800 dark:text-stone-100">
                Guias fiscais
                <ArrowRight size={14} className="text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                IRS, IVA, Segurança Social, empresa e património — com base legal e fonte oficial em
                cada afirmação.
              </span>
            </span>
          </Link>
          <Link
            href="/quiz-fiscal"
            className="group flex items-start gap-4 rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-all hover:border-brand hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
              <Trophy size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[15px] font-semibold text-stone-800 dark:text-stone-100">
                Quiz Fiscal
                <ArrowRight size={14} className="text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                {TOTAL_PERGUNTAS_META.toLocaleString("pt-PT")} perguntas para testares o que percebeste,
                com a base legal em cada resposta.
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* ── 7. Rigor e privacidade ───────────────────────────────────── */}
      <section
        aria-labelledby="rigor"
        className="mt-14 rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <ShieldCheck size={18} />
          </span>
          <h2 id="rigor" className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
            Rigor e privacidade
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            Todos os cálculos usam as taxas, escalões, coeficientes e deduções em vigor para 2026,
            com base legal identificada e fonte oficial ligada. A última revisão dos parâmetros
            fiscais foi a {dataPT(DATA_LAST_REVIEW)}.
          </p>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            Os valores que introduzes e os documentos que carregas ficam no teu dispositivo. Não
            precisas de conta para calcular, e nada é enviado para servidores sem uma ação explícita
            tua.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/metodologia"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            Como verificamos <ArrowRight size={12} />
          </Link>
          <Link
            href="/estado-dos-dados"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            Estado dos dados <ArrowRight size={12} />
          </Link>
          <Link
            href="/privacidade"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            Privacidade <ArrowRight size={12} />
          </Link>
        </div>
      </section>
    </>
  );
}
