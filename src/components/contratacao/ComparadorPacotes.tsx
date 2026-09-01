"use client";

import type {
  EmploymentDecisionReadiness,
  EmploymentOfferResult,
} from "../../../ReciboCerto-Fiscal-Engine/src";
import { Warning } from "@/components/ui/Icons";
import { eur } from "./estado";

export interface PacoteGuardado {
  id: string;
  nome: string;
  result: EmploymentOfferResult;
}

const ROTULO_PRONTIDAO: Record<EmploymentDecisionReadiness, string> = {
  incomplete: "Incompleto",
  estimated: "Estimativa",
  personalized: "Personalizado",
  validated: "Validado",
};

type Linha = {
  label: string;
  valor: (result: EmploymentOfferResult) => string;
  /** Quando existe, permite mostrar a diferença face ao primeiro pacote. */
  numero?: (result: EmploymentOfferResult) => number;
  /** Diferença menor é melhor (custo) ou maior é melhor (líquido)? */
  menorEMelhor?: boolean;
};

const liquidoMensal = (result: EmploymentOfferResult): string => {
  const worker = result.workerOutcome;
  return worker.kind === "personalized_projection"
    ? eur(worker.monthlyReference.cents)
    : `${eur(worker.monthlyReference.min.cents)} – ${eur(worker.monthlyReference.max.cents)}`;
};

const LINHAS: readonly Linha[] = [
  {
    label: "Vencimento base mensal",
    valor: (r) => eur(r.resolvedBaseSalaryMonthly.cents),
    numero: (r) => r.resolvedBaseSalaryMonthly.cents,
  },
  {
    label: "Pacote em dinheiro (ano)",
    valor: (r) => eur(r.employerCost.breakdown.cashCompensation.cents + r.employerCost.breakdown.mealAllowance.cents),
    numero: (r) => r.employerCost.breakdown.cashCompensation.cents + r.employerCost.breakdown.mealAllowance.cents,
  },
  { label: "Líquido projetado", valor: liquidoMensal },
  {
    label: "Custo anual recorrente",
    valor: (r) => eur(r.employerCost.annualStabilized.cents),
    numero: (r) => r.employerCost.annualStabilized.cents,
    menorEMelhor: true,
  },
  {
    label: "Ano civil de entrada",
    valor: (r) => eur(r.employerCost.firstCalendarYear.cents),
    numero: (r) => r.employerCost.firstCalendarYear.cents,
    menorEMelhor: true,
  },
  {
    label: "Primeiros 12 meses",
    valor: (r) => eur(r.employerCost.firstTwelveMonths.cents),
    numero: (r) => r.employerCost.firstTwelveMonths.cents,
    menorEMelhor: true,
  },
  {
    label: "Pico de tesouraria",
    valor: (r) => r.employerCost.peakMonth ? eur(r.employerCost.peakMonth.amount.cents) : "—",
    numero: (r) => r.employerCost.peakMonth?.amount.cents ?? 0,
    menorEMelhor: true,
  },
  {
    label: "Custos por confirmar",
    valor: (r) => String(r.employerCost.postCostSummary.unknownIds.length),
  },
  {
    label: "Horas faturáveis necessárias",
    valor: (r) => r.capacity?.billableHoursRequired !== null && r.capacity?.billableHoursRequired !== undefined
      ? `${r.capacity.billableHoursRequired.toLocaleString("pt-PT")} h`
      : "—",
  },
  {
    label: "Apoios com compatibilidade",
    valor: (r) => String(r.supports.filter((support) => support.status === "potential").length),
  },
  { label: "Nível de confiança", valor: (r) => ROTULO_PRONTIDAO[r.status.readiness] },
];

function diferenca(atual: number, base: number, menorEMelhor?: boolean): {
  texto: string;
  tom: string;
} {
  const delta = atual - base;
  if (delta === 0) return { texto: "igual", tom: "text-stone-500" };
  const melhor = menorEMelhor ? delta < 0 : delta > 0;
  return {
    texto: `${delta > 0 ? "+" : "−"}${eur(Math.abs(delta))}`,
    tom: melhor ? "text-brand-dark dark:text-brand-mint" : "text-clay-text",
  };
}

/**
 * Comparação A/B/C. Um cenário incompleto não pode aparecer como vencedor por
 * ter custos omitidos: fica marcado e a comparação diz porquê (CON-P1-18).
 */
export default function ComparadorPacotes({
  pacotes,
  atual,
  onRemover,
}: {
  pacotes: readonly PacoteGuardado[];
  atual: EmploymentOfferResult;
  onRemover: (id: string) => void;
}) {
  const colunas: Array<{ id: string; nome: string; result: EmploymentOfferResult; removivel: boolean }> = [
    ...pacotes.map((pacote) => ({ ...pacote, removivel: true })),
    { id: "atual", nome: "Proposta atual", result: atual, removivel: false },
  ];
  const base = colunas[0]!;
  const incompletos = colunas.filter((coluna) => !coluna.result.status.verdictAllowed);

  return (
    <section
      className="mt-6 rounded-2xl border border-brand/25 bg-brand-light/55 p-4 dark:bg-brand/10 sm:p-5"
      aria-labelledby="hiring-comparison-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-brand">Comparação de pacotes</p>
          <h3 id="hiring-comparison-title" className="mt-1 font-display text-xl font-semibold text-ink">
            {colunas.length} cenários lado a lado
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Altera os campos acima e volta a calcular: os pacotes fixados mantêm-se até os removeres.
            As diferenças são medidas contra {base.nome}.
          </p>
        </div>
      </div>

      {incompletos.length > 0 ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-alert-border bg-alert-bg p-3 text-sm leading-relaxed text-alert-text">
          <Warning size={15} className="mt-0.5 flex-none" />
          <span>
            {incompletos.length === 1
              ? `${incompletos[0]!.nome} tem custos obrigatórios por confirmar.`
              : `${incompletos.length} cenários têm custos obrigatórios por confirmar.`}{" "}
            Um cenário incompleto parece mais barato só porque lhe faltam parcelas — não o leias como o vencedor.
          </span>
        </p>
      ) : null}

      <div
        className="mt-4 overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Pacotes de contratação lado a lado"
      >
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">
            Comparação de custo, líquido, tesouraria, capacidade e confiança entre pacotes.
          </caption>
          <thead className="text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th scope="col" className="pb-2 font-semibold">Conta</th>
              {colunas.map((coluna) => (
                <th key={coluna.id} scope="col" className="pb-2 text-right font-semibold">
                  <span className="block">{coluna.nome}</span>
                  {!coluna.result.status.verdictAllowed ? (
                    <span className="mt-0.5 block normal-case text-clay-text">incompleto</span>
                  ) : null}
                  {coluna.removivel ? (
                    <button
                      type="button"
                      onClick={() => onRemover(coluna.id)}
                      className="mt-1 inline-flex min-h-[36px] items-center rounded-lg px-2 text-xs font-semibold normal-case text-stone-500 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-900"
                    >
                      Remover
                    </button>
                  ) : null}
                </th>
              ))}
              {colunas.length > 1 ? (
                <th scope="col" className="pb-2 text-right font-semibold">Diferença</th>
              ) : null}
            </tr>
          </thead>
          {/* `divide-brand/10` sobre `bg-brand-light/55` dava 1,01:1 — a linha
              existia no DOM e não existia no ecrã, que é o defeito que a régua
              da hierarquia mede. */}
          <tbody className="divide-y divide-brand/25">
            {LINHAS.map((linha) => {
              const ultima = colunas[colunas.length - 1]!;
              const delta = linha.numero && colunas.length > 1
                ? diferenca(linha.numero(ultima.result), linha.numero(base.result), linha.menorEMelhor)
                : null;
              return (
                <tr key={linha.label}>
                  <th scope="row" className="py-3 pr-4 font-medium text-stone-700 dark:text-stone-200">
                    {linha.label}
                  </th>
                  {colunas.map((coluna) => (
                    <td
                      key={coluna.id}
                      className={`py-3 text-right tabular-nums ${coluna.id === "atual" ? "font-semibold text-stone-900 dark:text-white" : "text-stone-500"}`}
                    >
                      {linha.valor(coluna.result)}
                    </td>
                  ))}
                  {colunas.length > 1 ? (
                    <td className={`py-3 text-right font-semibold tabular-nums ${delta?.tom ?? "text-stone-400"}`}>
                      {delta?.texto ?? "—"}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
