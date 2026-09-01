// ═══════════════════════════════════════════════════════════════════════
//  CLUSTERS DE DECISÃO — a unidade de planeamento
//  ---------------------------------------------------------------------
//  §9.2: «A unidade de planeamento não deve ser o artigo; deve ser o
//  cluster de decisão: uma página de entrada que responde, uma ferramenta
//  que calcula, exemplos por cenário, uma fonte/metodologia e uma
//  transição. Os cerca de 167 guias são inventário a classificar,
//  consolidar e distribuir — não uma meta de volume.»
//
//  Este ficheiro faz três coisas que um documento não faz:
//
//   1. Declara os oito clusters com a intenção, o ativo principal e a
//      transição comercial de cada um — a tabela do §9.2, executável.
//   2. Classifica cada guia num cluster (ou em nenhum), o que produz o
//      inventário que o §19.1 pede ao dia 14.
//   3. Torna visível o que está FORA dos clusters. É a parte
//      desconfortável e é o ponto todo: a decisão 5 do §1.1 é «congelar
//      expansão fora dos clusters eleitos até existirem baseline e
//      responsável editorial», e não se congela o que não se consegue ver.
//
//  Um guia fora de cluster não é um guia mau. É um guia sem transição
//  definida — e o relatório trata isso como dívida editorial, não como
//  volume conquistado.
// ═══════════════════════════════════════════════════════════════════════

import { GUIDE_MANIFESTS, type HubGroup } from "@/lib/guias/manifests";

export type ClusterId =
  | "primeiro-recibo-verde"
  | "liquido-e-reserva"
  | "salario-vs-recibos"
  | "irs-anual"
  | "ato-isolado"
  | "independente-vs-lda"
  | "recibo-de-vencimento"
  | "estrangeiro-e-creators";

/** A transição natural no fim do cluster — a rota comercial do §7.3. */
export type Transicao = "fiz" | "plus" | "contabilista" | "guardar" | "misto";

export interface Cluster {
  id: ClusterId;
  titulo: string;
  /** As intenções de pesquisa que o cluster tem de responder. */
  intencoes: readonly string[];
  /** A ferramenta que calcula — sem ela, é um artigo, não um cluster. */
  ativoPrincipal: string;
  /** Rota(s) de continuação e a condição, quando há uma. */
  transicao: Transicao;
  transicaoNota: string;
  /** O ICP dominante (§5.1). */
  icp: IcpId;
  /** A janela de procura dominante (§4.4). */
  sazonalidade: string;
}

export const CLUSTERS: readonly Cluster[] = [
  {
    id: "primeiro-recibo-verde",
    titulo: "Primeiro recibo verde",
    intencoes: ["abrir atividade", "CAE e CIRS", "IVA", "retenção na fonte", "primeiro recibo"],
    ativoPrincipal: "/ferramentas/classificar-atividade",
    transicao: "fiz",
    transicaoNota: "Percebeu o enquadramento; a emissão executa-se na FIZ.",
    icp: "A",
    sazonalidade: "Set-Out e Jan-Fev",
  },
  {
    id: "liquido-e-reserva",
    titulo: "Líquido e reserva",
    intencoes: ["quanto sobra", "IRS, SS e IVA", "quanto reservar", "declaração trimestral"],
    ativoPrincipal: "/ferramentas/regime-simplificado",
    transicao: "misto",
    transicaoNota: "Plus para guardar e acompanhar; FIZ quando há execução por fazer.",
    icp: "B",
    sazonalidade: "Abr, Jul, Out e Jan (trimestres)",
  },
  {
    id: "salario-vs-recibos",
    titulo: "Salário vs recibos",
    intencoes: ["comparar proposta", "custo para a empresa", "risco de dependência económica"],
    ativoPrincipal: "/ferramentas/comparar-regimes",
    transicao: "guardar",
    transicaoNota: "Guardar o cenário; FIZ apenas se a escolha for independente.",
    icp: "C",
    sazonalidade: "Set-Out",
  },
  {
    id: "irs-anual",
    titulo: "IRS anual",
    intencoes: ["anexo B", "deduções", "reembolso", "entrega da declaração"],
    ativoPrincipal: "/ferramentas/simulador-irs",
    transicao: "plus",
    transicaoNota: "Plus para cenários e exportação; especialista nas exceções.",
    icp: "B",
    sazonalidade: "Mar-Jun",
  },
  {
    id: "ato-isolado",
    titulo: "Ato isolado",
    intencoes: ["quando usar", "limites", "IVA e retenção no ato isolado"],
    ativoPrincipal: "/ferramentas/ato-isolado",
    transicao: "fiz",
    transicaoNota: "FIZ quando o rendimento se revela recorrente e obriga a abrir atividade.",
    icp: "A",
    sazonalidade: "Todo o ano",
  },
  {
    id: "independente-vs-lda",
    titulo: "Independente vs Lda",
    intencoes: ["ponto de equilíbrio", "custos de uma sociedade", "contabilidade organizada"],
    ativoPrincipal: "/ferramentas/simulador-empresa",
    transicao: "contabilista",
    transicaoNota: "Caso com obrigação profissional: rota de especialista, não FIZ por defeito.",
    icp: "D",
    sazonalidade: "Nov-Dez e Jul",
  },
  {
    id: "recibo-de-vencimento",
    titulo: "Recibo de vencimento",
    intencoes: ["simular o líquido", "auditar o recibo", "explicar as linhas"],
    ativoPrincipal: "/ferramentas/recibo-vencimento",
    transicao: "plus",
    transicaoNota: "Auditoria e exportação de evidência são valor recorrente do Plus.",
    icp: "C",
    sazonalidade: "Todo o ano, pico em Jan",
  },
  {
    id: "estrangeiro-e-creators",
    titulo: "Clientes estrangeiros e creators",
    intencoes: ["clientes UE e fora da UE", "plataformas", "merchant of record", "moeda"],
    ativoPrincipal: "/ferramentas/payout-mor",
    transicao: "misto",
    transicaoNota: "FIZ na execução corrente; especialista quando há multi-jurisdição.",
    icp: "B",
    sazonalidade: "Ago e todo o ano",
  },
];

export const cluster = (id: ClusterId): Cluster | undefined =>
  CLUSTERS.find((c) => c.id === id);

// ─── §5.1 — ICPs por prioridade ────────────────────────────────────────

export type IcpId = "A" | "B" | "C" | "D" | "E";

export interface ICP {
  id: IcpId;
  nome: string;
  situacao: string;
  dor: string;
  valor: string;
  receita: string;
}

export const ICPS: readonly ICP[] = [
  {
    id: "A",
    nome: "Novo independente",
    situacao: "Primeiros 90 dias; abrir atividade; primeiro recibo.",
    dor: "Medo de errar, líquido incerto, obrigações dispersas.",
    valor: "Classificar, simular, checklist, reserva e preparar a execução.",
    receita: "FIZ primeiro; Plus depois de haver valor.",
  },
  {
    id: "B",
    nome: "Independente recorrente",
    situacao: "Fatura mensal ou trimestral; clientes nacionais e externos.",
    dor: "Reserva, IVA/SS/IRS, previsão e histórico.",
    valor: "Dashboard, cenários, alertas, exportação e auditoria.",
    receita: "Plus + FIZ.",
  },
  {
    id: "C",
    nome: "Rendimento misto",
    situacao: "Salário mais recibos; proposta alternativa em cima da mesa.",
    dor: "Comparação líquida e risco.",
    valor: "Comparador e previsão anual explicada.",
    receita: "Plus; FIZ se escolher a via independente.",
  },
  {
    id: "D",
    nome: "Transição para empresa",
    situacao: "Volume, risco ou equipa justificam uma Lda.",
    dor: "Ponto de equilíbrio, custos e obrigação contabilística.",
    valor: "Simular, preparar dossiê e preparar as perguntas certas.",
    receita: "Lead para contabilista ou constituição.",
  },
  {
    id: "E",
    nome: "Distribuidor profissional",
    situacao: "Contabilista, RH, cowork, universidade ou creator.",
    dor: "Precisa de educar e qualificar sem trabalho manual repetido.",
    valor: "Link, embed, materiais e cenários verificáveis.",
    receita: "B2B, lead ou partilha de receita, no futuro.",
  },
];

// ─── §5.2 — Jobs-to-be-done nucleares ──────────────────────────────────

export interface JobToBeDone {
  quando: string;
  quero: string;
  paraPoder: string;
  momentoDeValor: string;
}

export const JOBS: readonly JobToBeDone[] = [
  {
    quando: "recebo uma proposta",
    quero: "comparar salário, recibos e empresa",
    paraPoder: "negociar sem confundir bruto com líquido",
    momentoDeValor: "Resultado lado a lado, com as premissas à vista",
  },
  {
    quando: "vou emitir ou receber",
    quero: "saber que documento, IVA, retenção e reserva",
    paraPoder: "não criar uma dívida invisível",
    momentoDeValor: "Checklist e valor a reservar",
  },
  {
    quando: "o ano muda",
    quero: "recalcular com regras e fontes novas",
    paraPoder: "planear a caixa e evitar surpresas",
    momentoDeValor: "Changelog e diferença entre anos",
  },
  {
    quando: "tenho uma dúvida complexa",
    quero: "preparar o caso e encontrar o especialista certo",
    paraPoder: "pagar por ajuda relevante, e não por triagem básica",
    momentoDeValor: "Dossiê e handoff consentido",
  },
  {
    quando: "volto no mês seguinte",
    quero: "reutilizar os dados e comparar com o histórico",
    paraPoder: "poupar tempo e acompanhar o progresso",
    momentoDeValor: "Cenário guardado e alerta",
  },
];

// ─── §5.3 — Critérios de priorização de pedidos ────────────────────────

export interface Criterio {
  pergunta: string;
  pontuacaoAlta: string;
  decisao: string;
}

export const CRITERIOS_PRIORIZACAO: readonly Criterio[] = [
  {
    pergunta: "Frequência",
    pontuacaoAlta: "Repete mensal, trimestral ou anualmente",
    decisao: "Favorece Plus e lifecycle",
  },
  {
    pergunta: "Intenção",
    pontuacaoAlta: "O utilizador tem um valor, um prazo ou uma escolha concreta",
    decisao: "Favorece ferramenta ou landing, não artigo genérico",
  },
  {
    pergunta: "Risco",
    pontuacaoAlta: "Errar tem impacto financeiro ou legal",
    decisao: "Exige fontes, revisão e limites claros",
  },
  {
    pergunta: "Acionabilidade",
    pontuacaoAlta: "Existe um próximo passo seguro dentro ou fora do produto",
    decisao: "Favorece FIZ, exportação ou especialista",
  },
  {
    pergunta: "Diferenciação",
    pontuacaoAlta: "O Recibo Certo combina cálculo, explicação e comparação",
    decisao: "Evita conteúdo comoditizado",
  },
  {
    pergunta: "Manutenção",
    pontuacaoAlta: "A regra e a fonte podem ser atualizadas com SLA",
    decisao: "Bloqueia expansão sem responsável",
  },
];

// ─── Classificação do inventário ───────────────────────────────────────

/**
 * De que grupo do hub nasce cada cluster. A tradução é grosseira de
 * propósito: um mapa exaustivo guia a guia envelheceria em duas semanas, e
 * o que interessa é a repartição, não a arrumação perfeita.
 */
const CLUSTER_POR_GRUPO: Partial<Record<HubGroup, ClusterId>> = {
  comecar: "primeiro-recibo-verde",
  faturar: "primeiro-recibo-verde",
  profissao: "primeiro-recibo-verde",
  contribuir: "liquido-e-reserva",
  prazos: "liquido-e-reserva",
  irs: "irs-anual",
  empresa: "independente-vs-lda",
  "conta-outrem": "recibo-de-vencimento",
  estrangeiro: "estrangeiro-e-creators",
};

/** Guias cuja intenção não segue o grupo do hub. Lista curta e explícita. */
const CLUSTER_POR_SLUG: Record<string, ClusterId> = {
  "ato-isolado": "ato-isolado",
  "acumulacao-emprego": "salario-vs-recibos",
  "falsos-recibos-verdes": "salario-vs-recibos",
  "unipessoal-vs-eni": "independente-vs-lda",
  "contabilidade-organizada": "independente-vs-lda",
  "merchant-of-record": "estrangeiro-e-creators",
  "clientes-estrangeiros": "estrangeiro-e-creators",
  "recibo-vencimento": "recibo-de-vencimento",
};

/**
 * O cluster de um guia, ou `"sem_cluster"`.
 *
 * `"sem_cluster"` não é uma falha do guia: é a informação de que aquela
 * página não tem, hoje, uma transição definida nem um lugar no calendário
 * editorial. É o que o §19.1 manda inventariar.
 */
export function clusterDoGuia(slug: string, grupo?: HubGroup): ClusterId | "sem_cluster" {
  const explicito = CLUSTER_POR_SLUG[slug];
  if (explicito) return explicito;
  const porGrupo = grupo ? CLUSTER_POR_GRUPO[grupo] : undefined;
  return porGrupo ?? "sem_cluster";
}

export interface InventarioCluster {
  cluster: ClusterId | "sem_cluster";
  titulo: string;
  guias: number;
  /** Slugs, para quem quiser ir ver. Ordenados. */
  slugs: readonly string[];
}

/**
 * O inventário dos guias por cluster (§19.1: «Inventariar 167 guias:
 * cluster, intenção, DVM, owner, reviewed_at, decisão keep/merge/remove»).
 *
 * A DVM e a decisão de manter/juntar/remover exigem dados que ainda não
 * existem — é justamente o que os primeiros 30 dias produzem. As duas
 * colunas que já se podem preencher hoje são estas: cluster e volume.
 */
export function inventarioPorCluster(): InventarioCluster[] {
  const balde = new Map<ClusterId | "sem_cluster", string[]>();
  for (const c of CLUSTERS) balde.set(c.id, []);
  balde.set("sem_cluster", []);

  for (const m of GUIDE_MANIFESTS) {
    if (m.status === "archived") continue;
    const id = clusterDoGuia(m.slug, m.hub);
    balde.get(id)!.push(m.slug);
  }

  return [...balde.entries()].map(([id, slugs]) => ({
    cluster: id,
    titulo: id === "sem_cluster" ? "Fora dos clusters eleitos" : cluster(id)!.titulo,
    guias: slugs.length,
    slugs: slugs.sort(),
  }));
}
