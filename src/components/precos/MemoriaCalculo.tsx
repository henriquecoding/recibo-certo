"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «Ver cálculo» — a memória, linha a linha
//  ---------------------------------------------------------------------
//  Fechada por omissão (divulgação progressiva) e completa quando aberta.
//  Cada linha mostra de onde vem: uma taxa legal e uma comissão negociável
//  não podem parecer a mesma coisa no ecrã, porque levam a ações
//  diferentes — uma cumpre-se, a outra renegoceia-se.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE } from "@/lib/motion";
import { fmt, pct } from "@/lib/format";
import type { Aviso, LinhaExplicacao, NivelConfianca, SeveridadeAviso } from "@/lib/pricing";
import { REVISAO_PRICING } from "@/lib/pricing";
import { Warning, Info, ExternalLink } from "@/components/ui/Icons";

const ROTULO_CONFIANCA: Record<NivelConfianca, string> = {
  oficial: "Lei",
  mercado: "Preçário",
  estimativa: "Estimativa",
};

const CLASSE_CONFIANCA: Record<NivelConfianca, string> = {
  oficial: "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint",
  mercado: "bg-alert-bg text-alert-text dark:bg-alert-text/15 dark:text-alert",
  estimativa: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

export function MemoriaCalculo({ linhas }: { linhas: LinhaExplicacao[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <section className="rounded-4xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex min-h-[48px] w-full items-center justify-between gap-3 px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span>
          <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">Ver cálculo</span>
          <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
            Como se chegou a este valor, com a fonte de cada linha
          </span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={`flex-shrink-0 text-stone-500 dark:text-stone-400 transition-transform ${aberto ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {aberto ? (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-stone-100 px-5 py-4 dark:border-stone-800">
              <ul className="space-y-3">
                {linhas.map((linha, i) => (
                  // As linhas informativas DECOMPÕEM uma parcela que já está
                  // na coluna — não são parcelas novas. Entram recuadas, com
                  // uma barra à esquerda e o valor entre parênteses em vez do
                  // sinal de menos, para que a coluna que se soma com os
                  // olhos seja exatamente a que fecha. Ver `LinhaExplicacao`.
                  <li
                    key={`${linha.rotulo}-${i}`}
                    className={
                      linha.informativa
                        ? "border-l-2 border-stone-200 pl-3 text-sm dark:border-stone-700"
                        : "text-sm"
                    }
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={
                            linha.informativa
                              ? "text-stone-500 dark:text-stone-400"
                              : "text-stone-700 dark:text-stone-200"
                          }
                        >
                          {linha.rotulo}
                        </span>
                        <span
                          className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CLASSE_CONFIANCA[linha.confianca]}`}
                        >
                          {ROTULO_CONFIANCA[linha.confianca]}
                        </span>
                      </span>
                      <span className="flex items-baseline gap-2 tabular-nums">
                        {linha.percentagem !== undefined && linha.percentagem > 0 ? (
                          <span className="text-xs text-stone-500 dark:text-stone-400">{pct(linha.percentagem)}</span>
                        ) : null}
                        {linha.informativa ? (
                          <span className="text-stone-500 dark:text-stone-400">
                            <span className="sr-only">Já incluído acima: </span>({fmt(Math.abs(linha.valor))})
                          </span>
                        ) : (
                          <span
                            className={`font-semibold ${
                              linha.valor < 0
                                ? "text-stone-500 dark:text-stone-400"
                                : "text-stone-800 dark:text-stone-100"
                            }`}
                          >
                            {linha.valor < 0 ? "−" : ""}
                            {fmt(Math.abs(linha.valor))}
                          </span>
                        )}
                      </span>
                    </div>
                    {linha.nota ? (
                      <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{linha.nota}</p>
                    ) : null}
                    {linha.fonte ? (
                      <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                        {linha.fonteUrl ? (
                          <a
                            href={linha.fonteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            // `min-h-[24px]`: sozinho na sua linha, este link
                            // não cabe na exceção «inline» da WCAG 2.5.8.
                            className="inline-flex min-h-[24px] items-center gap-1 underline-offset-2 hover:text-brand hover:underline"
                          >
                            {linha.fonte}
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          linha.fonte
                        )}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              <p className="mt-5 border-t border-stone-100 pt-4 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
                Taxas e regras fiscais lidas de fontes oficiais portuguesas. Preçários de canais e meios de pagamento
                verificados a {new Date(REVISAO_PRICING).toLocaleDateString("pt-PT")} — são pressupostos editáveis, não
                factos: confirma no contrato do teu canal.
              </p>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

/**
 * Os avisos, filtráveis por severidade.
 *
 * O filtro existe por causa de um defeito de posição, não de conteúdo: os
 * avisos renderizavam TODOS numa secção única, depois dos campos avançados
 * e depois da memória de cálculo. Um aviso `perigo` — «a este preço cada
 * venda tira-te dinheiro» — nascia quatro ecrãs abaixo do preço a que se
 * referia, que é o pior sítio possível para a mensagem mais urgente da
 * ferramenta.
 *
 * Agora os graves ficam colados ao número e os informativos continuam onde
 * estavam. A ordenação por severidade dentro de cada grupo mantém-se.
 */
export function Avisos({
  avisos,
  apenas,
  rotulo = "Avisos",
}: {
  avisos: Aviso[];
  /** Severidades a mostrar. Sem isto, mostra todas. */
  apenas?: readonly SeveridadeAviso[];
  rotulo?: string;
}) {
  const ordem = { perigo: 0, atencao: 1, info: 2 } as const;
  const ordenados = [...avisos]
    .filter((a) => !apenas || apenas.includes(a.severidade))
    .sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);

  if (ordenados.length === 0) return null;

  return (
    <section aria-label={rotulo} className="space-y-3">
      {ordenados.map((a) => (
        <div
          key={a.id}
          className={`rounded-2xl border p-4 ${
            a.severidade === "perigo"
              ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
              : a.severidade === "atencao"
                ? "border-alert-border bg-alert-bg dark:border-alert-border/40 dark:bg-alert-text/10"
                : "border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50"
          }`}
        >
          <p className="flex items-start gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
            {a.severidade === "info" ? (
              <Info size={15} className="mt-0.5 flex-shrink-0 text-stone-500 dark:text-stone-400" />
            ) : (
              <Warning
                size={15}
                className={`mt-0.5 flex-shrink-0 ${a.severidade === "perigo" ? "text-red-600" : "text-alert-text dark:text-alert"}`}
              />
            )}
            {a.titulo}
          </p>
          <p className="mt-1.5 pl-[23px] text-sm leading-relaxed text-stone-600 dark:text-stone-300">{a.texto}</p>
          {a.fonte ? (
            <p className="mt-1.5 pl-[23px] text-[11px] text-stone-500 dark:text-stone-400">
              {a.fonteUrl ? (
                <a
                  href={a.fonteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  // Como o link da fonte acima: sozinho no seu `<p>`, fora da
                  // exceção «inline» da WCAG 2.5.8.
                  className="inline-flex min-h-[24px] items-center gap-1 underline-offset-2 hover:text-brand hover:underline"
                >
                  {a.fonte}
                  <ExternalLink size={10} />
                </a>
              ) : (
                a.fonte
              )}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
