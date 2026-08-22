// ═══════════════════════════════════════════════════════════════════════
//  SEEDS — os 24 dossiers curados, agora como referência e não como universo
//  ---------------------------------------------------------------------
//  O pedido é explícito: as oportunidades pré-existentes podem continuar a
//  existir, mas não como universo finito de respostas. Aqui elas passam a
//  ser três coisas úteis e deixam de ser o teto:
//
//   1. **Copy de referência.** Quando o gerador compõe um candidato que
//      coincide com um dossier curado, herda o texto — que é melhor do que
//      qualquer título composto, porque foi escrito por uma pessoa.
//   2. **Ponte para a evidência.** Cinco dos dossiers têm piloto com
//      ingestão ativa. É por esta tabela que um candidato gerado chega às
//      séries reais do INE, do Eurostat e do Portal BASE.
//   3. **Benchmark.** Um candidato gerado que caia perto de um dossier
//      curado pode ser comparado com ele — e é assim que se percebe se o
//      gerador está a produzir coisas plausíveis.
//
//  O que NÃO acontece: o gerador não está limitado a estes pares. A maior
//  parte dos candidatos que produz não tem seed nenhum, e é esse o ponto.
// ═══════════════════════════════════════════════════════════════════════

import { OPPORTUNITY_TEMPLATES, type OpportunityTemplate } from "@/lib/negocio/market/opportunities";

export interface SeedCurado {
  /** O id do dossier em `catalogo-oportunidades.ts`. */
  templateId: string;
  problemaId: string;
  modeloId: string;
  /** Rótulo curto do público, quando o dossier é mais específico do que o problema. */
  nota?: string;
}

/**
 * O mapa curado → (problema, modelo).
 *
 * Escrito à mão de propósito: é uma afirmação editorial sobre o que cada
 * dossier ataca, e derivá-la automaticamente seria adivinhar. O teste de
 * integridade obriga a que os ids dos dois lados existam.
 */
export const SEEDS: readonly SeedCurado[] = Object.freeze([
  { templateId: "tourism-guest-operations", problemaId: "picos-operacionais-alojamento", modeloId: "avenca" },
  { templateId: "local-experience-host", problemaId: "visitante-sem-programa", modeloId: "hora" },
  { templateId: "wine-estate-operations", problemaId: "produtor-sem-lado-comercial", modeloId: "avenca" },
  { templateId: "sme-digital-operations", problemaId: "processos-dispersos-micro", modeloId: "projeto" },
  { templateId: "public-tender-support", problemaId: "pme-fora-dos-concursos", modeloId: "avenca" },
  { templateId: "b2b-lead-research", problemaId: "equipa-comercial-sem-lista", modeloId: "avenca" },
  { templateId: "retail-online-launch", problemaId: "comercio-local-sem-canal", modeloId: "loja-online" },
  { templateId: "hospitality-staffing-team", problemaId: "reforco-imprevisivel-hotelaria", modeloId: "equipa-operacional" },
  { templateId: "senior-digital-concierge", problemaId: "barreira-digital-idosos", modeloId: "hora" },
  { templateId: "child-activities-programme", problemaId: "horas-entre-escola-e-trabalho", modeloId: "espaco-proprio" },
  { templateId: "petcare-route", problemaId: "animal-sozinho-o-dia-todo", modeloId: "avenca" },
  { templateId: "language-tutoring-remote", problemaId: "lingua-para-o-trabalho", modeloId: "hora" },
  { templateId: "home-transition-operations", problemaId: "transicao-de-casa", modeloId: "projeto" },
  { templateId: "home-tech-install", problemaId: "equipamento-comprado-por-configurar", modeloId: "projeto" },
  { templateId: "small-works-coordination", problemaId: "orcamentos-de-obra-incomparaveis", modeloId: "intermediacao" },
  { templateId: "energy-efficiency-check", problemaId: "casa-cara-de-aquecer", modeloId: "projeto" },
  { templateId: "device-repair-bench", problemaId: "equipamento-fora-de-garantia", modeloId: "projeto" },
  { templateId: "ev-charging-install", problemaId: "carregamento-eletrico-por-resolver", modeloId: "projeto" },
  { templateId: "industrial-maintenance-relief", problemaId: "manutencao-so-quando-para", modeloId: "contrato-anual" },
  { templateId: "niche-content-operations", problemaId: "conhecimento-sem-rotina-de-publicacao", modeloId: "avenca" },
  { templateId: "data-cleanup-migration", problemaId: "sistemas-a-mudar-sem-dados", modeloId: "projeto" },
  { templateId: "island-remote-backoffice", problemaId: "processos-dispersos-micro", modeloId: "avenca", nota: "Negócios das ilhas" },
  { templateId: "rural-proximity-services", problemaId: "distancia-aos-servicos", modeloId: "avenca" },
  { templateId: "local-food-production", problemaId: "prateleira-local-sem-produto-com-origem", modeloId: "producao-propria" },
] as const);

const TEMPLATE_POR_ID = new Map(OPPORTUNITY_TEMPLATES.map((item) => [item.id, item]));

/** A chave de composição: um par (problema, modelo) identifica um candidato. */
export const chaveSeed = (problemaId: string, modeloId: string) => `${problemaId}::${modeloId}`;

const POR_CHAVE = new Map<string, SeedCurado>();
for (const seed of SEEDS) {
  // O primeiro seed de cada par ganha. Dois dossiers curados podem atacar
  // o mesmo problema com o mesmo modelo em zonas diferentes — o das ilhas
  // e o das microempresas são o caso — e a copy do primeiro é a genérica.
  if (!POR_CHAVE.has(chaveSeed(seed.problemaId, seed.modeloId))) {
    POR_CHAVE.set(chaveSeed(seed.problemaId, seed.modeloId), seed);
  }
}

export interface ReferenciaCurada {
  seed: SeedCurado;
  template: OpportunityTemplate;
}

/** O dossier curado para este par, quando existe. Quase sempre não existe. */
export function referenciaCurada(problemaId: string, modeloId: string): ReferenciaCurada | undefined {
  const seed = POR_CHAVE.get(chaveSeed(problemaId, modeloId));
  if (!seed) return undefined;
  const template = TEMPLATE_POR_ID.get(seed.templateId);
  return template ? { seed, template } : undefined;
}

/** Todos os dossiers curados que atacam este problema, em qualquer modelo. */
export function curadosDoProblema(problemaId: string): readonly ReferenciaCurada[] {
  return SEEDS.filter((seed) => seed.problemaId === problemaId)
    .map((seed) => {
      const template = TEMPLATE_POR_ID.get(seed.templateId);
      return template ? { seed, template } : undefined;
    })
    .filter((item): item is ReferenciaCurada => item !== undefined);
}

export function verificarSeeds(): readonly string[] {
  const erros: string[] = [];
  for (const seed of SEEDS) {
    if (!TEMPLATE_POR_ID.has(seed.templateId)) {
      erros.push(`seed ${seed.templateId}: não existe no catálogo curado`);
    }
  }
  // Todo o dossier curado tem de estar mapeado: um que fique de fora perde
  // a ligação à evidência que já tem ligada, sem aviso nenhum.
  for (const template of OPPORTUNITY_TEMPLATES) {
    if (!SEEDS.some((seed) => seed.templateId === template.id)) {
      erros.push(`catálogo ${template.id}: sem seed que o ligue a um problema`);
    }
  }
  return erros;
}
