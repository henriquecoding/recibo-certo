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

/** O que a coisa É — decide o ícone, o rótulo e o desempate de ordenação. */
export type TipoDoc = "ferramenta" | "guia" | "atividade" | "quiz" | "plano";

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
  /** Ano a que a matéria se aplica, quando é canónico. */
  anoFiscal?: number;
  /** Desempate estável entre resultados com pontuação semelhante (0–100). */
  prioridade: number;
}

export interface IndiceBusca {
  versao: number;
  documentos: DocumentoBusca[];
}

/** Sobe quando a FORMA do documento muda — o nome do ficheiro leva-a. */
export const VERSAO_INDICE = 2;

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
};

/** Plural para cabeçalhos de grupo. */
export const ROTULO_TIPO_PLURAL: Record<TipoDoc, string> = {
  ferramenta: "Simuladores e ferramentas",
  guia: "Guias",
  atividade: "Atividades",
  quiz: "Quiz",
  plano: "Planos",
};

/**
 * A ordem por que os grupos aparecem quando os resultados são unificados.
 *
 * Não é alfabética: é a ordem em que uma resposta costuma ser útil. Quem
 * pergunta «quanto recebo?» quer a ferramenta antes da explicação.
 */
export const ORDEM_TIPOS: TipoDoc[] = ["ferramenta", "guia", "atividade", "quiz", "plano"];

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
