"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «E se…?» — o slider e os cenários
//  ---------------------------------------------------------------------
//  A parte da ferramenta que se usa depois de ter uma resposta, e a que
//  provavelmente vai reter mais gente: mexer no preço e ver a margem, o
//  lucro e o ponto de equilíbrio moverem-se ao mesmo tempo.
//
//  Corre tudo no cliente e em microssegundos porque o motor é puro. É a
//  razão prática pela qual `precificar()` não faz chamadas ao servidor:
//  sessenta recálculos por segundo enquanto se arrasta o dedo não podem
//  passar pela rede.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { fmt, pct } from "@/lib/format";
import {
  compararCenarios,
  precificar,
  type ChaveCenario,
  type ContextoPreco,
  type ResultadoPreco,
  type EstadoPreenchimento,
} from "@/lib/pricing";
import Badge from "@/components/ui/Badge";

/**
 * A ressalva de «isto ainda é um exemplo» tem de viajar com os números.
 *
 * O cartão de resultado dizia-o e estes dois, logo por baixo, apresentavam
 * os mesmos valores sem qualquer reserva — o que fazia a ressalva parecer
 * uma modéstia do cabeçalho em vez do que é: o aviso de que nada daquilo
 * saiu ainda do negócio de quem está a ler.
 */
function Selo({ estado }: { estado: EstadoPreenchimento }) {
  if (estado === "completo") return null;
  return (
    <span className="rounded-md bg-stone-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-400">
      {estado === "exemplo" ? "valores de exemplo" : "ainda uma estimativa"}
    </span>
  );
}

export function SliderPreco({
  contexto,
  resultado,
  estado = "completo",
}: {
  contexto: ContextoPreco;
  resultado: ResultadoPreco;
  estado?: EstadoPreenchimento;
}) {
  const piso = resultado.faixa.ancoras.find((a) => a.chave === "piso")?.pvp ?? 0;
  const minimo = Math.max(0.5, Math.min(piso * 0.7, resultado.pvp * 0.5));
  const maximo = Math.max(resultado.pvp * 1.8, piso * 2);
  const passo = maximo > 200 ? 1 : maximo > 40 ? 0.5 : 0.1;

  const [preco, setPreco] = useState<number | null>(null);
  const precoAtual = preco ?? resultado.pvp;

  // Parado no recomendado, mostra-se O RESULTADO — não uma re-derivação
  // dele. Voltar a resolver a partir do PVP já arredondado reintroduz o
  // arredondamento (`liquidoDe(415,92)` dá 338,15 onde o solver tinha
  // 338,14), e a mesma página exibia dois preços sem IVA diferentes para o
  // mesmo preço. O invariante manda arredondar líquido, IVA e PVP EM
  // CONJUNTO; recalcular a partir de um deles parte-o.
  const simulado = useMemo(
    () =>
      preco === null
        ? resultado
        : precificar({
            ...contexto,
            objetivo: { ...contexto.objetivo, modo: "preco_fixo", valor: preco, valorEhPVP: true },
          }),
    [contexto, preco, resultado],
  );

  const abaixoDoPiso = piso > 0 && precoAtual < piso;

  return (
    <section
      aria-label="Experimentar outro preço"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
          E se cobrasses outro preço?
          <Selo estado={estado} />
        </h2>
        {preco !== null ? (
          <button
            type="button"
            onClick={() => setPreco(null)}
            className="min-h-[36px] rounded-lg px-2 text-xs font-semibold text-brand-dark underline-offset-2 dark:text-brand-mint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Voltar ao recomendado
          </button>
        ) : null}
      </div>

      <div className="mb-2 flex items-baseline gap-3">
        <span
          className={`font-display text-3xl font-semibold tabular-nums ${
            abaixoDoPiso ? "text-red-600 dark:text-red-400" : "text-ink dark:text-stone-50"
          }`}
        >
          {fmt(precoAtual)}
        </span>
        {abaixoDoPiso ? <Badge tone="danger">abaixo do piso</Badge> : null}
      </div>

      <label htmlFor="slider-preco" className="sr-only">
        Preço ao cliente
      </label>
      <input
        id="slider-preco"
        type="range"
        min={minimo}
        max={maximo}
        step={passo}
        value={precoAtual}
        onChange={(e) => setPreco(Number(e.target.value))}
        className="h-9 w-full cursor-pointer accent-brand"
        aria-valuetext={`${fmt(precoAtual)} com IVA`}
      />
      <div className="flex justify-between text-[11px] tabular-nums text-stone-500 dark:text-stone-400">
        <span>{fmt(minimo)}</span>
        <span>{fmt(maximo)}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Celula
          rotulo="Margem"
          valor={pct(simulado.margem.margem)}
          nota="do preço sem IVA"
          alerta={simulado.margem.margem < 0}
        />
        <Celula
          rotulo="Fica por venda"
          valor={fmt(simulado.margem.lucroUnidade)}
          nota="depois de tudo"
          alerta={simulado.margem.lucroUnidade < 0}
        />
        <Celula
          rotulo="Por mês"
          valor={fmt(simulado.margem.lucroMensal)}
          nota="ao volume esperado"
          alerta={simulado.margem.lucroMensal < 0}
        />
        <Celula
          rotulo="Equilíbrio"
          valor={simulado.breakEven.possivel ? `${simulado.breakEven.unidades}` : "—"}
          nota={
            simulado.breakEven.possivel
              ? simulado.breakEven.unidades === 0
                ? "sem custos fixos"
                : "vendas por mês"
              : "não existe"
          }
          alerta={!simulado.breakEven.possivel}
        />
      </div>

      {simulado.taxaIVA > 0 ? (
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
          <span className="tabular-nums">{fmt(simulado.precoLiquido)}</span> sem IVA ·{" "}
          <span className="tabular-nums">{fmt(simulado.iva)}</span> de IVA a entregar
        </p>
      ) : null}
    </section>
  );
}

export function Cenarios({
  contexto,
  estado = "completo",
}: {
  contexto: ContextoPreco;
  estado?: EstadoPreenchimento;
}) {
  const [extra, setExtra] = useState<ChaveCenario | null>(null);

  const base = useMemo(() => compararCenarios(contexto), [contexto]);
  const adicional = useMemo(
    () => (extra ? compararCenarios(contexto, [extra]) : []),
    [contexto, extra],
  );

  const linhas = [...base, ...adicional];

  const BOTOES: { chave: ChaveCenario; rotulo: string }[] = [
    { chave: "desconto10", rotulo: "…der 10% de desconto" },
    { chave: "marketplace", rotulo: "…vender por marketplace" },
    { chave: "com_portes", rotulo: "…pagar os portes" },
    { chave: "volume_dobro", rotulo: "…vender o dobro" },
    { chave: "custo_mais_10", rotulo: "…o custo subir 10%" },
  ];

  return (
    <section
      aria-label="Cenários"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="font-display mb-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-stone-800 dark:text-stone-100">
        Comparar cenários
        <Selo estado={estado} />
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Os três primeiros são o mesmo negócio com dez pontos de margem a menos e a mais. Os botões acrescentam uma
        variação ao teu cenário.
      </p>

      {/* A tabela transborda em ecrãs estreitos. Quem navega por teclado tem
          de poder chegar ao scroll: `tabIndex` + `role="region"` com nome,
          que é o que a regra `scrollable-region-focusable` do axe exige. */}
      <div className="-mx-5 overflow-x-auto px-5" tabIndex={0} role="region" aria-label="Tabela de cenários">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <caption className="sr-only">Comparação de cenários de preço</caption>
          <thead>
            <tr className="border-b border-stone-100 text-left dark:border-stone-800">
              <th scope="col" className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Cenário
              </th>
              <th scope="col" className="pb-2 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Preço
              </th>
              <th scope="col" className="pb-2 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Margem
              </th>
              <th scope="col" className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Por mês
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((c) => (
              <tr key={c.chave} className="border-b border-stone-50 last:border-0 dark:border-stone-800/50">
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{c.rotulo}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-stone-500 dark:text-stone-400">{c.descricao}</span>
                </th>
                <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                  {fmt(c.pvp)}
                </td>
                <td
                  className={`py-2.5 pr-3 text-right tabular-nums ${
                    c.margem < 0 ? "text-red-600 dark:text-red-400" : "text-stone-600 dark:text-stone-300"
                  }`}
                >
                  {pct(c.margem)}
                </td>
                <td
                  className={`py-2.5 text-right tabular-nums ${
                    c.lucroMensal < 0 ? "text-red-600 dark:text-red-400" : "text-stone-600 dark:text-stone-300"
                  }`}
                >
                  {fmt(c.lucroMensal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">E se eu…</p>
      <div className="flex flex-wrap gap-2">
        {BOTOES.map((b) => (
          <button
            key={b.chave}
            type="button"
            aria-pressed={extra === b.chave}
            onClick={() => setExtra((e) => (e === b.chave ? null : b.chave))}
            className={`min-h-[36px] rounded-xl border px-3 py-2 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              extra === b.chave
                ? "border-brand-dark bg-brand-dark text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
            }`}
          >
            {b.rotulo}
          </button>
        ))}
      </div>
    </section>
  );
}

function Celula({
  rotulo,
  valor,
  nota,
  alerta,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/40">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{rotulo}</p>
      <p
        className={`mt-1 text-base font-semibold tabular-nums ${
          alerta ? "text-red-600 dark:text-red-400" : "text-stone-800 dark:text-stone-100"
        }`}
      >
        {valor}
      </p>
      {nota ? (
        <p className="mt-0.5 text-[11px] leading-tight text-stone-500 dark:text-stone-400">{nota}</p>
      ) : null}
    </div>
  );
}
