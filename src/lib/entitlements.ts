// ═══════════════════════════════════════════════════════════════════════
//  ENTITLEMENTS — permissões explícitas em vez de `plano === "pro"`
//  ---------------------------------------------------------------------
//  Ponto 11.5 da arquitetura da parceria. Verificar o nome do plano espalha
//  regras de negócio por dezenas de componentes e torna impossível mudar a
//  oferta sem caçar condicionais. Verificar uma PERMISSÃO isola isso aqui.
//
//  Estrutura comercial (ponto 11.1):
//    · Grátis     0 €        compreender, calcular e ler os Guias
//    · Plus       1,99 €/mês organizar, exportar, comparar
//    · FIZ        contratado diretamente com a FIZ
//
//  Regra inviolável: o estado da FIZ NÃO é um entitlement do Plus. É uma
//  capacidade de integração, condicionada à ligação da conta e ao contrato
//  do utilizador com a FIZ. Ligar, continuar e enviar dados para a FIZ é
//  gratuito e nunca verifica o plano (decisões fixas 4 e 5 da auditoria).
// ═══════════════════════════════════════════════════════════════════════

export type Plano = "free" | "plus";

export type Entitlement =
  | "history.cloud"
  | "scenarios.unlimited"
  | "export.csv"
  | "export.pdf"
  | "export.bundle"
  | "audit.payslip"
  | "tax.reserve"
  | "quiz.unlimited"
  | "quiz.analytics"
  | "profile.avatar"
  | "early_access";

/** Descrição de cada permissão, para a página de preços e para os gates. */
export const DESCRICAO_ENTITLEMENT: Record<Entitlement, string> = {
  "history.cloud": "Histórico na nuvem e em vários dispositivos",
  "scenarios.unlimited": "Cenários ilimitados",
  "export.csv": "Exportação em CSV",
  "export.pdf": "PDFs profissionais",
  "export.bundle": "Dossiê completo para o contabilista",
  "audit.payslip": "Auditoria do recibo de vencimento",
  "tax.reserve": "Mealheiro fiscal",
  "quiz.unlimited": "Energia ilimitada no Quiz Fiscal",
  "quiz.analytics": "Estatísticas avançadas do Quiz",
  "profile.avatar": "Fotografia de perfil",
  "early_access": "Acesso antecipado a novidades",
};

const TODOS: Entitlement[] = Object.keys(DESCRICAO_ENTITLEMENT) as Entitlement[];

/** O Plus inclui tudo o que existia no Pro e no Quiz Master (ponto 11.2). */
export const ENTITLEMENTS_POR_PLANO: Record<Plano, ReadonlySet<Entitlement>> = {
  free: new Set<Entitlement>(),
  plus: new Set<Entitlement>(TODOS),
};

export function planoTem(plano: Plano, permissao: Entitlement): boolean {
  return ENTITLEMENTS_POR_PLANO[plano].has(permissao);
}

// ─── Oferta comercial ──────────────────────────────────────────────────

export const PLUS = {
  nome: "Recibo Certo Plus",
  precoMensal: 1.99,
  moeda: "EUR",
  /** O que o Plus NÃO é — a confusão mais provável, por isso está aqui. */
  naoInclui: [
    "Não inclui nenhum plano nem serviço pago da FIZ.",
    "Não é necessário para ligar a conta FIZ nem para enviar dados para a FIZ.",
    "Não emite documentos fiscais nem submete declarações.",
  ],
} as const;

/**
 * O Quiz Master deixou de existir como subscrição separada (ponto 11.4):
 * XP, níveis e a conquista "Guru do IRS" continuam a ganhar-se por mérito,
 * e os benefícios avançados passaram para o Plus. O nível 10 deixou de ser
 * requisito de compra.
 */
export const QUIZ_MASTER_DESCONTINUADO = {
  badgeContinuaPorMerito: true,
  nivelDeixaDeSerRequisito: true,
} as const;
