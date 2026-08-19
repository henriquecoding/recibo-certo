"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O DESCONTO — o campo que tinha entrada e não tinha saída
//  ---------------------------------------------------------------------
//  `motores/desconto.ts` calcula, e sempre calculou, o desconto máximo
//  suportável, se a promoção destrói a rentabilidade e quantas unidades a
//  mais é preciso vender para compensar. Nada disso chegava ao ecrã: o
//  bloco «Desconto ou promoção» era um formulário que aceitava um número
//  e não respondia nada.
//
//  A pergunta que este ecrã responde é a que faz as promoções darem
//  prejuízo em Portugal inteiro: «se eu der 20% de desconto, quanto tenho
//  de vender a mais para ficar na mesma?» A resposta quase nunca é 20%.
//  Com 35% de margem, um desconto de 20% obriga a vender mais 133%.
// ═══════════════════════════════════════════════════════════════════════

import { fmt, pct } from "@/lib/format";
import type { ResultadoDesconto } from "@/lib/pricing";
import { Warning, CheckTrend } from "@/components/ui/Icons";

export default function DescontoResultado({ desconto }: { desconto: ResultadoDesconto }) {
  const mau = desconto.destruiRentabilidade;

  return (
    <section
      aria-label="Efeito do desconto"
      className={`rounded-4xl border p-5 ${
        mau
          ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
          : "border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900"
      }`}
    >
      <div className="mb-1 flex items-start gap-2">
        {mau ? (
          <Warning size={17} className="mt-0.5 flex-shrink-0 text-red-600" />
        ) : (
          <CheckTrend size={17} className="mt-0.5 flex-shrink-0 text-brand" />
        )}
        <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
          Com {pct(desconto.percentagem)} de desconto
        </h2>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        {mau
          ? "A este desconto cada venda deixa de pagar o que custa. Vender mais só aumenta o prejuízo."
          : "O preço aguenta, mas a margem muda — e o volume necessário para ficares na mesma também."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Par
          rotulo="Preço ao cliente"
          antes={fmt(desconto.pvpOriginal)}
          depois={fmt(desconto.pvpComDesconto)}
        />
        <Par rotulo="Margem" antes={pct(desconto.margemAntes)} depois={pct(desconto.margemDepois)} alerta={mau} />
        <Par
          rotulo="Fica-te por venda"
          antes={fmt(desconto.lucroAntes)}
          depois={fmt(desconto.lucroDepois)}
          alerta={desconto.lucroDepois < 0}
        />
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Desconto máximo
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {pct(desconto.descontoMaximo)}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-stone-500 dark:text-stone-400">
            acima disto cada venda dá prejuízo
          </p>
        </div>
      </div>

      {/* A pergunta que faz as promoções darem prejuízo. */}
      <div className="mt-4 rounded-2xl bg-brand-light px-4 py-3 dark:bg-brand/10">
        <p className="text-sm leading-relaxed text-brand-dark dark:text-brand-mint">
          {desconto.unidadesExtraParaCompensar === null ? (
            <>
              <strong className="font-semibold">Não há volume que compense este desconto.</strong> A margem que sobra é
              zero ou negativa, e vender mais unidades multiplica a perda em vez de a diluir.
            </>
          ) : desconto.unidadesExtraParaCompensar === 0 ? (
            <>
              <strong className="font-semibold">Não precisas de vender mais</strong> para manter o mesmo lucro total.
            </>
          ) : (
            <>
              Para manteres o mesmo lucro total, tens de vender{" "}
              <strong className="font-semibold tabular-nums">
                mais {desconto.unidadesExtraParaCompensar} unidades por mês
              </strong>
              . É esta a conta que quase ninguém faz antes de anunciar uma promoção — e é quase sempre maior do que a
              percentagem do desconto.
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function Par({
  rotulo,
  antes,
  depois,
  alerta,
}: {
  rotulo: string;
  antes: string;
  depois: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/40">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{rotulo}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-sm tabular-nums text-stone-500 line-through dark:text-stone-400">{antes}</span>
        <span
          className={`text-lg font-semibold tabular-nums ${
            alerta ? "text-red-600 dark:text-red-400" : "text-stone-800 dark:text-stone-100"
          }`}
        >
          {depois}
        </span>
      </p>
    </div>
  );
}
