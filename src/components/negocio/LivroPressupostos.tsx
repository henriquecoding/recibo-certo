"use client";

// ═══════════════════════════════════════════════════════════════════════
//  §22 — O LIVRO DE PRESSUPOSTOS
//  ---------------------------------------------------------------------
//  Duas colunas, e a segunda é a que interessa: «confirmado por ti» e
//  «assumido por enquanto». A pricing engine já provou que esta separação
//  é o que impede um exemplo de se apresentar como conselho.
//
//  ── NÃO ESTÁ NUM ACORDEÃO ──────────────────────────────────────────
//  Pela mesma razão que os `Pressupostos` da calculadora não estão: são
//  o mecanismo de honestidade. Escondê-los devolveria ao ecrã o defeito
//  que eles vieram fechar. Regulam-se sozinhos — encolhem à medida que a
//  pessoa responde e desaparecem quando não falta nada.
//
//  ── CADA UM LEVA AO SÍTIO ONDE SE RESOLVE ──────────────────────────
//  Um pressuposto que se lê e não se pode corrigir sem procurar é uma
//  reclamação, não uma ferramenta.
// ═══════════════════════════════════════════════════════════════════════

import { Check } from "@/components/ui/Icons";
import type { PressupostoNegocio } from "@/lib/negocio/tipos";
import { Cartao } from "./atomos";

const TOM_IMPACTO: Record<PressupostoNegocio["impacto"], string> = {
  alto: "bg-alert-bg text-alert-text",
  medio: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  baixo: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

export default function LivroPressupostos({
  assumidos,
  confirmados,
  aoResolver,
}: {
  assumidos: PressupostoNegocio[];
  confirmados: PressupostoNegocio[];
  aoResolver?: (destino: string) => void;
}) {
  if (assumidos.length === 0 && confirmados.length === 0) return null;

  return (
    <Cartao
      titulo="O que é teu e o que estamos a assumir"
      descricao="Um pressuposto declarado é honesto; um pressuposto escondido é um número inventado"
      id="pressupostos"
    >
      {confirmados.length > 0 ? (
        <section aria-labelledby="confirmados-t" className="mb-4">
          <h4
            id="confirmados-t"
            className="eyebrow mb-2 flex items-center gap-1.5 text-brand-dark dark:text-brand-mint"
          >
            <Check size={12} />
            Confirmado por ti
          </h4>
          <dl className="space-y-1">
            {confirmados.map((p) => (
              <div key={p.id} className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0 truncate text-xs text-stone-600 dark:text-stone-300">{p.rotulo}</dt>
                <dd className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                  {p.valor}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {assumidos.length > 0 ? (
        <section aria-labelledby="assumidos-t">
          <h4 id="assumidos-t" className="eyebrow mb-2 text-stone-500 dark:text-stone-400">
            Assumido por enquanto — {assumidos.length}
          </h4>
          <ul className="space-y-2">
            {assumidos.map((p) => (
              <li key={p.id} className="rounded-xl border border-stone-100 p-2.5 dark:border-stone-800">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0 text-xs font-semibold text-stone-800 dark:text-stone-100">{p.rotulo}</span>
                  <span className="flex-shrink-0 text-xs tabular-nums text-stone-600 dark:text-stone-300">
                    {p.valor}
                  </span>
                </div>
                {p.porque ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{p.porque}</p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TOM_IMPACTO[p.impacto]}`}>
                    impacto {p.impacto}
                  </span>
                  {p.resolverEm && aoResolver ? (
                    <button
                      type="button"
                      onClick={() => aoResolver(p.resolverEm!)}
                      // 36 px é o mínimo do projeto (regra 5b). Estes botões
                      // estavam a 32 e passaram a aparecer muitas mais vezes
                      // desde que o livro ganhou os pressupostos do posto de
                      // trabalho, da procura e da caixa.
                      className="inline-flex min-h-[36px] items-center rounded-lg px-1.5 text-[11px] font-semibold text-brand-dark underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-brand-mint"
                    >
                      Resolver isto
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-brand-dark dark:text-brand-mint">
          <Check size={13} />
          Não falta confirmar nada. Este é o cenário mais fiável que esta ferramenta consegue montar.
        </p>
      )}
    </Cartao>
  );
}
