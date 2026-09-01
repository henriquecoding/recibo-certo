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
  fonte?: FonteDoc;
  /**
   * Os TIPOS de entidade que este destino vai receber — nunca os valores.
   *
   * A distinção é toda: um plano é serializável, é medível e é lido por
   * quem depura. Se transportasse «1 200 €», bastava alguém registá-lo
   * uma vez para o valor sair do dispositivo.
   */
  campos: TipoEntidade[];
}

export type TipoClarificacao = "valor_sem_destino" | "periodicidade" | "bruto_ou_faturado" | "iva_incluido";

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
  | "MISSING_VAT_CONTEXT"
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
    ...(doc.fonte ? { fonte: doc.fonte } : {}),
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
 * │ O TESTE QUE UMA PERGUNTA TEM DE PASSAR PARA EXISTIR                  │
 * │                                                                     │
 * │ «Responder a isto muda MATERIALMENTE o resultado?» Se a resposta é   │
 * │ não, a pergunta é um obstáculo com ar de cuidado — e o custo é real: │
 * │ cada pergunta é uma paragem entre a pessoa e o que ela veio fazer.   │
 * │                                                                     │
 * │ As quatro que existem passam o teste:                                │
 * │                                                                     │
 * │  · um valor sem destino («1200») pode ser cinco contas diferentes;   │
 * │  · «por mês» ou «por ano» muda o escalão de IRS e o resultado todo;  │
 * │  · numa comparação, «bruto» e «faturado» não são o mesmo dinheiro —  │
 * │    comparar um com o outro dá uma conclusão errada e convincente;    │
 * │  · com ou sem IVA muda o que a pessoa recebe de facto.               │
 * │                                                                     │
 * │ E há sempre «Não sei». Obrigar a escolher entre duas opções que a    │
 * │ pessoa não distingue é pedir-lhe que invente um dado — que é          │
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
  const comparacao = entidade(reconhecimento, "comparacao");

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

  if (!principal) return undefined;

  // 2. Numa comparação, bruto e faturado não são o mesmo dinheiro.
  if (comparacao && valor && principal.renderer === "comparison") {
    return {
      tipo: "bruto_ou_faturado",
      pergunta: `${valor.texto} € é o valor bruto ou o valor faturado em cada cenário?`,
      porque: "A resposta é o que torna a comparação equivalente.",
      opcoes: [
        { id: "faturado", label: "Valor faturado" },
        { id: "bruto", label: "Valor bruto" },
        OPCAO_NAO_SEI,
      ],
    };
  }

  // 3. Um valor sem periodicidade, num destino que a sabe receber.
  if (valor && !periodicidade && principal.campos.includes("valor") && (principal.tipo === "ferramenta")) {
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

  // 4. Com ou sem IVA, no cálculo de um recibo.
  if (valor && principal.dominio === "recibos" && principal.renderer === "prepared_tool") {
    const jaDisse = reconhecimento.entidades.some((e) => e.tipo === "regime" && e.valor === "iva");
    if (!jaDisse) {
      return {
        tipo: "iva_incluido",
        pergunta: `${valor.texto} € inclui IVA?`,
        porque: "O IVA não é rendimento — é dinheiro que passa por ti.",
        opcoes: [
          { id: "sem-iva", label: "Não inclui" },
          { id: "com-iva", label: "Inclui" },
          { id: "isento", label: "Estou isento" },
        ],
      };
    }
  }

  return undefined;
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
  if (clarificacao?.tipo === "iva_incluido" || clarificacao?.tipo === "bruto_ou_faturado") {
    explicacoes.push("MISSING_VAT_CONTEXT");
  }
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
