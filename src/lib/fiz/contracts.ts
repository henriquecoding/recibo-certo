// ═══════════════════════════════════════════════════════════════════════
//  CONTRATO FIZ ↔ RECIBO CERTO
//  ---------------------------------------------------------------------
//  Tipos que espelham `FIZ_PARTNER_INTEGRATION_OPENAPI.yaml` (versão
//  2026-07-26). São o contrato: se a FIZ publicar uma versão nova do
//  OpenAPI, é AQUI que se muda primeiro, e `guias:fiz-contract` deteta as
//  divergências entre estes tipos, os manifestos e as rotas dos Guias.
//
//  Este ficheiro é isomórfico (cliente + servidor): só tipos e constantes,
//  nunca segredos nem chamadas de rede.
// ═══════════════════════════════════════════════════════════════════════

export const FIZ_CONTRACT_VERSION = "2026-07-26" as const;
export const FIZ_HANDOFF_SCHEMA_VERSION = "1.0" as const;

// ─── Enumerações ───────────────────────────────────────────────────────

export type CapabilityAvailability = "AVAILABLE" | "DEGRADED" | "UNAVAILABLE" | "RETIRED";
export type ConnectionState = "NOT_CONNECTED" | "CONNECTED" | "REAUTHORIZATION_REQUIRED" | "REVOKED";
export type GuideDataMode = "NO_DATA" | "CONSENTED_HANDOFF" | "CONNECTED_ACCOUNT";
export type GuideAudience = "TI" | "ENI" | "COMPANY" | "EMPLOYEE" | "MIXED";
export type GuideTopic =
  | "OPEN_ACTIVITY" | "INVOICING" | "VAT" | "SOCIAL_SECURITY"
  | "IRS" | "COMPANY" | "ACCOUNTANT" | "EXPENSES" | "OTHER";
export type Intent =
  | "START_FREELANCER" | "CONFIGURE_FREELANCER" | "CONFIGURE_VAT"
  | "CONFIGURE_SOCIAL_SECURITY" | "PREPARE_IRS" | "START_COMPANY" | "FIND_ACCOUNTANT";
export type Placement = "CONTEXT_ACTION" | "APPLY_TO_CASE" | "NEXT_STEP" | "SEARCH_RESULT" | "CATEGORY";
export type EntityType = "INDIVIDUAL" | "ENI" | "COMPANY";
export type VatTerritory = "CONTINENTAL" | "MADEIRA" | "AZORES" | "UNKNOWN";
export type VatRegimeEstimate = "EXEMPT_ART_53" | "EXEMPT_ART_9" | "NORMAL" | "UNKNOWN";
export type HandoffStatus = "PENDING_USER_ACCEPTANCE" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "DELETED";
export type ResourceStatus =
  | "NOT_APPLICABLE" | "UPCOMING" | "DATA_REQUIRED" | "READY_FOR_REVIEW" | "ACTION_REQUIRED"
  | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "PAYMENT_DUE" | "COMPLETED" | "UNKNOWN";
export type ObligationType =
  | "SOCIAL_SECURITY_QUARTERLY" | "VAT_PERIODIC" | "VAT_RECAPITULATIVE"
  | "IRS_ANNUAL" | "INVOICE_REPORTING" | "OTHER";
export type DeclarationType = "SOCIAL_SECURITY" | "VAT" | "VAT_RECAPITULATIVE" | "IRS" | "OTHER";
export type ActionResourceType = "OBLIGATION" | "DECLARATION" | "INVOICE_DRAFT" | "ACCOUNT";
export type ReferralStatus = "CREATED" | "CLICKED" | "ACCOUNT_CREATED" | "CONVERTED" | "EXPIRED" | "REJECTED";
export type CommissionStatus = "PENDING" | "APPROVED" | "PAID" | "REVERSED";

export type WebhookEventType =
  | "partner.referral.created" | "partner.referral.converted"
  | "partner.commission.created" | "partner.commission.approved" | "partner.commission.paid"
  | "partner.handoff.accepted" | "partner.handoff.expired" | "partner.capability.changed"
  | "user.connection.revoked" | "user.obligation.action_required"
  | "user.declaration.status_changed" | "user.invoice.status_changed";

export const WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] = [
  "partner.referral.created", "partner.referral.converted",
  "partner.commission.created", "partner.commission.approved", "partner.commission.paid",
  "partner.handoff.accepted", "partner.handoff.expired", "partner.capability.changed",
  "user.connection.revoked", "user.obligation.action_required",
  "user.declaration.status_changed", "user.invoice.status_changed",
] as const;

// ─── Scopes ────────────────────────────────────────────────────────────

/** Client Credentials — sistema-a-sistema. Nunca chegam ao navegador. */
export const PARTNER_SCOPES = {
  capabilities: "partner.capabilities.read",
  guideRouting: "partner.guide-routing.write",
  referralsWrite: "partner.referrals.write",
  referralsRead: "partner.referrals.read",
  handoffsWrite: "partner.handoffs.write",
  handoffsRead: "partner.handoffs.read",
  commissions: "partner.commissions.read",
  webhooks: "partner.webhooks.manage",
} as const;

/** Authorization Code + PKCE — delegados pelo utilizador.
    Ponto 7.2 da arquitetura: a ligação básica não pede escrita. */
export const USER_SCOPES = {
  profile: "profile.read",
  obligations: "obligations.read",
  deadlines: "deadlines.read",
  declarations: "declarations.read",
  invoices: "invoices.read",
  invoiceDrafts: "invoices.draft.write",
  revoke: "connection.revoke",
} as const;

export const SCOPES_LIGACAO_BASICA: readonly string[] = [
  USER_SCOPES.profile,
  USER_SCOPES.obligations,
  USER_SCOPES.deadlines,
  USER_SCOPES.declarations,
  USER_SCOPES.revoke,
];

/** Scopes que só podem ser pedidos por uma ação explícita do utilizador. */
export const SCOPES_SOB_PROCURA: readonly string[] = [
  USER_SCOPES.invoices,
  USER_SCOPES.invoiceDrafts,
];

// ─── Capacidades ───────────────────────────────────────────────────────

export interface Capability {
  key: string;
  label: string;
  description?: string;
  availability: CapabilityAvailability;
  audiences: GuideAudience[];
  dataModes: GuideDataMode[];
  actions: string[];
  requiredScopes?: string[];
  productKeys?: string[];
  territories?: string[];
}

export interface CapabilityCatalog {
  version: string;
  generatedAt: string;
  validUntil: string;
  capabilities: Capability[];
}

// ─── Resolução de rota de Guia ─────────────────────────────────────────

export interface GuideSourceContext {
  guideSlug: string;
  guideVersion: string;
  topic: GuideTopic;
  intent: Intent;
  audience: GuideAudience;
  placement?: Placement;
}

export interface ResolveGuideRouteRequest {
  guideSlug: string;
  guideVersion: string;
  topic: GuideTopic;
  intent: Intent;
  audience: GuideAudience;
  locale: string;
  connectionState: ConnectionState;
  placement?: Placement;
}

export interface GuideRoute {
  destinationKey: string;
  capabilityKey: string;
  action: string;
  dataMode: GuideDataMode;
  requiresConsent: boolean;
  label: string;
  disclosure?: string;
  requiredScopes?: string[];
  availability: CapabilityAvailability;
  unavailableReason?: string | null;
}

// ─── Handoff consentido ────────────────────────────────────────────────

export interface ConsentEvidence {
  receiptId: string;
  policyVersion: string;
  grantedAt: string;
  /** Os campos exatos que o utilizador viu e autorizou. */
  fields: string[];
}

export interface ProfilePrefill {
  entityType?: EntityType;
  activityCategory?: string;
  vatTerritory?: VatTerritory;
  vatRegimeEstimate?: VatRegimeEstimate;
  socialSecuritySituation?: string;
}

export interface SimulationSummary {
  currency: "EUR";
  period: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "ONE_OFF";
  grossEstimate: number;
  vatEstimate?: number;
  withholdingEstimate?: number;
  socialSecurityEstimate?: number;
  irsEstimate?: number;
}

export interface Provenance {
  engine: "recibo-certo";
  engineVersion: string;
  calculatedAt: string;
}

export interface CreateHandoffRequest {
  externalHandoffId: string;
  schemaVersion: typeof FIZ_HANDOFF_SCHEMA_VERSION;
  intent: Intent;
  locale: string;
  consent: ConsentEvidence;
  profile?: ProfilePrefill;
  simulationSummary?: SimulationSummary;
  provenance: Provenance;
  sourceContext?: GuideSourceContext;
}

export interface Handoff {
  id: string;
  externalHandoffId: string;
  status: HandoffStatus;
  url?: string | null;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
}

// ─── Onboarding e atribuição ───────────────────────────────────────────

export interface CreateOnboardingSessionRequest {
  externalSessionId: string;
  referralCode: string;
  intent: Intent;
  locale: string;
  returnUrl: string;
  cancelUrl: string;
  prefill?: ProfilePrefill;
  sourceContext?: GuideSourceContext;
}

export interface OnboardingSession {
  id: string;
  referralId: string;
  url: string;
  expiresAt: string;
}

export interface CreateReferralRequest {
  externalClickId: string;
  referralCode: string;
  placement: string;
  destination: string;
  locale?: string;
  anonymousSessionId?: string;
  campaign?: string;
  intent?: Intent;
  sourceContext?: GuideSourceContext;
}

export interface Referral {
  id: string;
  externalClickId: string;
  status: ReferralStatus;
  accountCreatedAt?: string | null;
  convertedAt?: string | null;
  attributionExpiresAt: string;
  createdAt: string;
}

export interface Money {
  currency: string;
  amount: number;
}

export interface Commission {
  id: string;
  referralId: string;
  productKey?: string;
  paymentId?: string;
  status: CommissionStatus;
  basis: Money;
  commission: Money;
  rate?: number;
  createdAt: string;
  approvedAt?: string | null;
  paidAt?: string | null;
}

// ─── Estados operacionais do utilizador ligado ─────────────────────────

export interface ResourceAction {
  kind: "OPEN_FIZ" | "NONE";
  actionSessionSupported: boolean;
}

export interface UserProfile {
  id: string;
  entityType: EntityType;
  locale: string;
  vatTerritory?: VatTerritory;
  connection: { connectedAt: string; scopes: string[] };
}

export interface Obligation {
  id: string;
  type: ObligationType;
  period: string;
  status: ResourceStatus;
  providerStatus?: string;
  dueAt?: string | null;
  title: string;
  summary?: string;
  action: ResourceAction;
  lastUpdatedAt: string;
}

export interface Deadline {
  id: string;
  type: ObligationType;
  title: string;
  dueAt: string;
  status: ResourceStatus;
  action: ResourceAction;
}

export interface Declaration {
  id: string;
  type: DeclarationType;
  period: string;
  status: ResourceStatus;
  providerStatus?: string;
  dueAt?: string | null;
  submittedAt?: string | null;
  acceptedAt?: string | null;
  amountDue?: Money | null;
  action: ResourceAction;
  lastUpdatedAt: string;
}

export interface InvoiceSummary {
  from: string;
  to: string;
  issuedCount: number;
  gross: Money;
  vat: Money;
  withholding: Money;
  lastUpdatedAt: string;
}

export interface InvoiceDraft {
  id: string;
  status: "DRAFT";
  reviewRequired: true;
  action: ResourceAction;
  createdAt: string;
}

export interface DraftCustomer {
  name: string;
  taxpayerNumber?: string;
  email?: string;
}

export interface DraftLine {
  description: string;
  quantity: number;
  unitPrice: Money;
  vatRate: "EXEMPT" | "REDUCED" | "INTERMEDIATE" | "NORMAL";
  vatExemptionReason?: string;
  withholdingPercent?: number;
}

export interface CreateInvoiceDraftRequest {
  documentType: "INVOICE" | "INVOICE_RECEIPT" | "SIMPLIFIED_INVOICE";
  customer: DraftCustomer;
  lines: DraftLine[];
  notes?: string;
  sourceSimulationId?: string;
  sourceContext?: GuideSourceContext;
}

export interface CreateActionSessionRequest {
  resourceType: ActionResourceType;
  resourceId: string;
  returnUrl: string;
}

export interface ActionSession {
  id: string;
  url: string;
  expiresAt: string;
}

export interface Paged<T> {
  data: T[];
  nextCursor?: string | null;
}

// ─── Webhooks ──────────────────────────────────────────────────────────

export interface WebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: WebhookEventType;
  apiVersion: string;
  createdAt: string;
  data: T;
  livemode: boolean;
}

export const WEBHOOK_HEADERS = {
  id: "fiz-webhook-id",
  timestamp: "fiz-webhook-timestamp",
  signature: "fiz-webhook-signature",
} as const;

/** RFC 7807 — a FIZ responde erros em application/problem+json. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  requestId?: string;
  errors?: { field: string; message: string }[];
}

// ─── Adaptador ─────────────────────────────────────────────────────────

/** O resto do produto depende DESTA interface, nunca de chamadas FIZ
    espalhadas (ponto 13.2 da arquitetura). Trocar a FIZ por outro operador
    é implementar esta interface — nada mais. */
export interface FiscalOperationsPartner {
  listCapabilities(): Promise<CapabilityCatalog>;
  resolveGuideRoute(input: ResolveGuideRouteRequest): Promise<GuideRoute>;
  createOnboardingSession(input: CreateOnboardingSessionRequest): Promise<OnboardingSession>;
  createHandoff(input: CreateHandoffRequest): Promise<Handoff>;
  getHandoff(handoffId: string): Promise<Handoff>;
  deleteHandoff(handoffId: string): Promise<void>;
  getProfile(accessToken: string): Promise<UserProfile>;
  listObligations(accessToken: string): Promise<Paged<Obligation>>;
  listDeadlines(accessToken: string, from: string, to: string): Promise<Paged<Deadline>>;
  listDeclarations(accessToken: string): Promise<Paged<Declaration>>;
  createInvoiceDraft(accessToken: string, input: CreateInvoiceDraftRequest): Promise<InvoiceDraft>;
  createActionSession(accessToken: string, input: CreateActionSessionRequest): Promise<ActionSession>;
  revokeConnection(accessToken: string): Promise<void>;
}

// ─── Regras invioláveis do contrato ────────────────────────────────────

/** Ponto 8.2 da arquitetura + 8.5 da auditoria: nunca em query string. */
export const CAMPOS_PROIBIDOS_EM_URL = [
  "nif", "niss", "taxpayernumber", "email", "password", "token",
  "rendimento", "salario", "iban", "morada", "telefone",
] as const;

/** O Recibo Certo nunca aceita um destino arbitrário devolvido pela FIZ:
    só URLs em domínios da FIZ passam. Sem isto, um catálogo comprometido
    conseguia redirecionar utilizadores para fora. */
export const DOMINIOS_FIZ_PERMITIDOS = [
  "fiz.co",
  "app.fiz.co",
  "partners-api.fiz.co",
  "sandbox-partners-api.fiz.co",
] as const;

export function destinoFizValido(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return DOMINIOS_FIZ_PERMITIDOS.some((d) => u.host === d || u.host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Verifica que nenhum dado pessoal ou fiscal viaja na query string. */
export function urlSemDadosSensiveis(url: string): boolean {
  try {
    const u = new URL(url);
    for (const chave of u.searchParams.keys()) {
      const k = chave.toLowerCase();
      if (CAMPOS_PROIBIDOS_EM_URL.some((p) => k.includes(p))) return false;
    }
    return true;
  } catch {
    return false;
  }
}
