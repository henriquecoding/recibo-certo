import type { ISODate, PortugueseJurisdiction } from "../core/model";
import type { WithholdingResolver } from "../domains/payroll/types";
import { EMPLOYER_RELEASES } from "./pt-employer-2026";
import {
  releaseRef,
  sealBundle,
  type EmployerDomain,
  type EmployerPolicyRelease,
  type EmploymentPolicyBundle,
  type ReleaseRef,
  type YearMonth,
} from "./types";

/**
 * Seletor central de release patronal.
 *
 * É o único sítio do sistema onde um `EmploymentPolicyBundle` nasce. Uma
 * página, um componente ou um adaptador que queira calcular tem de passar por
 * aqui — e por aqui não passa um release em `draft`, expirado, fora da
 * jurisdição ou incompatível com o engine (MOT-P0-001).
 */

/** Versão semântica do motor patronal. Sobe com quebras de contrato. */
export const EMPLOYMENT_ENGINE_SEMVER = "2.0.0" as const;

export interface ReleaseSelectionContext {
  /** Conhecimento regulamentar disponível — não é a data de pagamento. */
  simulationAsOf: ISODate;
  /** Mês a que a remuneração respeita. */
  workPeriod: YearMonth;
  /** Data de pagamento, que comanda a tabela de retenção. */
  payDate: ISODate;
  jurisdiction: PortugueseJurisdiction;
  withholding: WithholdingResolver;
  /** Pedido explícito de um release histórico, para reabrir um cenário. */
  requestedReleaseId?: string;
  /**
   * Só testes e consola editorial. Uma rota pública NUNCA passa isto: é o
   * que impede um release em rascunho de chegar a um ecrã.
   */
  allowUnpublishedRelease?: boolean;
}

export type ReleaseSelection =
  | { kind: "ready"; bundle: EmploymentPolicyBundle; warnings: readonly ReleaseWarning[] }
  | {
      kind: "stale_policy";
      reason: string;
      requested: { asOf: ISODate; workPeriod: YearMonth; jurisdiction: PortugueseJurisdiction };
      lastPublished?: ReleaseRef;
      available: readonly ReleaseRef[];
    }
  | { kind: "unsupported"; reasons: readonly string[]; available: readonly ReleaseRef[] };

export interface ReleaseWarning {
  code:
    | "RELEASE_NOT_APPROVED"
    | "RELEASE_NEARING_EXPIRY"
    | "DOMAIN_NOT_COVERED";
  message: string;
  severity: "info" | "warning" | "blocking";
  domain?: EmployerDomain;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return false;
  const stamp = new Date(Date.UTC(year, month - 1, day));
  return (
    stamp.getUTCFullYear() === year
    && stamp.getUTCMonth() + 1 === month
    && stamp.getUTCDate() === day
  );
}

const firstDayOf = (period: YearMonth): ISODate => `${period}-01` as ISODate;

function parseSemver(value: string): readonly [number, number, number] {
  const [major = 0, minor = 0, patch = 0] = value.split(".").map(Number);
  return [major, minor, patch];
}

function compareSemver(left: string, right: string): number {
  const a = parseSemver(left);
  const b = parseSemver(right);
  for (let index = 0; index < 3; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isEngineCompatible(release: EmployerPolicyRelease): boolean {
  return (
    compareSemver(EMPLOYMENT_ENGINE_SEMVER, release.engineCompatibility.min) >= 0
    && compareSemver(EMPLOYMENT_ENGINE_SEMVER, release.engineCompatibility.belowMajor) < 0
  );
}

/** Um release publicado é o que uma superfície pública pode servir. */
export const isPublished = (release: EmployerPolicyRelease): boolean =>
  release.status === "reviewed" || release.status === "approved";

const catalogue = (): readonly ReleaseRef[] => EMPLOYER_RELEASES.map(releaseRef);

/**
 * Resolve o release para um contexto. Falha de forma segura e explícita: sem
 * cobertura para a data ou a jurisdição, devolve `stale_policy` — nunca cai
 * para as constantes compiladas do ano anterior (MOT-P0-017).
 */
export function selectEmploymentPolicy(
  context: ReleaseSelectionContext,
): ReleaseSelection {
  const unsupported: string[] = [];
  if (!isValidDate(context.simulationAsOf)) {
    unsupported.push("A data de referência da simulação não é uma data válida.");
  }
  if (!isValidDate(context.payDate)) {
    unsupported.push("A data de pagamento não é uma data válida.");
  }
  if (!MONTH_PATTERN.test(context.workPeriod)) {
    unsupported.push("O período de trabalho não é um mês válido no formato AAAA-MM.");
  }
  if (unsupported.length > 0) {
    return { kind: "unsupported", reasons: unsupported, available: catalogue() };
  }

  const periodStart = firstDayOf(context.workPeriod);
  const eligible = EMPLOYER_RELEASES.filter((release) => {
    if (!release.jurisdictions.includes(context.jurisdiction)) return false;
    if (periodStart < release.effective.from || periodStart > release.effective.to) return false;
    if (context.payDate < release.effective.from || context.payDate > release.effective.to) {
      return false;
    }
    if (!isEngineCompatible(release)) return false;
    if (context.requestedReleaseId && release.releaseId !== context.requestedReleaseId) {
      return false;
    }
    return context.allowUnpublishedRelease === true || isPublished(release);
  });

  if (eligible.length === 0) {
    const published = EMPLOYER_RELEASES.filter(isPublished);
    const last = published[published.length - 1];
    return {
      kind: "stale_policy",
      reason: context.requestedReleaseId
        ? `Não há release publicado com o identificador ${context.requestedReleaseId} para esta data e jurisdição.`
        : `Não há release patronal publicado que cubra ${context.workPeriod} em ${context.jurisdiction}. O cálculo não reutiliza a política de outro ano.`,
      requested: {
        asOf: context.simulationAsOf,
        workPeriod: context.workPeriod,
        jurisdiction: context.jurisdiction,
      },
      lastPublished: last ? releaseRef(last) : undefined,
      available: catalogue(),
    };
  }

  // Vigências não se sobrepõem por construção; o mais recente ganha.
  const release = eligible.reduce((best, candidate) =>
    candidate.publishedAt > best.publishedAt ? candidate : best,
  );

  const warnings: ReleaseWarning[] = [];
  if (release.status !== "approved") {
    warnings.push({
      code: "RELEASE_NOT_APPROVED",
      severity: "warning",
      message:
        "Release em revisão técnica, sem aprovação profissional independente. Serve para preparar a decisão, não para a fechar.",
    });
  }
  for (const [domain, coverage] of Object.entries(release.domains) as readonly [
    EmployerDomain,
    EmployerPolicyRelease["domains"][EmployerDomain],
  ][]) {
    if (coverage === "unsupported" || coverage === "draft") {
      warnings.push({
        code: "DOMAIN_NOT_COVERED",
        severity: "info",
        domain,
        message: `Este release não cobre ${domain}.`,
      });
    }
  }

  return {
    kind: "ready",
    warnings,
    bundle: sealBundle({
      release,
      jurisdiction: context.jurisdiction,
      withholding: context.withholding,
      usage: context.allowUnpublishedRelease === true ? "internal_review" : "public",
    }),
  };
}

/** Coberturas que autorizam calcular um domínio. */
export function domainIsUsable(
  bundle: EmploymentPolicyBundle,
  domain: EmployerDomain,
): boolean {
  const coverage = bundle.release.domains[domain];
  return coverage === "approved" || coverage === "reviewed";
}
