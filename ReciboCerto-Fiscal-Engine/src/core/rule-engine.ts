import {
  type DatasetManifest,
  type EvaluationContext,
  type FieldRequirement,
  type FiscalDecision,
  type FiscalRule,
  type MissingInput,
  isWithinPeriod,
} from "./model";
import { needsInputDecision, outcomeToDecision, unsupportedDecision } from "./decision";

function readPath(input: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, input);
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

export function missingRequirements(
  input: unknown,
  requirements: readonly FieldRequirement[],
): readonly MissingInput[] {
  return requirements
    .filter((requirement) => !isPresent(readPath(input, requirement.path)))
    .map((requirement) => ({
      path: requirement.path,
      reason: requirement.reason,
      expected: requirement.expected,
    }));
}

export class FiscalRuleEngine {
  readonly #datasets: readonly DatasetManifest[];

  constructor(datasets: readonly DatasetManifest[]) {
    this.#datasets = Object.freeze([...datasets]);
  }

  evaluate<I, O>(
    rule: FiscalRule<I, O>,
    input: I,
    context: EvaluationContext,
  ): FiscalDecision<O> {
    const provisionalDatasetId = context.requestedDatasetId ?? `pt-${context.taxYear}-unresolved`;

    if (!Number.isInteger(context.taxYear) || context.taxYear < 2000) {
      return unsupportedDecision(provisionalDatasetId, rule.id, context, ["Ano fiscal inválido."]);
    }
    if (!rule.jurisdictions.includes(context.jurisdiction)) {
      return unsupportedDecision(provisionalDatasetId, rule.id, context, [
        `A regra ${rule.id} não suporta a jurisdição ${context.jurisdiction}.`,
      ]);
    }
    if (!isWithinPeriod(context.asOf, rule.effective)) {
      return unsupportedDecision(provisionalDatasetId, rule.id, context, [
        `A regra ${rule.id} não vigora em ${context.asOf}.`,
      ]);
    }

    const candidates = this.#datasets.filter(
      (dataset) =>
        dataset.taxYear === context.taxYear &&
        dataset.jurisdictions.includes(context.jurisdiction) &&
        isWithinPeriod(context.asOf, dataset.effective) &&
        (context.requestedDatasetId === undefined || dataset.id === context.requestedDatasetId),
    );
    if (candidates.length !== 1) {
      return unsupportedDecision(provisionalDatasetId, rule.id, context, [
        candidates.length === 0
          ? "Não existe um dataset único para o ano, data e jurisdição pedidos."
          : "Existem vários datasets candidatos; indique requestedDatasetId.",
      ]);
    }

    const dataset = candidates[0]!;
    if (
      (!dataset.productionReady || dataset.status !== "approved") &&
      context.allowUnapprovedDataset !== true
    ) {
      return unsupportedDecision(dataset.id, rule.id, context, [
        `O dataset ${dataset.id} está em estado ${dataset.status} e não está aprovado para produção.`,
      ]);
    }

    const missing = missingRequirements(input, rule.requirements);
    if (missing.length > 0) {
      return needsInputDecision(dataset.id, rule.id, context, missing);
    }

    return outcomeToDecision(dataset.id, rule.id, context, rule.evaluate(input, context));
  }
}
