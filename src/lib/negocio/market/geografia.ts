// ═══════════════════════════════════════════════════════════════════════
//  GEOGRAFIA — que observação serve a zona de quem está a decidir
//  ---------------------------------------------------------------------
//  Havia aqui um erro caro de confundir DUAS coisas diferentes:
//
//    · onde o modelo de negócio pode funcionar;
//    · onde nós, por acaso, já tínhamos dados.
//
//  A primeira versão só reconhecia Grande Lisboa e Península de Setúbal, e
//  quem escolhia «outra zona» via «falta sinal na tua zona» — apesar de a
//  fonte oficial estar, nesse mesmo instante, a devolver o valor nacional e
//  o de todas as NUTS II do país. Um número publicável era descartado e a
//  pessoa era informada do contrário.
//
//  Este módulo separa as duas ideias e fica com uma regra explícita:
//
//    · uma observação NACIONAL é contexto legítimo para qualquer zona —
//      não é um sinal local, e nunca deve ser apresentada como tal;
//    · uma observação REGIONAL só serve a sua própria região;
//    · a região da pessoa nunca sai do browser: é escolhida de uma lista
//      de NUTS II, não de uma morada.
// ═══════════════════════════════════════════════════════════════════════

import type { GeographyRef } from "./tipos";

/**
 * As NUTS II de Portugal na nomenclatura de 2024, mais uma entrada para
 * quem ainda não fixou zona. Uma lista fechada é deliberada: chega para
 * escolher onde testar e evita recolher morada, código postal ou GPS.
 */
export type MarketRegion =
  | "norte"
  | "centro"
  | "oeste-vale-tejo"
  | "grande-lisboa"
  | "peninsula-setubal"
  | "alentejo"
  | "algarve"
  | "acores"
  | "madeira"
  | "portugal";

export interface MarketRegionDefinition {
  id: MarketRegion;
  label: string;
  /** Código NUTS 2024 publicado pelo INE; `null` para «todo o país». */
  nutsCode: string | null;
}

export const MARKET_REGIONS: readonly MarketRegionDefinition[] = Object.freeze([
  { id: "norte", label: "Norte", nutsCode: "11" },
  { id: "centro", label: "Centro", nutsCode: "19" },
  { id: "oeste-vale-tejo", label: "Oeste e Vale do Tejo", nutsCode: "1D" },
  { id: "grande-lisboa", label: "Grande Lisboa", nutsCode: "1A" },
  { id: "peninsula-setubal", label: "Península de Setúbal", nutsCode: "1B" },
  { id: "alentejo", label: "Alentejo", nutsCode: "1C" },
  { id: "algarve", label: "Algarve", nutsCode: "15" },
  { id: "acores", label: "Açores", nutsCode: "20" },
  { id: "madeira", label: "Madeira", nutsCode: "30" },
  { id: "portugal", label: "Ainda não sei / todo o país", nutsCode: null },
] as const);

const BY_ID = new Map(MARKET_REGIONS.map((region) => [region.id, region]));

export function marketRegion(id: string): MarketRegionDefinition | undefined {
  return BY_ID.get(id as MarketRegion);
}

export function marketRegionLabel(id: MarketRegion): string {
  return BY_ID.get(id)?.label ?? id;
}

/**
 * Como uma observação se relaciona com a zona escolhida.
 *
 *  · `local`    — é a região da pessoa;
 *  · `nacional` — é o país inteiro: serve de contexto, não de sinal local;
 *  · `outra`    — é outra região, e não se transfere para esta.
 */
export type MarketGeographyMatch = "local" | "nacional" | "outra";

export function classifyObservationGeography(
  geography: Pick<GeographyRef, "level" | "code">,
  region: MarketRegion,
): MarketGeographyMatch {
  if (geography.level === "country") return "nacional";

  const nutsCode = BY_ID.get(region)?.nutsCode ?? null;
  // Sem zona fixada, uma observação regional continua a ser de outra
  // região: contar todas como «locais» inventaria uma cobertura que a
  // pessoa não escolheu.
  if (nutsCode === null) return "outra";
  return geography.code === nutsCode ? "local" : "outra";
}

/** Uma observação é utilizável na zona quando é local ou nacional. */
export function observationServesRegion(
  geography: Pick<GeographyRef, "level" | "code">,
  region: MarketRegion,
): boolean {
  return classifyObservationGeography(geography, region) !== "outra";
}

export interface RegionObservationSplit<T> {
  local: readonly T[];
  nacional: readonly T[];
  outras: readonly T[];
}

/**
 * Reparte as observações pelo papel que têm para esta zona, preservando a
 * ordem de entrada. Nada é descartado em silêncio: o que sobra fica em
 * `outras` e a interface pode dizer que existe, sem o apresentar como se
 * fosse da zona da pessoa.
 */
export function splitObservationsByRegion<T extends { geography: Pick<GeographyRef, "level" | "code"> }>(
  observations: readonly T[],
  region: MarketRegion,
): RegionObservationSplit<T> {
  const local: T[] = [];
  const nacional: T[] = [];
  const outras: T[] = [];
  for (const observation of observations) {
    const match = classifyObservationGeography(observation.geography, region);
    if (match === "local") local.push(observation);
    else if (match === "nacional") nacional.push(observation);
    else outras.push(observation);
  }
  return { local, nacional, outras };
}
