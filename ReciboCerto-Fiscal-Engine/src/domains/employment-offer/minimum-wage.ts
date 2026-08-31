import type { ISODate, PortugueseJurisdiction } from "../../core/model";
import { eurCents, type Money } from "../../core/money";
import type { MinimumWagePolicy } from "../../releases/types";
import type { MinimumWageVerdict, WorkingTimeAssessment } from "./types";

/**
 * Piso remuneratório do posto.
 *
 * O buraco que este módulo fecha (MOT-P0-005, MOT-P0-006, MOT-P0-011): o
 * motor guardava um único `minimumMonthlyWage` de 920 €, usava-o sobretudo
 * na penhora, e NENHUM objetivo comparava a proposta com ele. Uma proposta
 * abaixo do mínimo — ou legal num sítio e ilegal noutro — produzia um
 * resultado financeiro com aparência válida.
 *
 * Três regras, por esta ordem:
 * 1. a RMMG depende da jurisdição do LOCAL DE TRABALHO e da data;
 * 2. a tempo parcial o piso é proporcional ao período normal (CT, art. 155.º);
 * 3. o mínimo do IRCT/categoria pode ser SUPERIOR à RMMG — e, sem IRCT
 *    identificado, o motor não afirma conformidade: devolve
 *    `legal_floor_unconfirmed`.
 */

export const MINIMUM_WAGE_CITATIONS = [
  "pt.dr.decreto-lei-139-2025",
  "pt.dr.decreto-legislativo-regional-1-2026-m",
  "pt.dr.decreto-legislativo-regional-8-2002-a",
  "pt.dr.codigo-trabalho.artigo-155",
] as const;

export interface MinimumWageQuery {
  policy: MinimumWagePolicy;
  jurisdiction: PortugueseJurisdiction;
  /** Data a que o piso se afere: a de vigência do vínculo. */
  onDate: ISODate;
  offered: Money;
  workingTime: WorkingTimeAssessment;
  collectiveAgreement:
    | { status: "unknown" }
    | { status: "none" }
    | { status: "declared"; name: string; minimumMonthly?: Money };
}

export interface StatutoryFloor {
  monthly: Money;
  fullTimeMonthly: Money;
  basis: string;
  sourceIds: readonly string[];
}

/** Resolve a RMMG aplicável, já proporcionalizada ao tempo parcial. */
export function statutoryMinimumWage(
  policy: MinimumWagePolicy,
  jurisdiction: PortugueseJurisdiction,
  onDate: ISODate,
  workingTime: WorkingTimeAssessment,
): StatutoryFloor | undefined {
  const entry = policy.entries.find(
    (candidate) =>
      candidate.jurisdiction === jurisdiction
      && onDate >= candidate.effective.from
      && (candidate.effective.to === undefined || onDate <= candidate.effective.to),
  );
  if (!entry) return undefined;

  if (!workingTime.partTime) {
    return {
      monthly: entry.monthly,
      fullTimeMonthly: entry.monthly,
      basis: entry.basis,
      sourceIds: entry.sourceIds,
    };
  }

  // CT, artigo 155.º, n.º 1: a retribuição do tempo parcial é a do tempo
  // completo na proporção do respetivo período normal de trabalho.
  const proportional = eurCents(
    Math.round((entry.monthly.cents * workingTime.fullTimeFraction.ppm) / 1_000_000),
  );
  return {
    monthly: proportional,
    fullTimeMonthly: entry.monthly,
    basis: `${entry.basis}, proporcional ao período normal de tempo parcial`,
    sourceIds: [...entry.sourceIds, ...policy.partTimeSourceIds],
  };
}

/**
 * Gate do piso. Corre ANTES do payroll: sem piso resolvido não há proposta
 * sobre a qual valha a pena calcular retenções.
 */
export function assessMinimumWage(query: MinimumWageQuery): MinimumWageVerdict {
  const statutory = statutoryMinimumWage(
    query.policy,
    query.jurisdiction,
    query.onDate,
    query.workingTime,
  );

  if (!statutory) {
    return {
      kind: "legal_floor_unconfirmed",
      statutoryFloor: eurCents(0),
      offered: query.offered,
      reason: `O release não traz retribuição mínima para ${query.jurisdiction} em ${query.onDate}.`,
      sourceIds: [...MINIMUM_WAGE_CITATIONS],
    };
  }

  const collective = query.collectiveAgreement;
  const collectiveFloor =
    collective.status === "declared" ? collective.minimumMonthly : undefined;

  // O IRCT pode fixar um mínimo superior. Onde o instrumento é desconhecido,
  // afirmar conformidade seria inventar a metade que falta.
  if (collective.status === "unknown") {
    if (query.offered.cents < statutory.monthly.cents) {
      return {
        kind: "below_floor",
        floor: statutory.monthly,
        statutoryFloor: statutory.monthly,
        offered: query.offered,
        basis: statutory.basis,
        sourceIds: statutory.sourceIds,
      };
    }
    return {
      kind: "legal_floor_unconfirmed",
      statutoryFloor: statutory.monthly,
      offered: query.offered,
      reason:
        "A proposta cumpre a retribuição mínima garantida, mas o IRCT aplicável não está identificado e a tabela da categoria pode fixar um mínimo superior.",
      sourceIds: statutory.sourceIds,
    };
  }

  const floor =
    collectiveFloor && collectiveFloor.cents > statutory.monthly.cents
      ? collectiveFloor
      : statutory.monthly;
  const basis =
    collectiveFloor && collectiveFloor.cents > statutory.monthly.cents
      ? `Tabela do IRCT declarado, acima da RMMG (${statutory.basis})`
      : statutory.basis;

  if (query.offered.cents < floor.cents) {
    return {
      kind: "below_floor",
      floor,
      statutoryFloor: statutory.monthly,
      offered: query.offered,
      basis,
      sourceIds: statutory.sourceIds,
    };
  }

  // IRCT declarado sem tabela da categoria: cumpre a RMMG, mas o piso
  // convencional continua por confirmar.
  if (collective.status === "declared" && collectiveFloor === undefined) {
    return {
      kind: "legal_floor_unconfirmed",
      statutoryFloor: statutory.monthly,
      offered: query.offered,
      reason: `A proposta cumpre a retribuição mínima garantida, mas falta a tabela da categoria em ${collective.name} para confirmar o piso convencional.`,
      sourceIds: statutory.sourceIds,
    };
  }

  return {
    kind: "meets_floor",
    floor,
    statutoryFloor: statutory.monthly,
    basis,
    sourceIds: statutory.sourceIds,
    collectiveFloorConfirmed: collectiveFloor !== undefined || collective.status === "none",
  };
}
