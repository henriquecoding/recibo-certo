"use client";

// ═══════════════════════════════════════════════════════════════════════
//  SECÇÃO REVELÁVEL — a profundidade, disponível sem estar exposta
//  ---------------------------------------------------------------------
//  Cada secção do resultado (`Caixa`, `Tesouraria`, `Cenarios`…) já é um
//  cartão completo, com o seu próprio título e a sua própria moldura. Por
//  isso este componente NÃO as embrulha num segundo cartão: seria dois
//  títulos e duas bordas para a mesma coisa.
//
//  Em vez disso troca de forma:
//
//      fechada →  uma linha só, com o título e um resumo VIVO
//      aberta  →  o cartão original, exatamente como sempre foi
//
//  Quando abre, a linha desaparece e o título do próprio cartão ocupa-lhe
//  o lugar — a leitura é contínua, não há duplicação, e nenhum dos
//  componentes existentes precisou de ser tocado.
//
//  ── O RESUMO NÃO É DECORAÇÃO ───────────────────────────────────────
//  É a única informação que a pessoa tem para decidir se vale a pena
//  abrir. «Tesouraria» não diz nada; «guarda 47 € por mês · IVA a 20 de
//  fevereiro» diz tudo o que muita gente precisa — e essas abrem-na menos
//  vezes, que é exatamente o objetivo. Uma revelação progressiva cujo
//  gatilho não antecipa o valor não reduz carga: só a adia.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "@/components/ui/Icons";

export default function SeccaoRevelavel({
  titulo,
  resumo,
  aberta,
  aoAlternar,
  children,
}: {
  /** O mesmo nome por que a pessoa vai reconhecer o cartão lá dentro. */
  titulo: string;
  /** O que já se sabe sem abrir. Vivo, calculado, nunca genérico. */
  resumo?: string;
  aberta: boolean;
  aoAlternar: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const idPainel = `${id}-painel`;
  const idBotao = `${id}-botao`;

  // ── O FOCO NÃO PODE CAIR NO CHÃO ──────────────────────────────────
  //  Fechada e aberta são árvores diferentes: ao alternar, o elemento
  //  que tinha o foco é desmontado. Sem nada a apanhá-lo, o foco volta
  //  ao `<body>` — e quem navega por teclado é atirado para o topo do
  //  documento a meio da ferramenta, tendo de percorrer tudo outra vez.
  //
  //  ⚠️ ISTO FOI MEDIDO, NÃO IMAGINADO: o `auditar-teclado-preco.mjs`
  //  apanhou-o («Espaço recolhe e o foco sobrevive» a falhar) depois de
  //  o axe ter dado zero violações nas 24 combinações. É o género de
  //  falha que nenhuma ferramenta automática de acessibilidade vê.
  //
  //  Ao ABRIR, o foco vai para a região revelada (que é `tabIndex={-1}`
  //  para o poder receber) — o leitor de ecrã anuncia-a e o Tab seguinte
  //  continua DENTRO do conteúdo novo, que é para onde a pessoa quis ir.
  //  Ao FECHAR, volta para a linha recolhida, que é o que substituiu
  //  aquilo em que ela carregou.
  const [aFocar, setAFocar] = useState(false);
  const refLinha = useRef<HTMLButtonElement>(null);
  const refRegiao = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aFocar) return;
    setAFocar(false);
    (aberta ? refRegiao.current : refLinha.current)?.focus();
  }, [aberta, aFocar]);

  const alternar = () => {
    setAFocar(true);
    aoAlternar();
  };

  if (!aberta) {
    return (
      <button
        id={idBotao}
        ref={refLinha}
        type="button"
        onClick={alternar}
        aria-expanded={false}
        aria-controls={idPainel}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left transition-colors hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700 dark:hover:bg-stone-800/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{titulo}</span>
          {resumo ? (
            <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">{resumo}</span>
          ) : null}
        </span>
        <ChevronDown size={16} className="flex-shrink-0 text-stone-500 dark:text-stone-400" />
      </button>
    );
  }

  return (
    <div
      id={idPainel}
      ref={refRegiao}
      role="region"
      aria-label={titulo}
      // `-1` para poder receber o foco por programa sem entrar na ordem
      // do Tab: quem passa por aqui a tabular não leva um passo extra.
      tabIndex={-1}
      className="focus:outline-none"
    >
      {children}
      {/* Fechar é uma ação secundária: quem abriu quis ver. Fica no fim,
          onde a pessoa chega depois de ler, e não a competir com o
          conteúdo no topo. */}
      <button
        type="button"
        onClick={alternar}
        aria-expanded
        aria-controls={idPainel}
        className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-stone-500 underline-offset-2 transition-colors hover:text-brand-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-400 dark:hover:text-brand-mint"
      >
        <ChevronDown size={12} className="rotate-180" />
        Recolher {titulo.toLowerCase()}
      </button>
    </div>
  );
}
