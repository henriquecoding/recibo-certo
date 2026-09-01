// ═══════════════════════════════════════════════════════════════════════
//  RECONHECIMENTO — o que a frase diz, e nada do que ela não diz
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ ESTE MÓDULO NÃO ADIVINHA. É ISSO QUE O TORNA UTILIZÁVEL.            │
//  │                                                                     │
//  │ A tentação, numa barra de pesquisa que aceita linguagem natural, é   │
//  │ preencher o que falta: se a pessoa escreveu «1 200», assumir que é   │
//  │ mensal; se escreveu «empresa», assumir que quer abrir uma. Num       │
//  │ produto fiscal isso é o pior defeito possível — a interface diz      │
//  │ «percebi» por cima de um palpite, e a pessoa confia numa conta que   │
//  │ nunca pediu.                                                        │
//  │                                                                     │
//  │ Aqui só sai o que está escrito. O que falta fica a faltar, e é a     │
//  │ camada do plano (`plano.ts`) que decide se vale a pena fazer UMA     │
//  │ pergunta ou se é melhor não afirmar nada.                            │
//  │                                                                     │
//  │ Determinístico e local: expressões regulares e dicionários. Sem      │
//  │ modelo, sem rede, sem servidor — a consulta nunca sai do             │
//  │ dispositivo, e essa promessa é uma propriedade do código e não uma   │
//  │ linha de copy.                                                       │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ⚠️ FRONTEIRA: este ficheiro vive no chunk do painel. Não pode importar
//  `documentos.ts`, `fiscal-data.ts`, motores fiscais nem Supabase. O que
//  importa é o contrato (tipos), a normalização e duas listas fechadas de
//  catálogos que já existem — nenhuma delas com dependências.
// ═══════════════════════════════════════════════════════════════════════

import { DISTRITOS, ESPECIALIDADES } from "@/lib/contabilistas/catalogo";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import type { DominioBusca, Intencao, TipoEntidade } from "./esquema";
import { normalizar, tokens } from "./normalizar";

/* ─── O que sai daqui ─────────────────────────────────────────────── */

export type Periodicidade = "hora" | "dia" | "mes" | "trimestre" | "ano";

export interface EntidadeReconhecida {
  tipo: TipoEntidade;
  /**
   * O valor canónico — o que um destino receberia. Número nos valores e
   * nos anos, chave fechada nas restantes.
   */
  valor: string | number;
  /**
   * O que a pessoa escreveu, tal e qual. É o que a linha «pedido
   * reconhecido» mostra: devolver a nossa palavra em vez da dela seria
   * pedir-lhe que confirmasse uma tradução que não pediu.
   */
  texto: string;
}

export interface Reconhecimento {
  /** `null` quando a frase não diz sobre o quê. Não há domínio por omissão. */
  dominio: DominioBusca | null;
  /** `null` quando não há verbo nem pergunta que a revele. */
  intencao: Intencao | null;
  entidades: EntidadeReconhecida[];
  /**
   * Códigos verificáveis do que foi reconhecido e porquê. É o que permite
   * responder «porque recomendamos isto?» com uma regra, e não com uma
   * frase escrita à mão que ninguém consegue confrontar com o código.
   */
  sinais: SinalReconhecimento[];
}

export type SinalReconhecimento =
  | "DOMAIN_MATCH"
  | "INTENT_SIMULATE"
  | "INTENT_COMPLY"
  | "INTENT_UNDERSTAND"
  | "ENTITY_AMOUNT"
  | "ENTITY_PERIOD"
  | "ENTITY_YEAR"
  | "ENTITY_REGIME"
  | "ENTITY_LOCATION"
  | "ENTITY_PROFILE"
  | "COMPARISON_DETECTED"
  | "PROFESSIONAL_HELP_REQUESTED";

/* ─── Valor monetário ─────────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UM NÚMERO NÃO É UM VALOR — E CONFUNDI-LOS DÁ RESPOSTAS ABSURDAS      │
 * │                                                                     │
 * │ «modelo 3», «art. 151.º», «irs 2026», «iva a 23» — quatro consultas  │
 * │ reais com números que não são dinheiro. Tratá-los como valor punha   │
 * │ a interface a dizer «percebi: 3 €» a quem perguntou pelo Modelo 3.   │
 * │                                                                     │
 * │ Um número só é dinheiro quando a frase o diz: tem marca de moeda     │
 * │ colada (€, eur, euros) ou vive numa frase com vocabulário de         │
 * │ dinheiro («recebo», «faturo», «ganho», «cobro», «salário», «bruto»). │
 * │ Os anos são retirados ANTES — 2026 é uma data, não um rendimento.    │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const MARCA_MOEDA = /(?:€|\beur\b|\beuros?\b)/i;

const VOCABULARIO_DE_DINHEIRO = [
  "recebo", "recebe", "receber", "ganho", "ganha", "ganhar", "faturo", "fatura", "faturar",
  "faturados", "cobro", "cobra", "cobrar", "pago", "paga", "pagar", "salario", "vencimento",
  "bruto", "liquido", "rendimento", "rendimentos", "honorarios", "avenca", "valor", "custa",
  "sobra", "fica", "reservar", "guardar", "orcamento", "proposta", "ordenado",
];

/** Anos plausíveis. Fora desta janela, um número de quatro dígitos é dinheiro. */
const ANO_MIN = 2000;
const ANO_MAX = FISCAL_YEAR + 1;

/**
 * Lê um número escrito à portuguesa: `1 200`, `1.200`, `1200,50`, `1.200,50`.
 *
 * O separador de milhares é ponto ou espaço e o decimal é vírgula. Aceita-se
 * também o ponto decimal quando não há vírgula e as casas depois do ponto
 * não são exactamente três — «1.200» é mil e duzentos, «1.2» é um vírgula
 * dois, e essa ambiguidade resolve-se pela contagem de dígitos e não por
 * uma preferência.
 */
export function lerNumeroPT(bruto: string): number | null {
  const limpo = bruto.replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(limpo)) return null;

  const temVirgula = limpo.includes(",");
  let normal: string;

  if (temVirgula) {
    normal = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    const partes = limpo.split(".");
    // `1.200` e `1.200.000` são milhares; `1.2` e `1.25` são decimais.
    const milhares = partes.length > 1 && partes.slice(1).every((p) => p.length === 3);
    normal = milhares ? partes.join("") : limpo;
  }

  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

const PADRAO_NUMERO = /\d[\d\s.,]*\d|\d/g;

function extrairValor(consulta: string): EntidadeReconhecida | null {
  const normalizada = normalizar(consulta);
  const temVocabulario = VOCABULARIO_DE_DINHEIRO.some((v) => normalizada.includes(v));

  for (const m of consulta.matchAll(PADRAO_NUMERO)) {
    const texto = m[0].trim();
    const n = lerNumeroPT(texto);
    if (n === null || n <= 0) continue;

    // Um ano não é um rendimento, mesmo escrito no meio de uma frase sobre
    // dinheiro. «IRS de 2026» não é uma simulação de 2 026 €.
    const inteiro = Number.isInteger(n);
    if (inteiro && n >= ANO_MIN && n <= ANO_MAX && !/[.,\s]/.test(texto)) continue;

    const depois = consulta.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 8);
    const antes = consulta.slice(Math.max(0, (m.index ?? 0) - 8), m.index ?? 0);
    const comMoeda = MARCA_MOEDA.test(depois) || MARCA_MOEDA.test(antes);

    if (!comMoeda && !temVocabulario) continue;
    // Sem moeda explícita, um número pequeno é quase sempre outra coisa —
    // um número de artigo, um escalão, uma percentagem, um mês.
    if (!comMoeda && n < 100) continue;

    return { tipo: "valor", valor: n, texto };
  }
  return null;
}

/* ─── Periodicidade ───────────────────────────────────────────────── */

const PERIODICIDADES: { valor: Periodicidade; padroes: string[] }[] = [
  { valor: "hora", padroes: ["por hora", "a hora", "hora", "horas", "hora ria"] },
  { valor: "dia", padroes: ["por dia", "ao dia", "diaria", "diario", "dia"] },
  { valor: "mes", padroes: ["por mes", "ao mes", "mensal", "mensais", "mes", "meses", "mensalmente"] },
  { valor: "trimestre", padroes: ["por trimestre", "trimestral", "trimestre", "trimestralmente"] },
  { valor: "ano", padroes: ["por ano", "ao ano", "anual", "anuais", "ano", "anualmente"] },
];

function extrairPeriodicidade(normalizada: string, palavras: string[]): EntidadeReconhecida | null {
  for (const { valor, padroes } of PERIODICIDADES) {
    for (const p of padroes) {
      const achou = p.includes(" ") ? normalizada.includes(p) : palavras.includes(p);
      if (achou) return { tipo: "periodicidade", valor, texto: p };
    }
  }
  return null;
}

/* ─── Ano fiscal ──────────────────────────────────────────────────── */

function extrairAno(consulta: string): EntidadeReconhecida | null {
  for (const m of consulta.matchAll(/\b(20\d{2})\b/g)) {
    const n = Number(m[1]);
    if (n >= ANO_MIN && n <= ANO_MAX) return { tipo: "ano", valor: n, texto: m[1] };
  }
  return null;
}

/* ─── Regime / tema fiscal ────────────────────────────────────────── */

/**
 * Os temas fiscais que a pesquisa sabe nomear.
 *
 * A chave é o valor canónico; a lista são as formas por que as pessoas
 * lhes chamam. Nenhuma entrada aqui inventa um enquadramento: dizer que a
 * frase FALA de IVA não é dizer que a pessoa está sujeita a IVA — essa
 * resposta é da ferramenta, com os dados dela.
 */
const REGIMES: Record<string, string[]> = {
  iva: ["iva", "imposto sobre o valor acrescentado"],
  irs: ["irs", "imposto sobre o rendimento"],
  irc: ["irc"],
  "seguranca-social": ["seguranca social", "ss", "contribuicoes", "contribuicao"],
  retencao: ["retencao", "retencao na fonte", "retencao fonte"],
  "recibos-verdes": ["recibo verde", "recibos verdes", "ato isolado", "trabalhador independente", "independente"],
  "regime-simplificado": ["regime simplificado", "simplificado", "coeficiente"],
  "contabilidade-organizada": ["contabilidade organizada", "organizada"],
  empresa: ["empresa", "sociedade", "unipessoal", "lda", "sociedade por quotas"],
  contrato: ["contrato", "conta de outrem", "efetivo", "clt", "trabalhador dependente"],
};

function extrairRegimes(normalizada: string, palavras: string[]): EntidadeReconhecida[] {
  const achados: EntidadeReconhecida[] = [];
  for (const [canonico, formas] of Object.entries(REGIMES)) {
    for (const forma of formas) {
      const achou = forma.includes(" ") ? normalizada.includes(forma) : palavras.includes(forma);
      if (achou) {
        achados.push({ tipo: "regime", valor: canonico, texto: forma });
        break;
      }
    }
  }
  return achados;
}

/* ─── Localidade e especialidade (o diretório) ────────────────────── */

/**
 * Os distritos vêm do catálogo do diretório, não de uma lista nova.
 *
 * É a mesma divisão que o filtro do diretório aceita — e é por isso que
 * um distrito reconhecido aqui vira um filtro que existe do outro lado,
 * em vez de um texto que a página descarta em silêncio.
 */
function extrairLocalidade(normalizada: string): EntidadeReconhecida | null {
  for (const distrito of DISTRITOS) {
    const forma = normalizar(distrito);
    // A fronteira de palavra evita que «Faro» apareça dentro de outra
    // palavra e que «Évora» case com um pedaço de nome próprio.
    if (new RegExp(`(^|\\s)${forma}(\\s|$)`).test(normalizada)) {
      return { tipo: "localidade", valor: distrito, texto: distrito };
    }
  }
  return null;
}

/** A especialidade do diretório, quando a frase a nomeia. */
export function especialidadeDaConsulta(consulta: string): string | null {
  const normalizada = normalizar(consulta);
  for (const esp of ESPECIALIDADES) {
    if (normalizada.includes(normalizar(esp))) return esp;
  }
  // Os temas mais nomeados têm forma curta: «IVA» não aparece como
  // «IVA» na lista de especialidades por acaso — aparece exactamente
  // assim, e é essa a razão de isto ser um segundo passo e não um mapa.
  const palavras = tokens(normalizada);
  if (palavras.includes("iva")) return "IVA";
  if (palavras.includes("irs")) return "IRS";
  return null;
}

/* ─── Perfil ──────────────────────────────────────────────────────── */

const PERFIS: { valor: string; formas: string[] }[] = [
  { valor: "empresa", formas: ["empresa", "sociedade", "unipessoal", "lda", "gerente", "socio"] },
  { valor: "dependente", formas: ["contrato", "conta de outrem", "salario", "vencimento", "entidade patronal", "patrao"] },
  { valor: "independente", formas: ["recibo verde", "recibos verdes", "independente", "freelancer", "freelance"] },
];

function extrairPerfil(normalizada: string, palavras: string[]): EntidadeReconhecida | null {
  for (const { valor, formas } of PERFIS) {
    for (const forma of formas) {
      const achou = forma.includes(" ") ? normalizada.includes(forma) : palavras.includes(forma);
      if (achou) return { tipo: "perfil", valor, texto: forma };
    }
  }
  return null;
}

/* ─── Comparação A/B ──────────────────────────────────────────────── */

/**
 * «X ou Y», «X vs Y», «compensa mais».
 *
 * Só conta quando os DOIS lados são temas que a pesquisa sabe nomear. Sem
 * essa exigência, «quanto recebo ou quanto reservo» virava uma comparação
 * de regimes — e a interface abria um comparador para uma pergunta que
 * não comparava coisa nenhuma.
 */
const LIGACOES_DE_COMPARACAO = [" ou ", " vs ", " versus ", " contra "];

function extrairComparacao(normalizada: string, regimes: EntidadeReconhecida[]): EntidadeReconhecida | null {
  const temLigacao = LIGACOES_DE_COMPARACAO.some((l) => normalizada.includes(l)) ||
    normalizada.includes("compensa mais") ||
    normalizada.includes("compensa abrir") ||
    normalizada.includes("comparar");

  if (!temLigacao) return null;

  const lados = [...new Set(regimes.map((r) => String(r.valor)))];
  if (lados.length < 2) return null;

  return { tipo: "comparacao", valor: lados.slice(0, 3).join("|"), texto: lados.slice(0, 3).join(" ou ") };
}

/* ─── Intenção ────────────────────────────────────────────────────── */

const VERBOS_DE_INTENCAO: { intencao: Intencao; formas: string[] }[] = [
  {
    intencao: "cumprir",
    formas: [
      "quando", "prazo", "prazos", "ate quando", "data limite", "entregar", "entrego", "entrega",
      "declarar", "declaro", "tenho de", "obrigado a", "como abro", "como faco", "como abrir",
      "passo a passo", "onde entrego", "multa", "coima",
    ],
  },
  {
    intencao: "simular",
    formas: [
      "quanto", "calcular", "calculo", "simular", "simulacao", "sobra", "fica", "recebo",
      "pago", "custa", "reservar", "estimar", "quanto e", "valor",
    ],
  },
  {
    intencao: "compreender",
    formas: [
      "o que e", "como funciona", "porque", "porque e", "explicar", "significa", "diferenca",
      "quem", "posso", "vale a pena", "compensa",
    ],
  },
];

function extrairIntencao(normalizada: string, palavras: string[]): Intencao | null {
  for (const { intencao, formas } of VERBOS_DE_INTENCAO) {
    for (const forma of formas) {
      const achou = forma.includes(" ") ? normalizada.includes(forma) : palavras.includes(forma);
      if (achou) return intencao;
    }
  }
  return null;
}

/* ─── Domínio ─────────────────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ A ORDEM DESTA LISTA É A REGRA — E TEM DE SER LIDA DE CIMA PARA BAIXO │
 * │                                                                     │
 * │ Um domínio ganha ao primeiro sinal que casar. «apoio» está no topo   │
 * │ porque «contabilista para o IVA» é um pedido de APOIO com um tema, e │
 * │ não uma pergunta sobre IVA; «comparar» vem antes de «empresa»        │
 * │ porque «recibos verdes ou empresa» é uma comparação e não uma        │
 * │ pergunta sobre empresas.                                            │
 * │                                                                     │
 * │ Quando nada casa, o resultado é `null` — e `null` é uma resposta.    │
 * │ Um domínio por omissão faria a interface afirmar um assunto que a    │
 * │ pessoa nunca escreveu.                                              │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const SINAIS_DE_DOMINIO: { dominio: DominioBusca; formas: string[] }[] = [
  {
    dominio: "apoio",
    formas: [
      "contabilista", "contabilistas", "occ", "toc", "ajuda profissional", "falar com alguem",
      "validar com", "caso complexo", "contabilidade",
    ],
  },
  {
    dominio: "comparar",
    formas: ["comparar", "compensa mais", "vale mais a pena", "versus", "compensa abrir"],
  },
  {
    dominio: "obrigacoes",
    formas: [
      "prazo", "prazos", "calendario", "quando entrego", "quando pago", "quando declaro",
      "declaracao periodica", "declaracao trimestral", "modelo 3", "pagamentos por conta",
      "data limite", "coima", "multa",
    ],
  },
  {
    // ┌─────────────────────────────────────────────────────────────────┐
    // │ «PLANOS E PREÇOS» É O PRODUTO; «QUANTO COBRO» É O MOTOR DE PREÇO │
    // │                                                                 │
    // │ As duas famílias disputam a palavra «preço», e o produto vem     │
    // │ primeiro porque as suas formas são mais específicas: «planos»,   │
    // │ «Plus» e «subscrição» só significam uma coisa aqui. «Conta» NÃO  │
    // │ está na lista, e a ausência é deliberada — casaria com «conta de │
    // │ outrem», que é uma pergunta sobre salário.                       │
    // └─────────────────────────────────────────────────────────────────┘
    dominio: "produto",
    formas: [
      "plano", "planos", "plus", "subscricao", "assinatura", "metodologia",
      "privacidade", "termos", "estado dos dados", "quanto custa o recibo certo",
    ],
  },
  {
    dominio: "preco",
    formas: ["quanto cobrar", "quanto cobro", "preco", "precos", "margem", "markup", "tabela de precos"],
  },
  {
    dominio: "descoberta",
    formas: ["que negocio", "abrir um negocio", "ideia de negocio", "oportunidade", "o que posso fazer"],
  },
  {
    // A empresa vem antes do salário porque os seus sinais são mais
    // específicos: «dividendos», «IRC» e «gerência» só aparecem em
    // perguntas sobre sociedades. «Salário de gerência ou dividendos» tem
    // as duas palavras e é, sem ambiguidade, uma decisão de empresa.
    dominio: "empresa",
    formas: ["empresa", "sociedade", "unipessoal", "lda", "irc", "dividendos", "gerencia"],
  },
  {
    dominio: "salario",
    formas: [
      "salario", "vencimento", "recibo de vencimento", "ordenado", "conta de outrem",
      "contratar", "custo de contratar", "entidade patronal", "subsidio de ferias", "subsidio de natal",
    ],
  },
  {
    dominio: "patrimonio",
    formas: ["heranca", "herancas", "mais valias", "imovel", "casa", "imposto do selo", "partilha"],
  },
  {
    dominio: "recibos",
    formas: [
      "recibo verde", "recibos verdes", "ato isolado", "trabalhador independente", "freelancer",
      "abrir atividade", "atividade", "coeficiente", "retencao", "categoria b",
      // «Quanto tenho de guardar para impostos» é a pergunta central de
      // quem passa recibos verdes, e não tem uma única palavra em comum
      // com «recibo verde». Sem estas formas, a consulta ficava empatada
      // entre a calculadora de recibos e o motor de preço — duas contas
      // diferentes para a mesma frase.
      "quanto guardar", "guardar para impostos", "reservar para impostos", "tesouraria",
    ],
  },
  {
    dominio: "obrigacoes",
    formas: ["iva", "irs", "seguranca social", "contribuicoes"],
  },
];

function extrairDominio(normalizada: string, palavras: string[]): DominioBusca | null {
  for (const { dominio, formas } of SINAIS_DE_DOMINIO) {
    for (const forma of formas) {
      const achou = forma.includes(" ") ? normalizada.includes(forma) : palavras.includes(forma);
      if (achou) return dominio;
    }
  }
  return null;
}

/* ─── O reconhecimento completo ───────────────────────────────────── */

const VAZIO: Reconhecimento = { dominio: null, intencao: null, entidades: [], sinais: [] };

export function reconhecer(consulta: string): Reconhecimento {
  const bruta = consulta.trim();
  if (!bruta) return VAZIO;

  const normalizada = normalizar(bruta);
  const palavras = tokens(normalizada);
  if (palavras.length === 0) return VAZIO;

  const entidades: EntidadeReconhecida[] = [];
  const sinais: SinalReconhecimento[] = [];

  const ano = extrairAno(bruta);
  if (ano) {
    entidades.push(ano);
    sinais.push("ENTITY_YEAR");
  }

  const valor = extrairValor(bruta);
  if (valor) {
    entidades.push(valor);
    sinais.push("ENTITY_AMOUNT");
  }

  const periodicidade = extrairPeriodicidade(normalizada, palavras);
  if (periodicidade) {
    entidades.push(periodicidade);
    sinais.push("ENTITY_PERIOD");
  }

  const regimes = extrairRegimes(normalizada, palavras);
  if (regimes.length > 0) {
    entidades.push(...regimes);
    sinais.push("ENTITY_REGIME");
  }

  const comparacao = extrairComparacao(normalizada, regimes);
  if (comparacao) {
    entidades.push(comparacao);
    sinais.push("COMPARISON_DETECTED");
  }

  const localidade = extrairLocalidade(normalizada);
  if (localidade) {
    entidades.push(localidade);
    sinais.push("ENTITY_LOCATION");
  }

  const perfil = extrairPerfil(normalizada, palavras);
  if (perfil) {
    entidades.push(perfil);
    sinais.push("ENTITY_PROFILE");
  }

  const intencao = extrairIntencao(normalizada, palavras);
  if (intencao === "simular") sinais.push("INTENT_SIMULATE");
  if (intencao === "cumprir") sinais.push("INTENT_COMPLY");
  if (intencao === "compreender") sinais.push("INTENT_UNDERSTAND");

  /**
   * Uma comparação reconhecida MANDA no domínio.
   *
   * «recibos verdes ou empresa» tem sinais de recibos e de empresa; sem
   * esta regra, ganhava o primeiro da lista e a pesquisa abria a
   * calculadora de recibos verdes para uma pergunta cuja resposta é o
   * comparador. O sinal mais específico ganha ao mais frequente.
   */
  const dominio = comparacao ? "comparar" : extrairDominio(normalizada, palavras);
  if (dominio) sinais.push("DOMAIN_MATCH");
  if (dominio === "apoio") sinais.push("PROFESSIONAL_HELP_REQUESTED");

  return { dominio, intencao, entidades, sinais };
}

/** A entidade de um tipo, quando existe. Conveniência para o plano. */
export function entidade(r: Reconhecimento, tipo: TipoEntidade): EntidadeReconhecida | undefined {
  return r.entidades.find((e) => e.tipo === tipo);
}

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O QUE JÁ FOI RECONHECIDO NÃO DEVE VOLTAR A PESAR NO TEXTO            │
 * │                                                                     │
 * │ A pontuação por palavras divide pela contagem de palavras da         │
 * │ consulta. «Contabilista em Lisboa para IVA» tem cinco palavras; o    │
 * │ diretório de contabilistas acerta numa e fica com 20% de cobertura — │
 * │ abaixo do limiar. Resultado: a pesquisa respondia «sem resultados» a │
 * │ uma pergunta que tem uma resposta óbvia, e respondia PIOR quanto     │
 * │ mais natural fosse a frase.                                          │
 * │                                                                     │
 * │ Mas «Lisboa» não estava por reconhecer: já tinha virado um filtro do │
 * │ diretório. Uma entidade consumida pelo plano não pode continuar a    │
 * │ contar como assunto por encontrar no catálogo — é o mesmo dado a ser │
 * │ pedido duas vezes, e a segunda é uma penalização.                    │
 * │                                                                     │
 * │ Saem os valores, os anos, os locais e a periodicidade. FICAM os      │
 * │ temas («IVA», «empresa») e os perfis: esses são assunto, e é por     │
 * │ eles que se encontram documentos.                                    │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const ENTIDADES_CONSUMIDAS: TipoEntidade[] = ["valor", "ano", "localidade", "periodicidade"];

export function consultaParaRanking(consulta: string, r: Reconhecimento): string {
  let resto = consulta;
  for (const e of r.entidades) {
    if (!ENTIDADES_CONSUMIDAS.includes(e.tipo)) continue;
    // Sem expressão regular: o texto da entidade pode conter `.`, `,` e
    // parênteses, e escapá-los para depois os procurar à letra seria a
    // volta mais longa para o mesmo sítio.
    const i = resto.toLocaleLowerCase("pt-PT").indexOf(e.texto.toLocaleLowerCase("pt-PT"));
    if (i !== -1) resto = `${resto.slice(0, i)} ${resto.slice(i + e.texto.length)}`;
  }
  // A marca de moeda perde o sentido sem o número, e «€» sozinho não é
  // assunto de documento nenhum.
  resto = resto.replace(/€/g, " ").replace(/\s+/g, " ").trim();

  // Se sobrar pouco ou nada, o texto original é o melhor que há: mais vale
  // pontuar por um número do que não pontuar de todo.
  return normalizar(resto).length >= 2 ? resto : consulta;
}
