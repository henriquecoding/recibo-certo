// ═══════════════════════════════════════════════════════════════════════
//  MANIFESTOS DOS GUIAS (GuideManifest) — fonte única
//  ---------------------------------------------------------------------
//  Um Guia deixa de ser um ficheiro solto: título, categoria, arquétipo,
//  públicos, afirmações, ligações internas, ferramentas relacionadas, ação
//  FIZ, SEO e estado editorial vivem AQUI.
//
//  Daqui derivam (sem duplicação manual — falha 4.5 da auditoria):
//    · o índice /guias e o hub por intenção;
//    · a navegação lateral e móvel;
//    · o sitemap (via seo.ts) e o schema JSON-LD;
//    · as fontes apresentadas em cada página;
//    · as recomendações de simuladores (falha 4.4);
//    · a resolução da ação FIZ (nunca URLs escritos à mão).
// ═══════════════════════════════════════════════════════════════════════

import {
  Bank, Receipt, Calculator, ShieldCheck, Coin, User, Briefcase, Globe, FileSign,
  Wallet, Calendar, Clock, Building, Scale, Flag, Warning,
} from "@/components/ui/Icons";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { claimsDoGuia, type GuideAudience } from "./claims";

export type IconType = React.ComponentType<{ size?: number; className?: string }>;

export type Categoria = "Independentes" | "Conta de outrem" | "Empresas" | "Transversal";

/** Os cinco arquétipos do ponto 6.2 da auditoria. Cada um usa uma
    composição própria — não se impõe o mesmo modelo aos 29 Guias. */
export type Archetype = "decision" | "procedure" | "calculation" | "status" | "reference";

export const ARQUETIPOS: Record<Archetype, { rotulo: string; objetivo: string }> = {
  decision: { rotulo: "Decisão", objetivo: "Comparar alternativas e escolher" },
  procedure: { rotulo: "Procedimento", objetivo: "Completar uma tarefa do princípio ao fim" },
  calculation: { rotulo: "Cálculo", objetivo: "Explorar um valor na tua situação" },
  status: { rotulo: "Estado e calendário", objetivo: "Saber o que está pendente e quando" },
  reference: { rotulo: "Referência", objetivo: "Compreender uma regra ou um documento" },
};

/** Agrupamento por intenção do novo hub (ponto 9.1). Substitui a entrada
    única por tipo de contribuinte, que continua disponível como filtro. */
export type HubGroup =
  | "comecar" | "faturar" | "contribuir" | "irs" | "empresa" | "conta-outrem"
  | "prazos" | "direitos" | "encerrar";

export const HUB_GRUPOS: { id: HubGroup; titulo: string; descricao: string }[] = [
  { id: "comecar", titulo: "Começar", descricao: "Abrir atividade, escolher o regime e perceber o que vais pagar." },
  { id: "faturar", titulo: "Faturar", descricao: "Que documento emitir, com que IVA e com que retenção." },
  { id: "contribuir", titulo: "Gerir contribuições", descricao: "Segurança Social, acumulação e adiantamentos de IRS." },
  { id: "irs", titulo: "Preparar o IRS", descricao: "Escalões, benefícios, deduções e o que esperar do reembolso." },
  { id: "empresa", titulo: "Gerir uma empresa", descricao: "Constituir, tributar e cumprir as obrigações da sociedade." },
  { id: "conta-outrem", titulo: "Trabalho por conta de outrem", descricao: "Recibo de vencimento, subsídios e horas extra." },
  { id: "prazos", titulo: "Cumprir prazos", descricao: "O calendário das obrigações fiscais e contributivas." },
  // Secção nova. O catálogo respondia a "o que tenho de pagar" e a "quando",
  // mas não a "e quando é o outro lado que falha?" — o cliente que não paga,
  // a liquidação que não faz sentido, a dívida antiga que reaparece. É a
  // pergunta que mais aflige quem trabalha por conta própria e a única para
  // a qual não havia uma única linha no site.
  { id: "direitos", titulo: "Direitos e cobranças", descricao: "Quando o cliente não paga, quando o imposto não bate certo e o que podes exigir." },
  { id: "encerrar", titulo: "Encerrar", descricao: "Fechar atividade sem deixar pontas soltas." },
];

// ─── Contrato FIZ (espelha o OpenAPI da parceria) ──────────────────────

export type GuideTopic =
  | "OPEN_ACTIVITY" | "INVOICING" | "VAT" | "SOCIAL_SECURITY"
  | "IRS" | "COMPANY" | "ACCOUNTANT" | "EXPENSES" | "OTHER";

export type FizIntent =
  | "START_FREELANCER" | "CONFIGURE_FREELANCER" | "CONFIGURE_VAT"
  | "CONFIGURE_SOCIAL_SECURITY" | "PREPARE_IRS" | "START_COMPANY" | "FIND_ACCOUNTANT";

export type GuideDataMode = "NO_DATA" | "CONSENTED_HANDOFF" | "CONNECTED_ACCOUNT";

export interface FizGuideAction {
  topic: GuideTopic;
  intent: FizIntent;
  /** Chave de capacidade pedida ao catálogo da FIZ. Nunca um URL. */
  requiredCapability: string;
  dataPolicy: GuideDataMode;
  /** Rótulo por omissão — a FIZ pode devolver outro aprovado por ela. */
  fallbackLabel: string;
  /** Ações que a FIZ nunca deve executar sem revisão humana do utilizador. */
  exigeRevisaoHumana?: boolean;
}

// ─── Estado editorial ──────────────────────────────────────────────────

export type GuideStatus = "draft" | "review" | "published" | "archived";

export interface GuideManifest {
  id: string;
  slug: string;
  title: string;
  /** Título curto para navegação lateral e móvel. */
  navLabel: string;
  descricao: string;
  categoria: Categoria;
  hub: HubGroup;
  archetype: Archetype;
  icon: IconType;
  tempo: number;
  audiences: GuideAudience[];
  effectiveFrom: string;
  effectiveTo?: string;
  engineBindings: string[];
  relatedGuideIds: string[];
  relatedToolIds: ToolId[];
  fizAction?: FizGuideAction;
  seo: {
    description: string;
    /** Linguagem comum e erros frequentes — alimentam a pesquisa (ponto 9.2). */
    aliases: string[];
    schema: ("Article" | "HowTo" | "FAQPage")[];
  };
  owner: string;
  reviewer: string;
  lastReviewedAt: string;
  status: GuideStatus;
}

/** Ferramentas do ReciboCerto que um Guia pode recomendar. Os `slug`
    correspondem a `FERRAMENTAS`; os três últimos são rotas próprias. */
export type ToolId =
  | "simulador-irs" | "recibo-vencimento" | "auditoria-recibo" | "mapa-contabilistas"
  | "ato-isolado" | "regime-simplificado" | "classificar-atividade" | "simulador-empresa"
  | "simulador-herancas" | "payout-mor" | "comparador" | "quiz-fiscal" | "calculadora";

export const TOOL_HREFS: Record<ToolId, string> = {
  "simulador-irs": "/ferramentas/simulador-irs",
  "recibo-vencimento": "/ferramentas/recibo-vencimento",
  "auditoria-recibo": "/ferramentas/auditoria-recibo",
  "mapa-contabilistas": "/ferramentas/mapa-contabilistas",
  "ato-isolado": "/ferramentas/ato-isolado",
  "regime-simplificado": "/ferramentas/regime-simplificado",
  "classificar-atividade": "/ferramentas/classificar-atividade",
  "simulador-empresa": "/ferramentas/simulador-empresa",
  "simulador-herancas": "/ferramentas/simulador-herancas",
  "payout-mor": "/ferramentas/payout-mor",
  comparador: "/?modo=comparar",
  "quiz-fiscal": "/quiz-fiscal",
  calculadora: "/#calculadora",
};

const DE = `${FISCAL_YEAR}-01-01`;
const REVISTO = "2026-07-26";
const EQUIPA = "Equipa editorial ReciboCerto";
// Ponto 11 da auditoria: os grupos P0 têm de ser revistos por pessoa
// competente antes do lançamento. Até lá o revisor fica explicitamente
// por atribuir — e `guias:lint` avisa (não falha) enquanto assim for.
const REVISOR_PENDENTE = "Por atribuir — revisão fiscal pendente";

export const GUIDE_MANIFESTS: GuideManifest[] = [
  // ══ Começar ═════════════════════════════════════════════════════════
  {
    id: "abrir-atividade", slug: "abrir-atividade",
    title: "Como abrir atividade nas Finanças",
    navLabel: "Abrir atividade",
    descricao: "Passo a passo para abrir atividade como trabalhador independente.",
    categoria: "Independentes", hub: "comecar", archetype: "procedure", icon: Bank, tempo: 5,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["COEFICIENTES", "RETENCAO", "IVA_ISENCAO_LIMITE"],
    relatedGuideIds: ["ato-isolado", "regime-simplificado", "iva-recibos-verdes", "seguranca-social"],
    relatedToolIds: ["classificar-atividade", "regime-simplificado", "calculadora"],
    fizAction: { topic: "OPEN_ACTIVITY", intent: "START_FREELANCER", requiredCapability: "onboarding.freelancer", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Continuar a abertura de atividade na FIZ" },
    seo: { description: "Abrir atividade nas Finanças em 2026: quem tem de o fazer, que dados escolher e o que muda no IRS, IVA e Segurança Social.", aliases: ["abrir atividade", "abrir recibos verdes", "começar a passar recibos verdes", "inscrição trabalhador independente", "abrir actividade financas"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "ato-isolado", slug: "ato-isolado",
    title: "Ato isolado ou recibos verdes?",
    navLabel: "Ato isolado",
    descricao: "Descobre quando usar ato isolado e quando emitir recibos verdes.",
    categoria: "Independentes", hub: "comecar", archetype: "decision", icon: Scale, tempo: 4,
    audiences: ["TI"], effectiveFrom: DE,
    engineBindings: ["IVA_ISENCAO_LIMITE", "COEFICIENTES"],
    relatedGuideIds: ["abrir-atividade", "regime-simplificado", "iva-recibos-verdes"],
    relatedToolIds: ["ato-isolado", "regime-simplificado"],
    fizAction: { topic: "OPEN_ACTIVITY", intent: "CONFIGURE_FREELANCER", requiredCapability: "onboarding.review-setup", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever o enquadramento na FIZ" },
    // "ação isolada" e "acto isolado" são erros frequentes — o ponto 9.2 da
    // auditoria exige que a pesquisa os apanhe, não que os corrija.
    seo: { description: "Ato isolado ou abrir atividade? A árvore de decisão, os efeitos fiscais de cada opção e quando a escolha deixa de existir.", aliases: ["ato isolado", "acto isolado", "ação isolada", "recibo verde uma vez só", "trabalho pontual recibo"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "regime-simplificado", slug: "regime-simplificado",
    title: "Regime simplificado e coeficientes",
    navLabel: "Regime simplificado",
    descricao: "Entende os coeficientes e o que realmente pagas em IRS.",
    categoria: "Independentes", hub: "comecar", archetype: "decision", icon: Calculator, tempo: 6,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["COEFICIENTES", "REGRA_15", "ESCALOES_IRS"],
    relatedGuideIds: ["contabilidade-organizada", "despesas-dedutiveis", "escaloes-irs", "abrir-atividade"],
    relatedToolIds: ["regime-simplificado", "classificar-atividade", "simulador-irs"],
    fizAction: { topic: "IRS", intent: "CONFIGURE_FREELANCER", requiredCapability: "tax-setup.review", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever a configuração fiscal na FIZ" },
    seo: { description: "Coeficientes do regime simplificado por atividade, a regra dos 15 % e o que sobra depois do IRS e da Segurança Social.", aliases: ["regime simplificado", "coeficiente 0.75", "coeficiente recibos verdes", "regra dos 15%"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "despesas-dedutiveis", slug: "despesas-dedutiveis",
    title: "Despesas dedutíveis e a regra dos 15%",
    navLabel: "Despesas dedutíveis",
    descricao: "Que despesas contam no regime simplificado — e quanto tens de justificar.",
    categoria: "Independentes", hub: "comecar", archetype: "reference", icon: Coin, tempo: 6,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["REGRA_15", "COEFICIENTES"],
    relatedGuideIds: ["regime-simplificado", "contabilidade-organizada", "deducoes-coleta"],
    relatedToolIds: ["regime-simplificado", "simulador-irs"],
    fizAction: { topic: "EXPENSES", intent: "CONFIGURE_FREELANCER", requiredCapability: "expenses.categories", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Preparar as categorias de despesa na FIZ" },
    seo: { description: "Que despesas justificam a regra dos 15 % no regime simplificado, que prova é exigida e o que o e-Fatura não resolve sozinho.", aliases: ["despesas dedutíveis", "despesas recibos verdes", "regra dos 15", "e-fatura afetação atividade"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "contabilidade-organizada", slug: "contabilidade-organizada",
    title: "Simplificado vs. contabilidade organizada",
    navLabel: "Contab. organizada",
    descricao: "Quando compensa passar ao lucro real e o que muda.",
    categoria: "Independentes", hub: "comecar", archetype: "decision", icon: Scale, tempo: 6,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["COEFICIENTES", "ESCALOES_IRS"],
    relatedGuideIds: ["regime-simplificado", "despesas-dedutiveis", "unipessoal-vs-eni"],
    relatedToolIds: ["simulador-irs", "mapa-contabilistas"],
    fizAction: { topic: "ACCOUNTANT", intent: "FIND_ACCOUNTANT", requiredCapability: "accountant.assessment", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Pedir uma avaliação a um contabilista na FIZ" },
    seo: { description: "Regime simplificado ou contabilidade organizada: o limiar económico, o custo do contabilista e as obrigações que mudam.", aliases: ["contabilidade organizada", "lucro real", "quando compensa contabilista", "mudar de regime irs"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },

  // ══ Faturar ═════════════════════════════════════════════════════════
  {
    id: "fatura-vs-recibo", slug: "fatura-vs-recibo",
    title: "Fatura, recibo e fatura-recibo",
    navLabel: "Fatura vs recibo",
    descricao: "As diferenças e onde entram os recibos verdes.",
    categoria: "Independentes", hub: "faturar", archetype: "reference", icon: Receipt, tempo: 4,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["retencao-na-fonte", "iva-recibos-verdes", "clientes-estrangeiros"],
    relatedToolIds: ["calculadora", "classificar-atividade"],
    fizAction: { topic: "INVOICING", intent: "CONFIGURE_FREELANCER", requiredCapability: "invoicing.draft", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Preparar o documento na FIZ", exigeRevisaoHumana: true },
    seo: { description: "Fatura, recibo ou fatura-recibo: qual emitir consoante o pagamento já tenha ocorrido, e o que muda nos recibos verdes.", aliases: ["fatura recibo", "passar recibo", "emitir fatura", "recibo verde o que é", "fatura ou recibo"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "retencao-na-fonte", slug: "retencao-na-fonte",
    title: "Retenção na fonte",
    navLabel: "Retenção na fonte",
    descricao: "Saiba quando é aplicada e como funciona a retenção na fonte.",
    categoria: "Independentes", hub: "faturar", archetype: "reference", icon: ShieldCheck, tempo: 4,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["RETENCAO", "DISPENSA_RETENCAO_LIMITE"],
    relatedGuideIds: ["fatura-vs-recibo", "clientes-estrangeiros", "pagamentos-por-conta", "regime-simplificado"],
    relatedToolIds: ["classificar-atividade", "calculadora"],
    fizAction: { topic: "INVOICING", intent: "CONFIGURE_FREELANCER", requiredCapability: "invoicing.withholding-setup", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Configurar a retenção na FIZ" },
    seo: { description: "Retenção na fonte nos recibos verdes: taxa por atividade, dispensa, clientes não residentes e como recuperar no IRS.", aliases: ["retenção na fonte", "retencao 23%", "dispensa de retenção", "irs retido recibo verde"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "iva-recibos-verdes", slug: "iva-recibos-verdes",
    title: "IVA nos recibos verdes",
    navLabel: "IVA",
    descricao: "A isenção de 15 000 € e quando deves liquidar IVA.",
    categoria: "Independentes", hub: "faturar", archetype: "reference", icon: Coin, tempo: 5,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["IVA_ISENCAO_LIMITE", "IVA_ISENCAO_EXCESSO", "IVA_TAXAS"],
    relatedGuideIds: ["clientes-estrangeiros", "fatura-vs-recibo", "abrir-atividade", "calendario-fiscal"],
    relatedToolIds: ["classificar-atividade", "calculadora"],
    fizAction: { topic: "VAT", intent: "CONFIGURE_VAT", requiredCapability: "vat.setup", dataPolicy: "CONNECTED_ACCOUNT", fallbackLabel: "Tratar do IVA na FIZ" },
    seo: { description: "Isenção de IVA do Art. 53.º, o limite majorado, as taxas por região e o que fazer no mês em que ultrapassas.", aliases: ["iva recibos verdes", "isenção iva", "artigo 53", "15000 euros iva", "sair da isenção de iva"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "clientes-estrangeiros", slug: "clientes-estrangeiros",
    title: "Clientes estrangeiros",
    navLabel: "Clientes estrangeiros",
    descricao: "IVA e retenção quando faturas para fora de Portugal.",
    categoria: "Independentes", hub: "faturar", archetype: "reference", icon: Globe, tempo: 5,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["IVA_TAXAS", "RETENCAO"],
    relatedGuideIds: ["iva-recibos-verdes", "merchant-of-record", "retencao-na-fonte", "fatura-vs-recibo"],
    relatedToolIds: ["classificar-atividade", "payout-mor"],
    fizAction: { topic: "INVOICING", intent: "CONFIGURE_VAT", requiredCapability: "invoicing.foreign-customer", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Preparar o cliente estrangeiro na FIZ" },
    seo: { description: "Faturar para fora de Portugal: B2B e B2C, UE e fora da UE, validação no VIES, autoliquidação e retenção na fonte.", aliases: ["clientes estrangeiros", "faturar para o estrangeiro", "iva ue", "vies", "autoliquidação", "reverse charge"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "merchant-of-record", slug: "merchant-of-record",
    title: "Merchant of Record (MoR)",
    navLabel: "Merchant of Record",
    descricao: "Paddle, Lemon Squeezy e como tratar o payout mensal.",
    categoria: "Independentes", hub: "faturar", archetype: "decision", icon: Wallet, tempo: 6,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["clientes-estrangeiros", "iva-recibos-verdes", "fatura-vs-recibo"],
    relatedToolIds: ["payout-mor", "mapa-contabilistas"],
    // Ponto 5/#14 da auditoria: só encaminhar depois de identificar contrato
    // e contraparte — nunca uma ação de emissão automática.
    fizAction: { topic: "ACCOUNTANT", intent: "FIND_ACCOUNTANT", requiredCapability: "accountant.assessment", dataPolicy: "NO_DATA", fallbackLabel: "Falar com um contabilista na FIZ", exigeRevisaoHumana: true },
    seo: { description: "Merchant of Record para freelancers: o que muda comercialmente, o que depende do contrato e por que não há uma resposta fiscal única.", aliases: ["merchant of record", "mor", "paddle", "lemon squeezy", "payout mensal", "vender saas portugal"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "review",
  },

  // ══ Gerir contribuições ═════════════════════════════════════════════
  {
    id: "seguranca-social", slug: "seguranca-social",
    title: "Segurança Social",
    navLabel: "Segurança Social",
    descricao: "Como funcionam as contribuições, a fórmula e as isenções.",
    categoria: "Independentes", hub: "contribuir", archetype: "status", icon: User, tempo: 5,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["SS_TAXA", "SS_BASE", "IAS_VALUE"],
    relatedGuideIds: ["acumulacao-emprego", "calendario-fiscal", "cessar-atividade", "abrir-atividade"],
    relatedToolIds: ["calculadora", "classificar-atividade"],
    fizAction: { topic: "SOCIAL_SECURITY", intent: "CONFIGURE_SOCIAL_SECURITY", requiredCapability: "social-security.declaration", dataPolicy: "CONNECTED_ACCOUNT", fallbackLabel: "Ver as contribuições na FIZ" },
    seo: { description: "Contribuições dos trabalhadores independentes: base de incidência, declaração trimestral, isenções e a que prestações dão direito.", aliases: ["segurança social recibos verdes", "declaração trimestral", "contribuições trabalhador independente", "seguranca social independente"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "acumulacao-emprego", slug: "acumulacao-emprego",
    title: "Acumulação com emprego",
    navLabel: "Acumulação c/ emprego",
    descricao: "Tens emprego e passas recibos verdes? Sabe o que muda.",
    categoria: "Independentes", hub: "contribuir", archetype: "reference", icon: Briefcase, tempo: 5,
    audiences: ["MIXED"], effectiveFrom: DE,
    engineBindings: ["IAS_VALUE", "RETENCAO", "DISPENSA_RETENCAO_LIMITE"],
    relatedGuideIds: ["seguranca-social", "retencao-na-fonte", "escaloes-irs", "recibo-vencimento"],
    relatedToolIds: ["simulador-irs", "calculadora"],
    // Ponto 5/#10: avaliação contextual. Nunca automatizar a conclusão laboral.
    fizAction: { topic: "ACCOUNTANT", intent: "FIND_ACCOUNTANT", requiredCapability: "accountant.assessment", dataPolicy: "NO_DATA", fallbackLabel: "Pedir uma avaliação a um contabilista na FIZ", exigeRevisaoHumana: true },
    seo: { description: "Salário e recibos verdes ao mesmo tempo: IRS somado, dispensa de contribuições, entidade contratante e presunção laboral — três coisas diferentes.", aliases: ["acumular emprego e recibos verdes", "recibos verdes e contrato", "falso recibo verde", "entidade contratante", "dependência económica"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "pagamentos-por-conta", slug: "pagamentos-por-conta",
    title: "Pagamentos por conta do IRS",
    navLabel: "Pagamentos por conta",
    descricao: "Os adiantamentos de IRS da categoria B: prazos e cálculo.",
    categoria: "Independentes", hub: "contribuir", archetype: "status", icon: Calculator, tempo: 4,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["ESCALOES_IRS", "RETENCAO"],
    relatedGuideIds: ["retencao-na-fonte", "calendario-fiscal", "reembolso-irs", "regime-simplificado"],
    relatedToolIds: ["simulador-irs", "calculadora"],
    fizAction: { topic: "IRS", intent: "PREPARE_IRS", requiredCapability: "obligations.overview", dataPolicy: "CONNECTED_ACCOUNT", fallbackLabel: "Ver as obrigações reais na FIZ" },
    seo: { description: "Pagamentos por conta do IRS: quem está sujeito, como se calcula o adiantamento, prazos e quando pode ser dispensado.", aliases: ["pagamentos por conta", "adiantamento irs", "pagamento por conta categoria b"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },

  // ══ Preparar o IRS ══════════════════════════════════════════════════
  {
    id: "escaloes-irs", slug: "escaloes-irs",
    title: `Escalões de IRS ${FISCAL_YEAR}`,
    navLabel: "Escalões IRS",
    descricao: "A tabela e os mitos sobre subir de escalão.",
    categoria: "Transversal", hub: "irs", archetype: "calculation", icon: Calculator, tempo: 5,
    audiences: ["TI", "EMPLOYEE", "MIXED"], effectiveFrom: DE, effectiveTo: `${FISCAL_YEAR}-12-31`,
    engineBindings: ["ESCALOES_IRS", "MINIMO_EXISTENCIA"],
    relatedGuideIds: ["deducoes-coleta", "tributacao-conjunta", "regime-simplificado", "reembolso-irs"],
    relatedToolIds: ["simulador-irs", "quiz-fiscal"],
    fizAction: { topic: "IRS", intent: "PREPARE_IRS", requiredCapability: "irs.preparation", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Continuar a preparação do IRS na FIZ" },
    seo: { description: `Escalões de IRS ${FISCAL_YEAR}: a tabela completa, a diferença entre taxa marginal e taxa efetiva e por que subir de escalão não te deixa a perder.`, aliases: ["escalões irs", "escaloes irs 2026", "tabela irs", "taxa marginal", "subir de escalão"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "irs-jovem", slug: "irs-jovem",
    title: `IRS Jovem ${FISCAL_YEAR}`,
    navLabel: "IRS Jovem",
    descricao: "Isenção por ano, condições e como pedir.",
    categoria: "Transversal", hub: "irs", archetype: "calculation", icon: Flag, tempo: 4,
    audiences: ["TI", "EMPLOYEE"], effectiveFrom: DE, effectiveTo: `${FISCAL_YEAR}-12-31`,
    engineBindings: ["IRS_JOVEM", "IAS_VALUE"],
    relatedGuideIds: ["escaloes-irs", "deducoes-coleta", "abrir-atividade"],
    relatedToolIds: ["simulador-irs"],
    fizAction: { topic: "IRS", intent: "PREPARE_IRS", requiredCapability: "irs.preparation", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Preparar os dados de IRS na FIZ" },
    seo: { description: `IRS Jovem ${FISCAL_YEAR}: percentagem de isenção por ano de utilização, limite máximo, condições e como o histórico conta.`, aliases: ["irs jovem", "isenção irs jovem", "irs jovem 2026", "beneficio fiscal jovem"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "deducoes-coleta", slug: "deducoes-coleta",
    title: "Deduções à coleta",
    navLabel: "Deduções à coleta",
    descricao: "Saúde, educação e despesas gerais no teu IRS.",
    categoria: "Transversal", hub: "irs", archetype: "calculation", icon: Calculator, tempo: 5,
    audiences: ["TI", "EMPLOYEE", "MIXED"], effectiveFrom: DE,
    engineBindings: ["DEDUCOES_COLETA", "DEDUCAO_DEPENDENTES"],
    relatedGuideIds: ["escaloes-irs", "tributacao-conjunta", "despesas-dedutiveis", "reembolso-irs"],
    relatedToolIds: ["simulador-irs"],
    fizAction: { topic: "IRS", intent: "PREPARE_IRS", requiredCapability: "irs.preparation", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever a declaração na FIZ" },
    seo: { description: "Deduções à coleta do IRS por categoria: dependentes, saúde, educação, imóveis e despesas gerais — com os artigos exatos e o limite global.", aliases: ["deduções à coleta", "deducoes coleta", "despesas irs", "deduzir saúde irs", "despesas gerais familiares"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "mais-valias", slug: "mais-valias",
    title: "Mais-valias: ações, cripto e imóveis",
    navLabel: "Mais-valias",
    descricao: "Taxas, isenções e englobamento na categoria G.",
    categoria: "Transversal", hub: "irs", archetype: "calculation", icon: Coin, tempo: 6,
    audiences: ["TI", "EMPLOYEE", "MIXED"], effectiveFrom: DE,
    engineBindings: ["MAIS_VALIAS_TAXA", "ESCALOES_IRS"],
    relatedGuideIds: ["escaloes-irs", "deducoes-coleta", "reembolso-irs"],
    relatedToolIds: ["simulador-irs"],
    fizAction: { topic: "IRS", intent: "FIND_ACCOUNTANT", requiredCapability: "accountant.assessment", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Pedir revisão a um contabilista na FIZ", exigeRevisaoHumana: true },
    seo: { description: "Mais-valias na categoria G: imóveis, valores mobiliários e criptoativos tratados em separado, com taxas, isenções e englobamento.", aliases: ["mais valias", "mais-valias ações", "cripto irs", "vender casa irs", "categoria g"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "tributacao-conjunta", slug: "tributacao-conjunta",
    title: "Tributação conjunta vs. separada",
    navLabel: "Tributação conjunta",
    descricao: "O quociente conjugal e quando cada opção compensa.",
    categoria: "Transversal", hub: "irs", archetype: "decision", icon: User, tempo: 5,
    audiences: ["MIXED"], effectiveFrom: DE,
    engineBindings: ["QUOCIENTE_CONJUGAL", "ESCALOES_IRS"],
    relatedGuideIds: ["escaloes-irs", "deducoes-coleta", "reembolso-irs"],
    relatedToolIds: ["simulador-irs"],
    fizAction: { topic: "IRS", intent: "PREPARE_IRS", requiredCapability: "irs.preparation", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Enviar a opção e continuar na FIZ" },
    seo: { description: "Tributação conjunta ou separada: como funciona o quociente conjugal, quando compensa a cada perfil e o efeito nas deduções.", aliases: ["tributação conjunta", "irs em conjunto", "quociente conjugal", "declaração conjunta casados"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "reembolso-irs", slug: "reembolso-irs",
    title: "Reembolso de IRS: prazos e como acelerar",
    navLabel: "Reembolso de IRS",
    descricao: "Quando recebes e o que evita atrasos no reembolso.",
    categoria: "Transversal", hub: "irs", archetype: "status", icon: Wallet, tempo: 4,
    audiences: ["TI", "EMPLOYEE", "MIXED"], effectiveFrom: DE,
    engineBindings: ["ESCALOES_IRS"],
    relatedGuideIds: ["escaloes-irs", "deducoes-coleta", "pagamentos-por-conta", "calendario-fiscal"],
    relatedToolIds: ["simulador-irs"],
    fizAction: { topic: "IRS", intent: "PREPARE_IRS", requiredCapability: "irs.status", dataPolicy: "CONNECTED_ACCOUNT", fallbackLabel: "Ver o estado do IRS na FIZ" },
    seo: { description: "Reembolso de IRS: como se apura, que estados a declaração atravessa, o que costuma atrasar e o que não depende de ti.", aliases: ["reembolso irs", "quando recebo o irs", "estado da declaração", "irs a receber"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "ifici-nhr", slug: "ifici-nhr",
    title: "IFICI (NHR 2.0): taxa de 20%",
    navLabel: "IFICI / NHR 2.0",
    descricao: "O sucessor do Residente Não Habitual — condições e duração.",
    categoria: "Transversal", hub: "irs", archetype: "reference", icon: Flag, tempo: 5,
    audiences: ["TI", "EMPLOYEE"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["escaloes-irs", "abrir-atividade", "mais-valias"],
    relatedToolIds: ["simulador-irs", "mapa-contabilistas"],
    fizAction: { topic: "ACCOUNTANT", intent: "FIND_ACCOUNTANT", requiredCapability: "accountant.assessment", dataPolicy: "NO_DATA", fallbackLabel: "Falar com um contabilista na FIZ", exigeRevisaoHumana: true },
    seo: { description: "IFICI, o sucessor do Residente Não Habitual: a que rendimentos se aplica a taxa de 20 %, quem é elegível e o que fica de fora.", aliases: ["ifici", "nhr", "residente não habitual", "nhr 2.0", "taxa 20% ifici"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },

  // ══ Gerir uma empresa ═══════════════════════════════════════════════
  {
    id: "abrir-empresa", slug: "abrir-empresa",
    title: "Como abrir uma empresa",
    navLabel: "Abrir empresa",
    descricao: "Formas jurídicas, Empresa na Hora e custos reais.",
    categoria: "Empresas", hub: "empresa", archetype: "procedure", icon: Building, tempo: 7,
    audiences: ["COMPANY", "ENI"], effectiveFrom: DE,
    engineBindings: ["IRC_TAXAS", "DIVIDENDOS_TAXA"],
    relatedGuideIds: ["unipessoal-vs-eni", "irc", "tributacao-autonoma", "contabilidade-organizada"],
    relatedToolIds: ["simulador-empresa", "comparador", "mapa-contabilistas"],
    fizAction: { topic: "COMPANY", intent: "START_COMPANY", requiredCapability: "company.onboarding", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Preparar a empresa na FIZ" },
    seo: { description: "Abrir uma empresa em Portugal: formas jurídicas e responsabilidade, Empresa na Hora e Empresa Online, custos e obrigações que passam a existir.", aliases: ["abrir empresa", "criar empresa", "empresa na hora", "abrir lda", "constituir sociedade"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "unipessoal-vs-eni", slug: "unipessoal-vs-eni",
    title: "Empresa (unipessoal) vs. recibos verdes",
    navLabel: "Unipessoal vs. ENI",
    descricao: "IRC ou IRS, responsabilidade e custos — qual a estrutura certa.",
    categoria: "Empresas", hub: "empresa", archetype: "decision", icon: Building, tempo: 7,
    audiences: ["COMPANY", "ENI", "TI"], effectiveFrom: DE,
    engineBindings: ["IRC_TAXAS", "DIVIDENDOS_TAXA", "COEFICIENTES", "ESCALOES_IRS"],
    relatedGuideIds: ["abrir-empresa", "irc", "contabilidade-organizada", "regime-simplificado"],
    relatedToolIds: ["comparador", "simulador-empresa", "simulador-irs"],
    fizAction: { topic: "COMPANY", intent: "START_COMPANY", requiredCapability: "company.onboarding", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever a estrutura na FIZ" },
    seo: { description: "Sociedade unipessoal ou recibos verdes: responsabilidade patrimonial, IRC contra IRS, custos de operação e o ponto de viragem.", aliases: ["unipessoal ou recibos verdes", "eni", "empresário em nome individual", "abrir unipessoal", "vale a pena abrir empresa"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "irc", slug: "irc",
    title: "IRC para PME",
    navLabel: "IRC para PME",
    descricao: "Taxas, derrama e pagamentos por conta sem complicação.",
    categoria: "Empresas", hub: "empresa", archetype: "reference", icon: Calculator, tempo: 7,
    audiences: ["COMPANY"], effectiveFrom: DE,
    engineBindings: ["IRC_TAXAS"],
    relatedGuideIds: ["tributacao-autonoma", "abrir-empresa", "unipessoal-vs-eni", "calendario-fiscal"],
    relatedToolIds: ["simulador-empresa", "comparador"],
    fizAction: { topic: "COMPANY", intent: "START_COMPANY", requiredCapability: "company.obligations", dataPolicy: "CONNECTED_ACCOUNT", fallbackLabel: "Ver as obrigações da empresa na FIZ" },
    seo: { description: "IRC para PME: taxa geral e taxa reduzida, matéria coletável, derrama, pagamentos por conta e a Modelo 22.", aliases: ["irc", "irc pme", "taxa de irc", "modelo 22", "derrama municipal"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "tributacao-autonoma", slug: "tributacao-autonoma",
    title: "Tributação autónoma",
    navLabel: "Tributação autónoma",
    descricao: "Viaturas, despesas de representação e agravamento.",
    categoria: "Empresas", hub: "empresa", archetype: "reference", icon: Scale, tempo: 7,
    audiences: ["COMPANY"], effectiveFrom: DE,
    engineBindings: ["TRIBUTACAO_AUTONOMA", "TA_AGRAVAMENTO"],
    relatedGuideIds: ["irc", "abrir-empresa", "despesas-dedutiveis"],
    relatedToolIds: ["simulador-empresa"],
    fizAction: { topic: "EXPENSES", intent: "FIND_ACCOUNTANT", requiredCapability: "expenses.categories", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Classificar as despesas na FIZ" },
    seo: { description: "Tributação autónoma em IRC: matriz por tipo de despesa e de viatura, escalões de custo de aquisição e agravamento por prejuízo fiscal.", aliases: ["tributação autónoma", "tributacao autonoma viaturas", "ta irc", "despesas de representação"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },

  // ══ Trabalho por conta de outrem ════════════════════════════════════
  {
    id: "recibo-vencimento", slug: "recibo-vencimento",
    title: "Como ler o recibo de vencimento",
    navLabel: "Recibo de vencimento",
    descricao: "Bruto, Segurança Social, IRS e líquido explicados linha a linha.",
    categoria: "Conta de outrem", hub: "conta-outrem", archetype: "reference", icon: Receipt, tempo: 5,
    audiences: ["EMPLOYEE"], effectiveFrom: DE, effectiveTo: `${FISCAL_YEAR}-12-31`,
    engineBindings: ["TABELAS_RETENCAO", "SS_TCO"],
    relatedGuideIds: ["subsidios-ferias-natal", "trabalho-suplementar", "escaloes-irs", "acumulacao-emprego"],
    relatedToolIds: ["recibo-vencimento", "auditoria-recibo"],
    // Ponto 5/#15: sem envio por defeito. A continuação é uma ferramenta
    // do ReciboCerto, não uma ação FIZ.
    seo: { description: "Recibo de vencimento linha a linha: bruto, Segurança Social, IRS retido, subsídio de refeição e o líquido que sobra.", aliases: ["recibo de vencimento", "recibo de salario", "quanto recebo liquido", "descontos no salário", "folha de vencimento"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "subsidios-ferias-natal", slug: "subsidios-ferias-natal",
    title: "Subsídio de férias e de Natal",
    navLabel: "Subsídios férias/Natal",
    descricao: "Cálculo, descontos e o que muda com os duodécimos.",
    categoria: "Conta de outrem", hub: "conta-outrem", archetype: "calculation", icon: Calendar, tempo: 5,
    audiences: ["EMPLOYEE"], effectiveFrom: DE,
    engineBindings: ["TABELAS_RETENCAO", "SS_TCO"],
    relatedGuideIds: ["recibo-vencimento", "trabalho-suplementar", "escaloes-irs"],
    relatedToolIds: ["recibo-vencimento"],
    seo: { description: "Subsídio de férias e de Natal: base legal, prazos de pagamento, descontos aplicáveis e em que condições podem ser pagos em duodécimos.", aliases: ["subsídio de férias", "subsidio de natal", "duodécimos", "13º mês", "quando recebo o subsídio de natal"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "trabalho-suplementar", slug: "trabalho-suplementar",
    title: "Trabalho suplementar (horas extra)",
    navLabel: "Trabalho suplementar",
    descricao: "Acréscimos, retenção autónoma e limites legais.",
    categoria: "Conta de outrem", hub: "conta-outrem", archetype: "calculation", icon: Clock, tempo: 5,
    audiences: ["EMPLOYEE"], effectiveFrom: DE,
    engineBindings: ["TRABALHO_SUPLEMENTAR"],
    relatedGuideIds: ["recibo-vencimento", "subsidios-ferias-natal"],
    relatedToolIds: ["recibo-vencimento", "auditoria-recibo"],
    seo: { description: "Horas extra: acréscimos por período, limites legais anuais, descanso compensatório e como são tributadas.", aliases: ["horas extra", "trabalho suplementar", "pagamento horas extra", "trabalho extraordinário"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },

  // ══ Cumprir prazos ══════════════════════════════════════════════════
  {
    id: "calendario-fiscal", slug: "calendario-fiscal",
    title: `Calendário fiscal ${FISCAL_YEAR}`,
    navLabel: "Calendário fiscal",
    descricao: "Todos os prazos de IRS, IVA, Segurança Social e IRC num só sítio.",
    categoria: "Transversal", hub: "prazos", archetype: "status", icon: Calendar, tempo: 5,
    audiences: ["TI", "ENI", "COMPANY", "EMPLOYEE"], effectiveFrom: DE, effectiveTo: `${FISCAL_YEAR}-12-31`,
    engineBindings: [],
    relatedGuideIds: ["iva-recibos-verdes", "seguranca-social", "pagamentos-por-conta", "irc"],
    relatedToolIds: ["simulador-irs", "calculadora"],
    fizAction: { topic: "OTHER", intent: "CONFIGURE_FREELANCER", requiredCapability: "obligations.overview", dataPolicy: "CONNECTED_ACCOUNT", fallbackLabel: "Ver as minhas obrigações reais na FIZ" },
    seo: { description: `Calendário fiscal ${FISCAL_YEAR}: prazos legais de IRS, IVA, Segurança Social e IRC, com o que se entrega e quem está sujeito.`, aliases: ["calendário fiscal", "prazos fiscais", "datas irs", "quando entregar o iva", "agenda fiscal"], schema: ["Article"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },

  // ══ Direitos e cobranças ════════════════════════════════════════════
  //   Secção nova. Todo o catálogo respondia a "quanto pago" e "quando";
  //   nenhum guia respondia a "e se for o outro lado a falhar?".
  {
    id: "fatura-nao-paga", slug: "fatura-nao-paga",
    title: "Emiti a fatura e o cliente não pagou",
    navLabel: "Fatura não paga",
    descricao: "Porque é que já deves imposto de dinheiro que não recebeste — e como recuperá-lo.",
    categoria: "Independentes", hub: "direitos", archetype: "procedure", icon: Warning, tempo: 7,
    audiences: ["TI", "ENI", "COMPANY"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["juros-de-mora", "cobrar-divida", "recuperar-iva-incobravel", "iva-de-caixa"],
    relatedToolIds: ["auditoria-recibo", "calculadora"],
    fizAction: { topic: "INVOICING", intent: "FIND_ACCOUNTANT", requiredCapability: "receivables.assessment", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever a situação da fatura com a FIZ", exigeRevisaoHumana: true },
    seo: { description: "O IRS da categoria B vence-se com a emissão da fatura, não com o recebimento. O que fazer quando o cliente não paga: juros, recuperação do IVA e cobrança.", aliases: ["cliente não pagou", "fatura por pagar", "não me pagaram o recibo verde", "emiti recibo e não recebi", "pagar irs sem receber"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "juros-de-mora", slug: "juros-de-mora",
    title: "Prazos de pagamento e juros de mora",
    navLabel: "Juros de mora",
    descricao: "Quando a fatura se vence, que juros podes exigir e os 40 € que quase ninguém cobra.",
    categoria: "Transversal", hub: "direitos", archetype: "reference", icon: Clock, tempo: 5,
    audiences: ["TI", "ENI", "COMPANY"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["fatura-nao-paga", "cobrar-divida", "fatura-vs-recibo"],
    relatedToolIds: ["calculadora", "quiz-fiscal"],
    fizAction: { topic: "INVOICING", intent: "FIND_ACCOUNTANT", requiredCapability: "receivables.interest", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Apurar juros e encargos com a FIZ" },
    seo: { description: "Prazos legais de pagamento entre empresas e com entidades públicas, juros de mora sem interpelação e a indemnização mínima de 40 € por custos de cobrança.", aliases: ["juros de mora", "prazo de pagamento fatura", "atraso no pagamento", "40 euros indemnização cobrança", "quando posso cobrar juros"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "cobrar-divida", slug: "cobrar-divida",
    title: "Como cobrar uma dívida: da carta à injunção",
    navLabel: "Cobrar uma dívida",
    descricao: "A escada da cobrança, degrau a degrau, e quanto custa cada um.",
    categoria: "Transversal", hub: "direitos", archetype: "procedure", icon: Scale, tempo: 6,
    audiences: ["TI", "ENI", "COMPANY"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["fatura-nao-paga", "juros-de-mora", "recuperar-iva-incobravel"],
    relatedToolIds: ["mapa-contabilistas", "auditoria-recibo"],
    fizAction: { topic: "OTHER", intent: "FIND_ACCOUNTANT", requiredCapability: "debt-recovery.injunction", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Preparar a cobrança com a FIZ", exigeRevisaoHumana: true },
    seo: { description: "Interpelação, injunção e execução: os passos para cobrar uma fatura em atraso, os limites de valor e o que muda nas transações comerciais.", aliases: ["injunção", "como cobrar uma dívida", "cliente não paga o que fazer", "balcão nacional de injunções", "título executivo fatura"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "recuperar-iva-incobravel", slug: "recuperar-iva-incobravel",
    title: "Recuperar o IVA de faturas que não vais receber",
    navLabel: "Recuperar IVA",
    descricao: "Entregaste IVA de dinheiro que nunca entrou. Em que condições o Estado o devolve.",
    categoria: "Independentes", hub: "direitos", archetype: "procedure", icon: Receipt, tempo: 6,
    audiences: ["TI", "ENI", "COMPANY"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["fatura-nao-paga", "iva-de-caixa", "iva-recibos-verdes", "cobrar-divida"],
    relatedToolIds: ["regime-simplificado", "mapa-contabilistas"],
    fizAction: { topic: "VAT", intent: "CONFIGURE_VAT", requiredCapability: "vat.bad-debt-relief", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Preparar a regularização de IVA com a FIZ", exigeRevisaoHumana: true },
    seo: { description: "Créditos de cobrança duvidosa e incobráveis no IVA: prazos de mora, limites por devedor, pedido de autorização prévia e prova exigida.", aliases: ["recuperar iva", "crédito incobrável", "cobrança duvidosa iva", "regularização de iva a favor do sujeito passivo", "artigo 78 a civa"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "iva-de-caixa", slug: "iva-de-caixa",
    title: "Regime de IVA de caixa: pagar só depois de receber",
    navLabel: "IVA de caixa",
    descricao: "O regime que alinha a entrega do IVA com o recebimento — e o que se perde em troca.",
    categoria: "Independentes", hub: "direitos", archetype: "decision", icon: Wallet, tempo: 6,
    audiences: ["TI", "ENI", "COMPANY"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["iva-recibos-verdes", "fatura-nao-paga", "recuperar-iva-incobravel", "contabilidade-organizada"],
    relatedToolIds: ["simulador-empresa", "regime-simplificado"],
    fizAction: { topic: "VAT", intent: "CONFIGURE_VAT", requiredCapability: "vat.cash-accounting", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Avaliar o IVA de caixa com a FIZ" },
    seo: { description: "Como funciona o regime de IVA de caixa, quem pode optar, quando se exerce a opção e porque é que nem sempre compensa.", aliases: ["iva de caixa", "regime de caixa iva", "pagar iva só quando recebo", "contabilidade de caixa iva"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "contestar-liquidacao", slug: "contestar-liquidacao",
    title: "Não concordo com a nota de liquidação",
    navLabel: "Contestar liquidação",
    descricao: "Reclamação graciosa, recurso e impugnação — com os prazos que não se recuperam.",
    categoria: "Transversal", hub: "direitos", archetype: "procedure", icon: ShieldCheck, tempo: 6,
    audiences: ["TI", "ENI", "COMPANY", "EMPLOYEE"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["prazos-fiscais-divida", "reembolso-irs", "calendario-fiscal"],
    relatedToolIds: ["simulador-irs", "mapa-contabilistas"],
    fizAction: { topic: "OTHER", intent: "FIND_ACCOUNTANT", requiredCapability: "tax-dispute.assessment", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever a liquidação com a FIZ", exigeRevisaoHumana: true },
    seo: { description: "Como contestar uma liquidação de imposto: prazo de 120 dias da reclamação graciosa, três meses da impugnação judicial e o efeito do pagamento.", aliases: ["reclamação graciosa", "contestar irs", "não concordo com a liquidação", "impugnação judicial", "recurso hierárquico finanças"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "prazos-fiscais-divida", slug: "prazos-fiscais-divida",
    title: "Até quando é que a AT pode cobrar-me?",
    navLabel: "Caducidade e prescrição",
    descricao: "Caducidade da liquidação e prescrição da dívida — dois prazos diferentes que se confundem sempre.",
    categoria: "Transversal", hub: "direitos", archetype: "reference", icon: Calendar, tempo: 5,
    audiences: ["TI", "ENI", "COMPANY", "EMPLOYEE"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["contestar-liquidacao", "calendario-fiscal", "cessar-atividade"],
    relatedToolIds: ["quiz-fiscal", "mapa-contabilistas"],
    fizAction: { topic: "OTHER", intent: "FIND_ACCOUNTANT", requiredCapability: "tax-debt.review", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Analisar a dívida com a FIZ" },
    seo: { description: "Quatro anos para liquidar, oito para cobrar: a diferença entre caducidade e prescrição, quando cada prazo se suspende e o que fazer com uma dívida antiga.", aliases: ["prescrição dívidas fiscais", "caducidade liquidação", "dívida antiga finanças", "quantos anos pode a at cobrar", "prescrição irs"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },

  {
    id: "juros-indemnizatorios", slug: "juros-indemnizatorios",
    title: "Quando é a AT que te paga juros a ti",
    navLabel: "Juros indemnizatórios",
    descricao: "Pagaste imposto a mais por erro dos serviços? Há juros a teu favor — e quase ninguém os pede.",
    categoria: "Transversal", hub: "direitos", archetype: "reference", icon: Coin, tempo: 5,
    audiences: ["TI", "ENI", "COMPANY", "EMPLOYEE"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["contestar-liquidacao", "reembolso-irs", "prazos-fiscais-divida"],
    relatedToolIds: ["simulador-irs", "auditoria-recibo"],
    fizAction: { topic: "OTHER", intent: "FIND_ACCOUNTANT", requiredCapability: "tax-refund.interest", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Avaliar o direito a juros com a FIZ" },
    seo: { description: "Juros indemnizatórios: quando a Autoridade Tributária deve juros ao contribuinte por erro que lhe seja imputável, e como se pedem.", aliases: ["juros indemnizatórios", "at pagar juros", "erro imputável aos serviços", "reembolso com juros", "artigo 43 lgt"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "execucao-fiscal", slug: "execucao-fiscal",
    title: "A dívida foi para execução fiscal. E agora?",
    navLabel: "Execução fiscal",
    descricao: "O que acontece a partir da citação, que prazos correm e onde ainda podes travar o processo.",
    categoria: "Transversal", hub: "direitos", archetype: "procedure", icon: Warning, tempo: 6,
    audiences: ["TI", "ENI", "COMPANY", "EMPLOYEE"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["plano-prestacoes", "suspender-execucao", "penhora-limites", "prazos-fiscais-divida"],
    relatedToolIds: ["mapa-contabilistas", "quiz-fiscal"],
    fizAction: { topic: "OTHER", intent: "FIND_ACCOUNTANT", requiredCapability: "tax-enforcement.review", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever o processo de execução com a FIZ", exigeRevisaoHumana: true },
    seo: { description: "Execução fiscal passo a passo: citação, oposição, penhora e as três saídas possíveis — pagar, prestar garantia ou pedir prestações.", aliases: ["execução fiscal", "citação finanças", "dívida em execução", "processo executivo at", "penhora finanças"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "plano-prestacoes", slug: "plano-prestacoes",
    title: "Pagar a dívida fiscal a prestações",
    navLabel: "Pagar a prestações",
    descricao: "Até quantas prestações dá, o que é preciso para as conseguir e o que se perde se falhares uma.",
    categoria: "Transversal", hub: "direitos", archetype: "procedure", icon: Calendar, tempo: 5,
    audiences: ["TI", "ENI", "COMPANY", "EMPLOYEE"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["execucao-fiscal", "suspender-execucao", "calendario-fiscal"],
    relatedToolIds: ["calculadora", "mapa-contabilistas"],
    fizAction: { topic: "OTHER", intent: "FIND_ACCOUNTANT", requiredCapability: "tax-debt.installments", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Preparar o pedido de prestações com a FIZ" },
    seo: { description: "Pagamento em prestações de dívidas fiscais: limite geral de 36 prestações, alargamento até cinco anos em dificuldade notória e o efeito do incumprimento.", aliases: ["pagar a prestações finanças", "plano prestacional", "36 prestações", "dívida fiscal prestações", "artigo 196 cppt"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "suspender-execucao", slug: "suspender-execucao",
    title: "Suspender a execução enquanto discutes a dívida",
    navLabel: "Suspender a execução",
    descricao: "Contestar não trava a cobrança sozinho. O que trava é a garantia — ou a sua dispensa.",
    categoria: "Transversal", hub: "direitos", archetype: "procedure", icon: ShieldCheck, tempo: 5,
    audiences: ["TI", "ENI", "COMPANY"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["execucao-fiscal", "contestar-liquidacao", "plano-prestacoes"],
    relatedToolIds: ["mapa-contabilistas", "simulador-empresa"],
    fizAction: { topic: "OTHER", intent: "FIND_ACCOUNTANT", requiredCapability: "tax-enforcement.guarantee", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Avaliar a garantia com a FIZ", exigeRevisaoHumana: true },
    seo: { description: "Como suspender a execução fiscal: garantia idónea, penhora suficiente ou dispensa de garantia, e o que cada via implica.", aliases: ["suspender execução fiscal", "garantia bancária finanças", "dispensa de garantia", "artigo 169 cppt", "travar penhora"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "penhora-limites", slug: "penhora-limites",
    title: "O que te podem penhorar — e o que não podem",
    navLabel: "Limites da penhora",
    descricao: "Dois terços do rendimento estão protegidos, com um piso e um teto. Saber onde estão muda tudo.",
    categoria: "Transversal", hub: "direitos", archetype: "reference", icon: Wallet, tempo: 5,
    audiences: ["TI", "ENI", "COMPANY", "EMPLOYEE"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["execucao-fiscal", "suspender-execucao", "plano-prestacoes"],
    relatedToolIds: ["recibo-vencimento", "calculadora"],
    fizAction: { topic: "OTHER", intent: "FIND_ACCOUNTANT", requiredCapability: "tax-enforcement.seizure-limits", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Confirmar os limites da penhora com a FIZ" },
    seo: { description: "Limites legais da penhora de vencimentos e pensões: dois terços impenhoráveis, piso de um salário mínimo e teto de três.", aliases: ["penhora do salário", "quanto me podem penhorar", "impenhorabilidade", "penhora vencimento limites", "artigo 738 cpc"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "reversao-gerentes", slug: "reversao-gerentes",
    title: "Quando a dívida da empresa passa para o gerente",
    navLabel: "Reversão para gerentes",
    descricao: "A responsabilidade subsidiária não é automática — mas a inversão do ónus da prova apanha muita gente.",
    categoria: "Empresas", hub: "direitos", archetype: "reference", icon: Building, tempo: 6,
    audiences: ["COMPANY"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["execucao-fiscal", "abrir-empresa", "unipessoal-vs-eni", "contestar-liquidacao"],
    relatedToolIds: ["simulador-empresa", "mapa-contabilistas"],
    fizAction: { topic: "COMPANY", intent: "FIND_ACCOUNTANT", requiredCapability: "company.liability-review", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever a responsabilidade societária com a FIZ", exigeRevisaoHumana: true },
    seo: { description: "Reversão de dívidas fiscais para gerentes e administradores: as duas alíneas do Art. 24.º da LGT e quem tem de provar o quê em cada uma.", aliases: ["reversão dívida gerente", "responsabilidade subsidiária", "gerente responde por dívidas", "artigo 24 lgt", "reversão fiscal"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },
  {
    id: "falsos-recibos-verdes", slug: "falsos-recibos-verdes",
    title: "Recibos verdes a fingir de emprego",
    navLabel: "Falsos recibos verdes",
    descricao: "Se trabalhas com horário, no local e com meios de outro, pode não ser prestação de serviços.",
    categoria: "Independentes", hub: "direitos", archetype: "decision", icon: Scale, tempo: 6,
    audiences: ["TI", "EMPLOYEE"], effectiveFrom: DE,
    engineBindings: [],
    relatedGuideIds: ["acumulacao-emprego", "abrir-atividade", "recibo-vencimento", "seguranca-social"],
    relatedToolIds: ["recibo-vencimento", "comparador"],
    fizAction: { topic: "ACCOUNTANT", intent: "FIND_ACCOUNTANT", requiredCapability: "employment.classification-review", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever o enquadramento com a FIZ", exigeRevisaoHumana: true },
    seo: { description: "Presunção de contrato de trabalho: os indícios do Art. 12.º do Código do Trabalho, o que muda se a presunção operar e onde se reclama.", aliases: ["falsos recibos verdes", "presunção de contrato de trabalho", "recibos verdes ilegais", "dependência económica", "artigo 12 código do trabalho"], schema: ["Article"] },
    owner: EQUIPA, reviewer: REVISOR_PENDENTE, lastReviewedAt: REVISTO, status: "published",
  },

  // ══ Encerrar ════════════════════════════════════════════════════════
  {
    id: "cessar-atividade", slug: "cessar-atividade",
    title: "Cessar atividade",
    navLabel: "Cessar atividade",
    descricao: "Como fechar atividade e o que acontece se não fechares.",
    categoria: "Independentes", hub: "encerrar", archetype: "procedure", icon: FileSign, tempo: 4,
    audiences: ["TI", "ENI"], effectiveFrom: DE,
    engineBindings: ["SS_TAXA"],
    relatedGuideIds: ["seguranca-social", "iva-recibos-verdes", "abrir-atividade", "calendario-fiscal"],
    relatedToolIds: ["calculadora"],
    fizAction: { topic: "OPEN_ACTIVITY", intent: "CONFIGURE_FREELANCER", requiredCapability: "onboarding.review-setup", dataPolicy: "CONSENTED_HANDOFF", fallbackLabel: "Rever o processo de cessação na FIZ" },
    seo: { description: "Cessar atividade nas Finanças: checklist fiscal e contributiva, documentos, prazos e o que continua a correr se não fechares.", aliases: ["cessar atividade", "fechar atividade", "encerrar recibos verdes", "cessação de atividade"], schema: ["Article", "HowTo"] },
    owner: EQUIPA, reviewer: EQUIPA, lastReviewedAt: REVISTO, status: "published",
  },
];

// ─── Acesso ────────────────────────────────────────────────────────────

const POR_SLUG = new Map(GUIDE_MANIFESTS.map((m) => [m.slug, m]));

export function manifesto(slug: string): GuideManifest | undefined {
  return POR_SLUG.get(slug);
}

export function manifestoObrigatorio(slug: string): GuideManifest {
  const m = POR_SLUG.get(slug);
  if (!m) throw new Error(`Guia sem manifesto: "${slug}". Registar em src/lib/guias/manifests.ts.`);
  return m;
}

export const href = (m: GuideManifest): string => `/guias/${m.slug}`;

export function manifestosDoHub(hub: HubGroup): GuideManifest[] {
  return GUIDE_MANIFESTS.filter((m) => m.hub === hub && m.status !== "archived");
}

export function manifestosPublicados(): GuideManifest[] {
  return GUIDE_MANIFESTS.filter((m) => m.status !== "archived");
}

export function guiasRelacionados(slug: string): GuideManifest[] {
  const m = manifesto(slug);
  if (!m) return [];
  return m.relatedGuideIds.map((id) => POR_SLUG.get(id)).filter((g): g is GuideManifest => Boolean(g));
}

/** Estado de confiança apresentado no topo de cada Guia (ponto 9.4).
    Nunca diz "sempre atualizado": diz o que foi verificado e quando. */
export type EstadoRevisao = "revisto" | "em_revisao" | "alteracao_detetada" | "arquivado";

export function estadoRevisao(slug: string, exigeRevisao: boolean): EstadoRevisao {
  const m = manifesto(slug);
  if (!m) return "em_revisao";
  if (m.status === "archived") return "arquivado";
  if (m.status !== "published") return "em_revisao";
  return exigeRevisao ? "alteracao_detetada" : "revisto";
}

// ─── Integridade ───────────────────────────────────────────────────────

export function assertManifestsIntegrity(): void {
  const erros: string[] = [];
  const slugs = new Set<string>();

  for (const m of GUIDE_MANIFESTS) {
    if (m.id !== m.slug) erros.push(`Guia "${m.slug}": id e slug têm de coincidir.`);
    if (slugs.has(m.slug)) erros.push(`Guia "${m.slug}": slug duplicado.`);
    slugs.add(m.slug);

    if (!/^[a-z0-9][a-z0-9-]{1,127}$/.test(m.slug)) {
      erros.push(`Guia "${m.slug}": slug fora do padrão exigido pelo contrato FIZ.`);
    }
    if (!m.owner.trim()) erros.push(`Guia "${m.slug}": sem proprietário.`);
    if (!m.reviewer.trim()) erros.push(`Guia "${m.slug}": sem revisor.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.lastReviewedAt)) {
      erros.push(`Guia "${m.slug}": lastReviewedAt tem de ser uma data ISO.`);
    }
    if (m.audiences.length === 0) erros.push(`Guia "${m.slug}": sem públicos definidos.`);
    if (m.seo.description.length < 60 || m.seo.description.length > 320) {
      erros.push(`Guia "${m.slug}": seo.description com ${m.seo.description.length} caracteres (esperado 60–320).`);
    }
    if (m.seo.aliases.length < 2) {
      erros.push(`Guia "${m.slug}": precisa de pelo menos 2 sinónimos para a pesquisa.`);
    }
    // Ponto 4.6 da auditoria: nenhum Guia sem ligações contextuais próprias.
    if (m.relatedGuideIds.length === 0) erros.push(`Guia "${m.slug}": sem guias relacionados.`);
    if (m.relatedToolIds.length === 0) erros.push(`Guia "${m.slug}": sem ferramentas relacionadas.`);
    for (const id of m.relatedGuideIds) {
      if (!GUIDE_MANIFESTS.some((g) => g.id === id)) erros.push(`Guia "${m.slug}": relacionado inexistente "${id}".`);
      if (id === m.id) erros.push(`Guia "${m.slug}": não se pode relacionar consigo próprio.`);
    }
    for (const t of m.relatedToolIds) {
      if (!(t in TOOL_HREFS)) erros.push(`Guia "${m.slug}": ferramenta desconhecida "${t}".`);
    }
    // Regra 7.2/5: todo o Guia publicado tem afirmações rastreáveis.
    if (m.status === "published" && claimsDoGuia(m.id).length === 0) {
      erros.push(`Guia "${m.slug}": publicado sem nenhuma afirmação legal registada.`);
    }
    if (m.effectiveTo && m.effectiveTo < m.effectiveFrom) {
      erros.push(`Guia "${m.slug}": effectiveTo é anterior a effectiveFrom.`);
    }
    // Ponto 9.3: HowTo só quando existem passos completos e executáveis.
    if (m.seo.schema.includes("HowTo") && m.archetype !== "procedure") {
      erros.push(`Guia "${m.slug}": schema HowTo só é legítimo no arquétipo "procedure".`);
    }
    if (!m.seo.schema.includes("Article")) {
      erros.push(`Guia "${m.slug}": todo o Guia editorial declara pelo menos "Article".`);
    }
    // Ponto 8.2/13.x: a ação FIZ resolve-se por capacidade, nunca por URL.
    if (m.fizAction) {
      const cap = m.fizAction.requiredCapability;
      if (!/^[a-z0-9][a-z0-9._-]{2,127}$/.test(cap)) {
        erros.push(`Guia "${m.slug}": capacidade FIZ "${cap}" fora do padrão do contrato.`);
      }
      if (/^https?:/i.test(cap) || m.fizAction.fallbackLabel.includes("http")) {
        erros.push(`Guia "${m.slug}": a ação FIZ não pode conter URLs.`);
      }
    }
  }

  if (erros.length > 0) {
    throw new Error(`Manifestos de Guias inconsistentes:\n  · ${erros.join("\n  · ")}`);
  }
}

assertManifestsIntegrity();
