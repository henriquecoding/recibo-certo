// Dimensionamento de mercado — bottom-up, com fonte e data em cada entrada.
//
// ── O que estava errado ────────────────────────────────────────────────────
// A página dizia "1,3 milhões de empresas · 97% micro e pequenas" e chamava
// TAM/SAM/SOM a três contagens de entidades. Quatro problemas de uma vez:
//
//  1. o número não tinha fonte, ano nem definição de universo. O INE registou
//     1 526 926 empresas ativas em 2023; a ficha europeia de PME estimou
//     1 104 691 PME no setor não financeiro em 2024. São universos diferentes
//     e nenhum é "1,3 milhões";
//  2. os 97% não batem com essa ficha, onde micro são 95,5% e pequenas 3,8% —
//     99,3% somadas;
//  3. TAM/SAM/SOM eram contagens, não valor. Faltava o preço e a adoção;
//  4. o beachhead do produto NÃO são empresas: são pessoas que emitem recibos
//     verdes. Usar o universo das empresas inflaciona o mercado e descreve
//     mal o cliente.
//
// ── O que está aqui ────────────────────────────────────────────────────────
// O universo é o dos trabalhadores por conta própria, que é quem o produto
// serve hoje. O preço é o preço real do Plus. As duas taxas são objetivos
// declarados COMO objetivos, com o raciocínio à vista. Nada disto é tração.

import { marketSizing, sensibilidadePreco, type EntradaMercado } from "../_lib/market-sizing";

export interface FonteMercado {
  id: string;
  titulo: string;
  entidade: string;
  url: string;
  /** Ano ou data a que o dado respeita. */
  referencia: string;
}

export const FONTES: Record<string, FonteMercado> = {
  pordata_cpropria: {
    id: "pordata_cpropria",
    titulo: "Trabalhadores por conta própria",
    entidade: "INE / PORDATA",
    url: "https://www.pordata.pt/portugal/trabalhadores%2Bpor%2Bconta%2Bpropria%2Btotal%2Be%2Bpor%2Bnivel%2Bde%2Bescolaridade%2Bcompleto-1387-11495",
    referencia: "2025",
  },
  ine_empresas: {
    id: "ine_empresas",
    titulo: "Empresas ativas em Portugal",
    entidade: "INE — demografia das empresas",
    url: "https://www.ine.pt/ngt_server/attachfileu.jsp?att_display=n&att_download=y&look_parentBoui=710672025",
    referencia: "2023",
  },
  ce_pme: {
    id: "ce_pme",
    titulo: "SME Fact Sheet Portugal",
    entidade: "Comissão Europeia",
    url: "https://webgate.ec.europa.eu/circabc-ewpp/d/d/workspace/SpacesStore/e5ec33da-694a-459a-94a5-122cee7ac76e/download",
    referencia: "2025 (dados de 2024)",
  },
};

/**
 * Números publicados pelas fontes, tal como elas os publicam. Ficam aqui em
 * vez de dentro do texto para que a página não possa citar um valor que a
 * fonte não diz.
 */
export const UNIVERSOS = {
  trabalhadoresContaPropria: {
    valor: 773_000,
    fonte: FONTES.pordata_cpropria,
    definicao:
      "Pessoas com trabalho por conta própria (isoladas e empregadoras) em Portugal. Inclui perfis que não emitem recibos verdes, pelo que é um limite superior do beachhead, não uma contagem de clientes potenciais.",
  },
  empresasAtivas: {
    valor: 1_526_926,
    fonte: FONTES.ine_empresas,
    definicao: "Empresas ativas em Portugal, contagem do INE para 2023.",
  },
  pmeSetorNaoFinanceiro: {
    valor: 1_104_691,
    fonte: FONTES.ce_pme,
    definicao:
      "PME do setor empresarial não financeiro, estimativa da ficha europeia. Universo diferente do do INE — não são intermutáveis.",
  },
} as const;

/**
 * Estrutura empresarial, tal como a ficha europeia a reporta. A página
 * anterior dizia "97% micro e pequenas"; o valor correto, nessa fonte, é
 * 95,5% + 3,8% = 99,3%.
 */
export const ESTRUTURA_PME = {
  micro: 95.5,
  pequenas: 3.8,
  medias: 0.6,
  grandes: 0.1,
  fonte: FONTES.ce_pme,
} as const;

/** Preço real do Plus hoje. Não é um pressuposto: está na página de preços. */
export const PRECO_PLUS_MENSAL = 1.99;

/**
 * As duas taxas do funil. São OBJETIVOS declarados, não observações — e é por
 * isso que a página as marca como meta e nunca como tração.
 */
export const PRESSUPOSTOS = {
  fatiaServivel: 0.25,
  fatiaServivelPorque:
    "Fração do universo que o produto atual serve de facto: quem tem rendimento independente recorrente, usa canais digitais e enfrenta decisões de IRS/IVA/SS ao longo do ano. É uma estimativa nossa, não uma observação.",
  fatiaAlcancavel5a: 0.05,
  fatiaAlcancavelPorque:
    "Ambição a cinco anos sobre o mercado servível, assumindo aquisição maioritariamente orgânica. É uma meta, não uma projeção validada.",
} as const;

const ENTRADA: EntradaMercado = {
  clientesElegiveis: UNIVERSOS.trabalhadoresContaPropria.valor,
  arpaMensalEur: PRECO_PLUS_MENSAL,
  fatiaServivel: PRESSUPOSTOS.fatiaServivel,
  fatiaAlcancavel5a: PRESSUPOSTOS.fatiaAlcancavel5a,
};

export const MERCADO = marketSizing(ENTRADA);

/** O preço é o pressuposto que mais move o resultado — daí os três cenários. */
export const SENSIBILIDADE = sensibilidadePreco(ENTRADA, [1.99, 4.99, 9.99]);

export const ENTRADA_MERCADO = ENTRADA;
