import type { Money } from "../../core/money";
import type { CapacityResult } from "./capacity";
import type { CostSummary } from "./completeness";
import type { Assumption, EmploymentOfferInput } from "./types";

export interface AssumptionContext {
  usedReferenceScenarios: boolean;
  costs: CostSummary;
  calendars: {
    admissionVacationWorkdays: number;
    admissionMonths: number;
    mealEligibleDays: number;
    holidaysOnScheduledDays: number;
  };
  capacity?: CapacityResult;
  /** Parte do orçamento deliberadamente não usada. */
  budgetReserved?: Money;
}

const euros = (value: Money): string =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.cents / 100);

/**
 * Pressupostos e lacunas do cenário. A copy vive aqui, ao lado dos factos que
 * a justificam — não no React, onde podia contradizê-los.
 */
export function employmentOfferAssumptions(
  input: EmploymentOfferInput,
  context: AssumptionContext,
): readonly Assumption[] {
  const assumptions: Assumption[] = [];

  if (context.usedReferenceScenarios) {
    assumptions.push({
      id: "worker-profile-range",
      label: "Líquido em cenários de referência",
      detail: "A empresa não forneceu factos pessoais autorizados. O motor compara quatro perfis fiscais documentados sem atribuir nenhum deles ao candidato — não é um envelope que cubra todas as situações.",
      severity: "estimate",
    });
  }

  if (input.role.productive && input.role.productiveShare === undefined) {
    assumptions.push({
      id: "productive-share-missing",
      label: "Fração produtiva por indicar",
      detail: "Sem a percentagem faturável, o custo por hora produtiva fica indisponível.",
      severity: "blocking",
    });
  }

  if (context.capacity?.expectationExceedsCapacity) {
    // Alerta, não bloqueio: a lacuna é de RETORNO, não de custo. O custo do
    // posto continua conhecido — o que fica por justificar é a expectativa de
    // venda. Marcar isto como bloqueante deixava o cenário por omissão
    // permanentemente incompleto por um pressuposto comercial.
    assumptions.push({
      id: "capacity-expectation-exceeds",
      label: "Expectativa acima da capacidade",
      detail: "As horas faturáveis esperadas ultrapassam as horas produtivas que o calendário deste posto permite. O custo não muda; o retorno esperado é que não cabe no ano.",
      severity: "estimate",
    });
  }

  if (input.role.collectiveAgreement.status === "unknown") {
    assumptions.push({
      id: "irct-unknown",
      label: "IRCT por confirmar",
      detail: "Não foi indicado o instrumento de regulamentação coletiva aplicável. Se existir, pode impor mínimos de retribuição, subsídios ou descanso acima do que aqui está calculado — desconhecido não é o mesmo que inexistente.",
      severity: "estimate",
    });
  }

  if (input.package.mealAllowance?.daysPerMonth !== undefined) {
    assumptions.push({
      id: "meal-days-declared",
      label: "Dias de refeição declarados",
      detail: `Foi usado o número de dias declarado pela empresa em vez dos dias elegíveis do calendário. O ano estabilizado tem ${context.calendars.mealEligibleDays} dias de trabalho efetivo depois de retirar ${context.calendars.holidaysOnScheduledDays} feriados em dia útil e as férias.`,
      severity: "estimate",
    });
  } else {
    assumptions.push({
      id: "meal-days-from-calendar",
      label: "Refeição contada pelo calendário",
      detail: `O subsídio de refeição foi contado sobre ${context.calendars.mealEligibleDays} dias elegíveis, já sem feriados nem férias — não sobre uma média fixa de 22 dias por mês.`,
      severity: "info",
    });
  }

  if (context.calendars.admissionMonths < 12) {
    assumptions.push({
      id: "admission-year-vacation",
      label: "Férias proporcionais no ano da admissão",
      detail: `No ano de entrada foram contados ${context.calendars.admissionVacationWorkdays} dias úteis de férias, pela regra de dois dias por mês de contrato até 20 (Código do Trabalho, artigo 239.º, n.º 1).`,
      severity: "info",
    });
  }

  assumptions.push({
    id: "vacation-plan-spread",
    label: "Férias sem plano marcado",
    detail: `As férias foram distribuídas a partir do mês de gozo principal indicado. Um plano de férias diferente muda o mês do subsídio e os dias de refeição, não o custo anual.`,
    severity: "info",
  });

  if (context.budgetReserved && context.budgetReserved.cents > 0) {
    assumptions.push({
      id: "safety-margin",
      label: "Margem de segurança reservada",
      detail: `${euros(context.budgetReserved)} do orçamento ficaram deliberadamente fora da composição do pacote.`,
      severity: "info",
    });
  }

  if (context.costs.unknownIds.length > 0) {
    assumptions.push({
      id: "post-costs-unknown",
      label: "Custos do posto por confirmar",
      detail: `${context.costs.unknownIds.length} parcela(s) do posto continuam por preencher. Ficaram fora do total em vez de serem inventadas a zero — é por isso que o custo aparece como intervalo.`,
      severity: "estimate",
    });
  }

  assumptions.push({
    id: "supports-not-deducted",
    label: "Apoios não abatidos",
    detail: "Uma medida potencial só reduz custo depois de aprovação, calendário e condições confirmados.",
    severity: "info",
  });

  return assumptions;
}
