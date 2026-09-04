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
import type { EstadoTrabalho, TipoTrabalho } from "@/lib/dashboard/work-items/tipos";
import type { MotivoAgora } from "@/lib/dashboard/work-items/agregar";

export type NomeEvento =
  | "guide_view"
  // ── Motor de dossiê de guia (§9 do relatório do motor) ──────────────
  //
  // Oito eventos, e o que os justifica é uma pergunta que não tinha
  // resposta possível: de `/guias/*` só saía `guide_view`, e por isso não
  // se sabia — nem se PODIA saber — que guias geram procura de
  // profissional. Havia eventos `accountant_*` declarados que os Guias
  // nunca disparavam.
  //
  // `guide_dossier_extract` é o que responde à pergunta que decide o
  // futuro do motor: das sete vistas da consola, quais é que os
  // contabilistas usam mesmo. Se ao fim de um trimestre só três forem
  // usadas, cortam-se as outras quatro.
  | "guide_dossier_start"
  | "guide_dossier_ready"
  | "guide_dossier_sent"
  | "guide_dossier_opened"
  | "guide_dossier_extract"
  | "guide_dossier_request"
  | "guide_dossier_request_answered"
  | "guide_dossier_revoked"
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
  | "accountant_link_request"
  | "accountant_share"
  | "accountant_booking"
  | "accountant_match_impression"
  | "accountant_match_click"
  | "lead_consent"
  | "lead_submitted"
  | "lead_accepted"
  | "lead_won"
  | "return_7d"
  | "return_30d"
  // ── Cabeçalho e pesquisa global (§15 da auditoria do cabeçalho) ──────
  // Onze eventos, e nenhum transporta o que foi escrito. Sem eles não há
  // como provar descoberta, relevância nem tempo até valor — e a auditoria
  // dá 4/10 a esta dimensão precisamente por não existir contrato nenhum.
  //
  // Os seis últimos chegaram com a moldura canónica: medem a DECISÃO (que
  // família, que confiança, que pergunta, que caminho aberto) e não a
  // leitura. É a diferença entre saber se a pesquisa está a resolver
  // perguntas e saber o que as pessoas escreveram — e só a primeira é
  // nossa para saber.
  | "header_search_open"
  | "header_search_submit"
  | "header_search_result_click"
  | "header_search_zero_results"
  | "header_search_abandon"
  | "header_search_intent_recognized"
  | "header_search_clarification_shown"
  | "header_search_clarification_answered"
  | "header_search_prepared_action_open"
  | "header_search_alternate_path_click"
  | "header_search_professional_support_open"
  | "header_nav_click"
  | "header_overlay_conflict"
  | "focus_switch_ack"
  | "focus_switch_ready"
  // ── Salário bifurcado e planeador de contratação ───────────────────
  | "salary_path_impression"
  | "salary_path_selected"
  | "hiring_planner_started"
  | "hiring_goal_selected"
  | "hiring_result_viewed"
  | "hiring_calculation_started"
  | "hiring_calculation_completed"
  | "hiring_result_incomplete"
  | "hiring_blocking_fact_resolved"
  | "hiring_range_explained"
  | "hiring_scenario_saved"
  | "hiring_scenario_reopened"
  | "hiring_comparison_created"
  | "hiring_offer_exported"
  | "hiring_export_generated"
  | "hiring_support_opened"
  | "hiring_share_created"
  | "hiring_share_revoked"
  // ── Painel: continuidade (§16.1 do relatório do dashboard) ──────────
  // O painel não media nada do que este trabalho existe para melhorar:
  // se a retoma é visível, se é útil, e se as etapas se ligam umas às
  // outras. Sem estes quatro, simplificar a navegação seria adivinhar.
  //
  // Nenhum deles transporta título, id, montante, atividade ou concelho.
  // Transportam a ETAPA, o ESTADO e o MOTIVO — enums fechados, definidos
  // no contrato de trabalho e na regra do «Agora».
  | "dashboard_view"
  | "dashboard_workspace_opened"
  | "dashboard_continue_clicked"
  | "dashboard_next_action_clicked";

export type PercursoSalario = "trabalhador" | "empregador";
export type ObjetivoContratacao =
  | "employer_budget"
  | "target_net"
  | "known_offer"
  | "required_capacity";
export type CertezaContratacao = "exact" | "range";
/** Nível de confiança da decisão patronal. Nunca acompanha valores pessoais. */
export type ProntidaoContratacao =
  | "incomplete"
  | "estimated"
  | "personalized"
  | "validated";
export type ProjecaoContratacao = "personalized_projection" | "reference_scenarios";

/** Propriedades de cada evento. O `Payload` de um evento é o seu contrato. */
export interface PayloadsEvento {
  guide_view: {
    guide_id: string;
    cluster: ClusterId | "sem_cluster";
    /** ISO date da última revisão editorial do guia — não a data do build. */
    reviewed_at: string;
  };
  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ OS OITO DO DOSSIÊ: A FORMA, NUNCA O CONTEÚDO                       │
   * │                                                                   │
   * │ `guide_id` é um slug público — está no URL de toda a gente. O que  │
   * │ nunca entra é o que a pessoa respondeu, a nota que escreveu, o     │
   * │ destinatário, ou qualquer valor fiscal: contagens em balde         │
   * │ (`section_count`, `item_count`) dizem tudo o que o painel precisa  │
   * │ sem dizer nada sobre o caso.                                      │
   * │                                                                   │
   * │ E nenhum evento leva `guide_id` e dados fiscais no mesmo sítio —   │
   * │ é a regra 2 deste ficheiro, aplicada onde é mais fácil quebrá-la.  │
   * └───────────────────────────────────────────────────────────────────┘
   */
  guide_dossier_start: {
    guide_id: string;
    /** `contabilista` ou `fiz` — a rota que o guia mostrou. */
    route: Rota;
    user_state: EstadoConta;
  };
  guide_dossier_ready: {
    guide_id: string;
    /** Quantas secções a pessoa deixou seguir. Um número, nunca quais. */
    section_count: number;
    /** Quantas perguntas ficaram em «não sei». */
    unknown_count: number;
  };
  guide_dossier_sent: {
    guide_id: string;
    /** `vinculo`, `caso` ou `ligacao` — o destino, nunca o destinatário. */
    destination: string;
    consent_version: string;
    section_count: number;
  };
  guide_dossier_opened: {
    guide_id: string;
    destination: string;
    /** Quantas vezes já tinha sido aberto. Serve a taxa de leitura real. */
    open_count: number;
  };
  guide_dossier_extract: {
    guide_id: string;
    /** A vista de onde se extraiu: `elementos`, `julgamento`, … */
    view: string;
    /** `copiar`, `exportar`, `pedir`, `perguntar`. */
    action: string;
    /** Formato, quando a ação o tem. */
    format?: string;
    item_count: number;
  };
  guide_dossier_request: {
    guide_id: string;
    item_count: number;
    /** Quantos itens foram escritos pelo profissional, e não pelo guia. */
    authored_count: number;
    /** Havia prazo em algum item? Um sim/não, nunca a data. */
    has_deadline: boolean;
  };
  guide_dossier_request_answered: {
    guide_id: string;
    /** `entregue`, `nao_aplica` ou `dispensado`. */
    outcome: string;
    item_count: number;
  };
  guide_dossier_revoked: {
    guide_id: string;
    destination: string;
    /** Balde de dias desde o envio (§8.2: só baldes). */
    age_bucket: string;
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
  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ A REGRA DESTES TRÊS: NENHUM DADO FISCAL, NENHUMA IDENTIDADE       │
   * │                                                                   │
   * │ Uma partilha com o contabilista É conteúdo fiscal — valores,      │
   * │ regimes, por vezes o nome de um cliente no campo de notas. Nada    │
   * │ disso entra aqui, nem truncado nem em amostra.                    │
   * │                                                                   │
   * │ O `tool_id` diz de que ferramenta veio; o resto é forma. O id do  │
   * │ contabilista também não entra: cruzado com o utilizador, seria a  │
   * │ relação profissional de alguém num sistema de medição.            │
   * └───────────────────────────────────────────────────────────────────┘
   */
  accountant_link_request: { entry_page: string; user_state: EstadoConta };
  accountant_share: {
    tool_id: string;
    /** Tipo de partilha (`simulador_irs`, …) — rótulo nosso, não conteúdo. */
    share_kind: string;
    consent_version: string;
    /** Quantos campos seguiram. Um número, nunca os campos. */
    field_count: number;
  };
  accountant_booking: {
    /** `pedido` ou `cancelado` — a ação, não a data nem o assunto. */
    action: string;
    modality: string;
  };
  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ OS DOIS DA AFINIDADE: SEM O CONTABILISTA, SEM O RESULTADO          │
   * │                                                                   │
   * │ Medem se o fim de uma ferramenta leva alguém a um profissional —   │
   * │ e não QUEM. O id (ou o nome, ou o distrito) do contabilista        │
   * │ cruzado com o utilizador seria a relação profissional de alguém    │
   * │ num sistema de medição, que é a mesma linha que `accountant_share` │
   * │ já se recusa a atravessar.                                        │
   * │                                                                   │
   * │ `carries_result` é um sim/não sobre a EXISTÊNCIA de bagagem. O que │
   * │ a bagagem contém nunca sai do dispositivo por esta porta.          │
   * └───────────────────────────────────────────────────────────────────┘
   */
  accountant_match_impression: {
    tool_id: string;
    /** Estado da secção: `vinculado`, `diretorio` ou `vazio`. */
    state: string;
    /** Quantos cartões foram mostrados. */
    candidate_count: number;
    /** Quantos deles cobrem mesmo alguma das áreas pedidas. */
    matched_count: number;
    /** Havia uma simulação para levar? */
    carries_result: boolean;
  };
  accountant_match_click: {
    tool_id: string;
    /** A posição publicada do cartão seguido. Empates partilham o número. */
    rank: number;
    carries_result: boolean;
  };
  lead_consent: { case_type: string; partner_id: string; consent_version: string };
  lead_submitted: { case_type: string; partner_id: string; consent_version: string };
  lead_accepted: { case_type: string; partner_id: string; status: string; lag_days: number };
  lead_won: { case_type: string; partner_id: string; status: string; lag_days: number };
  return_7d: Retorno;
  return_30d: Retorno;

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ A REGRA DESTES SETE: A CONSULTA NUNCA SAI DO DISPOSITIVO           │
   * │                                                                   │
   * │ Nem truncada, nem «anonimizada», nem em amostra. Num produto       │
   * │ fiscal, a frase escrita na barra é um nome de cliente, um NIF, uma │
   * │ doença que dá dedução — e não há forma de a limpar que sobreviva a │
   * │ um utilizador criativo. O que se mede é a FORMA da consulta        │
   * │ (comprimento em balde, número de palavras) e o que ela produziu.   │
   * │                                                                   │
   * │ A barreira de `pii.ts` já recusaria um campo chamado `pesquisa`.   │
   * │ Isto é a decisão de desenho por trás dela: não há nenhum campo     │
   * │ onde a consulta caiba.                                            │
   * └───────────────────────────────────────────────────────────────────┘
   */
  header_search_open: ContextoBusca & {
    /** `frio` = índice ainda por carregar; `quente` = já em memória. */
    load_state: "frio" | "quente";
  };
  header_search_submit: ContextoBusca & {
    /** Balde do comprimento: "1-3", "4-10", "11-25", "26+". Nunca o texto. */
    length_bucket: string;
    token_count: number;
    intent: string;
  };
  header_search_result_click: ContextoBusca & {
    /** Id do documento do índice — um rótulo nosso, não conteúdo do utilizador. */
    document_id: string;
    kind: string;
    /** Posição na lista, a começar em 1. É a métrica de relevância. */
    rank: number;
    intent: string;
  };
  header_search_zero_results: ContextoBusca & {
    length_bucket: string;
    intent: string;
    /** Versão do índice — separa «não existe» de «ainda não estava indexado». */
    corpus_version: number;
  };
  header_search_abandon: ContextoBusca & {
    had_query: boolean;
    result_count_bucket: string;
    duration_bucket: string;
  };

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ A MOLDURA MEDE-SE PELO QUE DECIDIU, NUNCA PELO QUE LEU             │
   * │                                                                   │
   * │ O reconhecimento é a parte do produto que toca no texto mais       │
   * │ sensível que existe aqui: a frase que a pessoa escreveu. O que     │
   * │ estes seis eventos transportam é a FORMA da decisão — família,     │
   * │ intenção, confiança, quantas entidades, que pergunta se fez, que   │
   * │ opção fechada foi escolhida — e nunca o conteúdo dela.             │
   * │                                                                   │
   * │ Não há aqui um campo onde um valor caiba. Não é disciplina: a      │
   * │ barreira de `pii.ts` recusa qualquer chave com «valor» no nome, e  │
   * │ o `PlanoBusca` — que é o que estes eventos leem — também não       │
   * │ transporta valores, só tipos de entidade.                          │
   * └───────────────────────────────────────────────────────────────────┘
   */
  header_search_intent_recognized: ContextoBusca & {
    /** A família de decisão reconhecida, ou `nenhum`. Nunca a frase. */
    domain: string;
    intent: string;
    /** `pronto` · `clarificar` · `reconhecido` · `sem_caminho`. */
    plan_state: string;
    confidence: string;
    renderer: string;
    /** QUANTAS entidades se reconheceram. Nunca quais eram os valores. */
    entity_count: number;
  };
  header_search_clarification_shown: ContextoBusca & {
    /** O tipo da pergunta — uma união fechada, não a pergunta escrita. */
    kind: string;
    domain: string;
  };
  header_search_clarification_answered: ContextoBusca & {
    kind: string;
    /** O id da opção: `mes`, `ano`, `nao-sei`, … Sempre de um conjunto fechado. */
    answer: string;
  };
  header_search_prepared_action_open: ContextoBusca & {
    document_id: string;
    renderer: string;
    confidence: string;
    /** Quantos campos de contexto viajaram. Nunca o que estava neles. */
    handoff_field_count: number;
  };
  header_search_alternate_path_click: ContextoBusca & {
    document_id: string;
    rank: number;
  };
  header_search_professional_support_open: ContextoBusca & {
    /** `true` quando o apoio era o caminho principal, e não a faixa. */
    as_primary: boolean;
    /** Quantos filtros estruturados seguiram. Nunca quais eram. */
    filter_count: number;
  };
  header_nav_click: { item_id: string; viewport_class: ClasseViewport };
  header_overlay_conflict: {
    /** O overlay que pediu para abrir e o que já estava aberto. */
    requested: string;
    active: string;
  };
  focus_switch_ack: ContextoTrocaFoco;
  focus_switch_ready: ContextoTrocaFoco;
  salary_path_impression: ContextoContratacao & { path: PercursoSalario };
  salary_path_selected: ContextoContratacao & { path: PercursoSalario };
  hiring_planner_started: ContextoContratacao;
  hiring_goal_selected: ContextoContratacao & { goal: ObjetivoContratacao };
  hiring_result_viewed: ContextoContratacao & {
    goal: ObjetivoContratacao;
    certainty: CertezaContratacao;
    completion_step: string;
  };
  hiring_calculation_started: ContextoContratacao & { goal: ObjetivoContratacao };
  hiring_calculation_completed: ContextoContratacao & {
    goal: ObjetivoContratacao;
    readiness: ProntidaoContratacao;
    projection: ProjecaoContratacao;
    completion_step: string;
  };
  hiring_result_incomplete: ContextoContratacao & { blocking_count: number };
  hiring_blocking_fact_resolved: ContextoContratacao & { fact_id: string };
  hiring_range_explained: ContextoContratacao & { certainty: "range" };
  hiring_scenario_saved: ContextoContratacao & {
    saved_destination: "dispositivo" | "nuvem";
    readiness: ProntidaoContratacao;
  };
  hiring_scenario_reopened: ContextoContratacao;
  hiring_comparison_created: ContextoContratacao & { goal: ObjetivoContratacao };
  hiring_offer_exported: ContextoContratacao & { export_format: "pdf" };
  hiring_export_generated: ContextoContratacao & {
    export_format: "pdf";
    readiness: ProntidaoContratacao;
  };
  hiring_support_opened: ContextoContratacao & { support_id: string };
  hiring_share_created: ContextoContratacao;
  hiring_share_revoked: ContextoContratacao;

  // ── Painel: continuidade ────────────────────────────────────────────
  dashboard_view: {
    /** Havia trabalho por retomar quando o painel abriu. */
    has_work: boolean;
    /** Quantos itens — a contagem, nunca quais. */
    work_items: number;
    /** A lente fiscal ativa. É um perfil, não uma etapa. */
    fiscal_lens: "recibos" | "vencimento" | "empresa";
  };
  dashboard_workspace_opened: {
    workspace: TipoTrabalho;
    entrypoint: "overview" | "sidebar" | "hub_movel";
    state: EstadoTrabalho | "vazio";
  };
  dashboard_continue_clicked: {
    workspace: TipoTrabalho;
    state: EstadoTrabalho;
    source: "dispositivo" | "conta";
    /** A posição na lista. Diz se «Continuar» está no sítio certo. */
    position: number;
  };
  dashboard_next_action_clicked: {
    /** Porque foi ESTA a ação escolhida. Enum da regra de prioridade. */
    reason: MotivoAgora;
  };
}

/** Telemóvel, tablet ou secretária — pela largura, não pelo user-agent. */
export type ClasseViewport = "movel" | "tablet" | "secretaria";

interface ContextoBusca {
  viewport_class: ClasseViewport;
  /** Família da rota (`/guias`, `/ferramentas`, …). Nunca o URL completo. */
  route_group: string;
}

interface ContextoTrocaFoco {
  from_focus: string;
  to_focus: string;
  input: "pointer" | "teclado";
  prepared: boolean;
  latency_bucket: string;
}

/**
 * De onde veio quem está a planear uma contratação.
 *
 * As entradas `arco-*` existem porque contratar deixou de se alcançar só
 * pelo foco do salário: é o quarto passo do arco do negócio e tem cartão
 * próprio nas quatro leituras que desenham esse arco — a raiz («Descobrir»),
 * o preço, os recibos verdes e a empresa (`lib/foco/arco-contratacao.ts`).
 * Sem as distinguir, a única resposta possível a «qual dos passos traz quem
 * contrata?» era «ferramenta».
 *
 * É vocabulário fechado: a origem vem de um parâmetro da rota validado
 * contra esta lista, nunca do texto que estiver no URL.
 */
export type OrigemContexto =
  | "salario"
  | "ferramenta"
  | "arco-descobrir"
  | "arco-preco"
  | "arco-recibos"
  | "arco-empresa";

export interface ContextoContratacao {
  device: ClasseViewport;
  theme: "claro" | "escuro";
  source: OrigemContexto;
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
  dashboard_view: {
    disparo: "Visão geral do painel utilizável (cofre lido), com consentimento.",
    serve: "Denominador da continuidade: quantas sessões chegam com trabalho por retomar.",
    origem: "cliente",
  },
  dashboard_workspace_opened: {
    disparo: "Abertura de Descobrir, Preços, Projeto ou Contratação a partir do painel.",
    serve: "Que destinos merecem estar sempre visíveis, e por que porta se entra neles.",
    origem: "cliente",
  },
  dashboard_continue_clicked: {
    disparo: "Clique numa retoma da secção «Continuar de onde ficaste».",
    serve: "Se a retoma é visível e útil — a métrica que justifica esta reestruturação.",
    origem: "cliente",
  },
  dashboard_next_action_clicked: {
    disparo: "Clique na ação única do bloco «Agora».",
    serve: "Se a regra de prioridade escolhe a ação que a pessoa queria mesmo.",
    origem: "cliente",
  },
  guide_view: {
    disparo: "Guia visto, com consentimento de medição concedido.",
    serve: "Que conteúdo traz decisões, e não apenas visitas.",
    origem: "cliente",
  },
  guide_dossier_start: {
    disparo: "Folha de composição do dossiê aberta a partir de um Guia.",
    serve: "Que guias geram procura de profissional — a pergunta que só tinha `guide_view` para responder.",
    origem: "cliente",
  },
  guide_dossier_ready: {
    disparo: "Dossiê composto e pronto a seguir, antes de a pessoa escolher o destino.",
    serve: "Onde se desiste na composição, e quantas secções sobrevivem à escolha.",
    origem: "cliente",
  },
  guide_dossier_sent: {
    disparo: "Passagem feita: partilha ao vínculo, dossiê no caso, ou ligação criada.",
    serve: "Volume por destino — e se o destino de quem já tem contabilista fora da plataforma é mesmo usado.",
    origem: "cliente",
  },
  guide_dossier_opened: {
    disparo: "Dossiê aberto pelo destinatário. Contado no servidor, na rota que serve o conteúdo.",
    serve: "Taxa de leitura real: quantos dos que seguem chegam mesmo a ser lidos.",
    origem: "servidor",
  },
  guide_dossier_extract: {
    disparo: "Extração com seleção numa das vistas da consola.",
    serve: "QUE SECÇÕES VALEM — a pergunta que decide quais das sete vistas sobrevivem.",
    origem: "cliente",
  },
  guide_dossier_request: {
    disparo: "Pedido de elementos enviado ao cliente a partir da consola.",
    serve: "Se o motor gera trabalho ou só leitura.",
    origem: "cliente",
  },
  guide_dossier_request_answered: {
    disparo: "Cliente marcou um item pedido como entregue, dispensado ou não aplicável.",
    serve: "Se o ciclo fecha — a única medida de que a volta serve para alguma coisa.",
    origem: "cliente",
  },
  guide_dossier_revoked: {
    disparo: "Passagem revogada pela pessoa que a criou.",
    serve: "Sinal de confiança: quanto do que segue é retirado, e ao fim de quanto tempo.",
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
  accountant_link_request: {
    disparo: "Pedido de vínculo enviado a um contabilista do diretório.",
    serve: "Se o diretório converte, e a partir de que páginas.",
    origem: "cliente",
  },
  accountant_share: {
    disparo: "Simulação enviada ao contabilista vinculado, depois do consentimento.",
    serve: "Se a ligação ao contabilista é usada, ou só criada e esquecida.",
    origem: "cliente",
  },
  accountant_booking: {
    disparo: "Consulta pedida ou cancelada pelo cliente.",
    serve: "Se a agenda é usada — e quanto do que é marcado se desmarca.",
    origem: "cliente",
  },
  accountant_match_impression: {
    disparo: "A secção do fim de uma ferramenta resolveu — com cartões, com o contabilista da própria pessoa, ou sem ninguém.",
    serve: "Se o motor de afinidade encontra mesmo alguém, e em que ferramentas não encontra.",
    origem: "cliente",
  },
  accountant_match_click: {
    disparo: "Cartão de contabilista seguido a partir do fim de uma ferramenta.",
    serve: "Se a ordem por áreas converte — e se levar a simulação muda alguma coisa.",
    origem: "cliente",
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
  header_search_open: {
    disparo: "Superfície de pesquisa aberta (clique, ⌘K ou evento global).",
    serve: "Denominador de tudo o resto: quantas visitas chegam a procurar.",
    origem: "cliente",
  },
  header_search_submit: {
    disparo: "Consulta estabilizada com pelo menos dois caracteres.",
    serve: "Taxa de reformulação e forma das perguntas reais.",
    origem: "cliente",
  },
  header_search_result_click: {
    disparo: "Clique num resultado da pesquisa.",
    serve: "Search success rate e CTR do primeiro resultado.",
    origem: "cliente",
  },
  header_search_zero_results: {
    disparo: "Consulta válida sem qualquer resultado acima do limiar.",
    serve: "Zero-result rate — o sinal directo de lacunas no catálogo.",
    origem: "cliente",
  },
  header_search_abandon: {
    disparo: "Pesquisa fechada sem clique em nenhum resultado.",
    serve: "Abandono com consulta — onde a pesquisa promete e não entrega.",
    origem: "cliente",
  },
  header_search_intent_recognized: {
    disparo: "Plano compilado para uma consulta estabilizada.",
    serve: "Que percentagem das perguntas reais produz um caminho — e com que confiança.",
    origem: "cliente",
  },
  header_search_clarification_shown: {
    disparo: "A moldura fez uma pergunta antes de encaminhar.",
    serve: "Se as perguntas são raras (como devem ser) e quais é que aparecem.",
    origem: "cliente",
  },
  header_search_clarification_answered: {
    disparo: "A pessoa respondeu à pergunta da moldura.",
    serve: "Taxa de resposta por pergunta — uma que ninguém responde é um obstáculo.",
    origem: "cliente",
  },
  header_search_prepared_action_open: {
    disparo: "Clique na ação principal da moldura.",
    serve: "A métrica central: quantas perguntas acabam num caminho aberto.",
    origem: "cliente",
  },
  header_search_alternate_path_click: {
    disparo: "Clique numa alternativa em vez da ação principal.",
    serve: "Sinal de que a recomendação principal pode estar errada.",
    origem: "cliente",
  },
  header_search_professional_support_open: {
    disparo: "Clique no apoio profissional a partir da pesquisa.",
    serve: "Quando é que a resposta certa é uma pessoa, e não uma ferramenta.",
    origem: "cliente",
  },
  header_nav_click: {
    disparo: "Clique num item da navegação principal do cabeçalho.",
    serve: "Se a navegação separada da pesquisa é usada, e por quem.",
    origem: "cliente",
  },
  header_overlay_conflict: {
    disparo: "Um overlay pediu para abrir com outro modal já activo.",
    serve: "Guardrail: o número tem de ser zero (§15, SLO absoluto).",
    origem: "cliente",
  },
  focus_switch_ack: {
    disparo: "Primeira pintura visual depois de pedir outro foco da homepage.",
    serve: "SLO de reconhecimento do gesto em até 50 ms, apenas em baldes.",
    origem: "cliente",
  },
  focus_switch_ready: {
    disparo: "Conteúdo do foco pedido confirmado depois do commit e da pintura.",
    serve: "SLO de conteúdo correto, distinguindo rotas preparadas e frias.",
    origem: "cliente",
  },
  salary_path_impression: {
    disparo: "Um dos dois percursos da homepage de salário fica ativo.",
    serve: "Distribuição de procura entre receber e contratar.",
    origem: "cliente",
  },
  salary_path_selected: {
    disparo: "A pessoa escolhe explicitamente um percurso na bifurcação.",
    serve: "Conversão da bifurcação para cada palco e CTA.",
    origem: "cliente",
  },
  hiring_planner_started: {
    disparo: "O planeador patronal é montado no browser.",
    serve: "Denominador de utilização do planeador de contratação.",
    origem: "cliente",
  },
  hiring_goal_selected: {
    disparo: "O ponto de partida da contratação é alterado.",
    serve: "Que decisão patronal traz procura real.",
    origem: "cliente",
  },
  hiring_result_viewed: {
    disparo: "Um resultado válido do planeador é apresentado.",
    serve: "Conclusão por objetivo e nível de certeza.",
    origem: "cliente",
  },
  hiring_calculation_started: {
    disparo: "A pessoa pede o cálculo da contratação.",
    serve: "Denominador do funil: quantas revisões chegam a pedir conta.",
    origem: "cliente",
  },
  hiring_calculation_completed: {
    disparo: "O motor devolve um resultado para o objetivo escolhido.",
    serve: "Funil separado por incompleto, estimado, personalizado e validado.",
    origem: "cliente",
  },
  hiring_result_incomplete: {
    disparo: "O resultado sai com custos obrigatórios por confirmar.",
    serve: "Quantas decisões param por falta de dados — e em quantos pontos.",
    origem: "cliente",
  },
  hiring_blocking_fact_resolved: {
    disparo: "Um custo obrigatório deixa de estar por preencher.",
    serve: "Se a interface consegue mesmo desbloquear a decisão.",
    origem: "cliente",
  },
  hiring_range_explained: {
    disparo: "Um resultado sem dados pessoais explica o intervalo.",
    serve: "Quantas decisões preservam privacidade em vez de pedir dados do candidato.",
    origem: "cliente",
  },
  hiring_scenario_saved: {
    disparo: "A gravação do cenário termina com sucesso.",
    serve: "Memória criada no dispositivo ou na conta.",
    origem: "cliente",
  },
  hiring_scenario_reopened: {
    disparo: "Um cenário guardado é reidratado no planeador.",
    serve: "Continuidade real: quantas decisões voltam a ser abertas.",
    origem: "cliente",
  },
  hiring_comparison_created: {
    disparo: "Dois pacotes calculados passam a ser comparados.",
    serve: "Utilização da comparação antes de emitir proposta.",
    origem: "cliente",
  },
  hiring_offer_exported: {
    disparo: "A pessoa pede a versão PDF da proposta.",
    serve: "Handoff do cálculo para uma decisão externa.",
    origem: "cliente",
  },
  hiring_export_generated: {
    disparo: "Um documento do planeador é gerado, com o nível de confiança do cenário.",
    serve: "Saber quantos documentos saem de cenários ainda incompletos.",
    origem: "cliente",
  },
  hiring_support_opened: {
    disparo: "Um apoio oficial é aberto a partir do resultado.",
    serve: "Interesse útil por medida sem confundir triagem com aprovação.",
    origem: "cliente",
  },
  hiring_share_created: {
    disparo: "É criado um link revogável de partilha patronal.",
    serve: "Adoção futura da partilha sem conteúdo fiscal em analytics.",
    origem: "cliente",
  },
  hiring_share_revoked: {
    disparo: "Um link patronal é revogado.",
    serve: "Controlo efetivo da memória partilhada.",
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
 * Balde do COMPRIMENTO de uma consulta — nunca a consulta.
 *
 * Saber que as pesquisas com zero resultados têm quase todas mais de 25
 * caracteres diz o que é preciso saber (as pessoas escrevem frases e o
 * índice espera termos). O texto exacto não acrescentaria nada a essa
 * conclusão e acrescentaria tudo ao risco.
 */
export function baldeDeComprimento(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n <= 3) return "1-3";
  if (n <= 10) return "4-10";
  if (n <= 25) return "11-25";
  return "26+";
}

/** Balde de contagem de resultados — «nenhum», «poucos», «muitos». */
export function baldeDeContagem(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n <= 3) return "1-3";
  if (n <= 8) return "4-8";
  return "9+";
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
