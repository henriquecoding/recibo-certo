/**
 * Matriz de cobertura como dados (não prosa) — espelha `COVERAGE.md`.
 * `contract_only`: inputs e bloqueios definidos, mas o domínio ainda não
 * calcula imposto (nenhuma regra foi migrada para este núcleo).
 */
export type DomainStatus = "contract_only" | "partial" | "production";

export type DomainId =
  | "receipt-cashflow"
  | "personal-income-tax"
  | "vat"
  | "independent-social-security"
  | "payroll-withholding"
  | "corporate-income-tax"
  | "autonomous-taxation"
  | "tax-incentives"
  | "inheritance-and-gifts"
  | "international-income";

export interface DomainCoverage {
  id: DomainId;
  label: string;
  status: DomainStatus;
  firstDeliverable: string;
  mainBlocker: string;
}

export const COVERAGE: Record<DomainId, DomainCoverage> = {
  "receipt-cashflow": {
    id: "receipt-cashflow",
    label: "Tesouraria por recibo",
    status: "contract_only",
    firstDeliverable: "Caixa, IVA, retenção e reserva SS separados",
    mainBlocker: "Migrar regras sem chamar obrigação à reserva",
  },
  "personal-income-tax": {
    id: "personal-income-tax",
    label: "IRS anual",
    status: "contract_only",
    firstDeliverable: "Lotes de rendimento + coleta progressiva",
    mainBlocker: "Mínimo de existência, solidariedade, IFICI e IRS Jovem",
  },
  vat: {
    id: "vat",
    label: "IVA",
    status: "contract_only",
    firstDeliverable: "Enquadramento e territorialidade",
    mainBlocker: "Matriz art. 6.º e regimes transfronteiriços",
  },
  "independent-social-security": {
    id: "independent-social-security",
    label: "SS independente",
    status: "contract_only",
    firstDeliverable: "Apuramento trimestral e contribuição mensal",
    mainBlocker: "Opção, limites e isenções condicionais",
  },
  "payroll-withholding": {
    id: "payroll-withholding",
    label: "Retenção salarial",
    status: "contract_only",
    firstDeliverable: "Retenção por linha de remuneração",
    mainBlocker: "Elegibilidade IRS Jovem e casos laborais",
  },
  "corporate-income-tax": {
    id: "corporate-income-tax",
    label: "IRC",
    status: "contract_only",
    firstDeliverable: "Ponte do resultado contabilístico à coleta",
    mainBlocker: "Ajustamentos fiscais e dados contabilísticos",
  },
  "autonomous-taxation": {
    id: "autonomous-taxation",
    label: "Tributação autónoma",
    status: "contract_only",
    firstDeliverable: "Rubricas do art. 88.º com gates",
    mainBlocker: "Corrigir elétricos e agravamento no legado",
  },
  "tax-incentives": {
    id: "tax-incentives",
    label: "Benefícios",
    status: "contract_only",
    firstDeliverable: "Checklist de elegibilidade",
    mainBlocker: "Evidência, auxílios de Estado e aprovação",
  },
  "inheritance-and-gifts": {
    id: "inheritance-and-gifts",
    label: "Heranças/doações",
    status: "contract_only",
    firstDeliverable: "Casos simples, explicitamente limitados",
    mainBlocker: "Complexidade civil e avaliação",
  },
  "international-income": {
    id: "international-income",
    label: "Rendimento internacional",
    status: "contract_only",
    firstDeliverable: "Encaminhamento português por país/categoria",
    mainBlocker: "Artigos de cada CDT e limite do crédito",
  },
};

export function allDomainsAreContractOnly(): boolean {
  return Object.values(COVERAGE).every((d) => d.status === "contract_only");
}
