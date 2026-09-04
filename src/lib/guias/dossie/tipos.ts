// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE DOSSIÊ DE GUIA — os tipos
//  ---------------------------------------------------------------------
//  Um Guia já é uma base de factos estruturada, verificada e datada. O que
//  lhe faltava era uma PROJEÇÃO (o que dele interessa a um profissional),
//  um TRANSPORTE (como segue, com consentimento e revogação) e uma CONSOLA
//  (o que o profissional faz com ele).
//
//  Este ficheiro é o contrato dos três. É deliberadamente LEVE — só tipos e
//  constantes — porque atravessa a fronteira servidor/cliente: a folha de
//  composição recebe um `DossieDeGuia` já projetado, por props, e não pode
//  importar catálogos. Ver `docs/architecture/motor-dossie-de-guia.md` e a
//  regra de empacotamento de `atalhos.servidor.ts`.
//
//  ⚠️ A REGRA ABSOLUTA, herdada do Opportunity Discovery Engine:
//  **nenhum item chega ao ecrã do contabilista sem proveniência.** Não há
//  caminho no tipo para o evitar — `proveniencia` é obrigatória em
//  `ItemDossie`, e um item construído sem ela não compila.
// ═══════════════════════════════════════════════════════════════════════

import type { Confidence, ReviewSeverity } from "@/lib/guias/claims";
import type { Authority, LegalSourceId } from "@/lib/guias/legal-sources";
import type { Archetype, Categoria, HubGroup } from "@/lib/guias/manifests";
import type { AreaDoCaso } from "@/lib/contabilistas/areas";

// ─── Proveniência ──────────────────────────────────────────────────────

/**
 * De onde vem cada item. Sem isto não há item.
 *
 * As seis origens não são categorias soltas: separam o que a casa afirma
 * (manifesto, afirmação, fonte, motor, pacote) do que a PESSOA disse
 * (`pessoa`). Um contabilista que lê o dossiê tem de conseguir distinguir
 * «o guia diz» de «o cliente marcou» sem ter de adivinhar — e é essa
 * distinção que impede o dossiê de se disfarçar de parecer.
 */
export type Proveniencia =
  | { origem: "manifesto"; slug: string }
  | {
      origem: "afirmacao";
      claimId: string;
      fonteIds: LegalSourceId[];
      confianca: Confidence;
      severidade: ReviewSeverity;
      vigencia: { de: string; ate?: string };
    }
  | { origem: "fonte"; fonteId: LegalSourceId; autoridade: Authority; verificadaEm: string }
  | { origem: "motor"; ruleKey: string; ano: number }
  | { origem: "pacote"; guia: string; verificadoEm: string }
  | { origem: "pessoa"; campo: "checklist" | "resposta" | "nota" | "simulacao" };

/** Rótulo em pt-PT de cada origem, para a consola e para os formatos. */
export const ROTULO_ORIGEM: Record<Proveniencia["origem"], string> = {
  manifesto: "Registo editorial do guia",
  afirmacao: "Afirmação com base legal",
  fonte: "Fonte oficial",
  motor: "Motor fiscal",
  pacote: "Pacote editorial verificado",
  pessoa: "Respondido pela própria pessoa",
};

// ─── Secções ───────────────────────────────────────────────────────────

export type IdSeccao =
  | "resumo" // o caso em dez linhas (SBAR)
  | "aplicabilidade" // o que a pessoa respondeu, incluindo «não sei»
  | "elementos" // a checklist com estado  → vira lista PBC
  | "julgamento" // afirmações review_required → agenda da consulta
  | "prazos" // datas e vigências
  | "numeros" // dados do ano, com base legal
  | "base_legal" // fontes por autoridade
  | "avisos" // bloqueadores do pacote
  | "simulacao" // bagagem, se existir e se for consentida
  | "historico"; // o que mudou no guia desde a composição

/** A ordem com que as secções aparecem — em qualquer superfície. */
export const ORDEM_SECCOES: readonly IdSeccao[] = [
  "resumo", "aplicabilidade", "elementos", "julgamento",
  "prazos", "numeros", "base_legal", "avisos", "simulacao", "historico",
];

export const TITULO_SECCAO: Record<IdSeccao, string> = {
  resumo: "O caso em dez linhas",
  aplicabilidade: "O enquadramento, respondido",
  elementos: "Elementos a reunir",
  julgamento: "O que exige julgamento profissional",
  prazos: "Datas e vigências",
  numeros: "Números do ano",
  base_legal: "Base legal",
  avisos: "Avisos do pacote editorial",
  simulacao: "A simulação que a pessoa trouxe",
  historico: "O que mudou desde que foi composto",
};

/** O que a consola pode fazer com a seleção de cada secção. */
export const ACAO_NATURAL: Record<IdSeccao, string> = {
  resumo: "Copiar o resumo",
  aplicabilidade: "Devolver como perguntas",
  elementos: "Pedir ao cliente",
  julgamento: "Levar para a agenda da consulta",
  prazos: "Exportar para a agenda (.ics)",
  numeros: "Copiar a tabela",
  base_legal: "Copiar como citações",
  avisos: "Copiar os avisos",
  simulacao: "Copiar a simulação",
  historico: "Marcar como visto",
};

/**
 * As duas secções sem as quais um dossiê não é um dossiê.
 *
 * `resumo` porque sem ele o destinatário não sabe de que caso se trata;
 * `base_legal` porque sem ela o dossiê passa a ser opinião. Ver §4.3.
 */
export const SECCOES_MINIMAS: readonly IdSeccao[] = ["resumo", "base_legal"];

// ─── Itens ─────────────────────────────────────────────────────────────

/** O que a pessoa já disse sobre um elemento a reunir. */
export type EstadoElemento = "tenho" | "por_reunir" | "nao_aplica" | "nao_sei";

export const ROTULO_ESTADO_ELEMENTO: Record<EstadoElemento, string> = {
  tenho: "Já tenho",
  por_reunir: "Por reunir",
  nao_aplica: "Não se aplica",
  nao_sei: "Não sei",
};

/** Resposta a um critério de aplicabilidade. Nasce sempre em «não sei». */
export type RespostaPergunta = "sim" | "nao" | "nao_sei";

export const ROTULO_RESPOSTA: Record<RespostaPergunta, string> = {
  sim: "Sim",
  nao: "Não",
  nao_sei: "Não sei",
};

/** Uma fonte oficial, tal como viaja no dossiê. Nunca o objeto inteiro. */
export interface FonteDoDossie {
  fonteId: LegalSourceId;
  autoridade: Authority;
  titulo: string;
  artigo?: string;
  url: string;
  verificadaEm: string;
}

/**
 * Um item do dossiê.
 *
 * `texto` é EXATAMENTE a string publicada no guia. Não há aqui resumo,
 * paráfrase nem geração — `dossie:fidelidade` compara item a item com a
 * fonte e reprova qualquer divergência.
 */
export interface ItemDossie {
  /** Estável: `${seccao}.${n}` ou o `claimId`/`fonteId` quando existe. */
  id: string;
  texto: string;
  proveniencia: Proveniencia;
  /** Só em `elementos`: o que a pessoa já disse sobre este item. */
  estado?: EstadoElemento;
  /** Só em `elementos`: a numeração PBC, que é o que faz responder. */
  numero?: number;
  /** Só em `julgamento`: severidade, para ordenar a agenda. */
  peso?: ReviewSeverity;
  /** Só em `prazos`: a data que torna o item acionável. */
  quando?: { de: string; ate?: string };
  /** Só em `aplicabilidade`. */
  sentido?: "confirma" | "exclui";
  resposta?: RespostaPergunta;
  /** Só em `numeros`. */
  ruleKey?: string;
  ano?: number;
  /** Só em `base_legal`. */
  fonte?: FonteDoDossie;
  /** Só em `historico`. */
  data?: string;
  tipo?: string;
}

export interface SeccaoDossie {
  id: IdSeccao;
  /** pt-PT, para os dois lados. */
  titulo: string;
  itens: ItemDossie[];
  /**
   * Consentida pela pessoa nesta passagem. Uma secção não consentida não é
   * filtrada na leitura: **não é composta de todo** (§10.2). O campo existe
   * para a consola poder dizer «isto seguiu», nunca para esconder.
   */
  incluida: boolean;
}

// ─── O dossiê ──────────────────────────────────────────────────────────

export interface CabecalhoDoGuia {
  slug: string;
  titulo: string;
  arquetipo: Archetype;
  categoria: Categoria;
  hub: HubGroup;
  area: AreaDoCaso;
}

export interface DossieDeGuia {
  versao: 1;
  guia: CabecalhoDoGuia;
  /**
   * A VERSÃO LIDA. É isto que resolve a obrigação 3: três semanas depois,
   * quem lê sabe sobre que texto se falou — e `historico` mostra o que
   * mudou desde então.
   */
  fixado: {
    revistoEm: string;
    aplicavelDe: string;
    aplicavelAte?: string;
    appVersion: string;
    compostoEm: string;
    /** sha-256 das secções incluídas. O `payload_hash` da FIZ, aqui. */
    impressao: string;
  };
  seccoes: SeccaoDossie[];
  /** O que a pessoa escreveu, se escreveu. Opcional e curto. */
  nota?: string;
  consentimento: {
    versao: string;
    seccoes: IdSeccao[];
    em: string;
    expiraEm: string;
  };
}

// ─── A projeção ────────────────────────────────────────────────────────

/**
 * O Guia visto por quem o vai receber, antes de a pessoa responder seja o
 * que for.
 *
 * Vive aqui e não em `projecao.servidor.ts` por uma razão de fronteira: a
 * folha de composição é um componente de cliente e precisa DO TIPO, não do
 * módulo que o produz. Declará-lo no ficheiro `server-only` obrigava o
 * cliente a importá-lo para lá — e um `import type` a um módulo desses é
 * um convite a alguém, um dia, apagar o `type`.
 */
export interface ProjecaoDeGuia {
  guia: CabecalhoDoGuia;
  fixado: {
    revistoEm: string;
    aplicavelDe: string;
    aplicavelAte?: string;
    appVersion: string;
  };
  /**
   * De onde vem o texto editorial deste guia — o pacote verificado de
   * agosto de 2026 nos 112 da expansão, o registo editorial nos outros.
   * Viaja aqui para a composição não ter de o adivinhar.
   */
  editorial: Proveniencia;
  /** Nascem todas em «não sei». A folha aplica as respostas da pessoa. */
  perguntas: PerguntaDeGuia[];
  /** Os elementos a reunir, na ordem publicada. Sem estado — é da pessoa. */
  elementos: string[];
  /** As secções que não dependem do que a pessoa responde. */
  seccoes: SeccaoDossie[];
  /** Sinais para o routing (§5.3) e para a copy. */
  sinais: {
    afirmacoesPorRever: number;
    elementos: number;
    perguntas: number;
    fontes: number;
  };
  /** Para o aviso de exclusão da folha: «vê antes este guia». */
  relacionados: { slug: string; titulo: string }[];
}

// ─── Perguntas de enquadramento ────────────────────────────────────────

/**
 * Um critério de aplicabilidade, transformado em pergunta de três estados.
 *
 * «Não sei» é a resposta por omissão e NÃO é um erro: é o sinal mais útil
 * que o dossiê transporta, e é por aí que o contabilista começa. Um
 * formulário que obriga a escolher produz respostas inventadas, que são
 * piores do que nenhuma.
 */
export interface PerguntaDeGuia {
  id: string;
  /** O critério, tal e qual. */
  texto: string;
  sentido: "confirma" | "exclui";
  resposta: RespostaPergunta;
}

// ─── Seleção e extração (a consola) ────────────────────────────────────

/** O estado central da consola: que itens é que o profissional escolheu. */
export interface Selecao {
  itens: ReadonlySet<string>;
}

export type FormatoDeCopia = "markdown" | "texto";
export type FormatoDeFicheiro = "md" | "csv" | "ics" | "json";

export type AcaoDeExtracao =
  | { tipo: "copiar"; formato: FormatoDeCopia }
  | { tipo: "exportar"; formato: FormatoDeFicheiro }
  | { tipo: "pedir"; prazoDias?: number }
  | { tipo: "perguntar" }
  | { tipo: "anexar_a_proposta"; propostaId: string };

// ─── A volta: o Pedido de Elementos (a lista PBC) ──────────────────────

export type EstadoItemPedido = "pedido" | "entregue" | "nao_aplica" | "dispensado";

export const ROTULO_ESTADO_PEDIDO: Record<EstadoItemPedido, string> = {
  pedido: "Pedido",
  entregue: "Entregue",
  nao_aplica: "Não se aplica",
  dispensado: "Dispensado",
};

export interface ItemDePedido {
  /** Numerado: a convenção PBC, e o que faz o cliente responder. */
  n: number;
  /** O item do guia, tal e qual — ou o que o profissional escreveu. */
  texto: string;
  /**
   * `guia` quando o item veio do dossiê; `profissional` quando foi
   * escrito. Confundir os dois seria pôr na boca do Guia o que ele não
   * disse.
   */
  origem: "guia" | "profissional";
  /** `ItemDossie.id`, quando `origem === "guia"`. */
  itemId?: string;
  proveniencia: Proveniencia;
  estado: EstadoItemPedido;
  /** Por item, nunca global (§2.1). Só existe se alguém o escrever. */
  prazo?: string;
  /** Do contabilista, curta. */
  nota?: string;
}

export interface PedidoDeElementos {
  id: string;
  dossie: { ref: string; guia: string; impressao: string };
  itens: ItemDePedido[];
  criadoEm: string;
}

// ─── O rodapé obrigatório (§6.4) ───────────────────────────────────────

/**
 * A frase que acompanha TODAS as saídas — markdown, csv, ics, json e a
 * consola. Não é decoração: é a fronteira do §10.5 escrita onde o
 * destinatário a lê. Verificada por `dossie:copy`.
 */
export const RODAPE_DOSSIE =
  "Conteúdo informativo com fontes citadas. Não é parecer nem substitui o julgamento do contabilista certificado.";
