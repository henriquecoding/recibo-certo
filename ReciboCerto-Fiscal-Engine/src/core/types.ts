/**
 * Jurisdição fiscal portuguesa. Portugal é a jurisdição normativa — um país
 * de origem de rendimento (ex.: Brasil) nunca é uma jurisdição aqui; entra
 * apenas como metadado de uma fonte de rendimento no domínio internacional.
 */
export type Jurisdiction = "PT-CONTINENTE" | "PT-MADEIRA" | "PT-ACORES";

export function isJurisdiction(value: unknown): value is Jurisdiction {
  return value === "PT-CONTINENTE" || value === "PT-MADEIRA" || value === "PT-ACORES";
}

/** Data ISO 8601 (YYYY-MM-DD). */
export type IsoDate = string & { readonly __brand: "IsoDate" };

export function isIsoDate(value: string): value is IsoDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Intervalo de vigência de uma regra ou parâmetro. `to` omitido = ainda em vigor. */
export interface EffectivePeriod {
  from: IsoDate;
  to?: IsoDate;
}

export function isEffectiveAt(period: EffectivePeriod, date: IsoDate): boolean {
  if (date < period.from) return false;
  if (period.to !== undefined && date > period.to) return false;
  return true;
}

/**
 * Contexto obrigatório de qualquer avaliação (invariante #1 da arquitetura):
 * "O contexto contém data, ano fiscal e jurisdição portuguesa explícitos."
 */
export interface EvaluationContext {
  /** Data de referência da avaliação (não a de hoje — permite reproduzir o passado). */
  asOf: IsoDate;
  taxYear: number;
  jurisdiction: Jurisdiction;
  /**
   * Só para desenvolvimento/testes — nunca exposto pela aplicação pública
   * (ver ARCHITECTURE.md, secção "Aprovação").
   */
  allowUnapprovedDataset?: boolean;
}

/** Entidades explícitas (invariante #3 da arquitetura). */
export type EntityKind = "person" | "household" | "activity" | "company" | "transaction" | "asset";

export interface Entity {
  kind: EntityKind;
  id: string;
}
