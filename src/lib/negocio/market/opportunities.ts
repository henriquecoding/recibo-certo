import type { CenarioInicial } from "@/lib/pricing";
import type { MarketEvidenceGateResult, MarketObservation, MarketSourceHealth } from "./tipos";

export type BusinessStructurePreference = "recibos-verdes" | "empresa" | "por-decidir";
export type DeliveryPreference = "local" | "remoto" | "hibrido";
export type CapitalBand = "ate-500" | "500-3000" | "mais-3000";
export type RecurrencePreference = "pontual" | "recorrente" | "indiferente";
export type BusinessStrength = "comercial" | "digital" | "operacoes" | "cuidado" | "tecnico";
export type MarketRegion = "grande-lisboa" | "peninsula-setubal" | "outra-portugal";

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
  /** `portugal` significa que o modelo não depende destes dois pilotos locais. */
  regions: readonly (MarketRegion | "portugal")[];
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
    regions: ["grande-lisboa", "peninsula-setubal"],
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
        source: "Eurostat — Digital Intensity Index",
        purpose: "Dimensionar adoção digital por classe de empresa, sem a confundir com compra de consultoria.",
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_e_dii/default/table?lang=en",
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
        source: "Eurostat — competências digitais",
        purpose: "Medir o défice por idade; não assumir que população envelhecida equivale a procura paga.",
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_sk_dskl_i21/default/table?lang=en",
        status: "planned",
      },
      {
        source: "INE — Censos/população",
        purpose: "Dimensionar o contexto demográfico local com período de referência visível.",
        url: "https://dados.gov.pt/datasets/687062128c1cd0da86632362",
        status: "planned",
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
        source: "BASE / TED",
        purpose: "Contar procedimentos e adjudicações por CPV, geografia e período — nunca valor anunciado como receita provável.",
        url: "https://www.base.gov.pt/Base4/pt/",
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
        source: "INE / IRN — demografia e transações",
        purpose: "Procurar sinais estruturais e transacionais locais sem inferir intenção de compra.",
        url: "https://dados.gov.pt/",
        status: "planned",
      },
    ],
  },
] as const);

const CAPITAL_RANK: Readonly<Record<CapitalBand, number>> = {
  "ate-500": 0,
  "500-3000": 1,
  "mais-3000": 2,
};

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
    reasons.push(`Funciona em modelo ${profile.delivery}.`);
  } else {
    tensions.push(`O modelo pede ${template.delivery.join(" ou ")}, não ${profile.delivery}.`);
  }

  if (CAPITAL_RANK[template.capital] <= CAPITAL_RANK[profile.capital]) {
    score += 20;
    reasons.push("Cabe na faixa de capital escolhida.");
  } else {
    tensions.push("Pode exigir mais capital inicial do que declaraste.");
  }

  if (profile.recurrence === "indiferente" || profile.recurrence === template.recurrence) {
    score += 15;
    reasons.push(`O modelo de receita é ${template.recurrence}.`);
  } else {
    tensions.push(`A receita tende a ser ${template.recurrence}.`);
  }

  const matchingStrengths = template.strengths.filter((strength) => profile.strengths.includes(strength));
  const strengthScore = Math.min(25, matchingStrengths.length * 12.5);
  score += strengthScore;
  if (matchingStrengths.length) reasons.push(`Aproveita ${matchingStrengths.join(" e ")}.`);
  else tensions.push("Não coincide ainda com as competências que selecionaste.");

  if (profile.structure === "por-decidir" || template.structures.includes(profile.structure)) {
    score += 10;
    reasons.push(
      profile.structure === "por-decidir"
        ? "Pode ser testado antes de decidir a estrutura."
        : `Pode arrancar em ${profile.structure}.`,
    );
  } else {
    tensions.push("A estrutura preferida não é a indicada para este piloto.");
  }

  if (template.regions.includes("portugal") || template.regions.includes(profile.region)) {
    score += 10;
    reasons.push(
      template.regions.includes("portugal")
        ? "O modelo pode ser investigado em qualquer região."
        : "Existe um piloto de dados para a zona escolhida.",
    );
  } else {
    tensions.push("Ainda não existe sinal local curado para a zona escolhida.");
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

export function rankOpportunityTemplates(profile: BusinessDiscoveryProfile) {
  return OPPORTUNITY_TEMPLATES.map((template) => ({
    template,
    fit: calculateOpportunityFit(template, profile),
  })).sort((left, right) => right.fit.score - left.fit.score || left.template.title.localeCompare(right.template.title));
}
