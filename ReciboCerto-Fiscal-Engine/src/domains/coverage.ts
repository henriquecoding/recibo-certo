import type { FieldRequirement, FiscalDomain } from "../core/model";

/**
 * Matriz de cobertura como dados (não prosa) — espelha `COVERAGE.md`.
 * `contract_only`: inputs e bloqueios definidos, mas o domínio ainda não
 * calcula imposto (nenhuma regra foi migrada para este núcleo).
 */
export type DomainStatus = "contract_only" | "functional_draft" | "production";

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
    status: "functional_draft",
    firstDeliverable: "Rubricas, bases IRS/SS, custo patronal, penhora, inverso e auditoria",
    mainBlocker: "Testes dourados oficiais, benefícios complexos, cessação e aprovação do dataset",
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
    mainBlocker: "Migrar a matriz integral do artigo 88.º e aprovar testes dourados",
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

/**
 * Matriz detalhada usada pelos novos contratos. `COVERAGE` é mantido como
 * vista compacta para compatibilidade com o scaffold inicial.
 */
export type MigrationState = "contract_only" | "in_progress" | "reviewed" | "production";

export interface DetailedDomainCoverage {
  domain: FiscalDomain;
  state: MigrationState;
  requiredInputs: readonly FieldRequirement[];
  blockers: readonly string[];
}

export const DOMAIN_COVERAGE: Record<FiscalDomain, DetailedDomainCoverage> = {
  receipt_cashflow: {
    domain: "receipt_cashflow",
    state: "contract_only",
    requiredInputs: [
      { path: "receipt.issueDate", reason: "Selecionar regras e vigência.", expected: "ISO date" },
      { path: "receipt.grossAmountCents", reason: "Determinar a base monetária.", expected: "integer cents" },
      { path: "activity.code", reason: "Resolver coeficiente e retenção." },
      { path: "customer.residenceCountry", reason: "Determinar retenção e territorialidade." },
      { path: "customer.isBusiness", reason: "Distinguir B2B de B2C." },
    ],
    blockers: ["Fórmulas de tesouraria ainda não migradas nem aprovadas."],
  },
  personal_income_tax: {
    domain: "personal_income_tax",
    state: "contract_only",
    requiredInputs: [
      { path: "taxUnit.residence", reason: "Determinar incidência e região." },
      { path: "taxUnit.members", reason: "Determinar agregado e dependentes." },
      { path: "incomeLots", reason: "Preservar categoria, origem e regime de cada rendimento." },
      { path: "deductions", reason: "Calcular deduções específicas e à coleta." },
    ],
    blockers: ["Mínimo de existência exato, gates de IRS Jovem/IFICI e testes dourados."],
  },
  vat: {
    domain: "vat",
    state: "contract_only",
    requiredInputs: [
      { path: "operation.date", reason: "Selecionar regras e período de IVA." },
      { path: "operation.kind", reason: "Classificar a operação." },
      { path: "supplier.establishmentCountry", reason: "Determinar estabelecimento e incidência." },
      { path: "customer.residenceCountry", reason: "Determinar territorialidade." },
      { path: "customer.isBusiness", reason: "Distinguir B2B de B2C." },
    ],
    blockers: ["Matriz do artigo 6.º e regimes transfronteiriços não migrados."],
  },
  independent_social_security: {
    domain: "independent_social_security",
    state: "contract_only",
    requiredInputs: [
      { path: "contributionPeriod", reason: "Apurar trimestre e meses contributivos." },
      { path: "quarterlyIncome", reason: "Determinar rendimento relevante por natureza." },
      { path: "activity.startDate", reason: "Determinar início de efeitos e isenções." },
      { path: "otherEmployment", reason: "Avaliar acumulação e condições." },
    ],
    blockers: ["Ciclo trimestral, opção ±25%, limites e isenções condicionais."],
  },
  payroll_withholding: {
    domain: "payroll_withholding",
    state: "in_progress",
    requiredInputs: [
      { path: "period", reason: "Selecionar tabelas e vigência." },
      { path: "employee", reason: "Determinar região, situação familiar e benefícios invocados." },
      { path: "weeklyHoursHundredths", reason: "Aplicar fórmulas horárias." },
      { path: "lines", reason: "Classificar cada rubrica em IRS, SS, caixa e custo." },
    ],
    blockers: ["Dataset draft; faltam golden tests e matrizes factuais de benefícios/cessação."],
  },
  corporate_income_tax: {
    domain: "corporate_income_tax",
    state: "contract_only",
    requiredInputs: [
      { path: "company.taxResidence", reason: "Determinar incidência e região." },
      { path: "company.sizeQualification", reason: "Avaliar taxas por dimensão." },
      { path: "accounting.profitBeforeTaxCents", reason: "Partir do resultado contabilístico." },
      { path: "taxAdjustments", reason: "Apurar matéria coletável." },
    ],
    blockers: ["Exige ponte contabilística e migração da implementação comum para o núcleo aprovado."],
  },
  autonomous_taxation: {
    domain: "autonomous_taxation",
    state: "contract_only",
    requiredInputs: [
      { path: "expenseLines", reason: "Classificar encargos por rubrica legal." },
      { path: "company.lossPosition", reason: "Avaliar agravamento." },
      { path: "company.filingCompliance", reason: "Avaliar exceções transitórias." },
    ],
    blockers: ["Matriz integral do artigo 88.º e testes cruzados entre superfícies."],
  },
  tax_incentives: {
    domain: "tax_incentives",
    state: "contract_only",
    requiredInputs: [
      { path: "incentiveKind", reason: "Selecionar o regime." },
      { path: "eligibilityEvidence", reason: "Validar atividade, ativos, região e documentação." },
      { path: "stateAid", reason: "Aplicar intensidades e cumulações." },
      { path: "taxCapacity", reason: "Aplicar limites e reportes." },
    ],
    blockers: ["Nenhum benefício reduz imposto sem gate de elegibilidade aprovado."],
  },
  inheritance_and_gifts: {
    domain: "inheritance_and_gifts",
    state: "contract_only",
    requiredInputs: [
      { path: "event.kind", reason: "Distinguir morte, doação e alienação posterior." },
      { path: "estate.assets", reason: "Classificar e avaliar património." },
      { path: "estate.liabilities", reason: "Avaliar passivo dedutível." },
      { path: "familyAndWill", reason: "Determinar meação, legítima e sucessores." },
    ],
    blockers: ["Casos civis complexos exigem notário ou advogado."],
  },
  international_income: {
    domain: "international_income",
    state: "contract_only",
    requiredInputs: [
      { path: "person.taxResidenceCountry", reason: "Determinar incidência pessoal em Portugal." },
      { path: "income.sourceCountry", reason: "Selecionar convenção e método." },
      { path: "income.category", reason: "Classificar segundo o CIRS." },
      { path: "income.grossAmountCents", reason: "Determinar rendimento estrangeiro." },
      { path: "income.currency", reason: "Aplicar conversão documentada." },
      { path: "income.receiptDate", reason: "Selecionar câmbio e vigência." },
      { path: "income.foreignTaxPaidCents", reason: "Calcular o limite do crédito." },
    ],
    blockers: ["Faltam artigos por CDT e limite do artigo 81.º do CIRS."],
  },
};
