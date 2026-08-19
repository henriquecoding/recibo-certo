"use client";

// ═══════════════════════════════════════════════════════════════════════
//  QUANDO NÃO HÁ PREÇO POSSÍVEL — um diagnóstico, não uma parede
//  ---------------------------------------------------------------------
//  O que existia era um retângulo vermelho com uma frase, e mais nada:
//  desapareciam a faixa, o cursor, as métricas, os cenários e a memória
//  de cálculo. Ou seja, no momento em que a pessoa mais precisa de saber
//  QUAL fração está a comer o preço e qual é o teto real, a ferramenta
//  ficava mais calada do que em qualquer outro estado.
//
//  E a frase, sozinha, é fácil de ler ao contrário. «Só te sobram 41% de
//  cada euro cobrado» leva a pensar que o problema é a margem pedida
//  quando, quase sempre, o problema é uma comissão sobre o valor COM IVA
//  a valer 18,45% do valor sem IVA.
//
//  Por isso este ecrã mostra a repartição, o teto, e um botão que põe a
//  margem no máximo que as contas aguentam — que é a ação que a pessoa
//  ia tentar fazer à mão, a tentar adivinhar o número.
// ═══════════════════════════════════════════════════════════════════════

import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { pct } from "@/lib/format";
import type { ResultadoPreco as Resultado } from "@/lib/pricing";
import { Warning, Info } from "@/components/ui/Icons";

export default function SemPreco({
  resultado,
  aoAceitarMaximo,
}: {
  resultado: Resultado;
  /** Põe a margem no teto que estas frações permitem. */
  aoAceitarMaximo?: (margem: number) => void;
}) {
  const { diagnostico } = resultado;
  const total = diagnostico.consumidores.reduce((s, c) => s + c.fracao, 0);
  // Uma margem exatamente no teto deixa o denominador a zero e não tem
  // preço: propõe-se um passo abaixo, que é o maior valor que resolve.
  const proposta = Math.max(0, diagnostico.margemMaxima - 0.02);

  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      aria-label="Não há preço possível"
      className="rounded-4xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30 sm:p-7"
    >
      <div className="mb-2 flex items-start gap-2">
        <Warning size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
        <h2 className="font-display text-lg font-semibold text-red-900 dark:text-red-200">
          Não há preço possível com estes números
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-red-800 dark:text-red-300">{resultado.motivoTexto}</p>

      {diagnostico.consumidores.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-white/70 p-4 dark:bg-stone-900/60">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
            De cada euro que cobras
          </p>

          <ul className="space-y-2">
            {diagnostico.consumidores.map((c) => (
              <li key={c.rotulo}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm text-stone-700 dark:text-stone-200">{c.rotulo}</span>
                  <span className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                    −{pct(c.fracao)}
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-red-400"
                    style={{ width: `${Math.min(100, c.fracao * 100)}%` }}
                  />
                </div>
                {c.sobreBruto && c.fracaoOriginal !== undefined ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                    Pediram-te {pct(c.fracaoOriginal)}, mas incide sobre o valor <strong>com IVA</strong> — o que sai da
                    tua margem são {pct(c.fracao)}.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 border-t border-stone-200 pt-3 dark:border-stone-700">
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Sobra para ti</span>
            <span className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
              {pct(Math.max(0, 1 - total))}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl bg-white/70 p-4 dark:bg-stone-900/60">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
          <Info size={15} className="mt-0.5 flex-shrink-0 text-stone-500 dark:text-stone-400" />
          <span>
            Pediste{" "}
            <strong className="font-semibold tabular-nums">{pct(diagnostico.margemPedida)}</strong> de margem e o máximo
            que estas contas aguentam é{" "}
            <strong className="font-semibold tabular-nums">{pct(diagnostico.margemMaxima)}</strong>. Subir o preço não
            resolve: as comissões sobem com ele.
          </span>
        </p>

        {aoAceitarMaximo && proposta > 0 ? (
          <button
            type="button"
            onClick={() => aoAceitarMaximo(proposta)}
            className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Pôr a margem em {pct(proposta)} e ver o preço
          </button>
        ) : null}

        <p className="mt-3 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
          As outras saídas são reais e estão todas acima: baixar o custo, negociar a comissão, mudar de canal, ou
          aceitar uma margem menor. Nenhuma delas é a ferramenta a dizer que não.
        </p>
      </div>
    </m.section>
  );
}
