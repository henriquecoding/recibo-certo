// ═══════════════════════════════════════════════════════════════════════
//  INTEGRIDADE — quarentena antes de recomendação
//  ---------------------------------------------------------------------
//  Este validador não corrige dados. Enumera problemas e bloqueia a
//  publicação quando a proveniência, a licença, a unidade, a geografia ou
//  a validade não são demonstráveis.
// ═══════════════════════════════════════════════════════════════════════

import { classifyObservationFreshness, parseIsoDate } from "./freshness";
import { getMarketSource } from "./source-registry";
import type { MarketObservation } from "./tipos";

export type MarketIntegritySeverity = "warning" | "error";

export interface MarketIntegrityIssue {
  code:
    | "unknown-source"
    | "license-review"
    | "license-prohibited"
    | "missing-field"
    | "invalid-value"
    | "invalid-date"
    | "invalid-period"
    | "invalid-geography"
    | "invalid-quality"
    | "semantic-review"
    | "semantic-rejected"
    | "invalid-checksum"
    | "stale"
    | "expiring";
  severity: MarketIntegritySeverity;
  field: string;
  message: string;
}

export interface MarketIntegrityResult {
  publishable: boolean;
  issues: readonly MarketIntegrityIssue[];
}

export interface MarketIntegrityOptions {
  asOf: string;
  expiringWithinDays: number;
}

const SHA256 = /^sha256:[a-f0-9]{64}$/i;

function blank(value: string | undefined): boolean {
  return !value?.trim();
}

function isHttps(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function issue(
  issues: MarketIntegrityIssue[],
  code: MarketIntegrityIssue["code"],
  field: string,
  message: string,
  severity: MarketIntegritySeverity = "error",
): void {
  issues.push({ code, field, message, severity });
}

export function validateMarketObservation(
  observation: MarketObservation,
  options: MarketIntegrityOptions,
): MarketIntegrityResult {
  const issues: MarketIntegrityIssue[] = [];
  const source = getMarketSource(observation.sourceId);

  if (!source) {
    issue(issues, "unknown-source", "sourceId", `Fonte desconhecida: ${observation.sourceId || "(vazia)"}.`);
  } else if (source.license.status === "prohibited") {
    issue(issues, "license-prohibited", "sourceId", "A política da fonte proíbe esta utilização.");
  } else if (source.license.status === "review_required") {
    issue(
      issues,
      "license-review",
      "sourceId",
      "A licença ainda não foi aprovada para publicação; a observação fica em quarentena.",
    );
  }

  if (!observation.license) {
    issue(issues, "missing-field", "license", "A observação precisa de prova de licença própria.");
  } else {
    if (!isHttps(observation.license.url)) {
      issue(issues, "license-review", "license.url", "A prova de licença precisa de uma ligação HTTPS válida.");
    }
    if (observation.license.status === "prohibited") {
      issue(issues, "license-prohibited", "license.status", "A licença desta observação proíbe a utilização.");
    } else if (observation.license.status === "review_required") {
      issue(
        issues,
        "license-review",
        "license.status",
        "A licença desta série/dataset ainda não foi aprovada para publicação.",
      );
    }
    if (!["source", "series", "dataset"].includes(observation.license.scope)) {
      issue(issues, "license-review", "license.scope", "O âmbito da licença não é reconhecido.");
    }
  }

  for (const [field, value] of [
    ["id", observation.id],
    ["metricId", observation.metricId],
    ["unit", observation.unit],
  ] as const) {
    if (blank(value)) issue(issues, "missing-field", field, `${field} é obrigatório.`);
  }

  if (
    (typeof observation.value === "number" && !Number.isFinite(observation.value)) ||
    (typeof observation.value === "string" && blank(observation.value))
  ) {
    issue(issues, "invalid-value", "value", "O valor tem de ser finito ou texto não vazio.");
  }

  if (
    observation.geography.country !== "PT" ||
    blank(observation.geography.code) ||
    blank(observation.geography.name)
  ) {
    issue(
      issues,
      "invalid-geography",
      "geography",
      "A geografia precisa de país PT, código e nome explícitos.",
    );
  }

  const dates: readonly [string, string | undefined][] = [
    ["referencePeriod.start", observation.referencePeriod.start],
    ["referencePeriod.end", observation.referencePeriod.end],
    ["publishedAt", observation.publishedAt],
    ["retrievedAt", observation.retrievedAt],
    ["validUntil", observation.validUntil],
    ["asOf", options.asOf],
  ];

  for (const [field, value] of dates) {
    if (value !== undefined && parseIsoDate(value) === null) {
      issue(issues, "invalid-date", field, `${field} não é uma data ISO 8601 inequívoca.`);
    }
  }

  const start = parseIsoDate(observation.referencePeriod.start);
  const end = parseIsoDate(observation.referencePeriod.end);
  const validUntil = parseIsoDate(observation.validUntil);
  if (start !== null && end !== null && start > end) {
    issue(issues, "invalid-period", "referencePeriod", "O início do período é posterior ao fim.");
  }
  if (end !== null && validUntil !== null && validUntil < end) {
    issue(issues, "invalid-period", "validUntil", "A validade termina antes do período observado.");
  }

  if (
    !Number.isFinite(observation.quality.completeness) ||
    observation.quality.completeness < 0 ||
    observation.quality.completeness > 1
  ) {
    issue(issues, "invalid-quality", "quality.completeness", "A completude tem de estar entre 0 e 1.");
  }

  if (observation.quality.semanticMapping === "rejected") {
    issue(issues, "semantic-rejected", "quality.semanticMapping", "O mapeamento semântico foi rejeitado.");
  } else if (observation.quality.semanticMapping === "review_required") {
    issue(
      issues,
      "semantic-review",
      "quality.semanticMapping",
      "O mapeamento semântico precisa de revisão humana.",
    );
  }

  if (!SHA256.test(observation.checksum)) {
    issue(issues, "invalid-checksum", "checksum", "O checksum tem de ser um SHA-256 em hexadecimal.");
  }

  const freshness = classifyObservationFreshness(
    observation,
    options.asOf,
    options.expiringWithinDays,
  );
  if (freshness === "invalid" && !issues.some((item) => item.code === "invalid-date" || item.code === "invalid-period")) {
    issue(issues, "invalid-period", "validUntil", "Não foi possível determinar a frescura da observação.");
  } else if (freshness === "stale") {
    issue(issues, "stale", "validUntil", "A observação expirou e não pode sustentar uma recomendação atual.");
  } else if (freshness === "expiring") {
    issue(
      issues,
      "expiring",
      "validUntil",
      "A observação aproxima-se do fim da validade.",
      "warning",
    );
  }

  return {
    publishable: !issues.some((item) => item.severity === "error"),
    issues,
  };
}
