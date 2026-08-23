"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PARA QUEM NÃO SABE O QUE SABE FAZER
//  ---------------------------------------------------------------------
//  ┌────────────────────────────────────────────────────────────────────┐
//  │ O motor exige competências declaradas para correr, e a exigência   │
//  │ é correta: sem elas o grafo não tem por onde começar. Mas quem     │
//  │ chega a esta página SEM SABER o que sabe fazer é, plausivelmente,  │
//  │ quem mais precisa da ferramenta — e a resposta que recebia era um  │
//  │ botão desativado com uma frase a explicar porquê.                  │
//  │                                                                    │
//  │ Este painel lê o grafo ao contrário: dos problemas que existem na  │
//  │ zona para as competências que os destrancam. Não pontua nada e     │
//  │ não é um atalho ao motor. É uma lista de coisas que doem a alguém  │
//  │ em Portugal, para a pessoa se reconhecer numa e declarar a         │
//  │ competência a partir dali — com um clique, sem voltar atrás nem    │
//  │ procurar a pastilha certa numa lista de vinte e duas.              │
//  └────────────────────────────────────────────────────────────────────┘

import { useMemo, useState } from "react";
import { explorarPorSetor } from "@/lib/negocio/descoberta/conhecimento/grafo";
import { marketRegionLabel } from "@/lib/negocio/market/geografia";
import type { MarketRegion } from "@/lib/negocio/market/geografia";
import { ChevronDown, Plus, Search } from "@/components/ui/Icons";

export interface ExplorarSemCompetenciasProps {
  regiao: MarketRegion;
  /** As que já estão declaradas — para não oferecer o que já foi escolhido. */
  declaradas: ReadonlySet<string>;
  onDeclarar: (competenciaId: string) => void;
}

export default function ExplorarSemCompetencias({
  regiao,
  declaradas,
  onDeclarar,
}: ExplorarSemCompetenciasProps) {
  const setores = useMemo(() => explorarPorSetor(regiao), [regiao]);
  const [aberto, setAberto] = useState<string>(setores[0]?.setor ?? "");

  const total = setores.reduce((soma, item) => soma + item.problemas.length, 0);

  return (
    <section
      aria-labelledby="explorar-sem-competencias"
      className="rounded-4xl border border-stone-100 bg-cream/60 p-4 dark:border-stone-800 dark:bg-stone-950/40 sm:p-5"
    >
      <h3
        id="explorar-sem-competencias"
        className="font-display flex items-center gap-2 text-base font-semibold text-ink"
      >
        <Search size={15} className="text-brand" /> Não sabes por onde começar?
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
        Estes são os {total} problemas que o motor conhece
        {regiao === "portugal" ? " em Portugal" : ` e que existem em ${marketRegionLabel(regiao)}`}. Não
        são negócios nem sugestões: são coisas que custam tempo ou dinheiro a alguém. Lê até reconheceres
        uma que saberias resolver e declara aí a competência — o motor arranca a partir daí.
      </p>

      <div className="mt-3 space-y-1.5">
        {setores.map((setor) => {
          const open = aberto === setor.setor;
          return (
            <div
              key={setor.setor}
              className="overflow-hidden rounded-3xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900"
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setAberto(open ? "" : setor.setor)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                    {setor.rotulo}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-stone-500">
                    {setor.problemas.length}{" "}
                    {setor.problemas.length === 1 ? "problema" : "problemas"}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`flex-none text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open ? (
                <ul className="space-y-3 border-t border-stone-100 p-3.5 dark:border-stone-800">
                  {setor.problemas.map(({ problema, destrancadoPor, meiosImprescindiveis }) => (
                    <li key={problema.id} className="border-t border-stone-100 pt-3 first:border-t-0 first:pt-0 dark:border-stone-800">
                      <p className="text-[13px] font-semibold leading-snug text-stone-800 dark:text-stone-100">
                        {problema.enunciado}
                      </p>
                      <p className="mt-1 text-[12px] leading-snug text-stone-500">{problema.porqueDoi}</p>
                      <p className="mt-1 text-[11px] leading-snug text-stone-400">
                        Quem tem este problema: {problema.clientes.join(" · ")}
                      </p>
                      {meiosImprescindiveis.length > 0 ? (
                        <p className="mt-1 text-[11px] leading-snug text-stone-400">
                          Exige sempre: {meiosImprescindiveis.join(", ")}
                        </p>
                      ) : null}

                      {destrancadoPor.length > 0 ? (
                        <div className="mt-2">
                          <p className="text-[11px] font-medium text-stone-500">
                            Sei fazer isto — declarar:
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {destrancadoPor.map((competencia) => {
                              const ja = declaradas.has(competencia.id);
                              return (
                                <button
                                  key={competencia.id}
                                  type="button"
                                  disabled={ja}
                                  onClick={() => onDeclarar(competencia.id)}
                                  className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                    ja
                                      ? "border-brand bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
                                      : "border-stone-200 bg-white text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                                  }`}
                                >
                                  {ja ? null : <Plus size={11} />}
                                  {competencia.rotulo}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-stone-500">
        Isto não é um ranking e não pontua nada: é o que existe, por setor. A escolha continua a ser tua —
        o que muda é que passa a haver por onde começar.
      </p>
    </section>
  );
}
