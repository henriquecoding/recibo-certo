// ═══════════════════════════════════════════════════════════════════════
//  O MANIFESTO DO PAINEL — uma fonte, três superfícies
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ HAVIA 27 DESTINOS EM CINCO GRUPOS, TODOS ABERTOS AO MESMO TEMPO      │
//  │                                                                     │
//  │ A lista vivia dentro de `app/dashboard/layout.tsx`, um Client        │
//  │ Component, e misturava quatro coisas que não são a mesma:            │
//  │                                                                     │
//  │   · ETAPAS de trabalho  (descobrir, formar preço, planear)           │
//  │   · OBJETOS guardados   (recibos, receitas, cenários)                │
//  │   · PERFIS fiscais      (recibos verdes, salário, empresa)           │
//  │   · CONTEÚDO editorial  (guias, quiz) e rotas públicas               │
//  │                                                                     │
//  │ Quem entrava tinha de perceber a arquitetura interna do produto      │
//  │ antes de escolher para onde ir. E porque a lista era estática e      │
//  │ vivia no componente, uma rota nova podia existir sem aparecer, ou    │
//  │ aparecer na superfície errada, sem nada reprovar.                    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  A NAVEGAÇÃO PASSA A TER DOIS EIXOS, E ELES NÃO SE MISTURAM:
//
//    ETAPA («o que estou a tentar resolver agora?»)  → é ISTO, a sidebar.
//    PERFIL («de que forma recebo ou opero?»)        → é o módulo fiscal
//                                                      da visão geral, com
//                                                      as três lentes.
//
//  Descobrir, Preços, Projeto e Contratar são ETAPAS e por isso são
//  destinos. «Recibos verdes», «Salário» e «Empresa» são PERFIS e por isso
//  continuam a ser lentes de um módulo, não entradas de menu.
//
//  REGRAS DESTE FICHEIRO
//   · Dados puros. Sem React, sem `use client`, sem motores, sem catálogo.
//     É importado pelo layout SERVIDOR e pelas ilhas cliente ao mesmo
//     tempo; qualquer import pesado aqui entra no shell de todas as
//     páginas do painel.
//   · O ícone é uma CHAVE (`components/ferramentas/icon-map.tsx` resolve-a),
//     pela mesma razão que o catálogo das ferramentas o faz.
//   · `toolId` liga ao catálogo. `dashboard-navegacao.test.ts` reprova um
//     `toolId` inexistente, um `dashboardHref` sem dono aqui, e uma
//     ferramenta que declara a superfície `dashboard` sem destino.
// ═══════════════════════════════════════════════════════════════════════

/** As zonas da sidebar, pela ordem em que aparecem. */
export type SeccaoDashboard =
  /** Onde se aterra e onde está tudo o que já se começou. */
  | "principal"
  /** As quatro etapas de construir um negócio. */
  | "negocio"
  /** O que se gere depois de ele existir. */
  | "atividade"
  /** Simuladores — recolhido por omissão. */
  | "decidir"
  /** Verificadores e apoio humano — recolhido por omissão. */
  | "apoio"
  /** Perfil, conta e plano. Vivem no rodapé da sidebar. */
  | "conta"
  /** Páginas públicas. Saem da navegação persistente (§8.1). */
  | "explorar";

export type VisibilidadeDashboard = "sempre" | "recolhivel" | "rodape";

export interface ItemNavDashboard {
  id: string;
  /** O nome completo. É SEMPRE o nome acessível, em qualquer largura. */
  label: string;
  /** O nome curto, para a barra do telemóvel. Nunca substitui o acessível. */
  curto: string;
  href: string;
  /** Chave de `ICONES_FERRAMENTAS`. */
  icone: string;
  seccao: SeccaoDashboard;
  visibilidade: VisibilidadeDashboard;
  /** Sai do shell do painel (página pública). */
  externo?: boolean;
  /** Id no catálogo das ferramentas, quando este destino é uma. */
  toolId?: string;
  /**
   * Como a rota ativa se resolve. `exato` existe para `/dashboard`, que de
   * outra forma acenderia em todas as subrotas.
   */
  match?: "exato" | "prefixo";
}

export interface GrupoNavDashboard {
  id: SeccaoDashboard;
  titulo: string;
  /** Uma linha que explica o critério do grupo. Só nos recolhíveis. */
  nota?: string;
  itens: ItemNavDashboard[];
  /** Recolhíveis abrem fechados — a não ser que a rota ativa esteja lá. */
  recolhivel: boolean;
}

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O TETO DOS DESTINOS SEMPRE VISÍVEIS — E PORQUE SÃO NOVE E NÃO OITO   │
 * │                                                                     │
 * │ O relatório pedia oito, contra os 27 de então, e a conta dele era:   │
 * │ dois principais + três de negócio + três de atividade.               │
 * │                                                                     │
 * │ «Planear uma contratação» faltava a essa conta. Não é um simulador   │
 * │ entre outros: é o quarto passo do mesmo arco — descobrir o que       │
 * │ vender, saber a que preço, montar o projeto e, quando ele já não     │
 * │ cabe numa pessoa, contratar a primeira. Enterrá-la em «Outros        │
 * │ simuladores» era repetir, à escala de um destino, o erro que este    │
 * │ ficheiro existe para corrigir.                                       │
 * │                                                                     │
 * │ Nove, então — com um teto declarado e testado, que é o que o oito    │
 * │ do relatório queria mesmo dizer: um limite explícito em vez de uma   │
 * │ lista que cresce sem ninguém reparar.                                │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export const MAXIMO_DESTINOS_SEMPRE = 9;

/** Lugares da barra inferior do telemóvel. Quatro destinos + «Menu». */
export const SLOTS_MOVEL = 5;

export const NAV_DASHBOARD: ItemNavDashboard[] = [
  // ── Principal ────────────────────────────────────────────────────────
  {
    id: "visao-geral",
    label: "Visão geral",
    curto: "Início",
    href: "/dashboard",
    icone: "LayoutGrid",
    seccao: "principal",
    visibilidade: "sempre",
    match: "exato",
  },
  {
    // «Os meus cenários» dizia o tipo de objeto que a base de dados guarda.
    // O que a pessoa tem ali é trabalho: preços, projetos, simulações e
    // planos de contratação. O nome passa a ser o dela, não o nosso.
    id: "trabalho",
    label: "O meu trabalho",
    curto: "Trabalho",
    href: "/dashboard/cenarios",
    icone: "Receipt",
    seccao: "principal",
    visibilidade: "sempre",
  },

  // ── O teu negócio — as quatro etapas, pela ordem da decisão ──────────
  {
    id: "descobrir",
    label: "Descobrir",
    curto: "Descobrir",
    href: "/dashboard/descobrir",
    icone: "Lightbulb",
    seccao: "negocio",
    visibilidade: "sempre",
    toolId: "descobrir-negocio",
  },
  {
    id: "precos",
    label: "Preços",
    curto: "Preços",
    href: "/dashboard/precos",
    icone: "Coin",
    seccao: "negocio",
    visibilidade: "sempre",
    toolId: "calcular-preco",
  },
  {
    id: "negocio",
    label: "Projeto de negócio",
    curto: "Projeto",
    href: "/dashboard/negocio",
    icone: "ChartProjection",
    seccao: "negocio",
    visibilidade: "sempre",
  },
  {
    // Para quem contrata. O quarto passo do arco, e o primeiro em que
    // deixa de haver só uma pessoa no negócio.
    id: "contratar",
    label: "Planear uma contratação",
    curto: "Contratar",
    href: "/dashboard/contratacao",
    icone: "Briefcase",
    seccao: "negocio",
    visibilidade: "sempre",
    toolId: "planeador-contratacao",
  },

  // ── Gerir atividade ──────────────────────────────────────────────────
  {
    id: "recibos",
    label: "Recibos registados",
    curto: "Recibos",
    href: "/dashboard/recibos",
    icone: "Invoice",
    seccao: "atividade",
    visibilidade: "sempre",
  },
  {
    id: "receitas",
    label: "Receitas",
    curto: "Receitas",
    href: "/dashboard/receitas",
    icone: "History",
    seccao: "atividade",
    visibilidade: "sempre",
  },
  {
    // Fica sempre visível mesmo sendo pouco frequente: é a única coisa
    // aqui que tem multa do outro lado.
    id: "prazos",
    label: "Prazos fiscais",
    curto: "Prazos",
    href: "/dashboard/prazos",
    icone: "Calendar",
    seccao: "atividade",
    visibilidade: "sempre",
  },

  // ── Simular e decidir (recolhido) ────────────────────────────────────
  {
    id: "recibos-verdes",
    label: "Recibos verdes",
    curto: "Recibos verdes",
    href: "/dashboard/recibos-verdes",
    icone: "Receipt",
    seccao: "decidir",
    visibilidade: "recolhivel",
    toolId: "recibos-verdes",
  },
  {
    id: "irs",
    label: "Simulador de IRS",
    curto: "IRS",
    href: "/dashboard/simulador",
    icone: "Calculator",
    seccao: "decidir",
    visibilidade: "recolhivel",
    toolId: "simulador-irs",
  },
  {
    id: "salario",
    label: "Recibo de vencimento",
    curto: "Salário",
    href: "/dashboard/recibo-vencimento",
    icone: "Wallet",
    seccao: "decidir",
    visibilidade: "recolhivel",
    toolId: "recibo-vencimento",
  },
  {
    id: "empresa",
    label: "Abrir empresa",
    curto: "Empresa",
    href: "/dashboard/empresa",
    icone: "Building",
    seccao: "decidir",
    visibilidade: "recolhivel",
  },
  {
    id: "comparar",
    label: "Comparar cenários",
    curto: "Comparar",
    href: "/dashboard/comparar",
    icone: "Scale",
    seccao: "decidir",
    visibilidade: "recolhivel",
  },
  {
    id: "herancas",
    label: "Heranças e sucessões",
    curto: "Heranças",
    href: "/dashboard/herancas",
    icone: "Scale",
    seccao: "decidir",
    visibilidade: "recolhivel",
  },
  {
    id: "regime-simplificado",
    label: "Regime simplificado",
    curto: "Simplificado",
    href: "/dashboard/regime-simplificado",
    icone: "Gauge",
    seccao: "decidir",
    visibilidade: "recolhivel",
    toolId: "regime-simplificado",
  },
  {
    id: "ato-isolado",
    label: "Ato isolado ou atividade",
    curto: "Ato isolado",
    href: "/dashboard/ato-isolado",
    icone: "Swap",
    seccao: "decidir",
    visibilidade: "recolhivel",
  },

  // ── Apoio e verificação (recolhido) ──────────────────────────────────
  {
    id: "casos",
    label: "Os meus casos",
    curto: "Casos",
    href: "/dashboard/casos",
    icone: "Briefcase",
    seccao: "apoio",
    visibilidade: "recolhivel",
  },
  {
    id: "contabilista",
    label: "O meu contabilista",
    curto: "Contabilista",
    href: "/dashboard/contabilista",
    icone: "User",
    seccao: "apoio",
    visibilidade: "recolhivel",
  },
  {
    // As ligações de dossiê vivem à parte de «O meu contabilista» porque
    // servem exatamente quem NÃO tem contabilista na plataforma — e essa
    // página começa por devolver «ainda não tens ninguém ligado».
    id: "dossies",
    label: "Dossiês que enviei",
    curto: "Dossiês",
    href: "/dashboard/dossies",
    icone: "BookOpen",
    seccao: "apoio",
    visibilidade: "recolhivel",
  },
  {
    id: "auditoria",
    label: "Auditoria do recibo",
    curto: "Auditoria",
    href: "/dashboard/auditoria-recibo",
    icone: "ShieldCheck",
    seccao: "apoio",
    visibilidade: "recolhivel",
    toolId: "auditoria-recibo",
  },
  {
    id: "classificar",
    label: "Classificar atividade",
    curto: "Atividade",
    href: "/dashboard/classificar-atividade",
    icone: "Search",
    seccao: "apoio",
    visibilidade: "recolhivel",
    toolId: "classificar-atividade",
  },
  {
    id: "mapa",
    label: "Mapa de preços por região",
    curto: "Mapa",
    href: "/dashboard/mapa-contabilistas",
    icone: "MapPin",
    seccao: "apoio",
    visibilidade: "recolhivel",
    toolId: "mapa-contabilistas",
  },

  // ── Conta (rodapé da sidebar) ────────────────────────────────────────
  {
    id: "perfil",
    label: "O meu perfil",
    curto: "Perfil",
    href: "/dashboard/perfil",
    icone: "User",
    seccao: "conta",
    visibilidade: "rodape",
  },
  {
    id: "conta",
    label: "A minha conta",
    curto: "Conta",
    href: "/dashboard/conta",
    icone: "ShieldCheck",
    seccao: "conta",
    visibilidade: "rodape",
  },
  {
    id: "plano",
    label: "Plano e subscrição",
    curto: "Plano",
    href: "/dashboard/upgrade",
    icone: "Star",
    seccao: "conta",
    visibilidade: "rodape",
  },

  // ── Explorar — o que era navegação persistente e não devia ser ───────
  {
    id: "ferramentas",
    label: "Todas as ferramentas",
    curto: "Ferramentas",
    href: "/ferramentas",
    icone: "Calculator",
    seccao: "explorar",
    visibilidade: "rodape",
    externo: true,
  },
  {
    id: "guias",
    label: "Guias fiscais",
    curto: "Guias",
    href: "/guias",
    icone: "BookOpen",
    seccao: "explorar",
    visibilidade: "rodape",
    externo: true,
  },
  {
    id: "quiz",
    label: "Quiz Fiscal",
    curto: "Quiz",
    href: "/quiz-fiscal",
    icone: "Trophy",
    seccao: "explorar",
    visibilidade: "rodape",
    externo: true,
  },
  {
    id: "payout",
    label: "Recibo Merchant of Record",
    curto: "Payout",
    href: "/ferramentas/payout-mor",
    icone: "ShoppingBag",
    seccao: "explorar",
    visibilidade: "rodape",
    externo: true,
  },
];

/** Títulos e ordem das zonas. A ordem é contrato: não se reordena por uso. */
const ZONAS: Array<{ id: SeccaoDashboard; titulo: string; nota?: string; recolhivel: boolean }> = [
  { id: "principal", titulo: "Principal", recolhivel: false },
  { id: "negocio", titulo: "O teu negócio", recolhivel: false },
  { id: "atividade", titulo: "Gerir atividade", recolhivel: false },
  {
    id: "decidir",
    titulo: "Simular e decidir",
    nota: "Simuladores que se abrem quando é preciso decidir, não todos os dias.",
    recolhivel: true,
  },
  {
    id: "apoio",
    titulo: "Apoio e verificação",
    nota: "Conferir um recibo, classificar uma atividade, falar com alguém.",
    recolhivel: true,
  },
];

/** Os grupos da sidebar, já montados. Vazios não entram. */
export const GRUPOS_DASHBOARD: GrupoNavDashboard[] = ZONAS.map((z) => ({
  id: z.id,
  titulo: z.titulo,
  nota: z.nota,
  recolhivel: z.recolhivel,
  itens: NAV_DASHBOARD.filter((i) => i.seccao === z.id),
})).filter((g) => g.itens.length > 0);

/** Os destinos que a sidebar mostra sem ninguém abrir nada. */
export const DESTINOS_SEMPRE = NAV_DASHBOARD.filter((i) => i.visibilidade === "sempre");

/** Conta, e as páginas públicas que saíram da navegação persistente. */
export const ITENS_CONTA = NAV_DASHBOARD.filter((i) => i.seccao === "conta");
export const ITENS_EXPLORAR = NAV_DASHBOARD.filter((i) => i.seccao === "explorar");

/**
 * A BARRA INFERIOR DO TELEMÓVEL — quatro destinos e o «Menu».
 *
 * «Negócio» não é uma das quatro etapas: é o hub leve que as junta. No
 * telemóvel não cabem quatro etapas na barra; no computador estão as quatro
 * expostas e o hub não aparece. A rota existe (em vez de uma folha) porque
 * é ligável, tem botão «voltar», tem estado vazio e mede-se.
 */
export const SLOTS_MOVEL_DASHBOARD: ItemNavDashboard[] = [
  NAV_DASHBOARD.find((i) => i.id === "visao-geral")!,
  NAV_DASHBOARD.find((i) => i.id === "trabalho")!,
  {
    id: "construir",
    label: "Construir o negócio",
    curto: "Negócio",
    href: "/dashboard/construir",
    icone: "Lightbulb",
    seccao: "negocio",
    visibilidade: "sempre",
  },
  NAV_DASHBOARD.find((i) => i.id === "prazos")!,
];

/** As quatro etapas, na ordem do arco. O hub móvel e a visão geral leem-na. */
export const ETAPAS_NEGOCIO = NAV_DASHBOARD.filter((i) => i.seccao === "negocio");

/**
 * QUAL O DESTINO ACESO — e é sempre UM, no máximo.
 *
 * Decide pela rota mais específica: `/dashboard/precos/novo` é de «Preços»
 * e não da «Visão geral», mesmo que as duas casassem por prefixo. Dois
 * `aria-current="page"` no mesmo documento dizem a um leitor de ecrã que a
 * pessoa está em dois sítios ao mesmo tempo.
 */
export function itemAtivoDashboard(pathname: string | null | undefined): ItemNavDashboard | null {
  if (!pathname) return null;
  const limpo = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  const candidatos = NAV_DASHBOARD.filter((i) => {
    if (i.externo) return false;
    if (i.match === "exato") return limpo === i.href;
    return limpo === i.href || limpo.startsWith(`${i.href}/`);
  });
  if (candidatos.length === 0) return null;

  // O href mais longo é o mais específico.
  return candidatos.reduce((a, b) => (b.href.length > a.href.length ? b : a));
}

/** O grupo recolhível que tem de abrir por a rota ativa estar lá dentro. */
export function grupoAAbrir(pathname: string | null | undefined): SeccaoDashboard | null {
  const ativo = itemAtivoDashboard(pathname);
  if (!ativo) return null;
  const grupo = GRUPOS_DASHBOARD.find((g) => g.id === ativo.seccao);
  return grupo?.recolhivel ? grupo.id : null;
}
