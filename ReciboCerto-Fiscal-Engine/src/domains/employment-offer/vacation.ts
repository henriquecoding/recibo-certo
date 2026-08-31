import type { ISODate } from "../../core/model";
import type { VacationPolicy } from "../../releases/types";
import type { VacationEntitlement } from "./types";
import { parseISODate, toISODate } from "./work-calendar";

/**
 * Férias: quatro conceitos que estavam fundidos num só.
 *
 * O erro corrigido (MOT-P0-008): o motor calculava `2 × meses completos` e
 * distribuía imediatamente esses dias pelos meses ativos do ano da admissão.
 * Uma entrada em setembro retirava dias a setembro-dezembro, quando os seis
 * meses completos só terminam em março do ano seguinte — férias em meses
 * juridicamente impossíveis, a subtrair capacidade que existia.
 *
 * Passam a ser quatro coisas distintas (CT, artigos 237.º a 239.º):
 * 1. direito adquirido no ano da admissão — 2 dias úteis por mês, até 20;
 * 2. data a partir da qual pode ser gozado — seis meses completos de execução;
 * 3. o que cabe DENTRO do ano civil da admissão;
 * 4. o saldo transportado e o teto do gozo conjunto no ano seguinte.
 */

export const VACATION_CITATIONS = [
  "pt.dr.codigo-trabalho.artigo-237",
  "pt.dr.codigo-trabalho.artigo-238",
  "pt.dr.codigo-trabalho.artigo-239",
] as const;

const addMonths = (date: ISODate, months: number): ISODate => {
  const { year, month, day } = parseISODate(date);
  const stamp = new Date(Date.UTC(year, month - 1 + months, day));
  return toISODate({
    year: stamp.getUTCFullYear(),
    month: stamp.getUTCMonth() + 1,
    day: stamp.getUTCDate(),
  });
};

export interface VacationQuery {
  policy: VacationPolicy;
  contractStart: ISODate;
  contractEnd?: ISODate;
  /** Meses completos de contrato dentro do ano civil da admissão. */
  completeContractMonthsInAdmissionYear: number;
}

export function assessVacation(query: VacationQuery): VacationEntitlement {
  const { policy } = query;
  const start = parseISODate(query.contractStart);

  const accrued = Math.min(
    policy.admissionCapWorkdays,
    Math.max(0, query.completeContractMonthsInAdmissionYear) * policy.admissionWorkdaysPerMonth,
  );

  // CT, artigo 239.º, n.º 1: o direito só pode ser gozado após seis meses
  // completos de execução do contrato.
  const earliestLeaveDate = addMonths(
    query.contractStart,
    policy.minimumServiceMonthsBeforeLeave,
  );
  const earliest = parseISODate(earliestLeaveDate);
  const admissionYearEnd = toISODate({ year: start.year, month: 12, day: 31 });

  const reachesSixMonthsInAdmissionYear = earliest.year === start.year;

  // CT, artigo 239.º, n.º 2: se o ano civil terminar antes dos seis meses, o
  // gozo faz-se até 30 de junho do ano seguinte.
  const carryOverDeadline = reachesSixMonthsInAdmissionYear
    ? undefined
    : toISODate({
        year: start.year + 1,
        month: policy.carryOverDeadline.month,
        day: policy.carryOverDeadline.day,
      });

  // Contrato que cessa antes dos seis meses: o gozo é imediatamente anterior
  // à cessação, dentro do ano — nada transita.
  const endsBeforeSixMonths =
    query.contractEnd !== undefined && query.contractEnd < earliestLeaveDate;

  const usable = endsBeforeSixMonths
    ? accrued
    : reachesSixMonthsInAdmissionYear
      ? accrued
      : 0;
  const carriedOver = accrued - usable;

  // CT, artigo 239.º, n.º 3: o gozo conjunto no ano seguinte tem teto.
  const secondYear = Math.min(
    policy.combinedYearCapWorkdays,
    policy.annualWorkdays + carriedOver,
  );

  return {
    admissionYearAccruedWorkdays: accrued,
    earliestLeaveDate: endsBeforeSixMonths ? query.contractEnd! : earliestLeaveDate,
    admissionYearUsableWorkdays: usable,
    carriedOverWorkdays: carriedOver,
    carryOverDeadline: carriedOver > 0 ? carryOverDeadline : undefined,
    secondYearWorkdays: secondYear,
    citations: [...VACATION_CITATIONS],
  };
}

/**
 * Primeiro mês do ano da admissão em que o gozo já é legalmente possível.
 * Fora dele, o calendário não pode marcar férias — era exatamente o que
 * fazia ao repartir os dias pelos meses com mais dias contratados.
 */
export function earliestLeaveMonth(
  entitlement: VacationEntitlement,
  admissionYear: number,
): number | undefined {
  const date = parseISODate(entitlement.earliestLeaveDate);
  if (date.year > admissionYear) return undefined;
  if (date.year < admissionYear) return 1;
  return date.month;
}

/** Descrição sem número inventado, para a memória de cálculo. */
export function describeVacation(entitlement: VacationEntitlement): string {
  if (entitlement.carriedOverWorkdays === 0) {
    return `${entitlement.admissionYearAccruedWorkdays} dias úteis adquiridos no ano da admissão, gozáveis a partir de ${entitlement.earliestLeaveDate}.`;
  }
  return `${entitlement.admissionYearAccruedWorkdays} dias úteis adquiridos no ano da admissão; ${entitlement.carriedOverWorkdays} transitam para o ano seguinte${
    entitlement.carryOverDeadline ? `, com gozo até ${entitlement.carryOverDeadline}` : ""
  }.`;
}
