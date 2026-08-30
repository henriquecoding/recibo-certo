import type { Assumption, EmploymentOfferInput } from "./types";

export function employmentOfferAssumptions(
  input: EmploymentOfferInput,
  usedRange: boolean,
): readonly Assumption[] {
  const assumptions: Assumption[] = [];
  if (usedRange) {
    assumptions.push({
      id: "worker-profile-range",
      label: "Líquido apresentado como intervalo",
      detail: "A empresa não forneceu factos pessoais autorizados. O motor compara perfis fiscais documentados sem atribuir nenhum deles ao candidato.",
      severity: "estimate",
    });
  }
  if (input.postCosts.accidentInsuranceAnnual === undefined) {
    assumptions.push({
      id: "accident-insurance-missing",
      label: "Seguro por orçamentar",
      detail: "O prémio depende da atividade e da seguradora. Foi mantido fora do total em vez de ser inventado.",
      severity: "blocking",
    });
  }
  if (input.postCosts.healthAndSafetyAnnual === undefined) {
    assumptions.push({
      id: "sst-missing",
      label: "Saúde e segurança por orçamentar",
      detail: "O total não inclui um valor presumido para SST/medicina do trabalho.",
      severity: "estimate",
    });
  }
  if (input.postCosts.trainingAnnual === undefined) {
    assumptions.push({
      id: "training-cost-missing",
      label: "Formação sem orçamento monetário",
      detail: "As horas de formação reduzem capacidade; o custo do fornecedor só entra quando for indicado.",
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
  assumptions.push({
    id: "supports-not-deducted",
    label: "Apoios não abatidos",
    detail: "Uma medida potencial só reduz custo depois de aprovação e calendário confirmados.",
    severity: "info",
  });
  return assumptions;
}

