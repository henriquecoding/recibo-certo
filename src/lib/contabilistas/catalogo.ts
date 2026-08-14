// Listas fixas usadas no perfil e no diretório.
//
// Os distritos são os 18 do continente mais as duas regiões autónomas — a
// mesma divisão que `profissionais-regioes.ts` já usa no mapa de preços, para
// os dois falarem a mesma língua.

export const DISTRITOS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", "Évora",
  "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", "Porto", "Santarém",
  "Setúbal", "Viana do Castelo", "Vila Real", "Viseu",
  "Região Autónoma dos Açores", "Região Autónoma da Madeira",
] as const;

/**
 * Áreas de trabalho. Deliberadamente curta: uma lista de trinta itens não
 * ajuda ninguém a escolher, e cada item novo é mais uma coisa a manter
 * coerente com os clusters de decisão (`src/lib/clusters.ts`).
 */
export const ESPECIALIDADES = [
  "Recibos verdes",
  "IRS",
  "IVA",
  "Contabilidade organizada",
  "Abertura de atividade",
  "Sociedades e IRC",
  "Trabalhadores e salários",
  "Clientes internacionais",
  "Heranças e sucessões",
  "Dívidas e execuções",
] as const;

export type Especialidade = (typeof ESPECIALIDADES)[number];
