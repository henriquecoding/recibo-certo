"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import {
  ArrowRight,
  Check,
  Filter,
  Lightbulb,
  Search,
  ShieldCheck,
} from "@/components/ui/Icons";
import type { ExemploDescoberta } from "./HeroDescobrir";
import { EASE } from "@/lib/motion";

const RESTRICOES = [
  {
    id: "capital",
    label: "Sem stock nem espaço",
    efeito: "Produção própria, loja física e operações intensivas em capital ficam fora.",
  },
  {
    id: "tempo",
    label: "Só algumas horas",
    efeito: "Urgências, turnos e disponibilidade permanente deixam de caber.",
  },
  {
    id: "online",
    label: "Quero operar online",
    efeito: "As hipóteses que dependem de deslocação ou presença física perdem prioridade.",
  },
] as const;

type RestricaoId = (typeof RESTRICOES)[number]["id"];

export default function LaboratorioDescobrir({ exemplo }: { exemplo: ExemploDescoberta }) {
  const [ativas, setAtivas] = useState<RestricaoId[]>(["capital"]);

  const efeitos = RESTRICOES.filter((restricao) => ativas.includes(restricao.id));

  const alternar = (id: RestricaoId) => {
    setAtivas((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id],
    );
  };

  return (
    <section id="como-decide" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-end gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="max-w-2xl">
            <div className="eyebrow mb-3 text-brand">Experimenta o raciocínio</div>
            <h2 className="text-balance font-display display-2 font-semibold text-ink">
              Uma restrição útil corta mais ruído do que dez filtros decorativos.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-stone-600 lg:justify-self-end">
            Liga e desliga condições reais. Esta demonstração não finge calcular procura:
            mostra apenas o que muda no universo de hipóteses. A análise completa consulta as fontes e
            explica cada exclusão.
          </p>
        </div>

        <div className="mt-9 grid overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-lift dark:border-stone-700 dark:bg-stone-900 lg:grid-cols-[.78fr_1.22fr]">
          <div className="border-b border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-900 sm:p-7 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-stone-500">
              <Filter size={15} className="text-brand" /> O que tem mesmo de caber
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              Perfil de exemplo: <strong className="font-semibold text-stone-700 dark:text-stone-200">{exemplo.competencia}</strong>,
              trabalho com dados e operação a solo.
            </p>

            <div className="mt-6 space-y-2.5" role="group" aria-label="Restrições do exemplo">
              {RESTRICOES.map((restricao) => {
                const ativa = ativas.includes(restricao.id);
                return (
                  <button
                    key={restricao.id}
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => alternar(restricao.id)}
                    className={`focus-marca flex min-h-[52px] w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                      ativa
                        ? "border-brand bg-brand-light text-brand-dark shadow-card dark:bg-brand/15 dark:text-brand-mint"
                        : "border-stone-200 bg-white text-stone-600 hover:border-brand/35 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    }`}
                  >
                    <span>{restricao.label}</span>
                    <span
                      aria-hidden
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${
                        ativa ? "border-brand bg-brand text-white" : "border-stone-300 text-transparent dark:border-stone-600"
                      }`}
                    >
                      <Check size={11} />
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-stone-500">
              <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-brand" />
              As respostas são opcionais e ficam no dispositivo. “Não respondido” nunca é tratado como zero.
            </p>
          </div>

          <div className="relative p-5 sm:p-7 lg:p-9">
            <div aria-hidden className="absolute right-0 top-0 h-48 w-48 rounded-full bg-brand-light/70 blur-3xl dark:bg-brand/10" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-brand">Depois do corte</div>
                <h3 className="mt-1 font-display text-2xl font-semibold text-ink">O que continua de pé</h3>
              </div>
              <span className="rounded-full border border-brand/25 bg-brand-light px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
                {ativas.length === 0 ? "Contexto aberto" : `${ativas.length} ${ativas.length === 1 ? "fronteira ativa" : "fronteiras ativas"}`}
              </span>
            </div>

            <div className="relative mt-6 rounded-3xl border border-stone-200 bg-cream p-5 dark:border-stone-700 dark:bg-stone-950 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
                  <Lightbulb size={18} />
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">Hipótese compatível</div>
                  <h4 className="mt-1 font-display text-xl font-semibold leading-tight text-ink">
                    {exemplo.titulo}
                  </h4>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 shadow-card dark:bg-stone-800 dark:text-stone-200">
                  {exemplo.modelo}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 shadow-card dark:bg-stone-800 dark:text-stone-200">
                  Serviço B2B
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 shadow-card dark:bg-stone-800 dark:text-stone-200">
                  Sem stock
                </span>
              </div>
            </div>

            <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-200">
                  <Filter size={14} className="text-clay-text" /> O que saiu do caminho
                </div>
                <AnimatePresence mode="popLayout" initial={false}>
                  {efeitos.length > 0 ? (
                    <m.ul
                      key={ativas.join("-")}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="mt-3 space-y-2"
                    >
                      {efeitos.map((item) => (
                        <li key={item.id} className="text-xs leading-relaxed text-stone-500">
                          {item.efeito}
                        </li>
                      ))}
                    </m.ul>
                  ) : (
                    <m.p
                      key="sem-restricoes"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-xs leading-relaxed text-stone-500"
                    >
                      Ainda não excluímos nada. O motor mantém mais hipóteses e assinala o contexto em falta.
                    </m.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-200">
                  <Search size={14} className="text-brand" /> O que a faria falhar
                </div>
                <p className="mt-3 text-xs leading-relaxed text-stone-500">
                  {exemplo.testeDeFalsificacao}
                </p>
              </div>
            </div>

            <div className="relative mt-6 flex flex-col gap-3 border-t border-stone-200 pt-5 dark:border-stone-700 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-sm text-xs leading-relaxed text-stone-500">
                Na ferramenta completa, cada candidato traz origem, lacunas, riscos e plano de investigação.
              </p>
              <Link
                href="/ferramentas/descobrir-negocio"
                className="focus-marca inline-flex min-h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float"
              >
                Usar o meu contexto <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
