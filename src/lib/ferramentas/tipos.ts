// ═══════════════════════════════════════════════════════════════════════
//  O CONTRATO DE UMA FERRAMENTA — §7.2 do relatório do hub
//  ---------------------------------------------------------------------
//  Tipos e nada mais. Sem React, sem motores fiscais, sem ícones.
//
//  A razão é a mesma que governa `busca/esquema.ts`: o catálogo alimenta o
//  hub, o painel, a navegação, a pesquisa e o sitemap. Se o contrato
//  arrastasse um componente de ícone, arrastava a árvore de ícones com ele
//  — e o hub, que devia ser quase todo servidor, passava a pagar bundle de
//  cliente por metadados. O ícone viaja como CHAVE; quem tem ícones é que
//  os resolve (`components/ferramentas/icon-map.tsx`).
//
//  O defeito que este ficheiro existe para tornar impossível (P0-04): havia
//  três registos paralelos — `FERRAMENTAS`, `FERRAMENTA_SLUGS` e `BLOCOS` do
//  painel. Os testes provavam que dois deles coincidiam; nenhum provava que
//  o inventário estava completo. Duas calculadoras reais viviam escondidas
//  dentro de guias e não constavam de lista nenhuma.
// ═══════════════════════════════════════════════════════════════════════

// `import type` e não import: o TypeScript apaga-o na compilação, e o
// catálogo continua a não ter nenhuma dependência de execução. A família de
// decisão vive no contrato da pesquisa porque é lá que ela é lida — aqui é
// a ferramenta a declarar a sua, que é a única forma de não haver depois
// uma segunda lista a dizer o mesmo por outras palavras.
import type { DominioBusca, TipoEntidade } from "@/lib/busca/esquema";

/** O que a ferramenta É — decide o ícone-tipo e o rótulo, nunca o acesso. */
export type ToolKind =
  | "simulator"
  | "calculator"
  | "decider"
  | "validator"
  | "wizard"
  | "map";

/** A quem serve. Uma ferramenta pode servir vários perfis. */
export type ToolProfile = "independente" | "dependente" | "empresa" | "familia";

/**
 * O que a pessoa vem cá FAZER — o eixo principal de descoberta (§4.3).
 *
 * Ninguém pensa «quero um simulador»; pensa «quanto vou receber?». O `kind`
 * é estrutura interna, o `intent` é a pergunta humana.
 */
export type ToolIntent = "calcular" | "comparar" | "verificar" | "cumprir";

/**
 * Quanto espaço a tarefa pede (§P1-01).
 *
 * Substitui a exceção por pathname que o layout tinha codificada
 * (`pathname === "/ferramentas/simulador-irs"`). A largura passa a ser uma
 * propriedade da ferramenta, não uma linha de `if`.
 */
export type ToolLayout = "compact" | "split" | "wide" | "map";

/** Sinal de ciclo de vida. Não se mistura com acesso nem com benefício. */
export type ToolStatus = "novo" | "beta" | "atualizado";

/** Superfícies onde a ferramenta aparece. Derivadas, nunca escritas duas vezes. */
export type ToolSurface = "hub" | "homepage" | "dashboard" | "search" | "sitemap";

export interface ToolAccess {
  /** O cálculo principal. Inegociavelmente grátis (§11.1). */
  core: "free";
  /** Conta: nunca exigida para calcular. */
  account: "none" | "optional";
  /** Exportar PDF/CSV pode ser Plus — o cálculo não. */
  export: "free" | "plus";
  /** Envio voluntário para a FIZ. Nunca exige Plus (§11.3). */
  fizHandoff: "optional-free" | "none";
}

export interface ToolDefinition {
  id: string;
  slug: string;
  canonicalHref: `/ferramentas/${string}`;
  /** Título orientado à tarefa — o que a pessoa quer fazer. É o do cartão. */
  title: string;
  /**
   * H1 da landing, quando a âncora de pesquisa não cabe no título do cartão.
   *
   * O cartão do hub vive numa grelha e quer ser curto; o H1 tem de conter a
   * query que as pessoas escrevem («simulador de IRS 2026»). São trabalhos
   * diferentes, mas continuam a sair do mesmo sítio — a alternativa era o H1
   * ficar escrito à mão na página, livre de divergir do catálogo.
   */
  h1?: string;
  /** Uma frase: o que a pessoa RECEBE. Não uma enumeração de leis (§5.3). */
  shortOutcome: string;
  description: string;
  kind: ToolKind;
  profiles: ToolProfile[];
  intents: ToolIntent[];
  topics: string[];
  /** Linguagem comum e erros frequentes de quem procura (alimenta a pesquisa). */
  aliases: string[];
  /** Chave do `icon-map.tsx` — nunca um componente. */
  icon: string;
  layout: ToolLayout;
  estimatedMinutes: number;
  /** O que a pessoa precisa de ter à mão antes de começar (§P1-07). */
  requiredInputs: string[];
  access: ToolAccess;
  privacy: "local-only";
  fiscalYear: 2026;
  reviewedAt: string;
  /** Curadoria explícita. Nunca «mais populares» sem dados reais (§4.4). */
  featuredRank?: number;
  /** Benefício, quando existe. Um por cartão, no máximo. */
  highlight?: string;
  status?: ToolStatus;
  dashboardHref?: `/dashboard/${string}`;
  /** Guia que embute esta ferramenta — a ligação é nos dois sentidos. */
  guiaEmbedHref?: `/guias/${string}`;
  /** CTA específico: «Calcular líquido», não «Abrir». */
  cta: string;
  relatedToolIds: string[];
  relatedGuideSlugs: string[];
  surfaces: ToolSurface[];
  /** Desempate estável entre resultados de pesquisa semelhantes (0–100). */
  searchPriority: number;
  /** Família apresentada no resultado da pesquisa. */
  searchGroup: string;
  /**
   * A FAMÍLIA DE DECISÃO a que a ferramenta pertence — sobre o quê é.
   *
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ PORQUE NÃO SE DERIVA DE `topics`                                   │
   * │                                                                   │
   * │ Foi a primeira tentativa e estava errada de forma silenciosa. Os   │
   * │ `topics` são etiquetas de assunto e várias ferramentas partilham   │
   * │ as mesmas: `comparar-regimes` tem `irc` e `empresa`, tal como o    │
   * │ `simulador-empresa`, e o `planeador-contratacao` tem `salario` e   │
   * │ `empresa` ao mesmo tempo. Uma regra de prioridade sobre a lista    │
   * │ punha-as no mesmo sítio — e a única forma de descobrir era ver a   │
   * │ pesquisa a devolver o simulador de empresa a quem perguntou pelo   │
   * │ custo de contratar alguém.                                        │
   * │                                                                   │
   * │ A ferramenta declara-o. É obrigatório: uma ferramenta nova sem     │
   * │ família não compila, que é a única forma de isto não passar a ser  │
   * │ uma lista com buracos daqui a seis meses.                         │
   * └───────────────────────────────────────────────────────────────────┘
   */
  dominio: DominioBusca;
  /**
   * O que esta ferramenta sabe RECEBER da pesquisa, quando alguém escreve
   * uma frase com contexto («quanto me fica de 1 200 €?»).
   *
   * Ausente ou vazio = a pesquisa abre-a limpa. Nunca se declara aqui uma
   * entidade que a página não consuma: seria prometer um preenchimento
   * que não acontece.
   */
  aceitaEntidades?: TipoEntidade[];
}

/**
 * Um percurso: uma sequência com um resultado, não mais uma grelha (§6).
 * Os passos referenciam ids do catálogo — `validar.ts` reprova se mentirem.
 */
export interface ToolPathway {
  id: string;
  title: string;
  outcome: string;
  steps: Array<{ toolId: string; note: string }>;
}

export const ROTULO_KIND: Record<ToolKind, string> = {
  simulator: "Simulador",
  calculator: "Calculadora",
  decider: "Decisor",
  validator: "Verificador",
  wizard: "Wizard",
  map: "Mapa",
};

export const ROTULO_INTENT: Record<ToolIntent, string> = {
  calcular: "Calcular o que recebo ou pago",
  comparar: "Comparar e decidir",
  verificar: "Verificar se está certo",
  cumprir: "Preparar uma obrigação",
};

/** Rótulo curto, para chips e filtros. */
export const ROTULO_INTENT_CURTO: Record<ToolIntent, string> = {
  calcular: "Calcular",
  comparar: "Comparar",
  verificar: "Verificar",
  cumprir: "Cumprir",
};

export const ROTULO_PERFIL: Record<ToolProfile, string> = {
  independente: "Independente",
  dependente: "Por conta de outrem",
  empresa: "Empresa",
  familia: "Família e património",
};

export const ROTULO_STATUS: Record<ToolStatus, string> = {
  novo: "Novo",
  beta: "Beta",
  atualizado: "Atualizado",
};
