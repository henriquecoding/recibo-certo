"use client";

// ═══════════════════════════════════════════════════════════════════════
//  OS CENÁRIOS, EM BARRAS DIVERGENTES
//  ---------------------------------------------------------------------
//  Era uma tabela de quatro colunas com `min-w-[420px]`. Três problemas,
//  por ordem de gravidade:
//
//   ① Foi a causa do scroll horizontal a 320/360/390 px. Itens de grelha
//     assumem `min-width: auto`, e esse mínimo de 420 px esticava a
//     coluna inteira. A correção da Fase 0 isolou-o com `minmax(0,1fr)`,
//     mas a tabela continuava a precisar de scroll próprio para se ler.
//
//   ② Comparar quatro cenários por três colunas de números é trabalho de
//     leitura. A pergunta é «qual destes me deixa melhor?», e a resposta
//     estava espalhada por doze células que é preciso ler uma a uma.
//
//   ③ O lucro mensal pode ser NEGATIVO, e num número dentro de uma
//     célula isso é um sinal de menos que se perde. É a informação mais
//     importante da tabela toda.
//
//  Barras divergentes de uma linha do zero resolvem os três: lê-se de
//  relance qual é maior, o lado esquerdo do zero é visualmente
//  inconfundível, e uma lista vertical cabe em 320 px sem scroll nenhum.
//
//  ── ACESSIBILIDADE ─────────────────────────────────────────────────
//  O mesmo contrato do `ReceitaChart`: o desenho é `role="img"` com
//  `aria-label` e `aria-describedby` a apontar para uma tabela
//  equivalente. Ninguém perde dados por não ver as barras — a tabela tem
//  exatamente as mesmas colunas que a versão antiga tinha.
//
//  Sem bibliotecas de gráficos (§27): são divs com percentagens.
// ═══════════════════════════════════════════════════════════════════════

import { useId } from "react";
import { fmt, pct } from "@/lib/format";

export interface LinhaCenario {
  chave: string;
  rotulo: string;
  descricao: string;
  pvp: number;
  margem: number;
  lucroMensal: number;
}

export default function CenariosBarras({ linhas }: { linhas: readonly LinhaCenario[] }) {
  const idTabela = useId();
  if (linhas.length === 0) return null;

  const valores = linhas.map((l) => l.lucroMensal);
  // O zero entra sempre no domínio: sem ele, um conjunto todo positivo
  // desenhava a barra mais pequena com comprimento zero e parecia nula.
  const minimo = Math.min(0, ...valores);
  const maximo = Math.max(0, ...valores);
  const amplitude = maximo - minimo || 1;

  const posicao = (v: number) => ((v - minimo) / amplitude) * 100;
  const zero = posicao(0);

  const melhor = Math.max(...valores);

  return (
    <div>
      <ul
        role="img"
        aria-describedby={idTabela}
        aria-label={`Comparação de ${linhas.length} cenários por lucro mensal, do melhor ${fmt(melhor)} ao pior ${fmt(Math.min(...valores))}`}
        className="space-y-3"
      >
        {linhas.map((l) => {
          const p = posicao(l.lucroMensal);
          const negativo = l.lucroMensal < 0;
          const esquerda = Math.min(zero, p);
          const largura = Math.abs(p - zero);

          return (
            <li key={l.chave} className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="min-w-0 text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                  {l.rotulo}
                </span>
                <span className="flex flex-shrink-0 items-baseline gap-2 text-xs tabular-nums">
                  <span className="font-semibold text-stone-800 dark:text-stone-100">{fmt(l.pvp)}</span>
                  <span className={negativo ? "text-red-600 dark:text-red-400" : "text-stone-500 dark:text-stone-400"}>
                    {pct(l.margem)}
                  </span>
                </span>
              </div>

              {/* A pista, com a linha do zero no sítio que o domínio dita. */}
              <div className="relative mt-1.5 h-5" aria-hidden="true">
                <div className="absolute inset-x-0 top-1.5 h-2 rounded-full bg-stone-100 dark:bg-stone-800" />
                <div
                  className={`absolute top-1.5 h-2 rounded-full ${
                    negativo ? "bg-red-400 dark:bg-red-500/80" : "bg-brand"
                  }`}
                  style={{ left: `${esquerda}%`, width: `${Math.max(largura, 0.8)}%` }}
                />
                {/* A linha do zero só se desenha quando há negativos: sem
                    eles é a borda esquerda e mais um traço só ruído. */}
                {minimo < 0 ? (
                  <span
                    className="absolute top-0 h-5 w-px bg-stone-400 dark:bg-stone-500"
                    style={{ left: `${zero}%` }}
                  />
                ) : null}
              </div>

              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[11px] leading-relaxed">
                <span
                  className={`font-semibold tabular-nums ${
                    negativo ? "text-red-600 dark:text-red-400" : "text-stone-600 dark:text-stone-300"
                  }`}
                >
                  {fmt(l.lucroMensal)}/mês
                </span>
                <span className="min-w-0 text-stone-500 dark:text-stone-400">{l.descricao}</span>
              </p>
            </li>
          );
        })}
      </ul>

      {/* A tabela equivalente. Fechada, mas presente no DOM e referida
          pelo `aria-describedby` — é assim que quem usa leitor de ecrã
          chega aos mesmos números sem depender das barras. */}
      <details className="group mt-4">
        <summary className="inline-flex min-h-[24px] cursor-pointer items-center py-1 text-xs font-medium text-stone-500 transition-colors hover:text-brand dark:text-stone-400">
          Ver valores em tabela
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table id={idTabela} className="w-full border-collapse text-xs">
            <caption className="sr-only">Comparação de cenários de preço</caption>
            <thead>
              <tr className="text-left text-stone-500 dark:text-stone-400">
                <th scope="col" className="pb-1 pr-3 font-semibold">Cenário</th>
                <th scope="col" className="pb-1 pr-3 text-right font-semibold">Preço</th>
                <th scope="col" className="pb-1 pr-3 text-right font-semibold">Margem</th>
                <th scope="col" className="pb-1 text-right font-semibold">Por mês</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.chave} className="border-t border-stone-100 dark:border-stone-800">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal text-stone-600 dark:text-stone-300">
                    {l.rotulo}
                  </th>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                    {fmt(l.pvp)}
                  </td>
                  <td
                    className={`py-1.5 pr-3 text-right tabular-nums ${
                      l.margem < 0 ? "text-red-600 dark:text-red-400" : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {pct(l.margem)}
                  </td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${
                      l.lucroMensal < 0 ? "text-red-600 dark:text-red-400" : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {fmt(l.lucroMensal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
