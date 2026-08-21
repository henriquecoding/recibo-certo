// ═══════════════════════════════════════════════════════════════════════
//  FRESHNESS — quatro relógios, sem atalhos
//  ---------------------------------------------------------------------
//  Consultar hoje um ficheiro sobre 2023 não torna o mercado «atual».
//  `retrievedAt` é auditável, mas a idade efetiva nasce do fim do período
//  de referência e a expiração nasce de `validUntil`.
// ═══════════════════════════════════════════════════════════════════════

import type { MarketFreshnessState, MarketObservation } from "./tipos";

const DAY_IN_MS = 86_400_000;
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_WITH_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

function validCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDay;
}

/**
 * Converte apenas ISO 8601 não ambíguo: `YYYY-MM-DD` ou um instante com
 * timezone explícita. Datas como `20/08/2026` e datetimes sem timezone são
 * rejeitadas para que browser e servidor não discordem.
 */
export function parseIsoDate(value: string): number | null {
  const dateOnly = ISO_DATE_ONLY.exec(value);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    return validCalendarDate(year, month, day) ? Date.UTC(year, month - 1, day) : null;
  }

  const dateTime = ISO_WITH_TIME.exec(value);
  if (!dateTime) return null;
  const year = Number(dateTime[1]);
  const month = Number(dateTime[2]);
  const day = Number(dateTime[3]);
  if (!validCalendarDate(year, month, day)) return null;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

function inclusiveEnd(value: string): number | null {
  const parsed = parseIsoDate(value);
  if (parsed === null) return null;
  return ISO_DATE_ONLY.test(value) ? parsed + DAY_IN_MS - 1 : parsed;
}

export function addDaysToIsoDate(value: string, days: number): string | null {
  const parsed = parseIsoDate(value);
  if (parsed === null || !ISO_DATE_ONLY.test(value) || !Number.isInteger(days)) return null;
  return new Date(parsed + days * DAY_IN_MS).toISOString().slice(0, 10);
}

/** Idade do dado em dias; nunca usa a data de recolha para o rejuvenescer. */
export function effectiveReferenceAgeDays(
  observation: Pick<MarketObservation, "referencePeriod">,
  asOf: string,
): number | null {
  const referenceEnd = inclusiveEnd(observation.referencePeriod.end);
  const now = parseIsoDate(asOf);
  if (referenceEnd === null || now === null) return null;
  return Math.max(0, Math.floor((now - referenceEnd) / DAY_IN_MS));
}

export function classifyObservationFreshness(
  observation: Pick<MarketObservation, "referencePeriod" | "retrievedAt" | "validUntil">,
  asOf: string,
  expiringWithinDays: number,
): MarketFreshnessState {
  const referenceStart = parseIsoDate(observation.referencePeriod.start);
  const referenceEnd = inclusiveEnd(observation.referencePeriod.end);
  const retrievedAt = parseIsoDate(observation.retrievedAt);
  const validUntil = inclusiveEnd(observation.validUntil);
  const now = parseIsoDate(asOf);

  if (
    referenceStart === null ||
    referenceEnd === null ||
    retrievedAt === null ||
    validUntil === null ||
    now === null ||
    referenceStart > referenceEnd ||
    validUntil < referenceEnd ||
    !Number.isFinite(expiringWithinDays) ||
    expiringWithinDays < 0
  ) {
    return "invalid";
  }

  if (now > validUntil) return "stale";
  // Com datas civis, «expira hoje» tem zero dias completos restantes mesmo
  // que ainda faltem algumas horas. É essa a linguagem que a UI mostra.
  if (Math.floor((validUntil - now) / DAY_IN_MS) <= expiringWithinDays) return "expiring";
  return "fresh";
}
