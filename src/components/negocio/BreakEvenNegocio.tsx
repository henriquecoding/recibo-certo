"use client";

// ═══════════════════════════════════════════════════════════════════════
//  P0 #2 — «AS CONTAS FECHAM A PARTIR DE…»
//  ---------------------------------------------------------------------
//  Mostrar «17» não ajuda ninguém. O que transforma uma divisão numa
//  decisão é ver onde está o 17 em relação ao que a pessoa espera vender:
//  seis vendas acima do equilíbrio é uma notícia; seis abaixo é outra.
//
//  ── A RÉGUA TEM EQUIVALENTE TEXTUAL ────────────────────────────────
//  Uma barra com dois marcadores é invisível a quem usa leitor de ecrã, e
//  é dela que sai a conclusão do ecrã inteiro. O parágrafo por baixo diz
//  exatamente o mesmo em palavras — não é redundância, é a versão que
//  algumas pessoas leem.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import type { BreakEvenNegocio as BE } from "@/lib/negocio/tipos";
import { Cartao } from "./atomos";

export default function BreakEvenNegocio({
  breakEven,
  receitaSemIVAMes = 0,
}: {
  breakEven: BE;
  /** A faturação atual, para a régua do caso declarado em bloco. */
  receitaSemIVAMes?: number;
}) {
  if (!breakEven.possivel) {
    return (
      <Cartao titulo="Ponto de equilíbrio" id="breakeven">
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{breakEven.nota}</p>
      </Cartao>
    );
  }

  // ── O negócio declarado em bloco (§6) ─────────────────────────────
  //  Sem ofertas não há vendas para contar, e «0 vendas por mês» seria uma
  //  resposta errada com ar de resposta. A pergunta certa passa a ser
  //  «que volume de negócios paga a estrutura».
  if (breakEven.base === "receita") {
    return <EmReceita breakEven={breakEven} atual={receitaSemIVAMes} />;
  }

  const { vendasMes, vendasEsperadasMes, folgaVendas } = breakEven;

  // A escala vai até 30% acima do maior dos dois, para que nenhum dos
  // marcadores encoste ao limite e pareça um teto.
  const teto = Math.max(vendasMes, vendasEsperadasMes, 1) * 1.3;
  const posEquilibrio = Math.min(100, (vendasMes / teto) * 100);
  const posEsperado = Math.min(100, (vendasEsperadasMes / teto) * 100);
  const fecha = folgaVendas >= 0;

  return (
    <Cartao id="breakeven">
      <p className="eyebrow text-brand">As contas fecham a partir de</p>
      <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-ink sm:text-4xl">
        {vendasMes} <span className="text-lg font-normal text-stone-500 dark:text-stone-400">vendas por mês</span>
      </p>
      {breakEven.receitaSemIVAMes > 0 ? (
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
          {fmt(breakEven.receitaSemIVAMes)} de faturação mensal, sem IVA
        </p>
      ) : null}

      {/* ── A régua ───────────────────────────────────────────────── */}
      <div className="mt-5" aria-hidden>
        <div className="relative h-2 w-full rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${fecha ? "bg-brand" : "bg-alert"}`}
            style={{ width: `${Math.min(posEquilibrio, posEsperado)}%` }}
          />
          {/* Equilíbrio */}
          <span
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded bg-stone-500 dark:bg-stone-300"
            style={{ left: `${posEquilibrio}%` }}
          />
          {/* Esperado */}
          <span
            className={`absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white shadow-card dark:border-stone-900 ${
              fecha ? "bg-brand" : "bg-alert"
            }`}
            style={{ left: `${posEsperado}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] tabular-nums text-stone-500 dark:text-stone-400">
          <span>0</span>
          <span>{Math.round(teto)}</span>
        </div>
      </div>

      {/* O equivalente textual. É a mesma informação, para quem não vê a
          régua — e para quem a vê e prefere a frase. */}
      <p
        className={`mt-3 rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          fecha
            ? "bg-brand-light/60 text-brand-deep dark:bg-brand/10 dark:text-brand-mint"
            : "bg-alert-bg text-alert-text"
        }`}
      >
        {fecha
          ? `Esperas ${vendasEsperadasMes} vendas por mês — ${folgaVendas} acima do equilíbrio. A partir da ${vendasMes}.ª venda de cada mês, o que entra é resultado.`
          : `Esperas ${vendasEsperadasMes} vendas por mês e precisas de ${vendasMes}. Faltam ${Math.abs(
              folgaVendas,
            )} por mês para a estrutura se pagar.`}
      </p>

      {breakEven.nota ? (
        <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{breakEven.nota}</p>
      ) : null}
    </Cartao>
  );
}

/** O mesmo cartão, em euros de faturação em vez de vendas. */
function EmReceita({ breakEven, atual }: { breakEven: BE; atual: number }) {
  const necessaria = breakEven.receitaSemIVAMes;
  const fecha = atual >= necessaria;
  const teto = Math.max(necessaria, atual, 1) * 1.3;
  const posEquilibrio = Math.min(100, (necessaria / teto) * 100);
  const posAtual = Math.min(100, (atual / teto) * 100);

  return (
    <Cartao id="breakeven">
      <p className="eyebrow text-brand">As contas fecham a partir de</p>
      <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-ink sm:text-4xl">
        {fmt(necessaria)}{" "}
        <span className="text-lg font-normal text-stone-500 dark:text-stone-400">por mês, sem IVA</span>
      </p>
      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
        {fmt(necessaria * 12)} por ano de volume de negócios
      </p>

      <div className="mt-5" aria-hidden>
        <div className="relative h-2 w-full rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${fecha ? "bg-brand" : "bg-alert"}`}
            style={{ width: `${Math.min(posEquilibrio, posAtual)}%` }}
          />
          <span
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded bg-stone-500 dark:bg-stone-300"
            style={{ left: `${posEquilibrio}%` }}
          />
          <span
            className={`absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white shadow-card dark:border-stone-900 ${
              fecha ? "bg-brand" : "bg-alert"
            }`}
            style={{ left: `${posAtual}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] tabular-nums text-stone-500 dark:text-stone-400">
          <span>0</span>
          <span>{fmt(teto)}</span>
        </div>
      </div>

      <p
        className={`mt-3 rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          fecha
            ? "bg-brand-light/60 text-brand-deep dark:bg-brand/10 dark:text-brand-mint"
            : "bg-alert-bg text-alert-text"
        }`}
      >
        {fecha
          ? `Faturas ${fmt(atual)} por mês — ${fmt(atual - necessaria)} acima do equilíbrio. Cada euro acima de ${fmt(
              necessaria,
            )} contribui para o resultado.`
          : `Faturas ${fmt(atual)} por mês e precisas de ${fmt(necessaria)}. Faltam ${fmt(
              necessaria - atual,
            )} por mês para a estrutura se pagar.`}
      </p>

      {breakEven.nota ? (
        <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{breakEven.nota}</p>
      ) : null}
    </Cartao>
  );
}
