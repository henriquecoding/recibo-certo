"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PAGAMENTOS POR CONTA DE IRS (Art. 102.º CIRS) — cartão partilhado
//
//  Um só cartão para os dois modos do simulador de recibos verdes. A regra
//  do projeto é que o guiado e o completo bebem do mesmo motor; o que se
//  acrescenta a um tem de aparecer no outro, e a maneira de o garantir é não
//  haver duas versões da mesma peça.
//
//  Porque é que isto merece um cartão próprio: a retenção na fonte sai do
//  recibo — vê-se. Os pagamentos por conta não saem de lado nenhum. São três
//  notas de cobrança em julho, setembro e dezembro, e apanham de surpresa
//  precisamente quem não tem retenção nenhuma durante o ano: vendas,
//  alojamento local, TVDE, plataformas e clientes estrangeiros.
// ═══════════════════════════════════════════════════════════════════════

import { fmt, pct } from "@/lib/format";
import { PAGAMENTOS_CONTA_IRS } from "@/lib/fiscal-data";
import type { PagamentosConta } from "@/lib/fiscal";
import { Calendar, Warning } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";

const MES_CURTO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "20 de julho, 20 de setembro e 20 de dezembro" */
export function datasPagamentosConta(dia: number, meses: number[]): string {
  const partes = meses.map((m) => `${dia} de ${MES_CURTO[m - 1] ?? ""}`);
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

interface Props {
  resultado: PagamentosConta;
  /** Faturação anual — abaixo de zero não há nada que mostrar. */
  faturacaoAnual: number;
  className?: string;
}

export default function PagamentosContaCard({ resultado, faturacaoAnual, className = "" }: Props) {
  if (faturacaoAnual <= 0) return null;
  if (resultado.total <= 0 && !resultado.abaixoDoMinimo) return null;

  const exigivel = resultado.total > 0;
  const datas = datasPagamentosConta(
    resultado.dia || PAGAMENTOS_CONTA_IRS.dia.value,
    resultado.meses.length ? resultado.meses : PAGAMENTOS_CONTA_IRS.meses.value,
  );

  return (
    <section
      className={`rounded-3xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900 ${className}`}
      aria-labelledby="ppc-titulo"
    >
      <div className="flex items-start gap-2.5 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          <Calendar size={14} />
        </span>
        <div className="min-w-0">
          <h4
            id="ppc-titulo"
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200"
          >
            Pagamentos por conta de IRS
            <InfoTip label="Pagamentos por conta (Art. 102.º CIRS)">
              Além da retenção na fonte, quem tem rendimentos da categoria B entrega
              três pagamentos por conta, calculados pela AT a partir da declaração do{" "}
              <strong>penúltimo</strong> ano:{" "}
              <strong>{pct(PAGAMENTOS_CONTA_IRS.taxa.value)} × (C − R) × RLB / RLT</strong>,
              em que C é a coleta desse ano, R as retenções da categoria B, RLB o
              rendimento líquido da categoria B e RLT o rendimento líquido total.
              Cada prestação não é exigível abaixo de{" "}
              {fmt(PAGAMENTOS_CONTA_IRS.minimoPorPrestacao.value)}.
            </InfoTip>
          </h4>
          <p className="text-[10px] leading-tight text-stone-400 dark:text-stone-500">
            {datas} · Art. 102.º CIRS
          </p>
        </div>
      </div>

      {exigivel ? (
        <>
          <div className="flex items-baseline justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {fmt(resultado.prestacao)}
              </p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">
                por prestação · {resultado.numero} no ano
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                {fmt(resultado.total)}
              </p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">total no ano</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 border-t border-stone-100 px-4 py-3 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
            <span className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400">
              <Warning size={13} />
            </span>
            <span>
              Estimativa a partir <strong>deste</strong> cenário. A lei manda calcular sobre o
              penúltimo ano — se mantiveres o nível de faturação, é este o valor; se souberes
              que vais faturar menos, o Art. 102.º n.º 3 deixa-te reduzir ou cessar os
              pagamentos, mas ficar mais de{" "}
              {pct(PAGAMENTOS_CONTA_IRS.margemErro.value)} abaixo do devido gera juros
              compensatórios. O valor oficial vem na nota de liquidação da AT.
            </span>
          </div>
        </>
      ) : (
        <p className="px-4 py-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          Com este cenário não há pagamentos por conta a fazer: cada prestação ficaria
          abaixo dos {fmt(PAGAMENTOS_CONTA_IRS.minimoPorPrestacao.value)} a partir dos
          quais são exigíveis (Art. 102.º n.º 1 CIRS).
        </p>
      )}
    </section>
  );
}
