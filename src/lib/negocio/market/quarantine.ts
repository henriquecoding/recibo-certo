import type { MarketIntegrityIssue, MarketIntegrityOptions } from "./integridade";
import { validateMarketObservation } from "./integridade";
import type { MarketObservation } from "./tipos";

export interface MarketQuarantineItem {
  observation: MarketObservation;
  issues: readonly MarketIntegrityIssue[];
}

export interface MarketQuarantineReport {
  accepted: readonly MarketObservation[];
  quarantined: readonly MarketQuarantineItem[];
  generatedAt: string;
}

/** Separa os dados sem os corrigir ou esconder. */
export function quarantineMarketObservations(
  observations: readonly MarketObservation[],
  options: MarketIntegrityOptions,
): MarketQuarantineReport {
  const accepted: MarketObservation[] = [];
  const quarantined: MarketQuarantineItem[] = [];
  for (const observation of [...observations].sort((a, b) => a.id.localeCompare(b.id))) {
    const result = validateMarketObservation(observation, options);
    if (result.publishable) accepted.push(observation);
    else quarantined.push({ observation, issues: result.issues });
  }
  return { accepted, quarantined, generatedAt: options.asOf };
}
