"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ATO 9 e 10 — «O MESMO NEGÓCIO, nas duas formas»
//  ---------------------------------------------------------------------
//  A frase que muda tudo: em vez de comparar números abstratos, estamos a
//  comparar o negócio que a pessoa acabou de construir. Os 61 800 € não
//  saíram de um slider — saíram das ofertas, dos volumes e da estrutura.
//
//  ── NADA É CALCULADO AQUI ──────────────────────────────────────────
//  `compararRegimes` já compara recibos verdes com sociedade, e
//  `simularEmpresaOpcoes` já faz IRC, derrama e dividendos. Este
//  componente entrega-lhes os números certos pelos adaptadores e desenha
//  o que vem de volta.
//
//  ── E NÃO RECOMENDA ────────────────────────────────────────────────
//  §35: «não recomendar abrir sociedade apenas porque deu mais líquido».
//  Uma sociedade traz contabilidade organizada obrigatória, obrigações
//  declarativas e irreversibilidade prática — coisas que uma diferença de
//  líquido não captura. O ecrã mostra a diferença e diz o que ela não
//  inclui.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import Link from "next/link";
import { fmt } from "@/lib/format";
import { compararRegimes } from "@/lib/fiscal";
import { ArrowRight, Info } from "@/components/ui/Icons";
import { entradaComparacao } from "@/lib/negocio/adapters/comparar";
import { entradaEmpresa } from "@/lib/negocio/adapters/empresa";
import type { ContextoNegocio, ResultadoNegocio } from "@/lib/negocio/tipos";
import { Cartao } from "./atomos";

export default function ComparacaoNegocio({
  negocio,
  contexto,
}: {
  negocio: ResultadoNegocio;
  contexto: ContextoNegocio;
}) {
  const entrada = useMemo(() => entradaComparacao(negocio, contexto), [negocio, contexto]);
  const comparacao = useMemo(() => compararRegimes(entrada), [entrada]);
  const empresa = useMemo(() => entradaEmpresa(negocio), [negocio]);

  if (negocio.receitaSemIVAAno <= 0) {
    return (
      <Cartao titulo="Como faz mais sentido operar?" id="comparar">
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          Assim que houver receita projetada, comparamos aqui o mesmo negócio como trabalhador independente e como
          sociedade — com os números que construíste, não com um valor de exemplo.
        </p>
      </Cartao>
    );
  }

  const empresaCompensa = comparacao.diferenca > 0;

  return (
    <div className="space-y-3" id="comparar">
      <Cartao
        titulo="O mesmo negócio, nas duas formas"
        descricao="Em vez de comparar números abstratos, comparamos o negócio que acabaste de construir"
      >
        {/* ── A proveniência, antes dos números ──────────────────── */}
        <dl className="mb-4 space-y-1 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/50">
          {empresa.proveniencia.map((p) => (
            <div key={p.rotulo} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <dt className="min-w-0 text-[11px] text-stone-600 dark:text-stone-300">
                {p.rotulo}
                <span className="mt-0.5 block text-[10px] leading-snug text-stone-500 dark:text-stone-400">
                  {p.origem}
                </span>
              </dt>
              <dd className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {fmt(p.valor)}
              </dd>
            </div>
          ))}
        </dl>

        {/* Uma comparação é tabular de verdade — por isso é `<table>`, e
            não uma grelha de `div`s que finge sê-lo. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <caption className="sr-only">
              O mesmo negócio como trabalhador independente e como sociedade, por ano.
            </caption>
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-700">
                <th scope="col" className="py-2 pr-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
                  Por ano
                </th>
                <th scope="col" className="py-2 pr-2 text-right text-xs font-semibold text-stone-600 dark:text-stone-300">
                  Independente
                </th>
                <th scope="col" className="py-2 text-right text-xs font-semibold text-stone-600 dark:text-stone-300">
                  Sociedade
                </th>
              </tr>
            </thead>
            <tbody>
              <Linha
                rotulo="Faturação"
                a={entrada.brutoAnual}
                b={entrada.brutoAnual}
                nota="A mesma nos dois — é o teu negócio"
              />
              <Linha
                rotulo="Custos da atividade"
                a={-comparacao.freelancer.despesas}
                b={-(entrada.despesas ?? 0)}
              />
              <Linha
                rotulo="Impostos"
                a={-(comparacao.freelancer.irs + comparacao.freelancer.ss)}
                b={-(comparacao.empresa.irc + comparacao.empresa.derrama + comparacao.empresa.dividendos)}
                nota="Independente: IRS + Segurança Social · Sociedade: IRC + derrama + dividendos"
              />
              <tr className="border-t-2 border-stone-200 dark:border-stone-700">
                <th scope="row" className="py-2 pr-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
                  Fica para ti
                </th>
                <td
                  className={`py-2 pr-2 text-right text-sm font-semibold tabular-nums ${
                    !empresaCompensa ? "text-brand-dark dark:text-brand-mint" : "text-stone-800 dark:text-stone-100"
                  }`}
                >
                  {fmt(comparacao.freelancer.liquido)}
                </td>
                <td
                  className={`py-2 text-right text-sm font-semibold tabular-nums ${
                    empresaCompensa ? "text-brand-dark dark:text-brand-mint" : "text-stone-800 dark:text-stone-100"
                  }`}
                >
                  {fmt(comparacao.empresa.liquido)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 rounded-2xl bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600 dark:bg-stone-800/50 dark:text-stone-300">
          {Math.abs(comparacao.diferenca) < 500
            ? "As duas formas dão praticamente o mesmo líquido. Quando a diferença é esta, o que decide não são os impostos — é a obrigação de contabilidade organizada, a responsabilidade limitada e o trabalho administrativo."
            : empresaCompensa
              ? `A sociedade dá mais ${fmt(comparacao.diferenca)} por ano neste cenário. Não é razão suficiente para abrir uma: falta contar a contabilidade organizada obrigatória, as obrigações declarativas e o facto de fechar uma sociedade ser bem mais trabalhoso do que cessar atividade.`
              : `Como trabalhador independente ficas com mais ${fmt(
                  Math.abs(comparacao.diferenca),
                )} por ano neste cenário. À medida que a faturação sobe, a conta pode inverter-se — vale a pena voltar aqui quando os números mudarem.`}
        </p>

        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            Estimativa de ordem de grandeza. Não modela salário do gerente, tributação autónoma, englobamento de
            dividendos nem benefícios fiscais — o simulador de empresa faz tudo isso, já com estes números.
          </span>
        </p>
      </Cartao>

      {/* ── As duas saídas para os motores completos ───────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/ferramentas/comparar-regimes"
          className="group flex items-start justify-between gap-3 rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:border-brand hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-800 dark:bg-stone-900"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
              Comparação completa
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Com dependentes, estado civil, região, IRS Jovem e o ponto de viragem
            </span>
          </span>
          <ArrowRight size={15} className="mt-0.5 flex-shrink-0 text-stone-300 group-hover:text-brand" />
        </Link>

        <Link
          href="/ferramentas/simulador-empresa"
          className="group flex items-start justify-between gap-3 rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:border-brand hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-800 dark:bg-stone-900"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
              Simulador de empresa
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Salário do gerente, dividendos, tributação autónoma, RFAI e localização
            </span>
          </span>
          <ArrowRight size={15} className="mt-0.5 flex-shrink-0 text-stone-300 group-hover:text-brand" />
        </Link>
      </div>
    </div>
  );
}

function Linha({
  rotulo,
  a,
  b,
  nota,
}: {
  rotulo: string;
  a: number;
  b: number;
  nota?: string;
}) {
  return (
    <tr className="border-b border-stone-100 dark:border-stone-800">
      <th scope="row" className="py-2 pr-2 text-left text-xs font-normal text-stone-600 dark:text-stone-300">
        {rotulo}
        {nota ? (
          <span className="mt-0.5 block text-[10px] leading-snug text-stone-500 dark:text-stone-400">{nota}</span>
        ) : null}
      </th>
      <td className="py-2 pr-2 text-right text-xs tabular-nums text-stone-700 dark:text-stone-200">{fmt(a)}</td>
      <td className="py-2 text-right text-xs tabular-nums text-stone-700 dark:text-stone-200">{fmt(b)}</td>
    </tr>
  );
}
