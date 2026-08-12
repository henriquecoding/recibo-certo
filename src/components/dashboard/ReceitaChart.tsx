"use client";

import { useId } from "react";
import { anoDoRecibo, mesDoRecibo, type Recibo } from "@/lib/recibos-contrato";
import { fmt } from "@/lib/format";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function ReceitaChart({ recibos, ano }: { recibos: Recibo[]; ano: number }) {
  const tabelaId = useId();
  const porMes = Array.from({ length: 12 }, () => 0);
  recibos.forEach((r) => {
    // Escopo pelo prefixo da data, não por `new Date(...)`: um recibo de 31/12
    // não pode mudar de ano com o fuso de quem abre o painel (RC-P0-01).
    if (anoDoRecibo(r) === ano) porMes[mesDoRecibo(r) - 1] += r.valor;
  });
  const max = Math.max(...porMes, 1);
  const total = porMes.reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:bg-stone-900 dark:border-stone-800">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Receita de {ano}</h2>
        <span className="font-display text-lg font-semibold text-brand">{fmt(total)}</span>
      </div>
      {/* Sem items-end na linha: as colunas esticam à altura (h-40) e as barras
          ganham uma área não-nula para a sua % de altura.
          O gráfico é decorativo para a tecnologia de apoio — os valores estão
          na tabela abaixo, que é a versão legível por leitor de ecrã e por quem
          navega só com teclado (RC-P2-05). */}
      <div className="flex h-40 gap-1.5" role="img" aria-describedby={tabelaId}
           aria-label={`Faturação mensal de ${ano}, total ${fmt(total)}`}>
        {porMes.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end">
              <div
                aria-hidden
                className={`w-full rounded-t-md transition-[height] duration-700 ease-out ${
                  v > 0 ? "bg-brand/85 hover:bg-brand" : "bg-stone-100 dark:bg-stone-800"
                }`}
                style={{ height: `${Math.max((v / max) * 100, v > 0 ? 8 : 2)}%` }}
              />
            </div>
            {/* Três letras em vez de uma: «J» servia janeiro, junho e julho ao
                mesmo tempo e nenhuma coluna era identificável. */}
            <span className="text-[10px] text-stone-400" aria-hidden>{MESES[i]}</span>
          </div>
        ))}
      </div>

      <details className="mt-4 group">
        <summary className="cursor-pointer text-xs font-medium text-stone-500 transition-colors hover:text-brand dark:text-stone-400">
          Ver valores em tabela
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table id={tabelaId} className="w-full border-collapse text-xs">
            <caption className="sr-only">Faturação de {ano}, mês a mês</caption>
            <thead>
              <tr className="text-left text-stone-400">
                <th scope="col" className="pb-1 font-semibold">Mês</th>
                <th scope="col" className="pb-1 text-right font-semibold">Faturado</th>
              </tr>
            </thead>
            <tbody>
              {porMes.map((v, i) => (
                <tr key={i} className="border-t border-stone-50 dark:border-stone-800">
                  <th scope="row" className="py-1 text-left font-normal text-stone-500 dark:text-stone-400">
                    {MESES_LONGOS[i]}
                  </th>
                  <td className="py-1 text-right tabular-nums text-stone-700 dark:text-stone-300">{fmt(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
