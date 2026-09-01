// ═══════════════════════════════════════════════════════════════════════
//  O CONTRATO DA PESQUISA — um documento serializável, e nada mais
//  ---------------------------------------------------------------------
//  Este ficheiro é deliberadamente leve: tipos, rótulos e constantes. Não
//  importa `fiscal-data.ts`, não importa manifestos, não importa ícones.
//
//  A razão é arquitectural e está no ponto P1-02 da auditoria do cabeçalho:
//  o lançador da pesquisa vive no bundle inicial de TODAS as páginas
//  públicas. Se o contrato arrastasse o catálogo, o catálogo entrava com
//  ele — e o comentário «só carrega ao abrir» passava a ser uma promessa
//  contrariada pelo grafo de imports.
//
//  O ícone é o exemplo mais claro do que NÃO entra aqui. A versão anterior
//  guardava um nome de ícone por item e um mapa `nome → componente` no
//  painel; era mais uma ligação que nenhum compilador verificava. Um
//  documento de pesquisa transporta o TIPO, e o tipo escolhe o ícone no
//  sítio onde há ícones.
// ═══════════════════════════════════════════════════════════════════════

/**
 * O que a coisa É — decide o ícone, o rótulo e o desempate de ordenação.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ENTRARAM TRÊS TIPOS NOVOS (v3)                                │
 * │                                                                     │
 * │ O índice cobria o que é CONTEÚDO — ferramentas, guias, atividades,   │
 * │ o quiz e a página de planos. Cobria bem, e mesmo assim havia         │
 * │ perguntas inteiras do site a que a pesquisa não sabia responder:     │
 * │                                                                     │
 * │   «quando entrego o IVA?»      → obrigação: a resposta é um prazo    │
 * │                                   com base legal e fonte, não um     │
 * │                                   guia sobre IVA;                    │
 * │   «como é que calculam isto?»  → página: metodologia, estado dos     │
 * │                                   dados, privacidade, termos;        │
 * │   «quero falar com alguém»     → apoio: o diretório de              │
 * │                                   contabilistas, que é uma pessoa    │
 * │                                   do outro lado e não um artigo.     │
 * │                                                                     │
 * │ Nenhuma delas devolvia nada, ou devolvia o guia mais parecido — que  │
 * │ num produto fiscal é pior do que não devolver nada. Continuam todas  │
 * │ DERIVADAS das fontes canónicas (`prazos.ts`, `navegacao.ts`): o      │
 * │ índice ganhou famílias, não ganhou uma lista escrita à mão.          │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export type TipoDoc =
  | "ferramenta"
  | "guia"
  | "atividade"
  | "quiz"
  | "plano"
  | "obrigacao"
  | "pagina"
  | "apoio";

/**
 * COMO SE APRESENTA O CAMINHO PREPARADO — e nunca o que ele calcula.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O RENDERER MUDA O CONTEÚDO, NUNCA A MOLDURA                          │
 * │                                                                     │
 * │ A tentação, com oito tipos de documento, é dar a cada um a sua       │
 * │ superfície. Seria voltar ao mini-painel de controlo que o ponto      │
 * │ P1-04 já desmontou uma vez: a pessoa passaria a ter de aprender      │
 * │ uma interface por família antes de fazer a pergunta.                 │
 * │                                                                     │
 * │ A moldura é uma só — interpretação, um caminho principal, no máximo  │
 * │ uma pergunta, alternativas discretas. O renderer decide o que se lê  │
 * │ DENTRO dela: uma obrigação mostra fonte e vigência, uma comparação   │
 * │ mostra os dois cenários, um apoio mostra o que é partilhado. Nada    │
 * │ disto calcula: a lógica fiscal fica nas ferramentas canónicas, e a   │
 * │ pesquisa abre-as com o contexto que reconheceu.                      │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export type RendererBusca =
  | "direct_route"
  | "prepared_tool"
  | "comparison"
  | "obligation"
  | "guide"
  | "professional_support";

/**
 * O EIXO DE ASSUNTO — a família de decisão a que a coisa pertence.
 *
 * Não é o tipo (o que a coisa é) nem a intenção (o que a pessoa quer
 * fazer): é SOBRE O QUÊ. É este eixo que permite a uma consulta sobre
 * empresa não ser respondida com a calculadora de recibos verdes só
 * porque as duas dizem «IRS» na descrição.
 *
 * As ferramentas declaram-no no catálogo (`ToolDefinition.dominio`) e os
 * guias herdam-no do hub — em nenhum dos casos há uma segunda lista.
 */
export type DominioBusca =
  | "recibos"
  | "empresa"
  | "salario"
  | "preco"
  | "descoberta"
  | "obrigacoes"
  | "patrimonio"
  | "comparar"
  | "produto"
  | "apoio";

/**
 * O que a pesquisa consegue reconhecer numa frase — e mais nada.
 *
 * A lista é curta de propósito. Cada entrada aqui é uma promessa de que
 * existe um extractor determinístico, testado, que a sabe encontrar sem
 * inventar; e de que existe pelo menos um destino que a sabe receber. Um
 * tipo de entidade sem as duas coisas seria uma etiqueta bonita a dizer
 * «percebi» por cima de um palpite.
 */
export type TipoEntidade =
  | "valor"
  | "periodicidade"
  | "ano"
  | "regime"
  | "localidade"
  | "perfil"
  | "comparacao";

/** A proveniência de uma regra que a pesquisa apresenta como facto. */
export interface FonteDoc {
  label: string;
  url: string;
  /** ISO. A data em que a regra foi conferida contra a fonte oficial. */
  revistoEm: string;
}

/**
 * O que a pessoa PRECISA DE FAZER.
 *
 * É o eixo que substitui «Ferramentas / Guias / Atividades» como filtro
 * principal (ponto P1-08): quem chega com «tenho de cobrar IVA?» não sabe
 * se precisa de um guia, de um simulador ou do classificador — mas sabe
 * perfeitamente que precisa de CUMPRIR uma obrigação.
 */
export type Intencao = "simular" | "compreender" | "cumprir";

/** A quem serve. `todos` é transversal, não «desconhecido». */
export type PerfilBusca = "independente" | "dependente" | "empresa" | "todos";

export interface DocumentoBusca {
  /** `guia:iva-recibos-verdes`, `ferramenta:simulador-irs`, … — único. */
  id: string;
  tipo: TipoDoc;
  titulo: string;
  descricao: string;
  href: string;
  /** Linguagem comum e erros frequentes. Pesam quase tanto como o título. */
  aliases: string[];
  /** Agrupamento editorial (hub do guia, família da ferramenta). */
  grupo: string;
  intencoes: Intencao[];
  perfis: PerfilBusca[];
  /** A família de decisão. Ver `DominioBusca`. */
  dominio: DominioBusca;
  /** Como o caminho preparado se apresenta. Ver `RendererBusca`. */
  renderer: RendererBusca;
  /** Ano a que a matéria se aplica, quando é canónico. */
  anoFiscal?: number;
  /**
   * As entidades que ESTE destino sabe receber.
   *
   * É uma lista de permissões, não uma sugestão: o handoff só transporta
   * o que aqui estiver, e o que não estiver não é preenchido nem
   * prometido. Sem isto, «reconheci 1 200 €» acabaria a empurrar um valor
   * para uma ferramenta que não tem onde o pôr — e a pessoa chegaria a um
   * ecrã que diz ter percebido e não mudou nada.
   */
  aceita?: TipoEntidade[];
  /** Obrigatória nas obrigações: nenhuma regra chega ao ecrã sem fonte. */
  fonte?: FonteDoc;
  /**
   * `true` quando o destino exige sessão iniciada.
   *
   * A pesquisa continua a mostrá-lo — esconder o painel de quem ainda não
   * entrou seria responder «não existe» a uma pergunta cuja resposta é
   * «existe, e é preciso entrar». Mas di-lo ANTES do clique.
   */
  requerConta?: boolean;
  /** Desempate estável entre resultados com pontuação semelhante (0–100). */
  prioridade: number;
}

export interface IndiceBusca {
  versao: number;
  documentos: DocumentoBusca[];
}

/** Sobe quando a FORMA do documento muda — o nome do ficheiro leva-a. */
export const VERSAO_INDICE = 3;

/**
 * O índice é um ficheiro estático, servido pela CDN e versionado no nome.
 *
 * JSON e não um módulo JavaScript: não passa pelo parser de JS, não entra
 * no grafo de módulos e é `JSON.parse` puro. É o mesmo raciocínio que já
 * governa os dados do popup de Novidades.
 */
export const CAMINHO_INDICE = `/busca/indice.v${VERSAO_INDICE}.json`;

export const ROTULO_TIPO: Record<TipoDoc, string> = {
  ferramenta: "Simulador",
  guia: "Guia",
  atividade: "Atividade",
  quiz: "Quiz",
  plano: "Plano",
  obrigacao: "Obrigação",
  pagina: "Página",
  apoio: "Apoio",
};

/** Plural para cabeçalhos de grupo. */
export const ROTULO_TIPO_PLURAL: Record<TipoDoc, string> = {
  ferramenta: "Simuladores e ferramentas",
  guia: "Guias",
  atividade: "Atividades",
  quiz: "Quiz",
  plano: "Planos",
  obrigacao: "Prazos e obrigações",
  pagina: "Páginas",
  apoio: "Apoio profissional",
};

/** O rótulo curto de cada família de decisão. Aparece na interpretação. */
export const ROTULO_DOMINIO: Record<DominioBusca, string> = {
  recibos: "Recibos verdes",
  empresa: "Empresa",
  salario: "Salário",
  preco: "Preço",
  descoberta: "Que negócio abrir",
  obrigacoes: "Prazos e obrigações",
  patrimonio: "Património e heranças",
  comparar: "Comparar regimes",
  produto: "Recibo Certo",
  apoio: "Apoio profissional",
};

/**
 * A ordem por que os grupos aparecem quando os resultados são unificados.
 *
 * Não é alfabética: é a ordem em que uma resposta costuma ser útil. Quem
 * pergunta «quanto recebo?» quer a ferramenta antes da explicação.
 */
export const ORDEM_TIPOS: TipoDoc[] = [
  "ferramenta",
  "obrigacao",
  "guia",
  "apoio",
  "atividade",
  "quiz",
  "plano",
  "pagina",
];

export type FiltroIntencao = "tudo" | Intencao;

export interface IntencaoDef {
  id: FiltroIntencao;
  label: string;
  /** Uma linha que explica o eixo sem jargão de catálogo. */
  sub: string;
}

export const INTENCOES: IntencaoDef[] = [
  { id: "tudo", label: "Tudo", sub: "Tudo o que existe no Recibo Certo" },
  { id: "simular", label: "Simular", sub: "Calcular um valor na tua situação" },
  { id: "compreender", label: "Compreender", sub: "Perceber uma regra ou um documento" },
  { id: "cumprir", label: "Cumprir", sub: "Fazer o que é preciso, e a tempo" },
];

/** Exemplos rotativos do campo — perguntas, não categorias. */
export const EXEMPLOS_PESQUISA = [
  "Quanto vou receber?",
  "Tenho de cobrar IVA?",
  "Compensa abrir empresa?",
  "Quando pago a Segurança Social?",
];

/**
 * A intenção que a rota actual sugere.
 *
 * É uma SUGESTÃO de filtro inicial e não uma segunda memória de navegação:
 * o utilizador pode trocá-la dentro do painel, e a rota volta a mandar na
 * abertura seguinte. Ver o quadro em `nav-config.tsx` sobre porque a rota
 * é a única verdade que todos os caminhos já actualizam.
 */
export function intencaoPorContexto(pathname: string): FiltroIntencao {
  if (pathname.startsWith("/guias")) return "compreender";
  if (pathname.startsWith("/ferramentas") || pathname.startsWith("/dashboard")) return "simular";
  if (pathname.startsWith("/quiz-fiscal")) return "compreender";
  return "tudo";
}
