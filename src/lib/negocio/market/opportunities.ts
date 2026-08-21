import type { CenarioInicial } from "@/lib/pricing";
import { marketRegionLabel, type MarketRegion } from "./geografia";
import type {
  MarketEvidenceGateResult,
  MarketObservation,
  MarketSemanticMappingStatus,
  MarketSignalKind,
  MarketSourceHealth,
} from "./tipos";

export type BusinessStructurePreference = "recibos-verdes" | "empresa" | "por-decidir";
export type DeliveryPreference = "local" | "remoto" | "hibrido";
export type CapitalBand = "ate-500" | "500-3000" | "mais-3000";
export type RecurrencePreference = "pontual" | "recorrente" | "indiferente";
export type BusinessStrength = "comercial" | "digital" | "operacoes" | "cuidado" | "tecnico";

export type { MarketRegion } from "./geografia";

export interface BusinessDiscoveryProfile {
  structure: BusinessStructurePreference;
  delivery: DeliveryPreference;
  capital: CapitalBand;
  recurrence: RecurrencePreference;
  strengths: readonly BusinessStrength[];
  region: MarketRegion;
}

export interface OpportunityTemplate {
  id: string;
  title: string;
  promise: string;
  customer: string;
  problem: string;
  delivery: readonly DeliveryPreference[];
  /**
   * Onde o MODELO faz sentido — nunca onde temos dados.
   *
   * Confundir as duas coisas foi um erro real: o piloto turístico esteve
   * limitado a duas NUTS II só porque o manifesto começou por mapear duas,
   * e quem escolhia outra zona era penalizado na compatibilidade por uma
   * limitação nossa. `portugal` significa «investigável em qualquer zona»;
   * a diferença entre regiões passa a vir do valor observado, não daqui.
   */
  regions: readonly MarketRegion[];
  capital: CapitalBand;
  recurrence: Exclude<RecurrencePreference, "indiferente">;
  strengths: readonly BusinessStrength[];
  structures: readonly Exclude<BusinessStructurePreference, "por-decidir">[];
  pricingScenario: CenarioInicial;
  revenueModel: string;
  firstCustomerPath: readonly string[];
  criticalRequirements: readonly string[];
  falsificationTest: string;
  evidencePlan: readonly {
    source: string;
    purpose: string;
    url: string;
    status: "live" | "planned" | "license-review";
  }[];
}

export interface OpportunityFit {
  templateId: string;
  score: number;
  label: "forte" | "possivel" | "fraca";
  reasons: readonly string[];
  tensions: readonly string[];
}

export interface MarketObservationSummary {
  id: string;
  metricId: string;
  value: MarketObservation["value"];
  unit: string;
  geography: MarketObservation["geography"];
  referencePeriod: MarketObservation["referencePeriod"];
  retrievedAt: string;
  validUntil: string;
  sourceId: string;
  license: MarketObservation["license"];
  /** A série de onde a leitura veio — duas séries nunca são somadas. */
  seriesId: string;
  seriesLabel: string;
  /** O que o número diz, e o que continua a não dizer. */
  reading: string;
  /**
   * Lineage e papel do sinal, publicados de propósito.
   *
   * O servidor não conhece a zona de quem pergunta e por isso o seu gate
   * assume compatibilidade geográfica. Sem estes três campos, o browser —
   * que conhece a zona — não conseguia voltar a correr o gate sem inventar
   * a origem estatística do sinal.
   */
  independenceKey: string;
  kind: MarketSignalKind;
  critical: boolean;
  semanticMapping: MarketSemanticMappingStatus;
}

export interface MarketPilotEvidence {
  templateId: string;
  checkedAt: string;
  gate: MarketEvidenceGateResult;
  observations: readonly MarketObservationSummary[];
  sourceHealth: readonly MarketSourceHealth[];
  sourceUrl?: string;
  datasetUrl?: string;
  note?: string;
}

export const OPPORTUNITY_TEMPLATES: readonly OpportunityTemplate[] = Object.freeze([
  {
    id: "tourism-guest-operations",
    title: "Operações locais para alojamento turístico",
    promise: "Check-ins, apoio multilingue, reposições e coordenação de ocorrências para pequenos operadores.",
    customer: "Alojamentos independentes e pequenos gestores sem equipa própria permanente.",
    problem: "A ocupação cria picos operacionais que não justificam contratar uma equipa a tempo inteiro.",
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["operacoes", "comercial"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel: "Avença por unidade alojamento + preço por intervenção fora do pacote.",
    firstCustomerPath: [
      "Escolher uma microzona alcançável em 20–30 minutos.",
      "Entrevistar dez operadores sobre ocorrências e horários reais.",
      "Vender um piloto pago de 30 dias com limites explícitos.",
    ],
    criticalRequirements: ["Disponibilidade e raio de deslocação", "Seguro adequado", "Proteção de dados e acesso a imóveis"],
    falsificationTest:
      "Abandonar ou redesenhar se dez operadores não relatarem ocorrências repetidas ou se nenhum aceitar um piloto pago dentro do preço sustentável.",
    evidencePlan: [
      {
        source: "INE — ocupação-quarto",
        purpose: "Observar intensidade e geografia da atividade turística.",
        url: "https://dados.gov.pt/datasets/taxa-de-ocupacao-quarto-nos-estabelecimentos-de-alojamento-turistico",
        status: "live",
      },
      {
        source: "INE — Demografia das empresas (0014098)",
        purpose:
          "Contar sociedades constituídas por ano na zona. É uma operação estatística diferente do inquérito à hotelaria, por isso triangula a sério.",
        url: "https://www.ine.pt/xurl/indx/0014098/PT",
        status: "live",
      },
      {
        source: "Validação do utilizador",
        purpose: "Provar dor operacional e disposição a pagar no microterritório.",
        url: "https://www.recibocerto.pt/ferramentas/descobrir-negocio",
        status: "planned",
      },
    ],
  },
  {
    id: "sme-digital-operations",
    title: "Instalação de operações digitais para microempresas",
    promise: "Organizar pedidos, CRM leve, propostas, cobranças e automações simples sem vender uma transformação abstrata.",
    customer: "Micro e pequenas empresas com processos dispersos por WhatsApp, email e folhas de cálculo.",
    problem: "Ferramentas existem, mas a adoção falha quando ninguém traduz o processo e acompanha a equipa.",
    delivery: ["remoto", "hibrido"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["digital", "operacoes", "comercial"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "projeto",
    revenueModel: "Diagnóstico pago + implementação por projeto + manutenção mensal opcional.",
    firstCustomerPath: [
      "Escolher um único setor e um processo caro e repetitivo.",
      "Mapear o processo de cinco empresas sem propor software.",
      "Vender uma implementação curta com métrica antes/depois.",
    ],
    criticalRequirements: ["RGPD e acessos mínimos", "Capacidade de suporte", "Âmbito técnico e responsabilidade contratual"],
    falsificationTest:
      "Rejeitar a hipótese se o processo não consumir tempo mensurável ou se cinco decisores não pagarem sequer pelo diagnóstico.",
    evidencePlan: [
      {
        source: "Eurostat — Digital Intensity Index (isoc_e_dii)",
        purpose:
          "Comparar microempresas com pequenas empresas na mesma medida. A distância entre classes é o défice a investigar, não a compra de consultoria.",
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_e_dii/default/table?lang=en",
        status: "live",
      },
      {
        source: "INE — Demografia das empresas (0014098)",
        purpose:
          "Contar empresas individuais e sociedades nascidas por ano na zona: é o momento em que um negócio monta processos do zero.",
        url: "https://www.ine.pt/xurl/indx/0014098/PT",
        status: "live",
      },
      {
        source: "INE — utilização de TIC nas empresas",
        purpose: "Confirmar o contexto português e a adoção recente de IA.",
        url: "https://www.ine.pt/xportal/xmain?DESTAQUESdest_boui=707461582&DESTAQUESmodo=2&xpgid=ine_destaques&xpid=INE",
        status: "license-review",
      },
    ],
  },
  {
    id: "senior-digital-concierge",
    title: "Acompanhamento digital presencial para seniores e famílias",
    promise: "Ajuda acompanhada em serviços digitais, segurança básica e organização — sem guardar credenciais.",
    customer: "Famílias que apoiam pessoas com baixa confiança digital e querem uma presença local de confiança.",
    problem: "A disponibilidade de serviços digitais não elimina barreiras de uso, confiança e segurança.",
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["cuidado", "operacoes"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico_hora",
    revenueModel: "Sessão avulsa, pack familiar ou acompanhamento mensal com limites de responsabilidade.",
    firstCustomerPath: [
      "Entrevistar familiares pagadores, não presumir que o utilizador final compra.",
      "Definir tarefas permitidas e proibidas antes do primeiro serviço.",
      "Testar três sessões pagas com acompanhamento e checklist de segurança.",
    ],
    criticalRequirements: ["Nunca custodiar passwords ou códigos", "Seguro e limites de atuação", "Protocolo contra fraude e abuso"],
    falsificationTest:
      "Parar se as famílias não aceitarem pagar pelo acompanhamento ou se a responsabilidade necessária exceder o seguro e o âmbito do serviço.",
    evidencePlan: [
      {
        source: "Eurostat — competências digitais (isoc_sk_dskl_i21)",
        purpose:
          "Medir o défice dos 65–74 anos contra a população total. Um défice é barreira de uso, não procura paga — quem paga costuma ser a família.",
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_sk_dskl_i21/default/table?lang=en",
        status: "live",
      },
      {
        source: "INE — Índice de envelhecimento (0012909)",
        purpose:
          "Dimensionar quantas pessoas na zona podem precisar de acompanhamento. Estimativas anuais da população: operação distinta do inquérito europeu às famílias.",
        url: "https://www.ine.pt/xurl/indx/0012909/PT",
        status: "live",
      },
    ],
  },
  {
    id: "public-tender-support",
    title: "Radar e preparação operacional de concursos para pequenas empresas",
    promise: "Filtrar oportunidades públicas, organizar requisitos e prazos e preparar um dossier — sem substituir apoio jurídico.",
    customer: "Pequenas empresas capazes de entregar, mas sem rotina para acompanhar procedimentos.",
    problem: "A informação é pública, porém a triagem e a preparação documental consomem tempo e falham por processo.",
    delivery: ["remoto", "hibrido"],
    regions: ["portugal"],
    capital: "ate-500",
    recurrence: "recorrente",
    strengths: ["operacoes", "comercial", "digital"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "servico",
    revenueModel: "Avença de monitorização + fee fixo por dossier; nunca comissão que crie conflito sem revisão jurídica.",
    firstCustomerPath: [
      "Escolher dois códigos CPV e uma região.",
      "Medir quantos avisos realmente elegíveis surgem em 30 dias.",
      "Vender uma triagem paga antes de automatizar o radar.",
    ],
    criticalRequirements: ["Limite entre apoio administrativo e jurídico", "Confidencialidade", "Rastreio de prazos e versões"],
    falsificationTest:
      "Rejeitar o nicho se não houver procedimentos elegíveis recorrentes ou se as empresas não valorizarem a poupança de tempo acima do preço sustentável.",
    evidencePlan: [
      {
        source: "INE — Sistema de contas integradas das empresas (0014044)",
        purpose:
          "Dimensionar o universo de empresas pequenas capazes de entregar, por zona.",
        url: "https://www.ine.pt/xurl/indx/0014044/PT",
        status: "live",
      },
      {
        source: "Portal BASE (IMPIC), via dados.gov.pt",
        purpose:
          "Contar contratos celebrados e procedimentos abertos à concorrência, por zona e por ano — nunca o valor anunciado como receita provável. A leitura é feita por um job agendado sobre o ficheiro anual do portal; a aplicação serve o instantâneo commitado, com a data da extração à vista.",
        url: "https://dados.gov.pt/pt/datasets/contratos-publicos-portal-base-impic-contratos-de-2012-a-2026/",
        status: "live",
      },
      {
        source: "TED — Tenders Electronic Daily",
        purpose:
          "Acrescentar os avisos acima dos limiares europeus e a classificação por CPV, que o ficheiro anual do BASE não traz num formato utilizável. Enquanto não estiver ligado, a contagem por setor não existe e o cartão não a mostra.",
        url: "https://ted.europa.eu/",
        status: "planned",
      },
    ],
  },
  {
    id: "home-transition-operations",
    title: "Coordenação de transições de casa",
    promise: "Inventário, pedidos de orçamento, calendarização e acompanhamento de mudanças, heranças ou redução de casa.",
    customer: "Famílias sem tempo local para coordenar múltiplos prestadores e decisões.",
    problem: "Uma transição rara concentra dezenas de tarefas, mas o cliente não precisa de mais um prestador isolado.",
    delivery: ["local", "hibrido"],
    regions: ["portugal"],
    capital: "500-3000",
    recurrence: "pontual",
    strengths: ["operacoes", "cuidado", "comercial"],
    structures: ["recibos-verdes", "empresa"],
    pricingScenario: "projeto",
    revenueModel: "Diagnóstico e plano pagos + coordenação por projeto; fornecedores faturam diretamente ao cliente.",
    firstCustomerPath: [
      "Escolher uma transição concreta e uma área geográfica curta.",
      "Entrevistar profissionais que já recebem pedidos desorganizados.",
      "Vender um diagnóstico, antes de assumir toda a coordenação.",
    ],
    criticalRequirements: ["Seguro e responsabilidade", "Independência na escolha de fornecedores", "Regras para bens, chaves e dados pessoais"],
    falsificationTest:
      "Parar se o cliente preferir contratar diretamente ou se o custo de aquisição exceder a margem do projeto em três testes consecutivos.",
    evidencePlan: [
      {
        source: "INE — Transações de alojamentos familiares (0012787)",
        purpose:
          "Contar casas transacionadas por famílias, por zona e por ano. É o evento que cria a transição — e o sinal mais próximo de procura que existe publicado.",
        url: "https://www.ine.pt/xurl/indx/0012787/PT",
        status: "live",
      },
      {
        source: "INE — Índice de envelhecimento (0012909)",
        purpose:
          "Contexto das transições ligadas a herança e a redução de casa, sem inferir intenção de contratar.",
        url: "https://www.ine.pt/xurl/indx/0012909/PT",
        status: "live",
      },
    ],
  },
] as const);

const CAPITAL_RANK: Readonly<Record<CapitalBand, number>> = {
  "ate-500": 0,
  "500-3000": 1,
  "mais-3000": 2,
};

// ── Rótulos: os enums NÃO são texto de interface ──────────────────────
//  Estes valores são identificadores em ASCII, e estavam a ser
//  interpolados diretamente na copy: «Funciona em modelo hibrido»,
//  «Aproveita operacoes». Português de Portugal é inegociável, e um id
//  interno nunca é uma palavra.
const DELIVERY_LABEL: Readonly<Record<DeliveryPreference, string>> = {
  local: "presencial",
  remoto: "remoto",
  hibrido: "híbrido",
};

const RECURRENCE_LABEL: Readonly<Record<Exclude<RecurrencePreference, "indiferente">, string>> = {
  pontual: "por projeto pontual",
  recorrente: "recorrente",
};

const STRENGTH_LABEL: Readonly<Record<BusinessStrength, string>> = {
  comercial: "a tua veia comercial",
  digital: "o teu à-vontade digital",
  operacoes: "a tua capacidade de organizar e executar",
  cuidado: "o teu jeito para acompanhar pessoas",
  tecnico: "a tua resolução de problemas técnicos",
};

const STRUCTURE_LABEL: Readonly<Record<Exclude<BusinessStructurePreference, "por-decidir">, string>> = {
  "recibos-verdes": "recibos verdes",
  empresa: "empresa",
};

/** Junta com «e» antes do último, como se escreve em português. */
function enumerar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** Compatibilidade pessoal, deliberadamente separada da evidência de mercado. */
export function calculateOpportunityFit(
  template: OpportunityTemplate,
  profile: BusinessDiscoveryProfile,
): OpportunityFit {
  let score = 0;
  const reasons: string[] = [];
  const tensions: string[] = [];

  if (template.delivery.includes(profile.delivery)) {
    score += 20;
    reasons.push(`Funciona em modelo ${DELIVERY_LABEL[profile.delivery]}.`);
  } else {
    tensions.push(
      `O modelo pede trabalho ${template.delivery.map((item) => DELIVERY_LABEL[item]).join(" ou ")}, não ${DELIVERY_LABEL[profile.delivery]}.`,
    );
  }

  if (CAPITAL_RANK[template.capital] <= CAPITAL_RANK[profile.capital]) {
    score += 20;
    reasons.push("Cabe na faixa de capital escolhida.");
  } else {
    tensions.push("Pode exigir mais capital inicial do que declaraste.");
  }

  if (profile.recurrence === "indiferente" || profile.recurrence === template.recurrence) {
    score += 15;
    reasons.push(`O modelo de receita é ${RECURRENCE_LABEL[template.recurrence]}.`);
  } else {
    tensions.push(`A receita tende a ser ${RECURRENCE_LABEL[template.recurrence]}.`);
  }

  const matchingStrengths = template.strengths.filter((strength) => profile.strengths.includes(strength));
  const strengthScore = Math.min(25, matchingStrengths.length * 12.5);
  score += strengthScore;
  if (matchingStrengths.length) {
    reasons.push(`Aproveita ${enumerar(matchingStrengths.map((item) => STRENGTH_LABEL[item]))}.`);
  } else {
    tensions.push("Não coincide ainda com as competências que selecionaste.");
  }

  if (profile.structure === "por-decidir" || template.structures.includes(profile.structure)) {
    score += 10;
    reasons.push(
      profile.structure === "por-decidir"
        ? "Pode ser testado antes de decidir a estrutura."
        : `Pode arrancar em ${STRUCTURE_LABEL[profile.structure]}.`,
    );
  } else {
    tensions.push("A estrutura preferida não é a indicada para este piloto.");
  }

  // A zona só pode PENALIZAR quando o modelo depende mesmo de estar noutro
  // sítio. Não saber ainda onde testar não é uma incompatibilidade — e a
  // falta de dados nossos sobre uma região nunca foi razão para baixar a
  // compatibilidade de ninguém.
  const nacional = template.regions.includes("portugal");
  if (nacional || profile.region === "portugal" || template.regions.includes(profile.region)) {
    score += 10;
    reasons.push(
      nacional
        ? "O modelo pode ser investigado em qualquer zona do país."
        : profile.region === "portugal"
          ? "Podes escolher a zona depois de veres os sinais."
          : `Funciona na zona escolhida (${marketRegionLabel(profile.region)}).`,
    );
  } else {
    tensions.push(
      `Este modelo depende de ${template.regions.map(marketRegionLabel).join(" ou ")}, não de ${marketRegionLabel(profile.region)}.`,
    );
  }

  const rounded = Math.round(score);
  return {
    templateId: template.id,
    score: rounded,
    label: rounded >= 75 ? "forte" : rounded >= 50 ? "possivel" : "fraca",
    reasons,
    tensions,
  };
}

/**
 * Este piloto tem ingestão pública ativa, ou continua a ser só um plano?
 *
 * A interface precisa de saber para não prometer «a consultar…» sobre uma
 * fonte que ninguém está a consultar. Vem do `evidencePlan` curado e não de
 * uma lista de ids escrita à mão dentro de um componente — que foi
 * exatamente o que aqui existia.
 */
export function templateHasLiveEvidence(template: OpportunityTemplate): boolean {
  return template.evidencePlan.some((entry) => entry.status === "live");
}

export function rankOpportunityTemplates(profile: BusinessDiscoveryProfile) {
  return OPPORTUNITY_TEMPLATES.map((template) => ({
    template,
    fit: calculateOpportunityFit(template, profile),
  })).sort((left, right) => right.fit.score - left.fit.score || left.template.title.localeCompare(right.template.title));
}
