// ═══════════════════════════════════════════════════════════════════════
//  PAINEL SEMANAL, KPIs E ALVOS DE IMPLEMENTAÇÃO
//  ---------------------------------------------------------------------
//  §8.3 (painel), §17.1 (KPIs com definição) e §17.2 (alvos por prazo).
//
//  Está em código, e não numa folha de cálculo, por uma razão prática: um
//  KPI sem fórmula escrita é um KPI que muda de definição sempre que muda
//  de mãos. Aqui a fórmula, o dono, a frequência e o guardrail viajam
//  juntos, e a página `/estado-dos-dados` lê exatamente esta estrutura.
//
//  Nenhum número real vive aqui. Isto são DEFINIÇÕES. Os valores chegam da
//  camada de eventos quando existirem — e enquanto não existirem, o painel
//  mostra «sem dados», que é a resposta honesta.
// ═══════════════════════════════════════════════════════════════════════

export type Dono = "Produto" | "Growth" | "GM" | "Parcerias" | "Fiscal";
export type Frequencia = "semanal" | "mensal" | "coorte";

export interface KPI {
  id: string;
  nome: string;
  formula: string;
  frequencia: Frequencia;
  dono: Dono;
  /** O limite que não pode ser ultrapassado, ou a meta inicial. */
  guardrail: string;
}

/** §17.1 — os treze KPIs, com a definição que os torna comparáveis. */
export const KPIS: readonly KPI[] = [
  {
    id: "dvm",
    nome: "DVM",
    formula: "Utilizadores únicos com simulator_complete + result_view válido",
    frequencia: "semanal",
    dono: "Produto",
    guardrail: "Crescer sem degradar erro fiscal nem frescura das fontes",
  },
  {
    id: "activation",
    nome: "Ativação",
    formula: "DVM / simulator_start",
    frequencia: "semanal",
    dono: "Produto",
    guardrail: "+15% relativo em 90 dias nos 3 fluxos alvo",
  },
  {
    id: "landing-to-dvm",
    nome: "Landing → DVM",
    formula: "DVM / sessões de landing",
    frequencia: "semanal",
    dono: "Growth",
    guardrail: "Comparar por canal e por query; nunca celebrar impressão sem conclusão",
  },
  {
    id: "retencao",
    nome: "R7 / R30 / R90",
    formula: "Utilizadores que regressam e realizam valor no período",
    frequencia: "coorte",
    dono: "Produto",
    guardrail: "+20% relativo de R30 depois do baseline",
  },
  {
    id: "decisoes-por-user",
    nome: "Decisões por utilizador",
    formula: "DVM / utilizadores ativos",
    frequencia: "mensal",
    dono: "Produto",
    guardrail: "Provar continuidade, não compulsão",
  },
  {
    id: "plus-conversion",
    nome: "Conversão Plus",
    formula: "Pagantes ativos / ativados elegíveis",
    frequencia: "coorte",
    dono: "GM",
    guardrail: "Separar checkout de retenção — converter sem reter não conta",
  },
  {
    id: "mrr-churn",
    nome: "MRR e churn",
    formula: "Receita recorrente; cancelamentos / pagantes no início do período",
    frequencia: "mensal",
    dono: "GM",
    guardrail: "Churn por coorte e por motivo declarado",
  },
  {
    id: "fiz-outcome",
    nome: "Taxa de outcome FIZ",
    formula: "Outcomes remunerados / cliques elegíveis",
    frequencia: "semanal",
    dono: "Parcerias",
    guardrail: "Reconciliação ≥ 95%",
  },
  {
    id: "receita-1k-dvm",
    nome: "Receita por 1.000 DVM",
    formula: "Receita atribuída / DVM × 1.000",
    frequencia: "mensal",
    dono: "GM",
    guardrail: "Por rota e sem dupla contagem entre rotas",
  },
  {
    id: "lead-acceptance",
    nome: "Aceitação de leads",
    formula: "Leads aceites / leads submetidas",
    frequencia: "semanal",
    dono: "Parcerias",
    guardrail: "≥ 60% no piloto, ou rever a qualificação",
  },
  {
    id: "erro-fiscal",
    nome: "Taxa de erro fiscal",
    formula: "Erros confirmados / 1.000 DVM",
    frequencia: "semanal",
    dono: "Fiscal",
    guardrail: "Tendência decrescente; severidade alta obriga a parar",
  },
  {
    id: "frescura",
    nome: "Frescura das fontes",
    formula: "Recursos críticos dentro do SLA / total de recursos críticos",
    frequencia: "semanal",
    dono: "Fiscal",
    guardrail: "100% nos dados críticos",
  },
  {
    id: "citacao-ia",
    nome: "Taxa de citação em IA",
    formula: "Prompts com citação do ReciboCerto / prompts do conjunto",
    frequencia: "mensal",
    dono: "Growth",
    guardrail: "Registar baseline e evolução; validar sempre a exatidão do que é citado",
  },
  {
    id: "concentracao",
    nome: "Concentração de parceiros",
    formula: "Receita do maior parceiro / receita total",
    frequencia: "mensal",
    dono: "GM",
    guardrail: "Definir um teto até ao mês 12 e revê-lo trimestralmente",
  },
];

export const kpi = (id: string): KPI | undefined => KPIS.find((k) => k.id === id);

// ─── §8.3 — os seis blocos do painel semanal ───────────────────────────

export interface BlocoPainel {
  id: string;
  titulo: string;
  /** Os KPIs (por id) que compõem o bloco. */
  kpis: readonly string[];
  /** A pergunta de decisão a que o bloco responde. Sem pergunta, sem bloco. */
  pergunta: string;
}

export const BLOCOS_PAINEL: readonly BlocoPainel[] = [
  {
    id: "procura",
    titulo: "Procura",
    kpis: ["landing-to-dvm", "dvm"],
    pergunta: "Que canal traz decisões, e não apenas visitas?",
  },
  {
    id: "ativacao",
    titulo: "Ativação",
    kpis: ["activation", "dvm"],
    pergunta: "Onde falha o valor?",
  },
  {
    id: "retencao",
    titulo: "Retenção",
    kpis: ["retencao", "decisoes-por-user"],
    pergunta: "O produto merece uma subscrição?",
  },
  {
    id: "receita",
    titulo: "Receita",
    kpis: ["mrr-churn", "fiz-outcome", "lead-acceptance", "receita-1k-dvm"],
    pergunta: "Qual motor funciona, por jornada?",
  },
  {
    id: "qualidade",
    titulo: "Qualidade",
    kpis: ["erro-fiscal", "frescura"],
    pergunta: "Estamos a crescer sem degradar confiança?",
  },
  {
    id: "distribuicao",
    titulo: "Distribuição",
    kpis: ["citacao-ia", "concentracao"],
    pergunta: "Que ativo merece repetição?",
  },
];

// ─── §17.2 — alvos de implementação, não de vaidade ────────────────────

export interface AlvoPrazo {
  prazo: string;
  alvo: string;
}

export const ALVOS: readonly AlvoPrazo[] = [
  {
    prazo: "Dia 14",
    alvo: "100% dos fluxos críticos com especificação; ≥ 95% dos eventos tecnicamente recebidos; zero PII indevida.",
  },
  {
    prazo: "Dia 30",
    alvo: "Baseline por ferramenta e por canal; os três maiores abandonos conhecidos; Search, robots, lastmod e fallbacks auditados.",
  },
  {
    prazo: "Dia 60",
    alvo: "Clique FIZ → outcome reconciliável; checkout Plus → pago; 3 parceiros piloto; 6 ativos de vídeo/comunidade.",
  },
  {
    prazo: "Dia 90",
    alvo: "Ativação +15% relativo nos fluxos foco; R30 +20% relativo ou aprendizagem documentada; um motor de receita provado.",
  },
  {
    prazo: "Mês 6",
    alvo: "Dois canais repetíveis de DVM; um loop de retenção; score de qualidade de parceiros e de conteúdo.",
  },
  {
    prazo: "Mês 12",
    alvo: "Três loops repetíveis; concentração controlada; decisão informada sobre preço, B2B e API.",
  },
];

// ─── §19.5 e §19.6 — as rotinas que mantêm o painel vivo ───────────────

export const ROTINA_SEMANAL: readonly { dia: string; foco: string }[] = [
  { dia: "Segunda", foco: "Fonte ou alteração fiscal, incidentes e qualidade." },
  { dia: "Terça", foco: "Scorecard de DVM, ativação, R30 e receita; escolher um gargalo." },
  { dia: "Quarta", foco: "Entrevistas, suporte e comunidades; transformar linguagem em backlog." },
  { dia: "Quinta", foco: "Distribuição em lote e seguimento de parceiros." },
  { dia: "Sexta", foco: "Revisão de experiências, changelog, decisão e foco da semana seguinte." },
];

export const ROTINA_PERIODICA: readonly { periodo: string; foco: string }[] = [
  {
    periodo: "Mensal",
    foco: "Coorte Plus, receita por 1.000 DVM, reconciliação de parceiros, benchmark de citação, poda de conteúdo e revisão de risco.",
  },
  {
    periodo: "Trimestral",
    foco: "Revisão de fontes e arquitetura, preço, concentração, contratos, privacidade, acessibilidade e estratégia.",
  },
  {
    periodo: "Anual (Orçamento do Estado)",
    foco: "Rollover do motor, regressão, conteúdo, exemplos, vídeos, snippets e comunicação aos utilizadores.",
  },
];
