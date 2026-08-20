// ═══════════════════════════════════════════════════════════════════════
//  GATE LOCAL — o mesmo motor, agora com o que só o browser sabe
//  ---------------------------------------------------------------------
//  O servidor monta um pack público, igual para toda a gente: não conhece
//  a zona de quem pergunta, nem o preço que essa pessoa formou, nem se
//  alguém já lhe pagou. O gate que corre lá em cima é, por construção, o
//  mais fraco dos dois.
//
//  Este ficheiro corre O MESMO gate — `evaluateMarketEvidence`, sem cópia
//  nem variante — com as três coisas que só existem no dispositivo:
//
//   · a zona escolhida, que decide que observações servem;
//   · o cenário de preço concluído, que dá viabilidade económica;
//   · as provas comerciais registadas, que dão validação de mercado.
//
//  É por isto que `user_validated` e `operating` deixam de ser estados
//  decorativos: passa a haver um caminho real até eles, e esse caminho
//  passa por alguém ter pago.
// ═══════════════════════════════════════════════════════════════════════

import { evaluateMarketEvidence } from "./evidence-gate";
import { classifyObservationFreshness } from "./freshness";
import { observationServesRegion, type MarketRegion } from "./geografia";
import { userValidationFrom, type MarketHypothesis } from "./hipoteses";
import type { MarketObservationSummary, MarketPilotEvidence, OpportunityTemplate } from "./opportunities";
import type { MarketEvidenceGateResult, MarketEvidenceSignal } from "./tipos";

const EXPIRING_WITHIN_DAYS = 45;

export interface LocalGateInput {
  template: OpportunityTemplate;
  evidence?: MarketPilotEvidence;
  hypothesis?: MarketHypothesis;
  region: MarketRegion;
  asOf: string;
}

function toSignal(observation: MarketObservationSummary, asOf: string): MarketEvidenceSignal {
  return {
    observationId: observation.id,
    sourceId: observation.sourceId,
    independenceKey: observation.independenceKey,
    kind: observation.kind,
    freshness: classifyObservationFreshness(observation, asOf, EXPIRING_WITHIN_DAYS),
    geographyCompatible: true,
    semanticMapping: observation.semanticMapping,
    critical: observation.critical,
  };
}

export function evaluateLocalMarketEvidence(input: LocalGateInput): MarketEvidenceGateResult {
  // Filtrar, não sinalizar como incompatível.
  //
  // A ocupação do Algarve não é «evidência geograficamente incompatível»
  // para quem testa em Braga: é evidência de outro sítio, que não vem ao
  // caso. Passá-la ao gate marcada como incompatível fazia aparecer, para
  // sempre, um «falta correspondência geográfica» que ninguém conseguia
  // resolver — havia sempre outra região no pack.
  const servem = (input.evidence?.observations ?? []).filter((observation) =>
    observationServesRegion(observation.geography, input.region),
  );

  return evaluateMarketEvidence({
    templateId: input.template.id,
    evaluatedAt: input.asOf,
    signals: servem.map((observation) => toSignal(observation, input.asOf)),
    sourceHealth: input.evidence?.sourceHealth ?? [],
    // `undefined` seria «não perguntei»; `null` é «ainda não há cenário
    // concluído». O gate distingue as duas e nunca assume viabilidade.
    economicViability: input.hypothesis?.pricing ? input.hypothesis.pricing.viable : null,
    criticalRequirements: input.hypothesis?.requirementsReviewed ? "known" : "pending",
    falsificationTestDefined: Boolean(input.template.falsificationTest.trim()),
    userValidation: input.hypothesis ? userValidationFrom(input.hypothesis, input.asOf) : undefined,
  });
}
