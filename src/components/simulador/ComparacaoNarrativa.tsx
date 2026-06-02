"use client";

import { m } from "motion/react";
import { fmt } from "@/lib/format";
import { ArrowRight, Building, Receipt } from "@/components/ui/Icons";

interface ComparacaoNarrativaProps {
  liquidoRV: number;
  liquidoEmpresa: number;
  faturacaoAnual: number;
  breakEven: number | null;
  custoFixoEstimado: number;
  onVerDetalhe: () => void;
  modoAtivo?: "rv" | "empresa";
}

/**
 * Footer narrativo de comparação RV vs. Empresa — sempre visível.
 * Mostra qual é a melhor opção para a faturação actual, o break-even
 * e os principais pontos práticos de cada caminho.
 */
export default function ComparacaoNarrativa({
  liquidoRV,
  liquidoEmpresa,
  faturacaoAnual,
  breakEven,
  custoFixoEstimado,
  onVerDetalhe,
  modoAtivo = "rv",
}: ComparacaoNarrativaProps) {
  if (faturacaoAnual <= 0) return null;

  const diferenca = Math.abs(liquidoEmpresa - liquidoRV);
  const empresaMelhor = liquidoEmpresa > liquidoRV;
  const bePct =
    breakEven != null
      ? Math.min(100, Math.max(0, (breakEven / Math.max(1, faturacaoAnual * 1.5)) * 100))
      : null;

  return (
    <div className="px-6 py-6 sm:px-8 sm:py-7 bg-stone-50 dark:bg-stone-900">
      {/* Cabeçalho da secção */}
      <div className="eyebrow mb-5 text-stone-500">
        Comparação — Recibos Verdes vs. Empresa (Lda)
      </div>

      {/* Dois cards lado a lado */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Card RV */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`relative rounded-2xl border p-4 transition-all ${
            !empresaMelhor
              ? "border-brand bg-brand-light"
              : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950"
          }`}
        >
          {!empresaMelhor && (
            <span className="absolute right-3 top-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
              Melhor opção
            </span>
          )}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-stone-400">
              <Receipt size={16} />
            </span>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Recibos Verdes
            </span>
          </div>
          <div
            className={`font-display text-3xl font-semibold tabular-nums ${
              !empresaMelhor ? "text-brand-dark" : "text-stone-800 dark:text-stone-100"
            }`}
          >
            {fmt(Math.round(liquidoRV))}
          </div>
          <div className="mt-0.5 text-xs text-stone-400">líquido anual estimado</div>
          <ul className="mt-3 space-y-1">
            {[
              "Abre atividade nas Finanças (grátis)",
              "Emite recibos — sem contabilista obrigatório",
              "Zero custos de estrutura",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-1.5 text-[11px] text-stone-500 dark:text-stone-400"
              >
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </m.div>

        {/* Card Empresa */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`relative rounded-2xl border p-4 transition-all ${
            empresaMelhor
              ? "border-brand bg-brand-light"
              : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950"
          }`}
        >
          {empresaMelhor && (
            <span className="absolute right-3 top-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
              Melhor opção
            </span>
          )}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-stone-400">
              <Building size={16} />
            </span>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Empresa (Lda)
            </span>
          </div>
          <div
            className={`font-display text-3xl font-semibold tabular-nums ${
              empresaMelhor ? "text-brand-dark" : "text-stone-800 dark:text-stone-100"
            }`}
          >
            {fmt(Math.round(liquidoEmpresa))}
          </div>
          <div className="mt-0.5 text-xs text-stone-400">líquido anual estimado</div>
          <ul className="mt-3 space-y-1">
            {[
              `Constituição ~1.200€ (registo + setup contabilista)`,
              custoFixoEstimado > 0
                ? `Custos de estrutura estimados: ${fmt(Math.round(custoFixoEstimado))}/ano`
                : "Contabilista obrigatório (~150-300€/mês)",
              "IRC PME: 15% até 50.000€ + 19% excedente",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-1.5 text-[11px] text-stone-500 dark:text-stone-400"
              >
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-stone-300" />
                {item}
              </li>
            ))}
          </ul>
        </m.div>
      </div>

      {/* Diferença */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-950">
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {empresaMelhor
            ? `A empresa dá-te mais ${fmt(Math.round(diferenca))}/ano`
            : `Recibos Verdes dão-te mais ${fmt(Math.round(diferenca))}/ano`}
        </span>
        <span className="text-xs text-stone-400">
          {(diferenca / Math.max(1, faturacaoAnual) * 100).toFixed(1)}% da faturação
        </span>
      </div>

      {/* Break-even */}
      {breakEven != null && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
            <span>Ponto de equilíbrio</span>
            <span className="font-semibold text-stone-700 dark:text-stone-200">
              {fmt(breakEven)}/ano
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <div
              className="absolute left-0 top-0 h-full rounded-l-full bg-brand"
              style={{ width: `${Math.min(bePct ?? 0, 100)}%` }}
            />
            {bePct != null && (
              <div
                className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-stone-500"
                style={{ left: `${bePct}%` }}
              />
            )}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-stone-400">
            <span>RV vantajoso</span>
            <span className="font-medium text-stone-500">↑ {fmt(breakEven)}</span>
            <span>Empresa vantajosa</span>
          </div>
        </div>
      )}

      {/* CTA */}
      {modoAtivo !== "empresa" && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onVerDetalhe}
            className="inline-flex items-center gap-2 rounded-2xl border border-brand bg-brand-light px-5 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand hover:text-white"
          >
            Simular empresa em detalhe
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Nota */}
      <p className="mt-4 text-[10px] leading-relaxed text-stone-400">
        Empresa simulada com IRC PME, derrama municipal 1,5% e distribuição de dividendos (28% liberatória). Não inclui custos de contabilidade na comparação base — configurar nos parâmetros da empresa. Baseado na faturação actual sem despesas operacionais adicionais.
      </p>
    </div>
  );
}
