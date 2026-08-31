import type { MissingInput } from "../../core/model";
import { ratePpm } from "../../core/money";
import type { WorkingTimePolicy } from "../../releases/types";
import type { WorkingTimeArrangement, WorkingTimeAssessment } from "./types";

/**
 * Tempo de trabalho por médias, não por picos.
 *
 * O que estava errado (MOT-P0-007): escolher «adaptabilidade» abria o campo
 * das horas semanais até 50 ou 60 e o motor tratava esse número como o
 * período normal PERMANENTE do posto — horas pagas, capacidade e custo
 * subiam com ele. A lei não funciona assim: o período normal continua a ser
 * o do artigo 203.º e a adaptabilidade só autoriza um acréscimo em semanas
 * determinadas, compensado dentro de um período de referência, com
 * fundamento, e com a média — incluindo suplementar — a não exceder 48 h
 * (artigo 211.º, n.º 1).
 */

export const WORKING_TIME_CITATIONS = [
  "pt.dr.codigo-trabalho.artigo-203",
  "pt.dr.codigo-trabalho.artigo-204",
  "pt.dr.codigo-trabalho.artigo-205",
  "pt.dr.codigo-trabalho.artigo-207",
  "pt.dr.codigo-trabalho.artigo-211",
] as const;

export interface WorkingTimeReview {
  missing: readonly MissingInput[];
  conflicts: readonly string[];
  assessment?: WorkingTimeAssessment;
}

const hours = (hundredths: number): string =>
  (hundredths / 100).toLocaleString("pt-PT", { maximumFractionDigits: 2 });

export function reviewWorkingTime(
  arrangement: WorkingTimeArrangement,
  policy: WorkingTimePolicy,
): WorkingTimeReview {
  const missing: MissingInput[] = [];
  const conflicts: string[] = [];

  const weekdays = arrangement.workingWeekdays;
  if (weekdays.length === 0) {
    missing.push({
      path: "role.workingTime.workingWeekdays",
      reason: "Indica pelo menos um dia da semana contratado.",
    });
  }
  if (weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    missing.push({
      path: "role.workingTime.workingWeekdays",
      reason: "Os dias da semana vão de 1 (segunda) a 7 (domingo).",
    });
  }

  const normal = arrangement.normalWeeklyHoursHundredths;
  if (!Number.isSafeInteger(normal) || normal <= 0) {
    missing.push({
      path: "role.workingTime.normalWeeklyHoursHundredths",
      reason: "Indica o período normal de trabalho semanal do posto.",
    });
  }

  if (missing.length > 0) return { missing, conflicts };

  // CT, artigo 203.º, n.º 1: o período normal não excede 8 h por dia nem
  // 40 h por semana. O pico da adaptabilidade não é o período normal.
  if (normal > policy.normalWeeklyHoursHundredths) {
    conflicts.push(
      `O período normal de trabalho não pode exceder ${hours(policy.normalWeeklyHoursHundredths)} horas por semana (Código do Trabalho, artigo 203.º). ${hours(normal)} horas só podem existir como semana de acréscimo num regime de adaptabilidade, com o período de referência a repor a média.`,
    );
  }
  const dailyNormal = normal / Math.max(1, weekdays.length);
  if (dailyNormal > policy.normalDailyHoursHundredths) {
    conflicts.push(
      `O horário dá ${hours(dailyNormal)} horas por dia e o período normal admite no máximo ${hours(policy.normalDailyHoursHundredths)} (artigo 203.º). Acrescenta dias contratados ou reduz as horas semanais.`,
    );
  }

  const overtime = arrangement.expectedOvertimeWeeklyHoursHundredths ?? 0;
  const average = normal + Math.max(0, overtime);

  if (arrangement.regime !== "standard") {
    const limits =
      arrangement.regime === "adaptability_individual"
        ? policy.individualAdaptability
        : policy.collectiveAdaptability;

    if (!limits.admissibleBasis.includes(arrangement.basis)) {
      conflicts.push(
        arrangement.regime === "adaptability_collective"
          ? "A adaptabilidade por regulamentação coletiva exige um IRCT identificado (artigo 204.º). Sem instrumento aplicável, o regime não pode ser declarado."
          : "A adaptabilidade individual exige acordo escrito com o trabalhador ou IRCT aplicável (artigo 205.º).",
      );
    }

    const peak = arrangement.peakWeeklyHoursHundredths;
    if (peak === undefined) {
      missing.push({
        path: "role.workingTime.peakWeeklyHoursHundredths",
        reason: "Indica o limite das semanas de acréscimo do regime de adaptabilidade.",
      });
    } else if (peak > limits.peakWeeklyHoursHundredths) {
      conflicts.push(
        `As semanas de acréscimo deste regime não podem passar de ${hours(limits.peakWeeklyHoursHundredths)} horas (${arrangement.regime === "adaptability_collective" ? "artigo 204.º" : "artigo 205.º"}).`,
      );
    } else if (peak < normal) {
      conflicts.push(
        "A semana de acréscimo não pode ser inferior ao período normal contratado.",
      );
    }

    const reference = arrangement.referencePeriodMonths;
    if (reference === undefined) {
      missing.push({
        path: "role.workingTime.referencePeriodMonths",
        reason: "Indica o período de referência dentro do qual a média é reposta (artigo 207.º).",
      });
    } else if (reference <= 0 || reference > policy.maxReferencePeriodMonths) {
      conflicts.push(
        `O período de referência vai de 1 a ${policy.maxReferencePeriodMonths} meses (artigo 207.º).`,
      );
    }
  }

  // CT, artigo 211.º, n.º 1: a média semanal, incluindo trabalho
  // suplementar, não excede 48 h no período de referência.
  if (average > policy.averageWeeklyCeilingHundredths) {
    conflicts.push(
      `A média semanal com o trabalho suplementar previsto dá ${hours(average)} horas e o limite é ${hours(policy.averageWeeklyCeilingHundredths)} (artigo 211.º, n.º 1).`,
    );
  }

  if (missing.length > 0 || conflicts.length > 0) return { missing, conflicts };

  const fraction = Math.min(
    1_000_000,
    Math.round((normal * 1_000_000) / policy.normalWeeklyHoursHundredths),
  );
  return {
    missing: [],
    conflicts: [],
    assessment: {
      // As horas PAGAS são o período normal. Um pico compensado dentro do
      // período de referência não acrescenta horas contratadas ao ano.
      paidWeeklyHoursHundredths: normal,
      averageWeeklyHoursHundredths: average,
      partTime: normal < policy.normalWeeklyHoursHundredths,
      fullTimeFraction: ratePpm(fraction),
      citations: [...WORKING_TIME_CITATIONS],
    },
  };
}
