export * from "./core/model";
export * from "./core/money";
export * from "./core/decision";
export * from "./core/rule-engine";
export * from "./datasets/pt-2026";
export * from "./domains/coverage";
export * from "./domains/international-scope";
export * from "./domains/payroll/types";
export * from "./domains/payroll/engine";
export * from "./domains/payroll/garnishment";
export * from "./domains/payroll/inverse";
export * from "./domains/payroll/audit";
export * from "./domains/payroll/social-benefits";
export * from "./domains/payroll/rule";
export * from "./domains/payroll/policy-2026";
export * from "./domains/employment-offer/types";
export * from "./domains/employment-offer/engine";
export * from "./domains/employment-offer/inverse";
export * from "./domains/employment-offer/range";
export * from "./domains/employment-offer/calendar";
export * from "./domains/employment-offer/explanation";
export * from "./domains/employment-offer/policy-2026";
export * from "./legal/catalogue";
export * from "./legal/semantic-check";

import { DATASETS } from "./datasets/pt-2026";
import { FiscalRuleEngine } from "./core/rule-engine";

export function createFiscalRuleEngine(): FiscalRuleEngine {
  return new FiscalRuleEngine(DATASETS);
}
