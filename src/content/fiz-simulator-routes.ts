// ═══════════════════════════════════════════════════════════════════════
//  ENCAMINHAMENTO DOS SIMULADORES PARA A FIZ
//  ---------------------------------------------------------------------
//  Ponto 12.3 da arquitetura da parceria: os simuladores mantêm resultados e
//  memória de cálculo, e ganham um plano de ação com handoff escolhido pelo
//  utilizador.
//
//  Mesmas regras dos Guias: destino por CHAVE DE CAPACIDADE, nunca por URL;
//  nenhuma rota ativa antes da validação bilateral; e um simulador sem ação
//  correspondente tem a razão documentada em vez de ficar vazio por
//  esquecimento.
//
//  Diferença importante face aos Guias: aqui existe SEMPRE um resultado
//  calculado, por isso o handoff transporta um resumo de simulação — e é por
//  isso que estas rotas são quase todas CONSENTED_HANDOFF.
// ═══════════════════════════════════════════════════════════════════════

import type { FizIntent, GuideTopic, GuideDataMode } from "@/lib/guias/manifests";
import type { CampoHandoff } from "@/lib/fiz/handoff-fields";

export type SimuladorId =
  | "recibos-verdes"
  | "simulador-irs"
  | "simulador-empresa"
  | "regime-simplificado"
  | "ato-isolado"
  | "classificar-atividade"
  | "payout-mor"
  | "recibo-vencimento"
  | "auditoria-recibo"
  | "simulador-herancas"
  | "comparador";

export interface FizSimulatorRoute {
  simulador: SimuladorId;
  /** Rótulo do simulador, para a interface e para os registos. */
  nome: string;
  topic: GuideTopic;
  intent: FizIntent;
  requiredCapability: string;
  dataMode: GuideDataMode;
  /** Texto do botão, se a FIZ não devolver um aprovado por ela. */
  fallbackLabel: string;
  /** O que o utilizador ganha ao continuar — aparece antes do botão. */
  promessa: string;
  /**
   * Par de textos do modo LIGACAO (Fase 1 — link de afiliado).
   *
   * `promessa` diz «leva esta configuração para não a voltares a introduzir».
   * Em modo LIGACAO isso é FALSO: nada é transportado. Por isso cada rota tem
   * de trazer o seu par próprio — e obrigatório, ao contrário dos Guias, que
   * têm um recurso por intenção. Aqui a promessa é específica do simulador e
   * não há default honesto possível.
   */
  fallbackLabelLigacao: string;
  promessaLigacao: string;
  /** Campos que este simulador PROPÕE transferir. O utilizador escolhe
      quais autoriza; nada é enviado por omissão. */
  camposPropostos: CampoHandoff[];
  exigeRevisaoHumana?: boolean;
  enabled: boolean;
}

/**
 * Simuladores ativados, por lotes — a mesma lógica de `ROTAS_ATIVAS` nos
 * Guias. Ativar aqui não põe nada no ar sozinho: `PARCERIAS_ATIVAS` e a linha
 * da parceria no Supabase continuam a ser condições necessárias.
 */
const ATIVAS: readonly SimuladorId[] = [
  "recibos-verdes",
  "simulador-irs",
  "regime-simplificado",
];

/**
 * Identificação. Nunca é enviada por omissão e o utilizador escolhe campo a
 * campo — mas tem de constar da proposta do simulador, senão o servidor
 * recusa-a mesmo com consentimento. É o que evita que uma superfície
 * qualquer possa pedir o NIF só por o pôr no corpo do pedido.
 */
const IDENTIFICACAO: CampoHandoff[] = ["fullName", "taxpayerNumber", "email", "phone"];

const RESUMO_TI: CampoHandoff[] = [
  "entityType", "activityCategory", "vatTerritory", "vatRegimeEstimate",
  "period", "grossEstimate", "vatEstimate", "withholdingEstimate", "socialSecurityEstimate",
  "irsEstimate",
];

export const FIZ_SIMULATOR_ROUTES: FizSimulatorRoute[] = [
  {
    simulador: "recibos-verdes",
    nome: "Calculadora de recibos verdes",
    topic: "OPEN_ACTIVITY",
    intent: "CONFIGURE_FREELANCER",
    requiredCapability: "onboarding.freelancer",
    dataMode: "CONSENTED_HANDOFF",
    fallbackLabel: "Continuar com a FIZ sem repetir dados",
    promessa: "Leva esta configuração — atividade, regime de IVA e retenção — para não a voltares a introduzir.",
    fallbackLabelLigacao: "Abrir atividade e faturar com a FIZ",
    promessaLigacao: "A FIZ é software de faturação para quem passa recibos verdes: emite as faturas, trata do IVA e das obrigações da Segurança Social.",
    camposPropostos: [...RESUMO_TI, ...IDENTIFICACAO],
    enabled: ATIVAS.includes("recibos-verdes"),
  },
  {
    simulador: "simulador-irs",
    nome: "Simulador de IRS anual",
    topic: "IRS",
    intent: "PREPARE_IRS",
    requiredCapability: "irs.preparation",
    dataMode: "CONSENTED_HANDOFF",
    fallbackLabel: "Continuar a preparação do IRS na FIZ",
    promessa: "Envia os valores estimados para começares a declaração já com o contexto certo.",
    fallbackLabelLigacao: "Entregar o IRS com a FIZ",
    promessaLigacao: "A estimativa é nossa; a entrega é de quem está certificado para a fazer.",
    camposPropostos: ["entityType", "period", "grossEstimate", "irsEstimate", "withholdingEstimate", ...IDENTIFICACAO],
    enabled: ATIVAS.includes("simulador-irs"),
  },
  {
    simulador: "simulador-empresa",
    nome: "Simulador de empresa",
    topic: "COMPANY",
    intent: "START_COMPANY",
    requiredCapability: "company.onboarding",
    dataMode: "CONSENTED_HANDOFF",
    fallbackLabel: "Preparar a constituição na FIZ",
    promessa: "Leva a estrutura simulada para quem trata da constituição e da contabilidade.",
    fallbackLabelLigacao: "Ver a FIZ para empresas",
    promessaLigacao: "Constituição, contabilidade organizada e as obrigações anuais da sociedade, tratadas por contabilistas certificados.",
    camposPropostos: ["entityType", "activityCategory", "period", "grossEstimate", "irsEstimate", ...IDENTIFICACAO],
    enabled: ATIVAS.includes("simulador-empresa"),
  },
  {
    simulador: "regime-simplificado",
    nome: "Calculadora de regime simplificado",
    topic: "IRS",
    intent: "CONFIGURE_FREELANCER",
    requiredCapability: "tax-setup.review",
    dataMode: "CONSENTED_HANDOFF",
    fallbackLabel: "Rever a configuração fiscal na FIZ",
    promessa: "Confirma com quem executa se o coeficiente e o regime estão corretos no teu caso.",
    fallbackLabelLigacao: "Confirmar o enquadramento com a FIZ",
    promessaLigacao: "O coeficiente e o regime dependem da atividade concreta. Um contabilista confirma o teu caso antes de haver consequências.",
    camposPropostos: ["entityType", "activityCategory", "period", "grossEstimate", "irsEstimate", ...IDENTIFICACAO],
    enabled: ATIVAS.includes("regime-simplificado"),
  },
  {
    simulador: "ato-isolado",
    nome: "Decisor de ato isolado",
    topic: "OPEN_ACTIVITY",
    intent: "CONFIGURE_FREELANCER",
    requiredCapability: "onboarding.review-setup",
    dataMode: "CONSENTED_HANDOFF",
    fallbackLabel: "Rever o enquadramento na FIZ",
    promessa: "Se a decisão for abrir atividade, continua sem recomeçar do zero.",
    fallbackLabelLigacao: "Falar com um contabilista certificado",
    promessaLigacao: "Se a decisão for abrir atividade, é a FIZ que trata do passo seguinte.",
    camposPropostos: ["entityType", "activityCategory", "period", "grossEstimate", ...IDENTIFICACAO],
    enabled: ATIVAS.includes("ato-isolado"),
  },
  {
    simulador: "classificar-atividade",
    nome: "Classificador de atividade",
    topic: "OPEN_ACTIVITY",
    intent: "CONFIGURE_FREELANCER",
    requiredCapability: "onboarding.freelancer",
    dataMode: "CONSENTED_HANDOFF",
    fallbackLabel: "Abrir atividade com esta classificação na FIZ",
    promessa: "Leva o código de atividade escolhido para a abertura.",
    fallbackLabelLigacao: "Abrir atividade com a FIZ",
    promessaLigacao: "A classificação decide o coeficiente, a retenção e a base de Segurança Social do resto da tua vida fiscal — vale a pena confirmá-la com quem a vai registar.",
    camposPropostos: ["entityType", "activityCategory", "vatRegimeEstimate", ...IDENTIFICACAO],
    enabled: ATIVAS.includes("classificar-atividade"),
  },
  {
    simulador: "comparador",
    nome: "Comparador de enquadramentos",
    topic: "COMPANY",
    intent: "FIND_ACCOUNTANT",
    requiredCapability: "accountant.assessment",
    dataMode: "CONSENTED_HANDOFF",
    fallbackLabel: "Validar a escolha com um contabilista na FIZ",
    promessa: "A comparação é uma estimativa. Confirma a decisão com quem a vai executar.",
    fallbackLabelLigacao: "Validar a escolha com um contabilista",
    promessaLigacao: "A comparação é uma estimativa nossa. Quem a executa é quem a deve confirmar.",
    camposPropostos: ["entityType", "period", "grossEstimate", "irsEstimate", ...IDENTIFICACAO],
    exigeRevisaoHumana: true,
    enabled: ATIVAS.includes("comparador"),
  },
  {
    simulador: "payout-mor",
    nome: "Assistente de payout Merchant of Record",
    topic: "ACCOUNTANT",
    intent: "FIND_ACCOUNTANT",
    requiredCapability: "accountant.assessment",
    dataMode: "NO_DATA",
    fallbackLabel: "Falar com um contabilista na FIZ",
    promessa: "O tratamento correto depende do teu contrato — não há resposta única para levar daqui.",
    fallbackLabelLigacao: "Falar com um contabilista certificado",
    promessaLigacao: "O tratamento correto depende do contrato concreto e não há resposta única — é uma conversa, não um formulário.",
    camposPropostos: [],
    exigeRevisaoHumana: true,
    enabled: ATIVAS.includes("payout-mor"),
  },
];

/** Simuladores que, por decisão de produto, NÃO encaminham para a FIZ. */
export const SIMULADORES_SEM_ACAO_FIZ: { simulador: SimuladorId; razao: string }[] = [
  {
    simulador: "recibo-vencimento",
    razao: "Trabalho dependente: quem executa é a entidade empregadora, não um operador fiscal. Não há ação a continuar.",
  },
  {
    simulador: "auditoria-recibo",
    razao: "A auditoria é uma ferramenta de verificação do Recibo Certo. O passo seguinte é falar com a entidade empregadora.",
  },
  {
    simulador: "simulador-herancas",
    razao: "Sucessões resolvem-se em notário ou advogado, fora do âmbito de execução fiscal da FIZ.",
  },
];

export function rotaDoSimulador(id: SimuladorId): FizSimulatorRoute | undefined {
  return FIZ_SIMULATOR_ROUTES.find((r) => r.simulador === id);
}

export const META_ROTAS_SIMULADORES = {
  comAcao: FIZ_SIMULATOR_ROUTES.length,
  semAcao: SIMULADORES_SEM_ACAO_FIZ.length,
  ativas: FIZ_SIMULATOR_ROUTES.filter((r) => r.enabled).length,
} as const;
