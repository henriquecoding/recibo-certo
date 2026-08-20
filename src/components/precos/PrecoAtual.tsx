"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «QUANTO COBRAS HOJE?» — a primeira pergunta de quem já vende
//  ---------------------------------------------------------------------
//  §4.2 do relatório. Quem já tem clientes não vem formar um preço — vem
//  validar o que já pratica. Para essa pessoa, a primeira pergunta certa
//  não é «que margem queres?»: é o número que ela diz em voz alta ao
//  telefone.
//
//  ── PORQUE É QUE ISTO É UM ECRÃ E NÃO UM CAMPO ─────────────────────
//  Porque a ordem é a mensagem. Um campo «preço atual» no meio do
//  formulário continuava a fazer a pessoa passar por «margem pretendida»
//  primeiro — e a margem pretendida é exatamente o que ela vem descobrir.
//  Uma pergunta, um botão: não é um wizard (§117), é a porta certa.
//
//  ── E QUEM NÃO SABE ────────────────────────────────────────────────
//  Sai por «ainda não tenho preço» e cai no percurso de formação, que era
//  o de sempre. Uma porta que não deixa recuar é uma armadilha.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { ArrowRight } from "@/components/ui/Icons";
import type { DefinicaoCenarioInicial } from "@/lib/pricing";
import { CampoEuros } from "./atomos";

export default function PrecoAtual({
  definicao,
  aoConfirmar,
  aoFormarEmVezDisso,
  aoVoltar,
}: {
  definicao: DefinicaoCenarioInicial;
  aoConfirmar: (pvp: number) => void;
  /** «Ainda não tenho preço» — devolve a pessoa ao percurso de formação. */
  aoFormarEmVezDisso: () => void;
  /** Trocar de cenário. A porta tem de deixar recuar. */
  aoVoltar?: () => void;
}) {
  const [pvp, setPvp] = useState(0);
  const valido = pvp > 0;

  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      aria-labelledby="preco-atual-titulo"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <p className="eyebrow mb-2 text-stone-500 dark:text-stone-400">
        A validar {definicao.rotulo.toLowerCase()}
      </p>
      <h2
        id="preco-atual-titulo"
        className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100"
      >
        Quanto cobras hoje?
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Começamos pelo teu preço, não por uma margem que ainda não sabes. A partir dele descontamos
        custos, IVA, comissões e impostos — e mostramos a margem que te fica <strong>mesmo</strong>.
      </p>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) aoConfirmar(pvp);
        }}
      >
        <CampoEuros
          id="preco-atual"
          rotulo="O preço que cobras ao cliente"
          descricao="O valor final que o cliente paga, com IVA incluído se o liquidas."
          valor={pvp}
          aoMudar={setPvp}
          max={1_000_000}
        />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={!valido}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-stone-900"
          >
            Validar este preço
            <ArrowRight size={15} />
          </button>
          <button
            type="button"
            onClick={aoFormarEmVezDisso}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-brand-dark underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-brand-mint"
          >
            Ainda não tenho preço
          </button>
        </div>

        {/* O aviso de que o botão está desativado tem de chegar a quem não
            vê a opacidade. Sem `aria-live`, um leitor de ecrã anuncia um
            botão inerte sem dizer porquê. */}
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400" aria-live="polite">
          {valido
            ? "Podes afinar este valor a qualquer momento — nada aqui fica fechado."
            : "Escreve o preço para continuar. Se ainda não tens um, usa a outra saída."}
        </p>
      </form>

      {aoVoltar ? (
        <button
          type="button"
          onClick={aoVoltar}
          className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-1 text-xs font-semibold text-stone-500 underline-offset-2 hover:text-brand-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-400 dark:hover:text-brand-mint"
        >
          Afinal é outro tipo de oferta
        </button>
      ) : null}
    </m.section>
  );
}
