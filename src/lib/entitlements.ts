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

// ─── Matriz única funcionalidade → permissão (RC-P1-10) ────────────────
//
// Cada gate declarava a sua permissão à mão e o `ProGate` tinha
// `export.bundle` por omissão: a Saúde Fiscal e as reservas apareciam atrás
// do gate das exportações, o CSV de cenários passava sem `export.csv`, e um
// plano podia receber benefícios que ninguém lhe prometeu. Aqui existe UMA
// tabela; os componentes referem a funcionalidade, não a permissão.

export type Funcionalidade =
  | "saude-fiscal"
  | "reserva-trimestral"
  | "guardiao-iva"
  | "guardiao-retencao"
  | "guardiao-ss"
  | "estimativa-irs"
  | "historico-nuvem"
  | "cenarios-ilimitados"
  | "exportar-csv"
  | "exportar-pdf"
  | "exportar-dossie"
  | "auditoria-recibo-vencimento"
  | "avatar-perfil";

export const PERMISSAO_DA_FUNCIONALIDADE: Record<Funcionalidade, Entitlement> = {
  "saude-fiscal": "tax.reserve",
  "reserva-trimestral": "tax.reserve",
  "guardiao-iva": "tax.reserve",
  "guardiao-retencao": "tax.reserve",
  "guardiao-ss": "tax.reserve",
  "estimativa-irs": "tax.reserve",
  "historico-nuvem": "history.cloud",
  "cenarios-ilimitados": "scenarios.unlimited",
  "exportar-csv": "export.csv",
  "exportar-pdf": "export.pdf",
  "exportar-dossie": "export.bundle",
  "auditoria-recibo-vencimento": "audit.payslip",
  "avatar-perfil": "profile.avatar",
};

export function permissaoDe(f: Funcionalidade): Entitlement {
  return PERMISSAO_DA_FUNCIONALIDADE[f];
}

// ─── Oferta comercial ──────────────────────────────────────────────────

export const PLUS = {
  nome: "Recibo Certo Plus",
  precoMensal: 1.99,
  moeda: "EUR",
  /**
   * Não há plano anual. É uma decisão de produto, não um esquecimento: a
   * página de planos promete "um plano só, sem escadaria", e um seletor
   * mensal/anual é uma escadaria.
   *
   * Este valor é a ÚNICA origem do preço na aplicação. A integração Stripe
   * valida o montante, a moeda e a periodicidade antes de criar o Checkout,
   * impedindo que uma configuração antiga cobre um valor diferente.
   */
  temAnual: false,
  /**
   * Compra única: o MESMO Plus, pago uma vez em vez de todos os meses.
   *
   * Não é um terceiro plano — é uma segunda forma de pagar o único que há.
   * A distinção não é cosmética: assim que passar a haver dois conjuntos de
   * funcionalidades, a promessa de «um plano só, sem escadaria» deixa de
   * ser verdade, e é essa promessa que a página faz.
   */
  precoVitalicio: 19.99,
  /** O que o Plus NÃO é — a confusão mais provável, por isso está aqui. */
  naoInclui: [
    "Não inclui nenhum plano nem serviço pago da FIZ.",
    "Não é necessário para ligar a conta FIZ nem para enviar dados para a FIZ.",
    "Não emite documentos fiscais nem submete declarações.",
  ],
} as const;

const emEuros = (v: number): string =>
  v.toLocaleString("pt-PT", { style: "currency", currency: PLUS.moeda, minimumFractionDigits: 2 });

/** "1,99 €" — a forma que aparece em toda a interface e nos emails. */
export const precoPlusFormatado = (): string => emEuros(PLUS.precoMensal);

/** "19,99 €" — a compra única. */
export const precoVitalicioFormatado = (): string => emEuros(PLUS.precoVitalicio);

/**
 * Ao fim de quantos meses a compra única fica mais barata que a mensal.
 *
 * Calculado, nunca escrito à mão: se um dos preços mudar e este número
 * ficasse fixo, a página passava a fazer uma promessa aritmética falsa.
 */
export const mesesParaCompensarVitalicio = (): number =>
  Math.ceil(PLUS.precoVitalicio / PLUS.precoMensal);

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
