// O conteúdo da página de investidores, tipado e verificado no build.
//
// Tudo o que é afirmação passa pelo inventário abaixo, com estado declarado.
// `assertAfirmacoes` corre ao importar e faz o build falhar se alguma coisa
// futura for escrita como presente, ou se ficar um marcador por preencher.

import {
  assertAfirmacoes,
  assertSemMarcadores,
  type Afirmacao,
} from "../_lib/evidence";
import { PRECO_PLUS_MENSAL } from "./market";

/* ══════════════════════════════════════════════════════════════════════════
   1 · TESE
   ─────────────────────────────────────────────────────────────────────────
   A auditoria encontrou duas empresas dentro do mesmo pitch: uma camada de
   decisão que encaminha para parceiros, e uma fintech full-stack regulada que
   emite faturas, processa pagamentos e concede crédito — a competir com os
   mesmos parceiros.

   Escolheu-se a primeira, e não por preferência estética: é a que o
   repositório já descreve. O Plus custa 1,99 €/mês, a FIZ é tratada como
   parceiro de execução com ligação de afiliado, e não existe no código nada
   de faturação certificada, pagamentos ou crédito. Escrever a segunda tese
   seria descrever uma empresa que não existe.
   ══════════════════════════════════════════════════════════════════════════ */

export const TESE =
  "O ReciboCerto é a camada de decisão fiscal para quem trabalha em Portugal: " +
  "transforma regras de IRS, IVA e Segurança Social em números claros, antecipa " +
  "obrigações e liga o utilizador à execução certificada quando chega a altura de agir.";

export const SUBTESE =
  "Conquistamos o utilizador antes da obrigação, acompanhamo-lo ao longo do ano e " +
  "encaminhamo-lo para quem executa. Monetizamos software premium e parcerias — " +
  "não faturação regulada nem pagamentos.";

/* ══════════════════════════════════════════════════════════════════════════
   2 · INVENTÁRIO DE AFIRMAÇÕES
   ══════════════════════════════════════════════════════════════════════════ */

export const AFIRMACOES: Afirmacao[] = [
  {
    id: "motor",
    texto:
      "Os simuladores de recibos verdes, salário, empresa e IRS anual calculam com parâmetros que têm norma, fonte oficial e data de verificação.",
    estado: "live",
    verificacao: "Abrir /estado-dos-dados e /metodologia — cada parâmetro traz a base legal e a data.",
    urlFonte: "/estado-dos-dados",
  },
  {
    id: "gratis",
    texto: "Calcular, simular e ler os guias é gratuito e não exige registo.",
    estado: "live",
    verificacao: "Abrir a página inicial sem sessão e calcular.",
    urlFonte: "/",
  },
  {
    id: "plus",
    texto: `A monetização atual é uma subscrição única, o Plus, a ${PRECO_PLUS_MENSAL.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} €/mês.`,
    estado: "live",
    verificacao: "Página de preços pública.",
    urlFonte: "/precos",
  },
  {
    id: "conteudo",
    texto:
      "O conteúdo fiscal — guias, quiz e catálogo de atividades — é próprio, versionado e com histórico público de correções.",
    estado: "live",
    verificacao: "Abrir /guias, /quiz-fiscal e /changelog-fiscal.",
    urlFonte: "/changelog-fiscal",
  },
  {
    id: "fiz_ligacao",
    texto:
      "A ligação à FIZ existe hoje como encaminhamento com divulgação de afiliado: quem precisa de executar sai daqui com o contexto e a FIZ trata da emissão e das obrigações.",
    estado: "live",
    verificacao: "Ver a divulgação junto de cada ligação no produto e a nota em /integracoes/fiz.",
    urlFonte: "/integracoes/fiz",
  },
  {
    id: "fiz_api",
    texto:
      "Integração mais profunda com um operador certificado, por API, para o utilizador não repetir dados entre a decisão e a execução.",
    estado: "planned",
    verificacao: "Ainda não existe em produção. Depende de acordo comercial e técnico com o parceiro.",
  },
  {
    id: "medicao",
    texto:
      "Camada de medição própria, sem dependências de terceiros, com barreira que recusa qualquer evento contendo rendimento, NIF ou texto livre.",
    estado: "live",
    verificacao: "Código em src/lib/analytics; a barreira de PII corre no dispositivo antes de qualquer envio.",
  },
  {
    id: "tracao_instrumentada",
    texto:
      "Instrumentar o funil de ponta a ponta e publicar utilizadores ativos, ativação, retorno por coorte e conversão com definição e data.",
    estado: "planned",
    verificacao: "A camada de eventos existe; as séries e as coortes ainda não estão consolidadas.",
  },
  {
    id: "revenue_share",
    texto:
      "Receita de parceria à comissão validada, contada como receita apenas quando o parceiro a confirma — nunca ao clique.",
    estado: "pilot",
    verificacao: "O encaminhamento e a divulgação existem; o volume ainda não sustenta uma série publicável.",
  },
  {
    id: "pagamentos",
    texto:
      "Cobrança, reconciliação bancária e participação transacional. Só faz sentido com parceiro regulado, economia provada e procura demonstrada.",
    estado: "hypothesis",
    verificacao: "Não há parceiro, não há enquadramento e não há procura medida. Não entra em nenhum caso-base.",
  },
];

assertAfirmacoes(AFIRMACOES);

/* ══════════════════════════════════════════════════════════════════════════
   3 · A RONDA
   ─────────────────────────────────────────────────────────────────────────
   ⚠️ POR DIVULGAR. Montante, instrumento, ticket, comprometido, fecho e
   runway são factos que só o fundador tem, e o relatório é explícito: parar e
   pedir, nunca preencher. A página diz que não estão publicados e explica
   como chegar a eles — o que é uma resposta honesta, e melhor do que um
   parêntese reto a pedir dinheiro.

   Para publicar: preencher os campos e mudar `divulgada` para true. O teste
   `investidores-conteudo.test.ts` garante que nada aqui é publicado a meio.
   ══════════════════════════════════════════════════════════════════════════ */

export interface FichaRonda {
  divulgada: boolean;
  estagio?: string;
  montante?: string;
  instrumento?: string;
  ticketMinimo?: string;
  comprometido?: string;
  fechoPrevisto?: string;
  runwayMeses?: number;
}

export const RONDA: FichaRonda = {
  divulgada: false,
};

export const RONDA_NOTA =
  "Estágio, montante, instrumento e calendário são partilhados na primeira conversa, " +
  "com o deck. Não os publicamos aqui porque a informação de uma ronda muda com o " +
  "processo, e uma página desatualizada é pior do que uma página que não diz.";

/* ══════════════════════════════════════════════════════════════════════════
   4 · CONCORRÊNCIA
   ─────────────────────────────────────────────────────────────────────────
   A frase antiga — "as ferramentas existentes limitam-se a gerar faturas.
   Nenhuma responde…" — é uma afirmação absoluta e frágil, e é falsa sobre
   produtos que fazem bastante mais do que isso. A matriz abaixo descreve o que
   cada um faz bem e onde o ReciboCerto entra, que é antes.
   ══════════════════════════════════════════════════════════════════════════ */

export interface LinhaConcorrencia {
  produto: string;
  url?: string;
  wedge: string;
  faturacao: "sim" | "nao" | "parceiro";
  execucao: "sim" | "nao" | "parceiro";
  pagamentos: "sim" | "nao" | "integracoes";
  simulacao: "forte" | "medio" | "baixo";
  proprio?: boolean;
}

export const CONCORRENCIA: LinhaConcorrencia[] = [
  {
    produto: "ReciboCerto",
    wedge: "Decisão fiscal e simulação",
    faturacao: "nao",
    execucao: "parceiro",
    pagamentos: "nao",
    simulacao: "forte",
    proprio: true,
  },
  {
    produto: "FIZ",
    url: "https://fiz.co/",
    wedge: "Execução fiscal para independentes e ENI",
    faturacao: "sim",
    execucao: "sim",
    pagamentos: "nao",
    simulacao: "medio",
  },
  {
    produto: "Rauva",
    url: "https://rauva.com/pt/precos",
    wedge: "Sistema operativo financeiro para PME",
    faturacao: "sim",
    execucao: "sim",
    pagamentos: "sim",
    simulacao: "medio",
  },
  {
    produto: "InvoiceXpress",
    url: "https://invoicexpress.com/",
    wedge: "Faturação simples",
    faturacao: "sim",
    execucao: "parceiro",
    pagamentos: "integracoes",
    simulacao: "baixo",
  },
  {
    produto: "Moloni",
    url: "https://www.moloni.pt/planos/",
    wedge: "Faturação e gestão comercial",
    faturacao: "sim",
    execucao: "parceiro",
    pagamentos: "integracoes",
    simulacao: "baixo",
  },
];

export const CONCORRENCIA_NOTA =
  "As soluções de faturação resolvem bem a emissão e a gestão documental. O ReciboCerto " +
  "entra antes: ajuda a compreender o impacto fiscal, comparar cenários e decidir o passo " +
  "seguinte. É uma categoria complementar, não um substituto — e é por isso que a execução " +
  "é uma parceria e não um concorrente.";

/* ══════════════════════════════════════════════════════════════════════════
   5 · RISCOS
   ══════════════════════════════════════════════════════════════════════════ */

export interface Risco {
  id: string;
  titulo: string;
  descricao: string;
  mitigacao: string;
}

export const RISCOS: Risco[] = [
  {
    id: "dependencia_organica",
    titulo: "Concentração da aquisição em canal orgânico",
    descricao:
      "A procura chega sobretudo por pesquisa. Uma alteração de algoritmo ou a resposta direta dos assistentes de IA podem reduzir a visita mesmo com o conteúdo intacto.",
    mitigacao:
      "Conteúdo citável e com fonte, presença nos motores de resposta, produto que dá razão para voltar fora do momento da pesquisa, e email como canal próprio.",
  },
  {
    id: "monetizacao_fina",
    titulo: "Preço baixo e disposição a pagar por verificar",
    descricao:
      "Uma subscrição de 1,99 €/mês exige volume para ser material, e a disposição a pagar de trabalhadores independentes ainda não está medida em escala.",
    mitigacao:
      "Testar escalões e valor percebido antes de escalar aquisição; complementar com receita de parceria à comissão validada.",
  },
  {
    id: "dependencia_parceiro",
    titulo: "Dependência do parceiro de execução",
    descricao:
      "A parte executiva da promessa é de terceiros. Alteração de termos, de preço ou de prioridades do parceiro afeta o encaminhamento.",
    mitigacao:
      "Fronteira clara entre o que é nosso e o que é do parceiro, mais do que um caminho possível para a execução, e nenhuma funcionalidade do Plus dependente do parceiro.",
  },
  {
    id: "exatidao_fiscal",
    titulo: "Erro fiscal",
    descricao:
      "Um número errado num simulador de impostos é um problema de confiança e potencialmente de responsabilidade.",
    mitigacao:
      "Cada parâmetro com norma, fonte e data; asserções que falham o build; changelog fiscal público onde a correção fica descrita, incluindo o que estava errado.",
  },
  {
    id: "equipa",
    titulo: "Dimensão da equipa",
    descricao:
      "O produto, o conteúdo e a infraestrutura assentam numa equipa muito pequena — o que é uma vantagem de velocidade e um risco de continuidade.",
    mitigacao:
      "Motor, dados e conteúdo versionados no repositório com verificação automática; a decisão sobre reforço faz parte do uso de fundos.",
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   6 · O QUE O CAPITAL COMPRA
   ─────────────────────────────────────────────────────────────────────────
   Marcos, não uma lista aberta de funcionalidades. Sem percentagens de uso de
   fundos: essas dependem do montante, que não está fechado. Publicar uma
   repartição percentual de um montante desconhecido seria inventar.
   ══════════════════════════════════════════════════════════════════════════ */

export interface Marco {
  id: string;
  titulo: string;
  descricao: string;
  medida: string;
}

export const MARCOS: Marco[] = [
  {
    id: "medicao",
    titulo: "Tração medida e publicável",
    descricao:
      "Fechar a instrumentação do funil e passar a publicar utilizadores ativos, ativação, retorno por coorte e conversão, com definição e data.",
    medida: "As cinco métricas reservadas desta página passam a públicas, com série histórica.",
  },
  {
    id: "execucao",
    titulo: "Execução sem repetição de dados",
    descricao:
      "Integrar por API com um operador certificado, para quem decide aqui não voltar a escrever o mesmo noutro sítio.",
    medida: "Percentagem de encaminhamentos que chegam ao parceiro com contexto, e comissão validada.",
  },
  {
    id: "acompanhamento",
    titulo: "De uso pontual a acompanhamento anual",
    descricao:
      "Transformar a visita sazonal — o IRS, o prazo da Segurança Social — em presença ao longo do ano: prazos, reserva de dinheiro e avisos.",
    medida: "Retorno a 30 e 90 dias por coorte, e proporção de utilizadores com mais de um mês ativo.",
  },
];

/* ── Rede final: nada aqui pode ir para produção com marcadores por preencher.
   ────────────────────────────────────────────────────────────────────────── */
assertSemMarcadores(
  [
    TESE,
    SUBTESE,
    RONDA_NOTA,
    CONCORRENCIA_NOTA,
    ...RISCOS.flatMap((r) => [r.titulo, r.descricao, r.mitigacao]),
    ...MARCOS.flatMap((m) => [m.titulo, m.descricao, m.medida]),
  ],
  "Conteúdo da página de investidores",
);
