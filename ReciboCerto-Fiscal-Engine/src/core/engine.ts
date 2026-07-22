import type { Dataset } from "./dataset";
import { isApproved } from "./dataset";
import type { CalculationStep, Decision } from "./decision";
import { needsInput, notApplicable, ok, unsupported } from "./decision";
import type { EffectivePeriod, EvaluationContext, Jurisdiction } from "./types";
import { isEffectiveAt } from "./types";

export const ENGINE_VERSION = "0.1.0-draft";

/**
 * Uma regra fiscal executável. Nunca vive num componente de UI (invariante
 * #9 da arquitetura) — só é consumida através de `evaluate`.
 */
export interface Rule<Input, Output> {
  id: string;
  /** Campos de `Input` que têm de estar definidos (não `undefined`/`null`). */
  requiredFields: (keyof Input)[];
  effectivePeriod: EffectivePeriod;
  jurisdictions: Jurisdiction[];
  /** Chaves de `SOURCES`/fontes legais que fundamentam esta regra. */
  sources: string[];
  compute: (
    input: Input,
    dataset: Dataset,
    context: EvaluationContext,
  ) => { value: Output; calculation: CalculationStep[] };
}

function missingRequiredFields<Input extends object>(
  input: Input,
  requiredFields: (keyof Input)[],
): string[] {
  return requiredFields
    .filter((field) => input[field] === undefined || input[field] === null)
    .map((field) => String(field));
}

/**
 * Executa uma regra sobre um input, respeitando todos os invariantes de
 * segurança da arquitetura (ver ARCHITECTURE.md):
 *
 * 1. Dataset não aprovado → `unsupported`, exceto com
 *    `context.allowUnapprovedDataset` (só dev/testes — nunca em produção).
 * 2. Fora da vigência ou da jurisdição da regra → `not_applicable`.
 * 3. Campos obrigatórios em falta → `needs_input`, nunca um valor por defeito.
 * 4. Caso contrário, `ok` com proveniência completa (engineVersion, datasetId,
 *    ruleId, evaluatedAt) e memória de cálculo.
 */
export function evaluate<Input extends object, Output>(
  rule: Rule<Input, Output>,
  input: Input,
  dataset: Dataset,
  context: EvaluationContext,
): Decision<Output> {
  if (!isApproved(dataset) && !context.allowUnapprovedDataset) {
    return unsupported(
      `Dataset "${dataset.id}" tem estado "${dataset.status}", não "approved". ` +
        "Um dataset não aprovado nunca produz uma decisão \"ok\" em modo normal " +
        "(ver ARCHITECTURE.md, secção \"Aprovação\").",
      rule.id,
    );
  }

  if (!rule.jurisdictions.includes(context.jurisdiction)) {
    return notApplicable(
      `Regra "${rule.id}" não se aplica à jurisdição "${context.jurisdiction}" ` +
        `(aplica-se a: ${rule.jurisdictions.join(", ")}).`,
    );
  }

  if (!isEffectiveAt(rule.effectivePeriod, context.asOf)) {
    return notApplicable(
      `Regra "${rule.id}" não está em vigor em "${context.asOf}" ` +
        `(vigência: ${rule.effectivePeriod.from} a ${rule.effectivePeriod.to ?? "atual"}).`,
    );
  }

  const missing = missingRequiredFields(input, rule.requiredFields);
  if (missing.length > 0) {
    return needsInput(
      missing,
      `Regra "${rule.id}" precisa de: ${missing.join(", ")}.`,
    );
  }

  const { value, calculation } = rule.compute(input, dataset, context);

  return ok(
    value,
    {
      engineVersion: ENGINE_VERSION,
      datasetId: dataset.id,
      ruleId: rule.id,
      evaluatedAt: new Date().toISOString(),
    },
    calculation,
    rule.sources,
  );
}
