// ═══════════════════════════════════════════════════════════════════════
//  DICIONÁRIO DE EVENTOS — a fonte única do que se mede
//  ---------------------------------------------------------------------
//  Secção 8.1 do relatório estratégico. A auditoria não encontrou nenhuma
//  camada de product analytics no repositório: não se sabia que ferramentas
//  ativam, que guias convertem, porque regressam os utilizadores nem onde
//  o dinheiro se perde. A primeira das sete decisões do relatório é
//  «medir antes de escalar» — e é isto.
//
//  Três regras governam este ficheiro:
//
//   1. O dicionário é PEQUENO, ESTÁVEL e AUDITÁVEL. O objetivo não é
//      gravar tudo; é ligar origem → intenção → conclusão → retorno →
//      desfecho comercial. Um evento que não responde a uma pergunta do
//      painel semanal (§8.3) não entra.
//
//   2. Nenhum evento transporta dados fiscais pessoais. Nem valores de
//      rendimento, nem NIF, nem documentos, nem texto livre. Quando a
//      grandeza importa, vai em BALDE (ver `pii.ts`). Esta regra é
//      verificada em runtime e em teste — não é uma boa intenção.
//
//   3. Cada evento declara aqui o seu disparo e as suas propriedades. Um
//      evento sem entrada em `CATALOGO` é recusado pelo tracker. Isto
//      impede a erosão lenta que transforma qualquer taxonomia num
//      caixote: seis meses depois ninguém sabe o que `click_2` significa.
// ═══════════════════════════════════════════════════════════════════════

import type { ClusterId } from "@/lib/clusters";

// ─── Vocabulário partilhado ────────────────────────────────────────────

/** Se a pessoa tem conta e se está a pagar. Nunca identifica ninguém. */
export type EstadoConta = "anonimo" | "autenticado" | "plus";

/** Estado do paywall no momento da ação — separa «não quis» de «não pôde». */
export type EstadoPaywall = "sem_paywall" | "bloqueado" | "desbloqueado";

/**
 * Confiança do resultado (§14.3: o cabeçalho mostra o nível de confiança).
 *  · `completo`   — todas as entradas necessárias, regra coberta pelo motor
 *  · `estimado`   — faltam entradas opcionais; o resultado é um intervalo
 *  · `fora_de_escopo` — caso que o motor reconhece mas não cobre
 */
export type EstadoConfianca = "completo" | "estimado" | "fora_de_escopo";

/** Desfecho de um passo de simulador. */
export type DesfechoPasso = "ok" | "erro" | "abandonado";

/** As rotas comerciais mutuamente exclusivas do §7.3. */
export type Rota = "fiz" | "contabilista" | "sem_parceiro" | "plus";

// ─── Os eventos ────────────────────────────────────────────────────────

/**
 * Nomes dos eventos, exatamente como no §8.1 do relatório. Manter os nomes
 * em inglês é deliberado: são chaves de um sistema de medição partilhado
 * com ferramentas externas, não copy de interface (essa é toda em pt-PT).
 */
export type NomeEvento =
  | "guide_view"
  | "simulator_start"
  | "simulator_step"
  | "simulator_complete"
  | "result_view"
  | "result_save"
  | "result_share"
  | "result_export"
  | "signup_start"
  | "signup_complete"
  | "plus_checkout_start"
  | "plus_checkout_complete"
  | "fiz_impression"
  | "fiz_click"
  | "fiz_outcome"
  | "lead_consent"
  | "lead_submitted"
  | "lead_accepted"
  | "lead_won"
  | "return_7d"
  | "return_30d";

/** Propriedades de cada evento. O `Payload` de um evento é o seu contrato. */
export interface PayloadsEvento {
  guide_view: {
    guide_id: string;
    cluster: ClusterId | "sem_cluster";
    /** ISO date da última revisão editorial do guia — não a data do build. */
    reviewed_at: string;
  };
  simulator_start: {
    tool_id: string;
    scenario_type: string;
    entry_page: string;
    user_state: EstadoConta;
  };
  simulator_step: {
    tool_id: string;
    step_id: string;
    outcome: DesfechoPasso;
    error_code?: string;
    /** Balde de tempo, nunca o tempo exato (§8.2: só baldes). */
    elapsed_bucket?: string;
  };
  simulator_complete: {
    tool_id: string;
    fiscal_year: number;
    confidence_state: EstadoConfianca;
  };
  result_view: {
    tool_id: string;
    /** Versão do resultado apresentado — permite explicar discrepâncias. */
    result_version: string;
    /** Versão da metodologia/motor fiscal que produziu o número. */
    methodology_version: string;
  };
  result_save: AcaoResultado;
  result_share: AcaoResultado;
  result_export: AcaoResultado & { export_type: string };
  signup_start: { origin_action: string; method: string };
  signup_complete: { origin_action: string; method: string; success: boolean; error_code?: string };
  plus_checkout_start: { price_id: string; tool_origin: string; cohort: string };
  plus_checkout_complete: {
    price_id: string;
    tool_origin: string;
    cohort: string;
    payment_status: string;
  };
  fiz_impression: { placement: string; tool_id: string; reason: string };
  fiz_click: {
    placement: string;
    tool_id: string;
    /** Código de elegibilidade legível — o mesmo que se mostra ao utilizador. */
    reason: string;
    affiliate_id: string;
    /** Gerado no servidor (§8.2). Nunca inventado no cliente. */
    click_id: string;
  };
  fiz_outcome: {
    click_id: string;
    outcome_type: string;
    /** Em cêntimos, para não arrastar vírgula flutuante na reconciliação. */
    eligible_revenue_cents: number;
    lag_days: number;
  };
  lead_consent: { case_type: string; partner_id: string; consent_version: string };
  lead_submitted: { case_type: string; partner_id: string; consent_version: string };
  lead_accepted: { case_type: string; partner_id: string; status: string; lag_days: number };
  lead_won: { case_type: string; partner_id: string; status: string; lag_days: number };
  return_7d: Retorno;
  return_30d: Retorno;
}

interface AcaoResultado {
  tool_id: string;
  action: string;
  account_state: EstadoConta;
  paywall_state: EstadoPaywall;
}

interface Retorno {
  first_tool: string;
  current_tool: string;
  account_state: EstadoConta;
  origin_cohort: string;
}

/** Um evento pronto a enviar: nome + payload correspondente. */
export type Evento = {
  [N in NomeEvento]: { nome: N; props: PayloadsEvento[N] };
}[NomeEvento];

// ─── Catálogo: quando dispara e porque existe ──────────────────────────

export interface DefinicaoEvento {
  /** Quando é que este evento dispara — a condição, não a intenção. */
  disparo: string;
  /** A pergunta do painel semanal a que serve (§8.3). Sem isto, não entra. */
  serve: string;
  /**
   * `servidor` quando o evento só pode ser emitido do lado do servidor,
   * porque depende de um facto que o cliente não conhece nem deve poder
   * afirmar (um pagamento confirmado por webhook, um postback do parceiro,
   * o estado de uma lead). Aceitar isto do browser seria aceitar receita
   * inventada por quem abrisse a consola.
   */
  origem: "cliente" | "servidor";
}

export const CATALOGO: Record<NomeEvento, DefinicaoEvento> = {
  guide_view: {
    disparo: "Guia visto, com consentimento de medição concedido.",
    serve: "Que conteúdo traz decisões, e não apenas visitas.",
    origem: "cliente",
  },
  simulator_start: {
    disparo: "Primeiro input válido de um simulador ou decisor.",
    serve: "Denominador da ativação (DVM / simulator_start).",
    origem: "cliente",
  },
  simulator_step: {
    disparo: "Passo concluído ou com erro.",
    serve: "Onde falha o valor — os três maiores abandonos.",
    origem: "cliente",
  },
  simulator_complete: {
    disparo: "Entradas suficientes e cálculo válido produzido.",
    serve: "Metade da North Star (a outra metade é o result_view).",
    origem: "cliente",
  },
  result_view: {
    disparo: "Resultado principal efetivamente renderizado.",
    serve: "Fecha a Decisão Verificada: houve cálculo E houve resultado visto.",
    origem: "cliente",
  },
  result_save: {
    disparo: "Cenário guardado.",
    serve: "Memória do utilizador — precursor do retorno a 30 dias.",
    origem: "cliente",
  },
  result_share: {
    disparo: "Resultado partilhado (link de cenário sem dados pessoais).",
    serve: "Taxa de recomendação e DVM por partilha.",
    origem: "cliente",
  },
  result_export: {
    disparo: "Exportação escolhida (CSV, PDF ou dossiê).",
    serve: "Valor recorrente do Plus e qualidade do handoff.",
    origem: "cliente",
  },
  signup_start: {
    disparo: "Início do fluxo de criação de conta.",
    serve: "Onde a conta é pedida e se isso ajuda ou trava.",
    origem: "cliente",
  },
  signup_complete: {
    disparo: "Conta criada (ou erro no fim do fluxo).",
    serve: "Conversão para identidade, por ação de origem.",
    origem: "cliente",
  },
  plus_checkout_start: {
    disparo: "Checkout do Plus iniciado.",
    serve: "Separar intenção de compra de retenção (§17.1).",
    origem: "cliente",
  },
  plus_checkout_complete: {
    disparo: "Pagamento CONFIRMADO por webhook — nunca no regresso do browser.",
    serve: "MRR real, sem contar checkouts abandonados como receita.",
    origem: "servidor",
  },
  fiz_impression: {
    disparo: "Cartão FIZ elegível efetivamente visível.",
    serve: "Denominador honesto do CTR — impressão vista, não renderizada.",
    origem: "cliente",
  },
  fiz_click: {
    disparo: "Clique num destino FIZ, já com click_id do servidor.",
    serve: "Início da cadeia de atribuição fim a fim.",
    origem: "cliente",
  },
  fiz_outcome: {
    disparo: "Postback ou reconciliação do parceiro.",
    serve: "Receita por 1.000 DVM e taxa de reconciliação (meta ≥ 95%).",
    origem: "servidor",
  },
  lead_consent: {
    disparo: "Consentimento específico dado para partilhar o caso.",
    serve: "Prova de que nada seguiu sem ação afirmativa.",
    origem: "cliente",
  },
  lead_submitted: {
    disparo: "Caso enviado ao profissional escolhido.",
    serve: "Volume da rota de exceção.",
    origem: "servidor",
  },
  lead_accepted: {
    disparo: "Profissional aceitou o caso.",
    serve: "Taxa de aceitação (meta ≥ 60% no piloto).",
    origem: "servidor",
  },
  lead_won: {
    disparo: "Caso convertido em cliente do profissional.",
    serve: "Economia real da rota de contabilista.",
    origem: "servidor",
  },
  return_7d: {
    disparo: "Nova sessão com utilidade dentro de 7 dias.",
    serve: "R7 por ferramenta e por coorte.",
    origem: "cliente",
  },
  return_30d: {
    disparo: "Nova sessão com utilidade dentro de 30 dias.",
    serve: "R30 — o teste de «o produto merece uma subscrição?».",
    origem: "cliente",
  },
};

/** Os eventos que o browser NÃO pode afirmar. Ver `DefinicaoEvento.origem`. */
export const EVENTOS_SO_SERVIDOR: readonly NomeEvento[] = (
  Object.keys(CATALOGO) as NomeEvento[]
).filter((n) => CATALOGO[n].origem === "servidor");

export function eventoConhecido(nome: string): nome is NomeEvento {
  return Object.prototype.hasOwnProperty.call(CATALOGO, nome);
}

// ─── Baldes ────────────────────────────────────────────────────────────

/**
 * Converte uma duração num balde. §8.2 permite recolher grandezas «apenas
 * em baldes quando indispensável» — e a duração de um passo é o caso
 * clássico: saber que um passo demora «mais de 2 minutos» diz tudo o que é
 * preciso para o corrigir, e o milissegundo exato é um identificador.
 */
export function baldeDeTempo(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "desconhecido";
  if (ms < 5_000) return "0-5s";
  if (ms < 15_000) return "5-15s";
  if (ms < 60_000) return "15-60s";
  if (ms < 300_000) return "1-5min";
  return "5min+";
}

/**
 * Balde de valor, em euros. Existe para o dia em que for tentador enviar
 * «rendimento: 34.500» — a resposta é `baldeDeValor(34500)` → "20k-50k",
 * que serve para segmentar e não serve para reidentificar ninguém.
 */
export function baldeDeValor(euros: number): string {
  if (!Number.isFinite(euros) || euros < 0) return "desconhecido";
  if (euros < 1_000) return "0-1k";
  if (euros < 5_000) return "1k-5k";
  if (euros < 10_000) return "5k-10k";
  if (euros < 20_000) return "10k-20k";
  if (euros < 50_000) return "20k-50k";
  if (euros < 100_000) return "50k-100k";
  return "100k+";
}
