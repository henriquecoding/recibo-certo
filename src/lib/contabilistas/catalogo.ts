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

/**
 * OS NOMES DOS PARÂMETROS DO DIRETÓRIO, num sítio só.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE VIVEM AQUI E JÁ NÃO EM `diretorio.ts`                         │
 * │                                                                     │
 * │ Mudar um destes muda links que já foram partilhados — por isso       │
 * │ sempre estiveram num sítio só, à vista. O que mudou foi QUEM         │
 * │ precisa deles: a pesquisa global reconhece «contabilista no Porto    │
 * │ para IVA» e tem de construir o endereço do diretório com filtros     │
 * │ estruturados.                                                       │
 * │                                                                     │
 * │ `diretorio.ts` importa o cliente Supabase. Se a pesquisa fosse lá    │
 * │ buscar os nomes dos parâmetros, levava o SDK inteiro para o chunk    │
 * │ do painel — o mesmo defeito de grafo que o ponto P1-02 corrigiu no   │
 * │ cabeçalho, repetido uma camada abaixo. Este ficheiro não importa     │
 * │ nada, e é essa a razão de ser dele.                                 │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export const PARAMS = {
  procura: "q",
  distrito: "distrito",
  especialidade: "especialidade",
  modalidade: "modalidade",
  idioma: "idioma",
  vagas: "vagas",
  occ: "occ",
  linkedin: "linkedin",
  ordem: "ordem",
  pagina: "pagina",
} as const;
