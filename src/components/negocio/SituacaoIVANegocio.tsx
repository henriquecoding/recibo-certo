"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A SITUAÇÃO DE IVA DO NEGÓCIO — §49, §50
//  ---------------------------------------------------------------------
//  `fiscal-iva.ts` sabe determinar isenção do Art. 53.º, perda de
//  isenção, transição, operação isenta pela natureza, taxa efetiva,
//  região, incoerências e periodicidade do Art. 41.º.
//
//  O Estúdio protegia bem a fronteira que mais custa — «IVA cobrado ≠
//  receita» — e não usava mais nada dessa inteligência. Quem construía um
//  negócio de 40 000 € nunca via que ia perder a isenção, e quem
//  construía um de 15 000 € nunca via que provavelmente a tem.
//
//  ── ESTE ECRÃ NÃO DECIDE NADA ──────────────────────────────────────
//  Traduz o negócio para a entrada do motor e mostra o que ele responde.
//  Nenhum limiar, nenhuma taxa e nenhuma regra vivem aqui — §53:
//  «reutilizar `fiscal-iva`, não codificar o limiar outra vez».
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { fmt } from "@/lib/format";
import { situacaoIVADoNegocio } from "@/lib/negocio/adapters/iva";
import { Info } from "@/components/ui/Icons";
import type { ContextoNegocio, ResultadoNegocio } from "@/lib/negocio/tipos";
import { Cartao } from "./atomos";

const TOM = {
  brand: "bg-brand-light/60 text-brand-deep dark:bg-brand/10 dark:text-brand-mint",
  aviso: "bg-alert-bg text-alert-text",
  critico: "bg-alert-bg text-alert-text",
  info: "bg-stone-50 text-stone-700 dark:bg-stone-800/50 dark:text-stone-200",
} as const;

export default function SituacaoIVANegocio({
  contexto,
  negocio,
}: {
  contexto: ContextoNegocio;
  negocio: ResultadoNegocio;
}) {
  const s = useMemo(() => situacaoIVADoNegocio(contexto, negocio), [contexto, negocio]);

  if (negocio.receitaSemIVAAno <= 0) return null;

  return (
    <Cartao titulo="A tua situação de IVA" descricao="Determinada pelo volume, pela região e pela natureza" id="iva">
      <div className={`rounded-2xl px-3 py-2 ${TOM[s.nivel]}`}>
        <p className="text-sm font-semibold">{s.titulo}</p>
        <p className="mt-1 text-xs leading-relaxed">{s.oQueAcontece}</p>
      </div>

      <dl className="mt-3 space-y-2">
        <Linha rotulo="Volume de negócios anual" valor={fmt(negocio.receitaSemIVAAno)} />
        {s.margemAteLimiar >= 0 ? (
          <Linha
            rotulo="Falta para o limiar do Art. 53.º"
            valor={fmt(s.margemAteLimiar)}
            nota={`O limiar é ${fmt(s.limiar)}.`}
          />
        ) : (
          <Linha
            rotulo="Acima do limiar do Art. 53.º"
            valor={fmt(Math.abs(s.margemAteLimiar))}
            nota={`O limiar é ${fmt(s.limiar)}.`}
          />
        )}
        {s.periodicidade ? (
          <Linha
            rotulo="Periodicidade da declaração"
            valor={s.periodicidade === "mensal" ? "Mensal" : "Trimestral"}
            nota="É ela que decide quando o IVA cobrado sai da conta — e a projeção de caixa já a usa."
          />
        ) : null}
        {negocio.ivaCobradoMes > 0 ? (
          <Linha
            rotulo="IVA liquidado por mês"
            valor={fmt(negocio.ivaCobradoMes)}
            nota="Nunca foi receita. É do Estado, a passar pela tua conta."
          />
        ) : null}
      </dl>

      <div className="mt-3 space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          <strong className="font-semibold text-stone-800 dark:text-stone-100">Quando acontece: </strong>
          {s.quandoAcontece}
        </p>
        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          <strong className="font-semibold text-stone-800 dark:text-stone-100">O que tens de fazer: </strong>
          {s.oQueTensDeFazer}
        </p>
      </div>

      {s.incoerencia ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-alert-bg px-3 py-2 text-[11px] leading-relaxed text-alert-text">
          <Info size={12} className="mt-0.5 flex-shrink-0" aria-hidden />
          <span>{s.incoerencia.texto}</span>
        </p>
      ) : null}

      {s.baseLegal.length > 0 ? (
        <p className="mt-3 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
          {s.baseLegal.join(" · ")}
        </p>
      ) : null}
    </Cartao>
  );
}

function Linha({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <dt className="min-w-0 text-xs text-stone-600 dark:text-stone-300">
        {rotulo}
        {nota ? (
          <span className="mt-0.5 block text-[10px] leading-snug text-stone-500 dark:text-stone-400">{nota}</span>
        ) : null}
      </dt>
      <dd className="flex-shrink-0 text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
        {valor}
      </dd>
    </div>
  );
}
