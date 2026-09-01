// ═══════════════════════════════════════════════════════════════════════
//  O PLANO — o que a interface pode AFIRMAR, e o que tem de perguntar
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE EXISTE UMA CAMADA ENTRE O RANKING E O ECRÃ                    │
//  │                                                                     │
//  │ Sem ela, a decisão «isto é uma certeza ou é um palpite?» acabaria    │
//  │ espalhada pelo JSX — um `resultados[0]` aqui, um `&&` ali — e a      │
//  │ pergunta mais importante do produto («podemos dizer isto a alguém    │
//  │ que vai tomar uma decisão fiscal?») passaria a ser respondida por    │
//  │ acidente, em sítios diferentes, com regras diferentes.               │
//  │                                                                     │
//  │ Aqui é um objecto, com estado explícito e com os códigos das regras  │
//  │ que o produziram. A interface desenha o plano; não o inventa. E o    │
//  │ botão «porque recomendamos isto?» consegue responder porque a        │
//  │ resposta está no objecto, não numa frase escrita à mão.               │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  O QUE ESTE MÓDULO NÃO FAZ, EM CIRCUNSTÂNCIA NENHUMA:
//   · não calcula imposto — prepara a ferramenta que o sabe calcular;
//   · não preenche o que a pessoa não escreveu;
//   · não põe valores em endereços (ver `handoff.ts`);
//   · não faz mais do que UMA pergunta de cada vez.
// ═══════════════════════════════════════════════════════════════════════

import { PARAMS } from "@/lib/contabilistas/catalogo";
import type {
  DocumentoBusca,
  DominioBusca,
  FonteDoc,
  Intencao,
  RendererBusca,
  TipoDoc,
  TipoEntidade,
} from "./esquema";
import { melhorResposta, type ResultadoBusca } from "./pontuar";
import {
  entidade,
  especialidadeDaConsulta,
  type EntidadeReconhecida,
  type Reconhecimento,
  type SinalReconhecimento,
} from "./reconhecer";

/* ─── O contrato ──────────────────────────────────────────────────── */

/**
 * O estado do plano. É esta palavra que decide o TOM da interface.
 *
 *  · `pronto`       há um caminho, e nada material falta. Diz-se «pedido
 *                   claro» e prepara-se a ação.
 *  · `clarificar`   há um caminho, mas falta um dado que muda o resultado.
 *                   Faz-se UMA pergunta.
 *  · `reconhecido`  percebeu-se o assunto e não há um caminho destacado.
 *                   Mostram-se resultados, sem coroar nenhum.
 *  · `sem_caminho`  não há confiança nenhuma. Diz-se isso — e oferece-se
 *                   navegação, que é o que resolve.
 */
export type EstadoPlano = "pronto" | "clarificar" | "reconhecido" | "sem_caminho";

export type Confianca = "alta" | "media" | "baixa";

export interface AcaoPreparada {
  /** O id do documento — um rótulo nosso, nunca conteúdo do utilizador. */
  id: string;
  tipo: TipoDoc;
  renderer: RendererBusca;
  dominio: DominioBusca;
  titulo: string;
  descricao: string;
  /** O destino final, já com os filtros estruturados que existirem. */
  href: string;
  requerConta: boolean;
  /** Estimativa da própria ferramenta, quando existe. Aparece com «≈». */
  minutos?: number;
  fonte?: FonteDoc;
  /** O que o destino SABE receber. Vem do catálogo, não da consulta. */
  aceita: TipoEntidade[];
  /**
   * Os TIPOS de entidade que este destino vai receber DESTA consulta —
   * nunca os valores.
   *
   * A distinção é toda: um plano é serializável, é medível e é lido por
   * quem depura. Se transportasse «1 200 €», bastava alguém registá-lo
   * uma vez para o valor sair do dispositivo.
   */
  campos: TipoEntidade[];
}

export type TipoClarificacao = "valor_sem_destino" | "periodicidade" | "base_de_comparacao";

export interface OpcaoClarificacao {
  id: string;
  label: string;
  /** Quando responder muda o destino, e não só o contexto. */
  href?: string;
}

export interface PerguntaClarificacao {
  tipo: TipoClarificacao;
  pergunta: string;
  /** Uma linha a dizer PORQUE se pergunta. Sem isto é um obstáculo. */
  porque: string;
  opcoes: OpcaoClarificacao[];
}

export interface ApoioProfissional {
  /** `true` quando o apoio é o caminho principal e não a faixa lateral. */
  principal: boolean;
  href: string;
  /**
   * Os filtros que o destino vai receber, prontos a mostrar à pessoa.
   *
   * Só valores de catálogos fechados (distrito, especialidade). O texto da
   * consulta NUNCA entra aqui: o pedido só é partilhado quando a pessoa o
   * confirmar, do outro lado, com as palavras dela.
   */
  filtros: { rotulo: string; valor: string }[];
}

export type CodigoExplicacao =
  | SinalReconhecimento
  | "MATCH_EXACT_TOOL"
  | "MATCH_TEXT_ONLY"
  | "LEADING_MARGIN"
  | "TIED_RESULTS"
  | "MISSING_PERIOD"
  | "MISSING_BASIS"
  | "MISSING_TARGET"
  | "NO_MATCH";

export interface PlanoBusca {
  schemaVersion: 1;
  estado: EstadoPlano;
  confianca: Confianca;
  dominio: DominioBusca | null;
  intencao: Intencao | null;
  entidades: EntidadeReconhecida[];
  explicacoes: CodigoExplicacao[];
  principal?: AcaoPreparada;
  clarificacao?: PerguntaClarificacao;
  /** Rotas relevantes, sempre com menos peso do que a principal. */
  alternativas: AcaoPreparada[];
  apoio?: ApoioProfissional;
}

/** Quantas alternativas cabem sem a superfície voltar a ser um índice. */
export const MAX_ALTERNATIVAS = 3;

/* ─── Ação preparada ──────────────────────────────────────────────── */

function camposDe(doc: DocumentoBusca, reconhecimento: Reconhecimento): TipoEntidade[] {
  if (!doc.aceita?.length) return [];
  return doc.aceita.filter((t) => reconhecimento.entidades.some((e) => e.tipo === t));
}

function acaoDe(doc: DocumentoBusca, reconhecimento: Reconhecimento): AcaoPreparada {
  return {
    id: doc.id,
    tipo: doc.tipo,
    renderer: doc.renderer,
    dominio: doc.dominio,
    titulo: doc.titulo,
    descricao: doc.descricao,
    href: doc.href,
    requerConta: doc.requerConta ?? false,
    ...(doc.minutos ? { minutos: doc.minutos } : {}),
    ...(doc.fonte ? { fonte: doc.fonte } : {}),
    aceita: doc.aceita ?? [],
    campos: camposDe(doc, reconhecimento),
  };
}

/* ─── Apoio profissional ──────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O DIRETÓRIO RECEBE FILTROS, NUNCA A PERGUNTA                         │
 * │                                                                     │
 * │ «Contabilista no Porto para validar o IVA de um cliente que não me   │
 * │ pagou» tem duas coisas que se podem transportar — um distrito e uma  │
 * │ especialidade, ambos de catálogos fechados — e uma que não: a frase. │
 * │ A frase é o caso da pessoa, e o caso partilha-se do outro lado, com  │
 * │ as palavras dela e depois de ela confirmar.                          │
 * │                                                                     │
 * │ Por isso o que sai daqui é um endereço com `distrito=` e             │
 * │ `especialidade=` e mais nada. Sem `q=`, que é o parâmetro que        │
 * │ transportaria texto livre para um sítio onde ele não é preciso.      │
 * └─────────────────────────────────────────────────────────────────────┘
 */
function apoioDe(consulta: string, reconhecimento: Reconhecimento, principal: boolean): ApoioProfissional {
  const params = new URLSearchParams();
  const filtros: { rotulo: string; valor: string }[] = [];

  const local = entidade(reconhecimento, "localidade");
  if (local) {
    params.set(PARAMS.distrito, String(local.valor));
    filtros.push({ rotulo: "Distrito", valor: String(local.valor) });
  }

  const especialidade = especialidadeDaConsulta(consulta);
  if (especialidade) {
    params.set(PARAMS.especialidade, especialidade);
    filtros.push({ rotulo: "Área", valor: especialidade });
  }

  const cauda = params.toString();
  return { principal, href: cauda ? `/contabilistas?${cauda}` : "/contabilistas", filtros };
}

/* ─── A pergunta — no máximo uma, e só quando muda a resposta ─────── */

const OPCAO_NAO_SEI: OpcaoClarificacao = { id: "nao-sei", label: "Não sei" };

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ OS DOIS TESTES QUE UMA PERGUNTA TEM DE PASSAR PARA EXISTIR           │
 * │                                                                     │
 * │ 1. «Responder a isto muda MATERIALMENTE o resultado?»                │
 * │ 2. «A resposta CHEGA ao destino?»                                    │
 * │                                                                     │
 * │ O segundo teste apagou uma pergunta que parecia boa. «1 200 € inclui │
 * │ IVA?» passa o primeiro com distinção — o IVA não é rendimento, é     │
 * │ dinheiro que passa pela pessoa — e reprova no segundo: a calculadora │
 * │ de recibos verdes não recebe esse campo, e a resposta morria aqui.   │
 * │ Uma pergunta cuja resposta não vai a lado nenhum é um obstáculo com  │
 * │ ar de cuidado, e o custo é real: é mais uma paragem entre a pessoa e │
 * │ aquilo que ela veio fazer.                                          │
 * │                                                                     │
 * │ Ficam três, e todas viajam:                                          │
 * │                                                                     │
 * │  · um valor sem destino («1200») pode ser cinco contas diferentes —  │
 * │    a resposta escolhe a página;                                      │
 * │  · «por mês» ou «por ano» muda o escalão de IRS e o resultado todo — │
 * │    a resposta viaja no contexto;                                     │
 * │  · numa comparação, «proposta de salário» e «orçamento do cliente»   │
 * │    não são o mesmo dinheiro. Não é uma pergunta inventada aqui: é a  │
 * │    MESMA que o comparador já faz («Comparar por: rendimento          │
 * │    ilíquido / custo do empregador»), feita antes em vez de depois.   │
 * │                                                                     │
 * │ E há sempre «Não sei». Obrigar a escolher entre duas opções que a    │
 * │ pessoa não distingue é pedir-lhe que invente um dado — que é         │
 * │ exactamente o que este produto não pode fazer.                       │
 * └─────────────────────────────────────────────────────────────────────┘
 */
function perguntaDe(
  principal: AcaoPreparada | undefined,
  reconhecimento: Reconhecimento,
  documentos: DocumentoBusca[],
): PerguntaClarificacao | undefined {
  const valor = entidade(reconhecimento, "valor");
  const periodicidade = entidade(reconhecimento, "periodicidade");
  const base = entidade(reconhecimento, "base");

  // 1. Um valor e mais nada. Não há caminho a preparar — há uma escolha.
  if (valor && !principal && !reconhecimento.dominio) {
    const candidatos = ["ferramenta:recibos-verdes", "ferramenta:recibo-vencimento", "ferramenta:calcular-preco"]
      .map((id) => documentos.find((d) => d.id === id))
      .filter((d): d is DocumentoBusca => Boolean(d));

    if (candidatos.length >= 2) {
      return {
        tipo: "valor_sem_destino",
        pergunta: `O que queres fazer com ${valor.texto} €?`,
        porque: "O mesmo valor dá contas diferentes conforme o que ele é.",
        opcoes: candidatos.map((d) => ({ id: d.id, label: d.titulo, href: d.href })),
      };
    }
  }

  if (!principal || !valor || !principal.aceita.includes("valor")) return undefined;

  // 2. Sem periodicidade, o número não quer dizer nada. Vem primeiro
  //    porque é o que torna o valor utilizável de todo.
  if (!periodicidade) {
    return {
      tipo: "periodicidade",
      pergunta: `${valor.texto} € é por mês ou por ano?`,
      porque: "O escalão de IRS depende do total do ano.",
      opcoes: [
        { id: "mes", label: "Por mês" },
        { id: "ano", label: "Por ano" },
        OPCAO_NAO_SEI,
      ],
    };
  }

  // 3. Numa comparação, a base tem de ser a mesma nos três cenários.
  if (!base && principal.renderer === "comparison" && principal.aceita.includes("base")) {
    return {
      tipo: "base_de_comparacao",
      pergunta: `${valor.texto} € é uma proposta de salário ou o orçamento do cliente?`,
      porque: "A resposta é o que torna a comparação equivalente nos três cenários.",
      opcoes: [
        { id: "iliquido", label: "Proposta de salário" },
        { id: "custoEmpregador", label: "Orçamento do cliente" },
        OPCAO_NAO_SEI,
      ],
    };
  }

  return undefined;
}

/* ─── A resposta ──────────────────────────────────────────────────── */

export interface RespostaClarificacao {
  tipo: TipoClarificacao;
  /** O `id` da opção escolhida. `nao-sei` é uma resposta como as outras. */
  opcao: string;
}

/**
 * A resposta entra no reconhecimento como se tivesse sido escrita.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE NÃO HÁ UM SEGUNDO ESTADO PARA AS RESPOSTAS                    │
 * │                                                                     │
 * │ A alternativa era o plano guardar «o que foi reconhecido» de um lado │
 * │ e «o que foi respondido» do outro, e todos os consumidores           │
 * │ passarem a ter de somar os dois — o handoff, a linha de              │
 * │ interpretação, os campos da ação, a medição. Quatro sítios a fazer   │
 * │ a mesma soma é a garantia de que um deles se esquece.                │
 * │                                                                     │
 * │ Uma resposta é informação da pessoa sobre o pedido dela, tal como as │
 * │ palavras que escreveu. Entra no mesmo sítio. O que a distingue —     │
 * │ para a linha de interpretação e para a medição — é o sinal           │
 * │ `ANSWERED`, e não uma segunda lista de entidades.                    │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function aplicarResposta(r: Reconhecimento, resposta: RespostaClarificacao | null): Reconhecimento {
  if (!resposta) return r;

  const comSinal: Reconhecimento = { ...r, sinais: [...r.sinais, "CLARIFICATION_ANSWERED"] };
  // «Não sei» é uma resposta legítima: encerra a pergunta e não acrescenta
  // dado nenhum. Preencher à mesma seria pedir à pessoa que inventasse.
  if (resposta.opcao === "nao-sei") return comSinal;

  if (resposta.tipo === "periodicidade") {
    return {
      ...comSinal,
      entidades: [
        ...comSinal.entidades,
        { tipo: "periodicidade", valor: resposta.opcao, texto: resposta.opcao === "mes" ? "por mês" : "por ano" },
      ],
    };
  }

  if (resposta.tipo === "base_de_comparacao") {
    return {
      ...comSinal,
      entidades: [
        ...comSinal.entidades,
        {
          tipo: "base",
          valor: resposta.opcao,
          texto: resposta.opcao === "custoEmpregador" ? "orçamento do cliente" : "proposta de salário",
        },
      ],
    };
  }

  // `valor_sem_destino` não acrescenta entidade nenhuma: a resposta é uma
  // navegação, e quem a trata é quem desenha as opções.
  return comSinal;
}

/* ─── O compilador ────────────────────────────────────────────────── */

export interface EntradaDoPlano {
  consulta: string;
  reconhecimento: Reconhecimento;
  /** Já ordenados e com os sinais de tarefa aplicados. */
  resultados: ResultadoBusca[];
  /** O catálogo completo — para as opções de clarificação e o apoio. */
  documentos: DocumentoBusca[];
}

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ QUANDO É QUE HÁ UM «CAMINHO PRINCIPAL»                               │
 * │                                                                     │
 * │ Quando o primeiro resultado ganha por margem clara (a mesma regra    │
 * │ de `melhorResposta`, que já existia e continua a ser a única) OU     │
 * │ quando a família de decisão foi reconhecida e o primeiro resultado   │
 * │ pertence a ela. A segunda condição é o que faz «quando entrego o     │
 * │ IVA» abrir a obrigação mesmo que o guia do IVA venha logo atrás com  │
 * │ pontuação parecida: os dois respondem às palavras, e só um responde  │
 * │ à pergunta.                                                          │
 * │                                                                     │
 * │ Fora disto NÃO há caminho principal. Coroar o primeiro de uma lista  │
 * │ empatada é dizer a alguém que vai decidir dinheiro que existe uma    │
 * │ certeza que não existe.                                             │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function compilarPlano({
  consulta,
  reconhecimento,
  resultados,
  documentos,
}: EntradaDoPlano): PlanoBusca {
  const explicacoes: CodigoExplicacao[] = [...reconhecimento.sinais];
  const base = {
    schemaVersion: 1 as const,
    dominio: reconhecimento.dominio,
    intencao: reconhecimento.intencao,
    entidades: reconhecimento.entidades,
  };

  /**
   * O apoio é o caminho principal quando a pessoa o PEDIU — e não quando
   * nós achamos que ela devia pedir. O sinal é explícito: a frase nomeia
   * um contabilista, pede validação ou diz que o caso é complexo.
   */
  const apoioPrincipal = reconhecimento.dominio === "apoio";

  if (resultados.length === 0) {
    /**
     * «1200 €» não devolve documento nenhum — nenhum título fala de mil e
     * duzentos — e mesmo assim não é uma consulta sem resposta: é uma
     * consulta a que falta o destino. Perguntar «o que queres fazer com
     * este valor?» é honesto; responder «sem resultados» a quem escreveu
     * um número é deitar fora a única coisa que ela disse.
     */
    const semDestino = perguntaDe(undefined, reconhecimento, documentos);
    if (semDestino) {
      return {
        ...base,
        estado: "clarificar",
        confianca: "baixa",
        explicacoes: [...explicacoes, "MISSING_TARGET"],
        clarificacao: semDestino,
        alternativas: [],
        apoio: apoioDe(consulta, reconhecimento, apoioPrincipal),
      };
    }

    return {
      ...base,
      estado: "sem_caminho",
      confianca: "baixa",
      explicacoes: [...explicacoes, "NO_MATCH"],
      alternativas: [],
      // Mesmo sem caminho, o apoio continua a existir — como alternativa e
      // nunca como fuga automática: quem não encontrou o que procurava não
      // pediu, por isso, para falar com um contabilista.
      apoio: apoioDe(consulta, reconhecimento, apoioPrincipal),
    };
  }

  const destacado = melhorResposta(resultados);
  const primeiro = resultados[0];
  const doDominio = Boolean(reconhecimento.dominio) && primeiro.doc.dominio === reconhecimento.dominio;

  if (destacado) explicacoes.push("LEADING_MARGIN");
  else if (!doDominio) explicacoes.push("TIED_RESULTS");

  const docPrincipal = destacado?.doc ?? (doDominio ? primeiro.doc : undefined);
  const principal = docPrincipal ? acaoDe(docPrincipal, reconhecimento) : undefined;

  if (principal) {
    explicacoes.push(principal.campos.length > 0 ? "MATCH_EXACT_TOOL" : "MATCH_TEXT_ONLY");
  }

  const clarificacao = perguntaDe(principal, reconhecimento, documentos);
  if (clarificacao?.tipo === "periodicidade") explicacoes.push("MISSING_PERIOD");
  if (clarificacao?.tipo === "base_de_comparacao") explicacoes.push("MISSING_BASIS");
  if (clarificacao?.tipo === "valor_sem_destino") explicacoes.push("MISSING_TARGET");

  const alternativas = resultados
    .filter((r) => r.doc.id !== principal?.id && r.doc.tipo !== "apoio")
    .slice(0, MAX_ALTERNATIVAS)
    .map((r) => acaoDe(r.doc, reconhecimento));

  const estado: EstadoPlano = clarificacao
    ? "clarificar"
    : principal
      ? "pronto"
      : "reconhecido";

  const confianca: Confianca = principal && destacado ? "alta" : principal ? "media" : "baixa";

  return {
    ...base,
    estado,
    confianca,
    explicacoes,
    ...(principal ? { principal } : {}),
    ...(clarificacao ? { clarificacao } : {}),
    alternativas,
    apoio: apoioDe(consulta, reconhecimento, apoioPrincipal),
  };
}

/**
 * O que vai viajar no contexto — os VALORES, e só os que o destino aceita.
 *
 * É a única função de todo o módulo que devolve valores em vez de tipos, e
 * é de propósito: o que sai daqui vai direto para `guardarHandoff`, que
 * escreve em `sessionStorage` e mais lado nenhum. Se um dia alguém quiser
 * medir um plano, mede o plano — que não tem valores.
 */
export function camposDoHandoff(plano: PlanoBusca): Partial<Record<TipoEntidade, string | number>> {
  const acao = plano.principal;
  if (!acao) return {};

  const campos: Partial<Record<TipoEntidade, string | number>> = {};
  for (const tipo of acao.aceita) {
    const e = plano.entidades.find((x) => x.tipo === tipo);
    if (e) campos[tipo] = e.valor;
  }
  return campos;
}

/**
 * A frase da linha de interpretação — só o que foi mesmo reconhecido.
 *
 * Devolve as PALAVRAS DA PESSOA («3 500 €», «Porto», «recibos verdes») e
 * não as nossas chaves internas. É o que torna a linha corrigível: ela
 * reconhece o que escreveu e vê imediatamente o que percebemos a mais ou
 * a menos.
 */
export function resumoDoPedido(plano: PlanoBusca, rotuloDominio: (d: DominioBusca) => string): string[] {
  const partes: string[] = [];
  if (plano.dominio) partes.push(rotuloDominio(plano.dominio));
  for (const e of plano.entidades) {
    if (e.tipo === "comparacao") continue;
    partes.push(e.tipo === "valor" ? `${e.texto} €` : e.texto);
  }
  return [...new Set(partes)];
}
