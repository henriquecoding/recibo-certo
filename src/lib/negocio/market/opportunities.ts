// ═══════════════════════════════════════════════════════════════════════
//  FOUNDER FIT — compatibilidade pessoal, e só isso
//  ---------------------------------------------------------------------
//  Este módulo responde a UMA pergunta: «isto cabe na vida desta pessoa?».
//  Não responde a «há mercado para isto» — essa vive no gate de evidência,
//  com fontes, período de referência e licença. As duas nunca se somam.
//
//  ── O QUE MUDOU NA VERSÃO 2 DA FÓRMULA, E PORQUÊ ───────────────────
//  A auditoria de agosto de 2026 percorreu as 25 920 combinações de perfil
//  contra o catálogo de cinco hipóteses e mediu o que a ferramenta era
//  realmente capaz de responder: 29 ordenações distintas e 7 conjuntos de
//  top-3. Setenta por cento dos perfis viam um EMPATE no primeiro lugar,
//  desfeito em silêncio por ordem alfabética do título; uma das cinco
//  hipóteses nunca chegava a primeiro para ninguém, em perfil nenhum.
//
//  Nada disso se resolvia mexendo em pesos — a informação não estava lá.
//  Resolve-se em três frentes, e as três estão neste ficheiro:
//
//   1. `rankOpportunityTemplates` publica o empate (`rank` partilhado e
//      `tiedWith`) em vez de o esconder atrás de um número de posição;
//   2. `calculateOpportunityFit` devolve a REPARTIÇÃO do score, para que
//      um «88 %» possa ser decomposto no ecrã em vez de ser um veredicto;
//   3. `fitDimensionIsInert` deriva do catálogo — e não de uma lista à
//      mão — que perguntas do formulário não conseguem separar nada, para
//      a interface o poder dizer em vez de fingir que todas contam.
//
//  O catálogo em si vive em `catalogo-oportunidades.ts`.
// ═══════════════════════════════════════════════════════════════════════

import { marketRegionLabel, type MarketRegion } from "./geografia";
import {
  OPPORTUNITY_TEMPLATES,
  type OpportunityTemplate,
} from "./catalogo-oportunidades";
import type {
  MarketEvidenceGateResult,
  MarketObservation,
  MarketOpportunityState,
  MarketSemanticMappingStatus,
  MarketSignalKind,
  MarketSourceHealth,
} from "./tipos";

export type BusinessStructurePreference = "recibos-verdes" | "empresa" | "por-decidir";
export type DeliveryPreference = "local" | "remoto" | "hibrido";
export type CapitalBand = "ate-500" | "500-3000" | "mais-3000";
export type RecurrencePreference = "pontual" | "recorrente" | "indiferente";
export type BusinessStrength = "comercial" | "digital" | "operacoes" | "cuidado" | "tecnico";

export type { MarketRegion } from "./geografia";
export {
  OPPORTUNITY_TEMPLATES,
  OPPORTUNITY_SECTORS,
  OPPORTUNITY_CATALOGUE_REVIEWED_AT,
  opportunitySectorLabel,
  type OpportunityIconName,
  type OpportunitySector,
  type OpportunityTemplate,
} from "./catalogo-oportunidades";

export interface BusinessDiscoveryProfile {
  structure: BusinessStructurePreference;
  delivery: DeliveryPreference;
  capital: CapitalBand;
  recurrence: RecurrencePreference;
  strengths: readonly BusinessStrength[];
  region: MarketRegion;
}

/** As seis perguntas que o Founder Fit lê. Nenhuma outra entra no score. */
export type FitDimension =
  | "delivery"
  | "capital"
  | "recurrence"
  | "strengths"
  | "structure"
  | "region";

export interface FitContribution {
  dimension: FitDimension;
  earned: number;
  max: number;
  /** Verdadeiro quando esta dimensão não separa nada no catálogo atual. */
  inert: boolean;
  /** A frase que já era produzida, agora agarrada à sua dimensão. */
  note: string;
  /** A dimensão contribuiu com o máximo? Serve o ecrã, não a aritmética. */
  matched: boolean;
}

export interface OpportunityFit {
  templateId: string;
  score: number;
  label: "forte" | "possivel" | "fraca";
  reasons: readonly string[];
  tensions: readonly string[];
  /** A repartição, para auditoria, testes e explicação no ecrã. */
  breakdown: readonly FitContribution[];
  /** Versão da fórmula, para snapshots e deteção de deriva. */
  formulaVersion: string;
}

/**
 * Sobe quando a aritmética do fit mudar de significado.
 *
 * Não é decoração: um snapshot de repartições congelado contra `@1` deixa
 * de valer quando os pesos mudam, e é preferível que o teste diga isso
 * pelo nome a que alguém compare números de fórmulas diferentes.
 */
export const MARKET_FIT_FORMULA_VERSION = "founder-fit@2";

export interface MarketObservationSummary {
  id: string;
  metricId: string;
  value: MarketObservation["value"];
  unit: string;
  geography: MarketObservation["geography"];
  referencePeriod: MarketObservation["referencePeriod"];
  retrievedAt: string;
  validUntil: string;
  sourceId: string;
  license: MarketObservation["license"];
  /** A série de onde a leitura veio — duas séries nunca são somadas. */
  seriesId: string;
  seriesLabel: string;
  /** O que o número diz, e o que continua a não dizer. */
  reading: string;
  /**
   * Lineage e papel do sinal, publicados de propósito.
   *
   * O servidor não conhece a zona de quem pergunta e por isso o seu gate
   * assume compatibilidade geográfica. Sem estes três campos, o browser —
   * que conhece a zona — não conseguia voltar a correr o gate sem inventar
   * a origem estatística do sinal.
   */
  independenceKey: string;
  kind: MarketSignalKind;
  critical: boolean;
  semanticMapping: MarketSemanticMappingStatus;
}

export interface MarketPilotEvidence {
  templateId: string;
  checkedAt: string;
  gate: MarketEvidenceGateResult;
  observations: readonly MarketObservationSummary[];
  sourceHealth: readonly MarketSourceHealth[];
  sourceUrl?: string;
  datasetUrl?: string;
  note?: string;
}

const CAPITAL_RANK: Readonly<Record<CapitalBand, number>> = {
  "ate-500": 0,
  "500-3000": 1,
  "mais-3000": 2,
};

/** Faixa de capital em símbolo, para o cartão não gastar uma linha nisso. */
export const CAPITAL_SYMBOL: Readonly<Record<CapitalBand, string>> = {
  "ate-500": "€",
  "500-3000": "€€",
  "mais-3000": "€€€",
};

export const CAPITAL_LABEL: Readonly<Record<CapitalBand, string>> = {
  "ate-500": "até 500 €",
  "500-3000": "500 a 3 000 €",
  "mais-3000": "mais de 3 000 €",
};

// ── Rótulos: os enums NÃO são texto de interface ──────────────────────
//  Estes valores são identificadores em ASCII, e estavam a ser
//  interpolados diretamente na copy: «Funciona em modelo hibrido»,
//  «Aproveita operacoes». Português de Portugal é inegociável, e um id
//  interno nunca é uma palavra.
const DELIVERY_LABEL: Readonly<Record<DeliveryPreference, string>> = {
  local: "presencial",
  remoto: "remoto",
  hibrido: "híbrido",
};

/** O mesmo, capitalizado, para as etiquetas curtas do cartão. */
export const DELIVERY_CHIP: Readonly<Record<DeliveryPreference, string>> = {
  local: "Presencial",
  remoto: "Remoto",
  hibrido: "Híbrido",
};

const RECURRENCE_LABEL: Readonly<Record<Exclude<RecurrencePreference, "indiferente">, string>> = {
  pontual: "por projeto pontual",
  recorrente: "recorrente",
};

export const RECURRENCE_CHIP: Readonly<Record<Exclude<RecurrencePreference, "indiferente">, string>> = {
  pontual: "Pontual",
  recorrente: "Recorrente",
};

const STRENGTH_LABEL: Readonly<Record<BusinessStrength, string>> = {
  comercial: "a tua veia comercial",
  digital: "o teu à-vontade digital",
  operacoes: "a tua capacidade de organizar e executar",
  cuidado: "o teu jeito para acompanhar pessoas",
  tecnico: "a tua resolução de problemas técnicos",
};

/** O rótulo curto que a interface oferece. Vive aqui, ao lado do resto. */
export const STRENGTH_CHIP: Readonly<Record<BusinessStrength, string>> = {
  comercial: "Vender e criar relações",
  digital: "Ferramentas digitais",
  operacoes: "Organizar e executar",
  cuidado: "Acompanhar pessoas",
  tecnico: "Resolver problemas técnicos",
};

const STRUCTURE_LABEL: Readonly<Record<Exclude<BusinessStructurePreference, "por-decidir">, string>> = {
  "recibos-verdes": "recibos verdes",
  empresa: "empresa",
};

export const STRUCTURE_CHIP: Readonly<Record<BusinessStructurePreference, string>> = {
  "recibos-verdes": "Recibos verdes",
  empresa: "Empresa",
  "por-decidir": "Ainda a decidir",
};

/** Junta com «e» antes do último, como se escreve em português. */
function enumerar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

// ═══════════════════════════════════════════════════════════════════════
//  O QUE O CATÁLOGO CONSEGUE SEPARAR
//  ---------------------------------------------------------------------
//  Derivado, nunca escrito à mão. Acrescentar uma hipótese que só faça
//  sentido em empresa liga a dimensão «estrutura» sozinha, e a interface
//  deixa de precisar de saber disto. Foi assim que se descobriu que duas
//  das seis perguntas do formulário não podiam alterar o resultado.
// ═══════════════════════════════════════════════════════════════════════

/** A assinatura de um template numa dimensão do fit. */
export function fitDimensionSignature(
  template: OpportunityTemplate,
  dimension: FitDimension,
): string {
  switch (dimension) {
    case "delivery":
      return [...template.delivery].sort().join("/");
    case "capital":
      return template.capital;
    case "recurrence":
      return template.recurrence;
    case "strengths":
      // A ORDEM conta, e por isso não se ordena aqui. `strengths` está
      // escrito por importância — a primeira é o que o trabalho pede
      // mesmo — e a repartição dos 25 pontos segue essa ordem. Duas
      // hipóteses com o mesmo conjunto por ordem diferente pontuam
      // diferente, logo são de facto distinguíveis.
      return template.strengths.join(">");
    case "structure":
      return [...template.structures].sort().join("/");
    case "region":
      return [...template.regions].sort().join("/");
  }
}

export const FIT_DIMENSIONS: readonly FitDimension[] = Object.freeze([
  "delivery",
  "capital",
  "recurrence",
  "strengths",
  "structure",
  "region",
] as const);

/** A assinatura completa. Dois templates com a mesma são o mesmo template. */
export function fitSignature(template: OpportunityTemplate): string {
  return FIT_DIMENSIONS.map((dimension) => fitDimensionSignature(template, dimension)).join("|");
}

/** Em quantas dimensões do fit dois templates discordam. */
export function fitSignatureDistance(
  left: OpportunityTemplate,
  right: OpportunityTemplate,
): number {
  return FIT_DIMENSIONS.filter(
    (dimension) =>
      fitDimensionSignature(left, dimension) !== fitDimensionSignature(right, dimension),
  ).length;
}

/**
 * Esta dimensão consegue, no catálogo atual, separar alguma coisa?
 *
 * Uma pergunta que não pode alterar o resultado não deve ser feita com o
 * mesmo peso visual das outras — e a correção não é manipular o score, é
 * a interface dizer para que serve a resposta.
 *
 * Memoizado por catálogo: `calculateOpportunityFit` chama-o seis vezes por
 * par (perfil, hipótese), e a auditoria percorre 25 920 perfis contra o
 * catálogo inteiro. Sem cache, uma pergunta barata passava a percorrer o
 * catálogo umas dezenas de milhões de vezes.
 */
const INERT_CACHE = new WeakMap<object, Map<FitDimension, boolean>>();

export function fitDimensionIsInert(
  dimension: FitDimension,
  catalogue: readonly OpportunityTemplate[] = OPPORTUNITY_TEMPLATES,
): boolean {
  const cache = INERT_CACHE.get(catalogue) ?? new Map<FitDimension, boolean>();
  INERT_CACHE.set(catalogue, cache);
  const guardado = cache.get(dimension);
  if (guardado !== undefined) return guardado;

  const inerte =
    new Set(catalogue.map((template) => fitDimensionSignature(template, dimension))).size <= 1;
  cache.set(dimension, inerte);
  return inerte;
}

/**
 * Competências que algum template do catálogo reconhece.
 *
 * A interface oferecia cinco e o catálogo usava quatro: «resolver
 * problemas técnicos» era um botão que não fazia absolutamente nada em
 * nenhum dos 25 920 perfis. Isto impede a recaída por construção — a
 * mesma disciplina que `templateHasLiveEvidence()` já aplica à evidência.
 */
export function strengthsUsedInCatalogue(
  catalogue: readonly OpportunityTemplate[] = OPPORTUNITY_TEMPLATES,
): ReadonlySet<BusinessStrength> {
  return new Set(catalogue.flatMap((template) => template.strengths));
}

// ═══════════════════════════════════════════════════════════════════════
//  O CÁLCULO
// ═══════════════════════════════════════════════════════════════════════

/**
 * Como se repartem os 25 pontos das competências, por ordem declarada.
 *
 * Somam sempre 25, e a primeira competência pesa mais do que a última —
 * porque o catálogo escreve `strengths` por importância e não por acaso.
 * O efeito lateral que interessa: a escala passa a ter muitos mais valores
 * distintos, e duas hipóteses que pedem as mesmas competências por ordem
 * diferente deixam de ser indistinguíveis.
 */
const STRENGTH_WEIGHTS: Readonly<Record<number, readonly number[]>> = Object.freeze({
  0: [],
  1: [25],
  2: [15, 10],
  3: [11, 8, 6],
  4: [9, 7, 5, 4],
  5: [7, 6, 5, 4, 3],
});

/** Compatibilidade pessoal, deliberadamente separada da evidência de mercado. */
export function calculateOpportunityFit(
  template: OpportunityTemplate,
  profile: BusinessDiscoveryProfile,
  catalogue: readonly OpportunityTemplate[] = OPPORTUNITY_TEMPLATES,
): OpportunityFit {
  const reasons: string[] = [];
  const tensions: string[] = [];
  const breakdown: FitContribution[] = [];

  const registar = (
    dimension: FitDimension,
    earned: number,
    max: number,
    note: string,
    matched: boolean,
  ) => {
    breakdown.push({
      dimension,
      earned,
      max,
      inert: fitDimensionIsInert(dimension, catalogue),
      note,
      matched,
    });
  };

  // ── Modo de trabalho ──────────────────────────────────────────────
  if (template.delivery.includes(profile.delivery)) {
    const nota = `Funciona em modelo ${DELIVERY_LABEL[profile.delivery]}.`;
    reasons.push(nota);
    registar("delivery", 20, 20, nota, true);
  } else {
    const nota = `O modelo pede trabalho ${template.delivery
      .map((item) => DELIVERY_LABEL[item])
      .join(" ou ")}, não ${DELIVERY_LABEL[profile.delivery]}.`;
    tensions.push(nota);
    registar("delivery", 0, 20, nota, false);
  }

  // ── Capital ───────────────────────────────────────────────────────
  if (CAPITAL_RANK[template.capital] <= CAPITAL_RANK[profile.capital]) {
    const nota = "Cabe na faixa de capital escolhida.";
    reasons.push(nota);
    registar("capital", 20, 20, nota, true);
  } else {
    const nota = `Pede tipicamente ${CAPITAL_LABEL[template.capital]} para arrancar — mais do que declaraste.`;
    tensions.push(nota);
    registar("capital", 0, 20, nota, false);
  }

  // ── Recorrência ───────────────────────────────────────────────────
  if (profile.recurrence === "indiferente" || profile.recurrence === template.recurrence) {
    const nota = `O modelo de receita é ${RECURRENCE_LABEL[template.recurrence]}.`;
    reasons.push(nota);
    registar("recurrence", 15, 15, nota, true);
  } else {
    const nota = `A receita tende a ser ${RECURRENCE_LABEL[template.recurrence]}.`;
    tensions.push(nota);
    registar("recurrence", 0, 15, nota, false);
  }

  // ── Competências ──────────────────────────────────────────────────
  //  Os 25 pontos repartem-se pelas competências que o template DECLARA,
  //  por ordem de importância. Duas correções de uma vez:
  //
  //   · o teto antigo — `min(25, n × 12,5)` — saturava aos dois acertos:
  //     acertar em três de três valia o mesmo que acertar em dois de três;
  //   · e tratava todas as competências como iguais, quando o catálogo já
  //     as escreve por ordem («este trabalho é sobretudo organizar; ser
  //     comercial ajuda»). Ignorar essa ordem deitava fora informação que
  //     já lá estava, e produzia empates onde havia diferença real.
  const matchingStrengths = template.strengths.filter((strength) =>
    profile.strengths.includes(strength),
  );
  const pesos = STRENGTH_WEIGHTS[template.strengths.length] ?? [];
  const strengthScore = template.strengths.reduce(
    (total, strength, indice) =>
      profile.strengths.includes(strength) ? total + (pesos[indice] ?? 0) : total,
    0,
  );
  if (matchingStrengths.length) {
    const nota = `Aproveita ${enumerar(matchingStrengths.map((item) => STRENGTH_LABEL[item]))}.`;
    reasons.push(nota);
    registar(
      "strengths",
      strengthScore,
      25,
      nota,
      matchingStrengths.length === template.strengths.length,
    );
  } else {
    const nota = `Pede sobretudo ${enumerar(
      template.strengths.map((item) => STRENGTH_LABEL[item]),
    )} — e isso não está no que selecionaste.`;
    tensions.push(nota);
    registar("strengths", 0, 25, nota, false);
  }

  // ── Estrutura ─────────────────────────────────────────────────────
  if (profile.structure === "por-decidir" || template.structures.includes(profile.structure)) {
    const nota =
      profile.structure === "por-decidir"
        ? "Pode ser testado antes de decidir a estrutura."
        : `Pode arrancar em ${STRUCTURE_LABEL[profile.structure]}.`;
    reasons.push(nota);
    registar("structure", 10, 10, nota, true);
  } else {
    const nota = `Este modelo pede ${enumerar(
      template.structures.map((item) => STRUCTURE_LABEL[item]),
    )}, e não ${STRUCTURE_LABEL[profile.structure]}.`;
    tensions.push(nota);
    registar("structure", 0, 10, nota, false);
  }

  // ── Zona ──────────────────────────────────────────────────────────
  //  A zona só pode PENALIZAR quando o modelo depende mesmo de estar
  //  noutro sítio. Não saber ainda onde testar não é uma
  //  incompatibilidade — e a falta de dados NOSSOS sobre uma região nunca
  //  foi razão para baixar a compatibilidade de ninguém.
  const nacional = template.regions.includes("portugal");
  if (nacional || profile.region === "portugal" || template.regions.includes(profile.region)) {
    const nota = nacional
      ? "O modelo pode ser investigado em qualquer zona do país."
      : profile.region === "portugal"
        ? `Depende de estar em ${enumerar(template.regions.map(marketRegionLabel))} — podes fixar a zona depois.`
        : `Funciona na zona escolhida (${marketRegionLabel(profile.region)}).`;
    reasons.push(nota);
    registar("region", 10, 10, nota, true);
  } else {
    const nota = `Este modelo depende de ${enumerar(
      template.regions.map(marketRegionLabel),
    )}, não de ${marketRegionLabel(profile.region)}.`;
    tensions.push(nota);
    registar("region", 0, 10, nota, false);
  }

  const rounded = Math.round(breakdown.reduce((total, item) => total + item.earned, 0));
  return {
    templateId: template.id,
    score: rounded,
    label: rounded >= 80 ? "forte" : rounded >= 55 ? "possivel" : "fraca",
    reasons,
    tensions,
    breakdown,
    formulaVersion: MARKET_FIT_FORMULA_VERSION,
  };
}

/**
 * Este piloto tem ingestão pública ativa, ou continua a ser só um plano?
 *
 * A interface precisa de saber para não prometer «a consultar…» sobre uma
 * fonte que ninguém está a consultar. Vem do `evidencePlan` curado e não de
 * uma lista de ids escrita à mão dentro de um componente — que foi
 * exatamente o que aqui existia.
 */
export function templateHasLiveEvidence(template: OpportunityTemplate): boolean {
  return template.evidencePlan.some((entry) => entry.status === "live");
}

export interface RankedOpportunity {
  template: OpportunityTemplate;
  fit: OpportunityFit;
  /** Posição PARTILHADA: dois scores iguais recebem o mesmo `rank`. */
  rank: number;
  /** Quantas hipóteses partilham este `rank`. 1 = posição exclusiva. */
  tiedWith: number;
}

/**
 * A ordem continua determinística — o desempate por título é conservado
 * para a lista não dançar entre renders. O que muda é que a posição deixa
 * de mentir: quatro hipóteses com o mesmo score são todas «1.ª», e o ecrã
 * passa a ter a informação para o dizer.
 *
 * O catálogo é injetável para a auditoria poder correr contra conjuntos
 * sintéticos sem monkey-patching de um módulo congelado.
 */
export function rankOpportunityTemplates(
  profile: BusinessDiscoveryProfile,
  catalogue: readonly OpportunityTemplate[] = OPPORTUNITY_TEMPLATES,
): readonly RankedOpportunity[] {
  const scored = catalogue
    .map((template) => ({ template, fit: calculateOpportunityFit(template, profile, catalogue) }))
    .sort(
      (left, right) =>
        right.fit.score - left.fit.score ||
        left.template.title.localeCompare(right.template.title, "pt-PT"),
    );

  const quantosPorScore = new Map<number, number>();
  for (const item of scored) {
    quantosPorScore.set(item.fit.score, (quantosPorScore.get(item.fit.score) ?? 0) + 1);
  }

  let rank = 0;
  let scoreAnterior: number | null = null;
  return scored.map((item, indice) => {
    if (item.fit.score !== scoreAnterior) {
      rank = indice + 1;
      scoreAnterior = item.fit.score;
    }
    return { ...item, rank, tiedWith: quantosPorScore.get(item.fit.score) ?? 1 };
  });
}

/**
 * O desempate por evidência — e porque NÃO é a ordem principal.
 *
 * A tentação era ordenar primeiro pelo estado do gate e só depois pelo
 * fit: «primeiro o que tem evidência, depois o que te encaixa». Numa
 * carteira em que todas as hipóteses têm séries ligadas, isso seria a
 * ordem certa. Neste catálogo, cinco das vinte e quatro têm ingestão
 * ativa — e ordenar por evidência fixaria essas cinco no topo para toda a
 * gente, independentemente do que a pessoa responder. Seria recriar,
 * dentro de um catálogo maior, exatamente o defeito que ele veio corrigir.
 *
 * Por isso a evidência entra onde é inequivocamente melhor do que a
 * alternativa: a desfazer empates. Um terço dos perfis produz empate no
 * primeiro lugar, e desfazê-lo por ordem alfabética do título é a única
 * escolha pior do que desfazê-lo por quem tem números publicados.
 *
 * Somar as duas coisas num «score mágico» continua fora de questão: fit é
 * preferência declarada, evidência é observação externa, e um número
 * único apagaria a distinção que é a tese inteira da ferramenta.
 *
 * O estado do gate só existe no browser (depende da zona, do preço e das
 * provas locais), por isso entra como argumento em vez de ser lido aqui.
 */
const EVIDENCE_ORDER: Readonly<Record<MarketOpportunityState, number>> = {
  contradicted: 0,
  template: 1,
  stale: 2,
  signal_detected: 3,
  candidate: 4,
  evidence_qualified: 5,
  user_validated: 6,
  operating: 7,
};

export function breakTiesWithEvidence(
  ranked: readonly RankedOpportunity[],
  stateOf: (templateId: string) => MarketOpportunityState | undefined,
): readonly RankedOpportunity[] {
  return [...ranked].sort((left, right) => {
    if (left.fit.score !== right.fit.score) return right.fit.score - left.fit.score;
    const esquerda = EVIDENCE_ORDER[stateOf(left.template.id) ?? "template"];
    const direita = EVIDENCE_ORDER[stateOf(right.template.id) ?? "template"];
    return (
      direita - esquerda || left.template.title.localeCompare(right.template.title, "pt-PT")
    );
  });
}
