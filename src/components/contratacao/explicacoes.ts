// ═══════════════════════════════════════════════════════════════════════
//  EXPLICAÇÕES LABORAIS DO PLANEADOR
//  ---------------------------------------------------------------------
//  ┌──────────────────────────────────────────────────────────────────┐
//  │ PORQUE É QUE UMA DICA DE UMA LINHA NÃO CHEGA                      │
//  │                                                                  │
//  │ O campo das horas de formação dizia «Mínimo legal de 40 horas.    │
//  │ Reduzem capacidade mesmo sem custo externo.» É verdade e é        │
//  │ inútil para quem nunca contratou ninguém: não diz de onde vem o   │
//  │ número, não diz o que acontece a quem não dá formação nenhuma —   │
//  │ e há muita empresa que nunca deu — nem diz quem está de fora.     │
//  │ Quem lê fica a achar que é uma recomendação simpática que se      │
//  │ pode ignorar sem consequência. Não é.                             │
//  │                                                                  │
//  │ Uma explicação neste planeador responde SEMPRE às mesmas três     │
//  │ perguntas, por esta ordem, e o tipo não deixa faltar nenhuma:     │
//  │                                                                  │
//  │   1. `regra`          — o que a lei exige, em português comum.    │
//  │   2. `seNaoCumprires` — o que acontece a quem não cumpre. É a     │
//  │                         que faltava em todo o lado, e é a única   │
//  │                         que transforma uma regra numa decisão.     │
//  │   3. `aQuemSeAplica`  — o âmbito, incluindo quem fica de fora.    │
//  │                         «Nenhuma empresa está isenta» é uma       │
//  │                         resposta legítima — e é a verdadeira      │
//  │                         para a formação contínua.                  │
//  │                                                                  │
//  │ É o mesmo contrato do `ToggleCard` do simulador guiado de         │
//  │ recibos verdes: regra em linguagem de quem não é jurista, artigo  │
//  │ citado, e a consequência dita em dinheiro ou em risco concreto.   │
//  └──────────────────────────────────────────────────────────────────┘
//
//  ⚠️ NADA AQUI É ESCRITO DE MEMÓRIA. Cada entrada aponta para citações
//  que o catálogo do motor (`ReciboCerto-Fiscal-Engine/src/legal`) tem de
//  saber resolver — o teste `contratacao-explicacoes.test.ts` falha se uma
//  citação não existir, e a ligação para o Diário da República é montada a
//  partir da citação, nunca escrita à mão. Antes de mexer numa frase,
//  confirma o artigo na fonte.
// ═══════════════════════════════════════════════════════════════════════

import type { CustoId } from "./estado";

export interface ExplicacaoLaboral {
  id: string;
  /** Título da secção que abre. Uma pergunta ou um facto, nunca um rótulo. */
  titulo: string;
  /** O que a lei exige, em linguagem de quem nunca contratou ninguém. */
  regra: string;
  /** O que acontece a quem não cumpre. Sem isto, a regra é decorativa. */
  seNaoCumprires: string;
  /** O âmbito — e, explicitamente, quem está de fora. */
  aQuemSeAplica: string;
  /** Citações a resolver no catálogo do motor. Nunca URLs à mão. */
  citacoes: readonly string[];
}

/**
 * Formação contínua.
 *
 * Fontes confirmadas a 2026-09-01, artigo a artigo:
 * · CT, art. 131.º, n.º 2  — 40 h anuais; a termo ≥ 3 meses, proporcional.
 * · CT, art. 131.º, n.º 5  — pelo menos 10% dos trabalhadores por ano.
 * · CT, art. 131.º, n.º 10 — contra-ordenação GRAVE (n.ºs 1, 2 ou 5).
 * · CT, art. 132.º, n.º 1  — horas não dadas em dois anos → crédito de horas.
 * · CT, art. 132.º, n.º 2  — o crédito é pago e conta como tempo de serviço.
 * · CT, art. 134.º         — na cessação, as horas por dar pagam-se em dinheiro.
 */
const FORMACAO_CONTINUA: ExplicacaoLaboral = {
  id: "formacao-continua",
  titulo: "As 40 horas de formação por ano",
  regra:
    "Cada trabalhador tem direito, em cada ano, a um mínimo de 40 horas de formação contínua. "
    + "Não é uma boa prática recomendada: é um direito individual dele e um dever teu. Essas horas "
    + "são tempo de trabalho pago, e é por isso que aparecem aqui a reduzir a capacidade do posto "
    + "mesmo quando a formação não tem fatura nenhuma — a pessoa está a ser paga e não está a produzir.",
  seNaoCumprires:
    "Não dar formação não poupa o custo: adia-o e transforma-o numa dívida com juros de tempo. "
    + "As horas que não deres até ao fim dos dois anos seguintes convertem-se em crédito de horas do "
    + "trabalhador — ele decide quando as usa, avisando-te com dez dias, e esse tempo é pago e conta "
    + "como serviço efetivo. E quando o contrato acabar, seja por que motivo for, tens de lhe pagar em "
    + "dinheiro a retribuição das horas de formação que ficaram por dar. Somam-se anos: três pessoas "
    + "com dois anos de formação em atraso são 240 horas para pagar à saída. Por cima disto, não "
    + "assegurar a formação é contra-ordenação grave.",
  aQuemSeAplica:
    "A todas as empresas, seja qual for a dimensão. Não há isenção por seres pequeno, por seres "
    + "recente, nem por nunca teres dado formação a ninguém — a antiguidade do incumprimento não o "
    + "legaliza. O que muda é a contagem: num contrato a termo de três meses ou mais as horas são "
    + "proporcionais à duração do contrato nesse ano, e abaixo de três meses a lei não fixa mínimo "
    + "anual. Há ainda um dever separado, ao nível da empresa e não da pessoa: em cada ano, pelo menos "
    + "10% dos teus trabalhadores têm de receber formação contínua.",
  citacoes: [
    "pt.dr.codigo-trabalho.artigo-131",
    "pt.dr.codigo-trabalho.artigo-132",
    "pt.dr.codigo-trabalho.artigo-134",
  ],
};

/**
 * Seguro de acidentes de trabalho.
 *
 * Fontes confirmadas a 2026-09-01:
 * · Lei n.º 98/2009, art. 79.º, n.º 1 — dever de transferir para seguradora.
 * · Lei n.º 98/2009, art. 79.º, n.º 2 — abrange quem cede trabalhadores.
 * · Lei n.º 98/2009, art. 79.º, n.º 4 — retribuição declarada a menos: a
 *   seguradora só responde por ela (nunca abaixo da retribuição mínima).
 * · Lei n.º 98/2009, art. 79.º, n.º 5 — o empregador responde pela diferença
 *   nas indemnizações, pensões e despesas de hospitalização e assistência.
 */
const SEGURO_ACIDENTES: ExplicacaoLaboral = {
  id: "seguro-acidentes-trabalho",
  titulo: "Porque é que o seguro impede a conclusão",
  regra:
    "Tens de transferir para uma seguradora autorizada a responsabilidade pela reparação de acidentes "
    + "de trabalho. Não é um seguro de proteção da empresa que se compra se sobrar orçamento: é a "
    + "forma que a lei impõe para garantir que a pessoa é indemnizada se algo lhe acontecer ao serviço.",
  seNaoCumprires:
    "A cobertura vale exatamente pela retribuição que declaraste à seguradora. Se declarares menos do "
    + "que pagas na realidade — o caso comum de quem declara só o vencimento base e esquece o resto —, "
    + "a seguradora responde apenas por esse valor mais baixo, e és tu que respondes pela diferença: "
    + "nas indemnizações por incapacidade, nas pensões e nas despesas de hospitalização e assistência "
    + "clínica. O risco não desaparece por não estar segurado; muda de dono, e passa a estar no "
    + "balanço da empresa.",
  aQuemSeAplica:
    "A qualquer empregador, incluindo quem contrata pessoas para prestarem trabalho noutras empresas. "
    + "O prémio depende da atividade, do risco do posto e da seguradora, e é por isso que este "
    + "planeador não o inventa: pede-te o valor e recusa-se a concluir sem ele, porque um seguro "
    + "esquecido é a diferença entre um custo anual credível e um que não conta a parte cara.",
  citacoes: ["pt.dr.lei-98-2009.artigo-79"],
};

/**
 * Férias.
 *
 * Fontes confirmadas a 2026-09-01:
 * · CT, art. 237.º — direito a férias.
 * · CT, art. 238.º — 22 dias úteis por ano.
 * · CT, art. 246.º, n.º 1 — obstar culposamente ao gozo: compensação do
 *   TRIPLO da retribuição do período em falta, e as férias continuam a ter
 *   de ser gozadas até 30 de abril do ano seguinte.
 * · CT, art. 246.º, n.º 2 — contra-ordenação grave.
 */
const FERIAS: ExplicacaoLaboral = {
  id: "ferias",
  titulo: "O direito a férias e o que custa negá-lo",
  regra:
    "O trabalhador tem direito a 22 dias úteis de férias por ano, pagos. O mês que indicares aqui "
    + "decide duas coisas na conta: quando é que o posto deixa de estar disponível, e em que mês sai "
    + "o subsídio de férias — que a lei manda pagar antes do gozo, e não no fim do ano.",
  seNaoCumprires:
    "Se impedires culposamente o gozo das férias — e «aqui ninguém tira férias» é isso mesmo —, a "
    + "pessoa tem direito a uma compensação no valor do TRIPLO da retribuição do período em falta, e "
    + "continua a poder gozar essas férias até 30 de abril do ano seguinte. Ou seja: pagas três vezes "
    + "e ainda ficas sem o trabalho. É também contra-ordenação grave.",
  aQuemSeAplica:
    "A todos os contratos, sem mínimo de dimensão da empresa. No ano de admissão a contagem é "
    + "diferente da dos anos seguintes, e é por isso que o planeador te pede a data de entrada em vez "
    + "de assumir um ano civil inteiro.",
  citacoes: [
    "pt.dr.codigo-trabalho.artigo-237",
    "pt.dr.codigo-trabalho.artigo-238",
    "pt.dr.codigo-trabalho.artigo-246",
  ],
};

export const EXPLICACOES: readonly ExplicacaoLaboral[] = Object.freeze([
  FORMACAO_CONTINUA,
  SEGURO_ACIDENTES,
  FERIAS,
]);

export function explicacaoPorId(id: string): ExplicacaoLaboral | undefined {
  return EXPLICACOES.find((item) => item.id === id);
}

/**
 * Que custo do posto tem explicação própria.
 *
 * `Partial` de propósito: a maioria dos custos é uma decisão de gestão sem
 * regra legal por trás (software, deslocações), e inventar-lhes uma «regra» só
 * para preencher a grelha seria o contrário do que este ficheiro existe para
 * fazer. Só entra aqui o que a lei manda mesmo.
 */
export const EXPLICACAO_POR_CUSTO: Partial<Record<CustoId, ExplicacaoLaboral>> = {
  accidentInsurance: SEGURO_ACIDENTES,
  // `training` NÃO entra aqui. O cartão de custo trata da FATURA do
  // fornecedor; as 40 horas são tempo, e a explicação vive ao lado do campo
  // das horas, na etapa da capacidade. Repetida nos dois sítios, a mesma
  // explicação passava a parecer duas regras diferentes.
};
