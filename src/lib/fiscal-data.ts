// ═══════════════════════════════════════════════════════════════════════
//  FONTE DE VERDADE FISCAL — Portugal 2026
//  ---------------------------------------------------------------------
//  Todos os parâmetros fiscais vivem AQUI e só aqui. Cada valor carrega:
//    · base legal (artigo do código aplicável)
//    · fonte verificável (URL oficial / entidade de referência)
//    · data da última verificação
//
//  O motor de cálculo (fiscal.ts) NÃO contém números mágicos: lê tudo
//  deste módulo. No fim do ficheiro, `assertFiscalDataIntegrity()` corre
//  ao carregar o módulo e LANÇA se algum invariante for violado — ou seja,
//  é impossível publicar dados internamente inconsistentes (o build falha).
//
//  AO ATUALIZAR PARA UM NOVO ANO: alterar os valores, atualizar
//  `lastVerified` de cada parâmetro tocado e `DATA_LAST_REVIEW`.
// ═══════════════════════════════════════════════════════════════════════

export const FISCAL_YEAR = 2026 as const;

/** Data da última revisão completa dos dados (ISO 8601). */
export const DATA_LAST_REVIEW = "2026-06-11" as const;

// ─── Registo de fontes (evita repetir URLs longos) ─────────────────────
export interface Source {
  label: string;
  url: string;
}

export const SOURCES = {
  // ── Portal das Finanças (AT) — Códigos tributários ──────────────────
  portalFinancasIVA: {
    label: "Art. 53.º CIVA — Isenção de IVA · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx",
  },
  art18civa: {
    label: "Art. 18.º CIVA — Taxas do imposto · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-18-do-civa.aspx",
  },
  art33civa: {
    label: "Art. 33.º CIVA — Cessação de atividade · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-33-do-civa.aspx",
  },
  art6civa: {
    label: "Art. 6.º CIVA — Localização das operações intracomunitárias · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-6-do-civa.aspx",
  },
  art31: {
    label: "Art. 31.º CIRS — Coeficientes do regime simplificado · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs31.aspx",
  },
  art68cirs: {
    label: "Art. 68.º CIRS — Taxas gerais (escalões IRS) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx",
  },
  art70cirs: {
    label: "Art. 70.º CIRS — Mínimo de existência · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs70.aspx",
  },
  art71cirs: {
    label: "Art. 71.º CIRS — Taxas liberatórias (dividendos) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs71.aspx",
  },
  art72: {
    label: "Art. 72.º CIRS — Taxas especiais (rendimentos prediais, categoria F) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs72.aspx",
  },
  art78cirs: {
    label: "Art. 78.º CIRS — Deduções à coleta · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs78.aspx",
  },
  art78aCirs: {
    label: "Art. 78.º-A CIRS — Dedução por dependentes · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs78a.aspx",
  },
  portalFinancasArt87: {
    label: "Art. 87.º CIRS — Deduções relativas a pessoas com deficiência · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs87.aspx",
  },
  art101cirs: {
    label: "Art. 101.º CIRS — Retenção na fonte sobre rendimentos Cat. B · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs101.aspx",
  },
  art101bCirs: {
    label: "Art. 101.º-B CIRS — Dispensa de retenção na fonte · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs101b.aspx",
  },
  art12bCirs: {
    label: "Art. 12.º-B CIRS — IRS Jovem · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs12b.aspx",
  },
  art56aCirs: {
    label: "Art. 56.º-A CIRS — Exclusão de rendimentos de pessoas com deficiência · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs56a.aspx",
  },
  art87circ: {
    label: "Art. 87.º CIRC — Taxas de IRC · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/irc87.aspx",
  },
  art88circ: {
    label: "Art. 88.º CIRC — Tributação autónoma · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/irc88.aspx",
  },

  // ── Diário da República (DRE) — Legislação consolidada ──────────────
  portaria151: {
    label: "Portaria 1011/2001 — Tabela de atividades do Art. 151.º CIRS · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/portaria/2001-177307831",
  },
  cfi: {
    label: "DL 162/2014 — Código Fiscal do Investimento (CFI: RFAI, DLRR, SIFIDE) · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2014-128418757",
  },

  // ── Segurança Social — Portal oficial ───────────────────────────────
  segSocialGov: {
    label: "Trabalhadores independentes — obrigações contributivas · Segurança Social (Gov)",
    url: "https://www.seg-social.pt/trabalhadores-independentes",
  },

  // ── Governo de Portugal — Guias oficiais ────────────────────────────
  govptTrabIndependente: {
    label: "Trabalhar por conta própria — guia para trabalhadores independentes · Gov.pt",
    url: "https://www.gov.pt/guias/trabalhar-por-conta-propria-guia-para-trabalhadores-independentes/",
  },

  // ── Ordem dos Contabilistas Certificados (OCC) — entidade oficial ──
  occIVA: {
    label: "IVA — Taxas em Portugal continental e regiões autónomas · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/iva-taxas-em-portugal-continental-e-acores",
  },
  occRegimeSimplificado: {
    label: "IRS — Regime simplificado (coeficientes e regra dos 15%) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irs-regime-simplificado-1",
  },
  alojamentoLocal: {
    label: "IRS do alojamento local — coeficientes (0,15 / 0,35 / 0,50) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irs-regime-simplificado-alojamento-local",
  },
  rendasPrediais: {
    label: "IRS — rendimentos prediais e tributação autónoma · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irs-rendimentos-prediais-e-tributacao-autonoma",
  },
  occTA: {
    label: "Tributação Autónoma — Art. 88.º CIRC (OE2025/OE2026) · OCC",
    url: "https://portal.occ.pt/pt-pt/noticias/irc-tributacao-autonoma",
  },
  occRFAI: {
    label: "RFAI — Regime Fiscal de Apoio ao Investimento (Art. 22.º–26.º CFI) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/beneficios-fiscais-rfai-e-dlrr",
  },
  occDLRR: {
    label: "DLRR — Dedução por Lucros Retidos e Reinvestidos (Art. 27.º–34.º CFI) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/beneficios-fiscais-rfai-e-dlrr",
  },
  occSIFIDE: {
    label: "SIFIDE II — Sistema de Incentivos Fiscais à I&D (Art. 35.º–42.º CFI) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irc-beneficios-fiscais-sifide-ii",
  },
  occIFICI: {
    label: "IFICI — Incentivo Fiscal à Investigação Científica e Inovação (ex-NHR) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irs-ifici-ex-nhr",
  },

  // ── Trabalho dependente (Categoria A) ───────────────────────────────
  despachoRetencao2026: {
    label: "Despacho n.º 233-A/2026 — Tabelas de retenção na fonte de IRS 2026 (Continente) · AT (ref. Montepio)",
    url: "https://www.montepio.org/ei/pessoal/impostos/tabelas-do-irs-conheca-as-taxas-de-retencao-na-fonte/",
  },
  subsidioRefeicao2026: {
    label: "Subsídio de refeição — limites de isenção 2026 (Art. 2.º, n.º 3 CIRS) · ref. Edenred/idealista",
    url: "https://www.edenred.pt/novidades/beneficios-sociais/subsidio-de-refeicao-2026-quais-os-valores-a-considerar/",
  },

  // ── Comissão Europeia ───────────────────────────────────────────────
  viesValidation: {
    label: "VIES — Validação de número de identificação para efeitos do IVA · Comissão Europeia",
    url: "https://ec.europa.eu/taxation_customs/vies",
  },
} satisfies Record<string, Source>;

export type SourceKey = keyof typeof SOURCES;

// ─── Valor com proveniência ────────────────────────────────────────────
export interface Sourced<T> {
  value: T;
  /** Base legal: artigo do código aplicável. */
  legalBasis: string;
  /** Chave do registo SOURCES. */
  source: SourceKey;
  /** Data da última verificação (ISO 8601). */
  lastVerified: string;
  /** Nota opcional de contexto. */
  note?: string;
}

function sv<T>(
  value: T,
  legalBasis: string,
  source: SourceKey,
  lastVerified: string,
  note?: string
): Sourced<T> {
  return { value, legalBasis, source, lastVerified, note };
}

const TODAY = "2026-06-11";

// ═══════════════════════════════════════════════════════════════════════
//  INDEXANTE DOS APOIOS SOCIAIS (IAS) — base de vários limites
// ═══════════════════════════════════════════════════════════════════════
export const IAS = sv(
  537.13,
  "Indexante dos Apoios Sociais (IAS) 2026",
  "segSocialGov",
  TODAY,
  "Base de cálculo de limites da Segurança Social e do teto do IRS Jovem."
);

// ═══════════════════════════════════════════════════════════════════════
//  IRS — RETENÇÃO NA FONTE (categoria B) — adiantamento, não imposto final
// ═══════════════════════════════════════════════════════════════════════
export type TipoAtividade = "art151" | "outros" | "vendas" | "diretosAutor";

export const RETENCAO: Record<TipoAtividade, Sourced<number>> = {
  art151: sv(
    0.23,
    "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    "art101cirs",
    TODAY,
    "Profissões liberais. Reduzida de 25% para 23% pelo OE2025; mantém-se em 2026."
  ),
  outros: sv(
    0.115,
    "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    "art101cirs",
    TODAY
  ),
  vendas: sv(
    0,
    "Vendas de bens/mercadorias — não sujeitas a retenção na fonte",
    "art101cirs",
    TODAY,
    "A retenção na fonte incide sobre prestações de serviços, não sobre vendas de bens."
  ),
  diretosAutor: sv(
    0.165,
    "Art. 101.º CIRS — direitos de autor e propriedade intelectual",
    "art101cirs",
    TODAY
  ),
};

export const META_TIPO: Record<TipoAtividade, { label: string; sub: string; info: string }> = {
  art151: {
    label: "Profissão do Art. 151.º",
    sub: "Programadores, designers, consultores, arquitetos, médicos…",
    info: "Profissões liberais listadas na tabela do Art. 151.º do CIRS. Retenção de 23% e coeficiente de 0,75 no regime simplificado.",
  },
  outros: {
    label: "Outras prestações de serviços",
    sub: "Serviços não previstos no Art. 151.º (código 1519)",
    info: "Serviços que não constam da tabela do Art. 151.º. Retenção de 11,5% e coeficiente de 0,35.",
  },
  vendas: {
    label: "Venda de bens / hotelaria",
    sub: "Comércio, produção, restauração e bebidas",
    info: "Vendas de mercadorias/produtos e atividades de restauração e hotelaria. Sem retenção na fonte e coeficiente de 0,15. A Segurança Social incide sobre 20% do rendimento.",
  },
  diretosAutor: {
    label: "Direitos de autor / propriedade intelectual",
    sub: "Royalties, licenciamento, propriedade industrial",
    info: "Cessão ou utilização de propriedade intelectual/industrial. Retenção de 16,5% e coeficiente de 0,95.",
  },
};

/** Limiar de dispensa de retenção na fonte (rendimento anual estimado). */
export const DISPENSA_RETENCAO_LIMITE = sv(
  15000,
  "Art. 101.º-B, n.º 1, al. a) CIRS",
  "art101bCirs",
  TODAY,
  "Quem prevê faturar menos do que este valor no ano pode dispensar a retenção na fonte."
);

// ═══════════════════════════════════════════════════════════════════════
//  IVA — isenção (Art. 53.º) e taxas por região
// ═══════════════════════════════════════════════════════════════════════
export const IVA_ISENCAO_LIMITE = sv(
  15000,
  "Art. 53.º CIVA",
  "portalFinancasIVA",
  TODAY,
  "Volume de negócios anual abaixo do qual há isenção de IVA."
);

/** Acima de 125% do limite de isenção, passa imediatamente ao regime normal. */
export const IVA_ISENCAO_EXCESSO = sv(
  18750,
  "Art. 53.º / Art. 58.º CIVA — excesso de 25% sobre o limiar",
  "portalFinancasIVA",
  TODAY
);

export type Regiao = "continente" | "madeira" | "acores";
export type EscalaoIVA = "reduzida" | "intermedia" | "normal";

export const IVA_TAXAS: Record<Regiao, Sourced<Record<EscalaoIVA, number>>> = {
  continente: sv(
    { reduzida: 0.06, intermedia: 0.13, normal: 0.23 },
    "Art. 18.º CIVA — Portugal continental",
    "occIVA",
    TODAY
  ),
  madeira: sv(
    { reduzida: 0.04, intermedia: 0.12, normal: 0.22 },
    "Art. 18.º CIVA — Região Autónoma da Madeira (DLR 6/2024/M: reduzida 4% desde out/2024)",
    "occIVA",
    TODAY
  ),
  acores: sv(
    { reduzida: 0.04, intermedia: 0.09, normal: 0.16 },
    "Art. 18.º CIVA — Região Autónoma dos Açores",
    "occIVA",
    TODAY
  ),
};

export const META_REGIAO: Record<Regiao, string> = {
  continente: "Continente",
  madeira: "Madeira",
  acores: "Açores",
};

// ═══════════════════════════════════════════════════════════════════════
//  SEGURANÇA SOCIAL — trabalhadores independentes
// ═══════════════════════════════════════════════════════════════════════
export const SS_TAXA = sv(
  0.214,
  "Art. 168.º do Código Contributivo — taxa contributiva do TI",
  "segSocialGov",
  TODAY
);

/** Coeficiente do rendimento relevante consoante a natureza da atividade. */
export type BaseSS = "servicos" | "bens";
export const SS_COEFICIENTE: Record<BaseSS, Sourced<number>> = {
  servicos: sv(0.7, "Art. 162.º Código Contributivo — prestação de serviços", "segSocialGov", TODAY),
  bens: sv(
    0.2,
    "Art. 162.º Código Contributivo — produção/venda de bens, hotelaria e restauração",
    "segSocialGov",
    TODAY
  ),
};

export const META_BASE_SS: Record<BaseSS, { label: string; sub: string }> = {
  servicos: { label: "Prestação de serviços", sub: "Base de 70% do rendimento" },
  bens: { label: "Venda de bens / hotelaria", sub: "Base de 20% do rendimento" },
};

/** Teto mensal do rendimento relevante = 12 × IAS. */
export const SS_BASE_MAX_MENSAL = sv(
  6445.56,
  "Limite de 12 × IAS ao rendimento relevante mensal médio",
  "segSocialGov",
  TODAY
);

export const SS_ISENCAO_PRIMEIRO_ANO_MESES = sv(
  12,
  "Art. 157.º Código Contributivo — isenção nos primeiros 12 meses de atividade",
  "segSocialGov",
  TODAY,
  "Aplica-se a quem não teve atividade independente nos 3 anos anteriores."
);

// ═══════════════════════════════════════════════════════════════════════
//  REGIME SIMPLIFICADO (IRS) — coeficientes para o rendimento tributável
// ═══════════════════════════════════════════════════════════════════════
export const REGIME_SIMPLIFICADO = {
  limite: sv(
    200000,
    "Art. 28.º CIRS — limite de rendimento bruto do regime simplificado",
    "art68cirs",
    TODAY
  ),
  coefServicos151: sv(0.75, "Art. 31.º, n.º 1, al. b) CIRS — serviços do Art. 151.º", "art31", TODAY),
  coefOutrosServicos: sv(0.35, "Art. 31.º, n.º 1, al. c) CIRS — outras prestações de serviços", "art31", TODAY),
  coefVendas: sv(0.15, "Art. 31.º, n.º 1, al. a) CIRS — vendas de bens, restauração e hotelaria", "art31", TODAY),
  coefPropIntelectual: sv(0.95, "Art. 31.º, n.º 1, al. d) CIRS — propriedade intelectual/industrial", "art31", TODAY),
  coefAlojamentoMoradia: sv(0.35, "Art. 31.º CIRS — alojamento local (moradia/apartamento)", "alojamentoLocal", TODAY),
  coefAlojamentoContencao: sv(0.5, "Art. 31.º, n.º 1, al. h) CIRS — alojamento local em zona de contenção", "alojamentoLocal", TODAY),
  coefTransparencia: sv(1.0, "Art. 31.º, n.º 1, al. g) CIRS — serviços a sociedade onde detém ≥ 5%", "art31", TODAY),
  coefSubsidiosNaoExploracao: sv(
    0.3,
    "Art. 31.º, n.º 1, al. e) CIRS — subsídios ou subvenções não destinados à exploração",
    "art31",
    TODAY,
    "Tributados em 1/5 no ano de recebimento e em cada um dos quatro anos seguintes."
  ),
  coefSubsidiosExploracao: sv(
    0.1,
    "Art. 31.º, n.º 1, al. f) CIRS — subsídios destinados à exploração e restantes rendimentos da categoria B",
    "art31",
    TODAY
  ),
};

/** Coeficiente do regime simplificado por tipo de atividade. */
export const COEFICIENTE_POR_TIPO: Record<TipoAtividade, number> = {
  art151: REGIME_SIMPLIFICADO.coefServicos151.value,
  outros: REGIME_SIMPLIFICADO.coefOutrosServicos.value,
  vendas: REGIME_SIMPLIFICADO.coefVendas.value,
  diretosAutor: REGIME_SIMPLIFICADO.coefPropIntelectual.value,
};

/** Base da Segurança Social por tipo (vendas/hotelaria = 20%, restante = 70%). */
export const BASE_SS_POR_TIPO: Record<TipoAtividade, BaseSS> = {
  art151: "servicos",
  outros: "servicos",
  vendas: "bens",
  diretosAutor: "servicos",
};

/**
 * Redução do coeficiente no início de atividade (Art. 31.º, n.º 10):
 * −50% no 1.º ano e −25% no 2.º ano de atividade.
 */
export const REDUCAO_COEFICIENTE_ANO = sv<Record<number, number>>(
  { 1: 0.5, 2: 0.25 },
  "Art. 31.º, n.º 10 CIRS — redução de 50% (1.º ano) e 25% (2.º ano)",
  "art31",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  IRS JOVEM — isenção progressiva (categorias A e B)
// ═══════════════════════════════════════════════════════════════════════
export const IRS_JOVEM = {
  idadeMax: sv(35, "Regime IRS Jovem — até 35 anos no último dia do ano", "art12bCirs", TODAY),
  /** Teto anual de rendimento isento = 55 × IAS. */
  tetoIAS: sv(55, "Teto anual de isenção = 55 × IAS", "art12bCirs", TODAY),
  /** Percentagem de isenção por ano de obtenção de rendimentos (1 a 10). */
  isencaoPorAno: sv<Record<number, number>>(
    { 1: 1.0, 2: 0.75, 3: 0.75, 4: 0.75, 5: 0.5, 6: 0.5, 7: 0.5, 8: 0.25, 9: 0.25, 10: 0.25 },
    "Regime IRS Jovem — 100% (1.º), 75% (2.º–4.º), 50% (5.º–7.º), 25% (8.º–10.º)",
    "art12bCirs",
    TODAY
  ),
};

// ═══════════════════════════════════════════════════════════════════════
//  IRS — ESCALÕES PROGRESSIVOS (Art. 68.º CIRS) e dedução específica.
//  Aplicam-se ao RENDIMENTO COLETÁVEL (após coeficiente e deduções).
// ═══════════════════════════════════════════════════════════════════════
export interface EscalaoIRS {
  /** Limite superior do escalão (€); null no último escalão. */
  ate: number | null;
  /** Taxa marginal aplicada à fração de rendimento dentro do escalão. */
  taxa: number;
}

export const ESCALOES_IRS = sv<EscalaoIRS[]>(
  [
    { ate: 8342, taxa: 0.125 },
    { ate: 12587, taxa: 0.157 },
    { ate: 17838, taxa: 0.212 },
    { ate: 23089, taxa: 0.241 },
    { ate: 29397, taxa: 0.311 },
    { ate: 43090, taxa: 0.349 },
    { ate: 46566, taxa: 0.431 },
    { ate: 86634, taxa: 0.446 },
    { ate: null, taxa: 0.48 },
  ],
  "Art. 68.º CIRS — escalões 2026 (Portugal continental)",
  "art68cirs",
  TODAY,
  "Taxas marginais. Confirmar anualmente contra a tabela oficial da AT."
);

// Dedução específica = máx(piso fixo; 8,54 × IAS). Para 2026 = 4.587,09 €.
export const DEDUCAO_ESPECIFICA_FLOOR = 4104;
export const DEDUCAO_ESPECIFICA_IAS_MULT = 8.54;

/**
 * Dedução específica da categoria B. No regime simplificado NÃO é uma subtração
 * direta ao coletável (o coeficiente já presume as despesas): conta como despesa
 * automaticamente justificada para a regra dos 15%. Em alternativa, contam as
 * contribuições à SS que excedam 10% do rendimento bruto, se superiores.
 */
export const DEDUCAO_ESPECIFICA_CATB = sv(
  Math.round(Math.max(DEDUCAO_ESPECIFICA_FLOOR, DEDUCAO_ESPECIFICA_IAS_MULT * IAS.value) * 100) / 100,
  "Art. 25.º / 31.º CIRS — máx(4.104 €; 8,54 × IAS)",
  "occRegimeSimplificado",
  TODAY
);

/** Limiar de despesas a justificar no regime simplificado (coef. 0,75 e 0,35). */
export const REGIME_15PCT = sv(
  0.15,
  "Art. 31.º CIRS — 15% do rendimento bruto a justificar com despesas",
  "occRegimeSimplificado",
  TODAY,
  "Parte de 15% do bruto não justificada com despesas é acrescida ao rendimento tributável."
);

/** Mínimo de existência (rendimento protegido de IRS). 2026 = RMMG 920 € × 14. */
export const MINIMO_EXISTENCIA = sv(
  12880,
  "Art. 70.º CIRS — mínimo de existência 2026 (RMMG 920 € × 14)",
  "art70cirs",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  IRC — para o comparador "recibos verdes vs empresa" (sociedade)
// ═══════════════════════════════════════════════════════════════════════
export const IRC_TAXA_GERAL = sv(
  0.19,
  "Art. 87.º CIRC — taxa geral 2026 (reduzida de 20% para 19% pelo OE2026)",
  "art87circ",
  TODAY
);
export const IRC_TAXA_PME = sv(
  0.15,
  "Art. 87.º CIRC — taxa reduzida PME nos primeiros 50.000 € de matéria coletável",
  "art87circ",
  TODAY
);
export const IRC_LIMITE_PME = sv(50000, "Art. 87.º CIRC — limiar da taxa reduzida PME", "art87circ", TODAY);
export const DERRAMA_MAX = sv(0.015, "Derrama municipal — taxa máxima legal sobre o lucro tributável", "art87circ", TODAY);
export const DIVIDENDOS_TAXA = sv(
  0.28,
  "Art. 71.º CIRS — taxa liberatória sobre dividendos distribuídos",
  "art71cirs",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  CATEGORIA F — RENDIMENTOS PREDIAIS (rendas puras, sem alojamento local)
//  ---------------------------------------------------------------------
//  Tributação totalmente distinta da categoria B: taxa autónoma (especial)
//  sobre as rendas líquidas das despesas dedutíveis (Art. 41.º), sem
//  Segurança Social e sem IVA (Art. 9.º CIVA). Não é recibo verde — tem
//  motor próprio (`calcularCategoriaF`). Pode optar-se pelo englobamento
//  (taxas progressivas), não modelado aqui.
// ═══════════════════════════════════════════════════════════════════════

/** Duração do contrato de arrendamento habitacional (define a redução da taxa). */
export type DuracaoArrendamento = "curto" | "5a10" | "10a20" | "20mais";

export const CATEGORIA_F = {
  /** Taxa autónoma sobre arrendamento para habitação. */
  taxaHabitacao: sv(
    0.25,
    "Art. 72.º, n.º 1 CIRS — taxa especial dos rendimentos prediais (habitação)",
    "art72",
    TODAY
  ),
  /** Taxa autónoma sobre arrendamento não habitacional (comércio, escritórios…). */
  taxaNaoHabitacao: sv(
    0.28,
    "Art. 72.º CIRS — rendimentos prediais de arrendamento não habitacional",
    "rendasPrediais",
    TODAY
  ),
  /**
   * Redução da taxa (em pontos percentuais, expressos como fração) por duração
   * do contrato de arrendamento HABITACIONAL permanente comunicado à AT.
   * 5–10 anos: −10 p.p.; 10–20 anos: −15 p.p.; ≥20 anos: −20 p.p.
   */
  reducaoDuracao: sv<Record<DuracaoArrendamento, number>>(
    { curto: 0, "5a10": 0.1, "10a20": 0.15, "20mais": 0.2 },
    "Art. 72.º, n.os 2 a 5 CIRS (Lei 56/2023) — reduções por duração do contrato",
    "rendasPrediais",
    TODAY,
    "Só para contratos de arrendamento habitacional permanente comunicados à AT. Renovações dão −2 p.p. cada, até −10 p.p. adicionais. O regime de renda moderada (taxa de 10%) anunciado no OE2026 está pendente de regulamentação e não é aqui aplicado."
  ),
};

export const META_DURACAO: Record<DuracaoArrendamento, { label: string; sub: string }> = {
  curto: { label: "Menos de 5 anos", sub: "Sem redução" },
  "5a10": { label: "5 a 10 anos", sub: "−10 p.p." },
  "10a20": { label: "10 a 20 anos", sub: "−15 p.p." },
  "20mais": { label: "20 anos ou mais", sub: "−20 p.p." },
};

// ═══════════════════════════════════════════════════════════════════════
//  CATÁLOGO DE ATIVIDADES — tabela do Art. 151.º CIRS (Portaria 1011/2001)
//  e categorias de comércio/hotelaria e propriedade intelectual. Cada
//  atividade aponta para o `tipo` que determina retenção, coeficiente e SS.
// ═══════════════════════════════════════════════════════════════════════
export interface Atividade {
  label: string;
  /** Categoria fiscal base (define os valores por defeito). */
  tipo: TipoAtividade;
  grupo: string;
  /**
   * Categoria de rendimento de IRS. As atividades deste catálogo são de
   * categoria B (rendimentos empresariais e profissionais — recibos verdes).
   * As rendas puras são categoria F e têm motor próprio (`calcularCategoriaF`),
   * fora do fluxo de recibos. Por defeito "B".
   */
  categoria?: "B" | "F";
  // ── Pacote de regras (override do `tipo`, para regimes especiais) ──
  /** Coeficiente do regime simplificado, se diferente do `tipo`. */
  coef?: number;
  /** Taxa de retenção na fonte, se diferente do `tipo`. */
  retencao?: number;
  /** Base da Segurança Social, se diferente do `tipo`. */
  baseSS?: BaseSS;
  /** Sujeita à regra dos 15% (Art. 31.º al. b/c). Por defeito deriva do `tipo`. */
  regra15?: boolean;
  /** Observação/exceção legal a mostrar ao utilizador. */
  nota?: string;
  /** Base legal do coeficiente. */
  legalCoef?: string;
}

/** Efeito fiscal efetivo de uma atividade (resolve overrides sobre o `tipo`). */
export interface EfeitoFiscal {
  coef: number;
  retencao: number;
  baseSS: BaseSS;
  regra15: boolean;
  nota?: string;
  legalCoef: string;
}

// Grupos da tabela oficial (Portaria 1011/2001) + categorias adicionais.
const G1 = "Engenharia e arquitetura";
const G2 = "Artistas e espetáculo";
const G3 = "Tauromaquia";
const G4 = "Economia e contabilidade";
const G5 = "Saúde (paramédicos)";
const G6 = "Juristas";
const G7 = "Médicos";
const G8 = "Ensino";
const G9 = "Nomeação oficial";
const G10 = "Psicologia e sociologia";
const G11 = "Química";
const G12 = "Religião";
const G13 = "Outras profissões liberais";
const G14 = "Veterinária";
const G15 = "Outros serviços";
const G_COM = "Comércio e hotelaria";
const G_PI = "Propriedade intelectual";
const G_SUB = "Subsídios e subvenções";

/** Entrada do Art. 151.º: código oficial + nome → tratamento de profissão liberal. */
const a = (code: string, nome: string, grupo: string): Atividade => ({
  label: `${code} · ${nome}`,
  tipo: "art151",
  grupo,
});

// Tabela oficial completa do Art. 151.º do CIRS (Portaria 1011/2001).
export const ATIVIDADES: Atividade[] = [
  // 1 — Arquitetos, engenheiros e técnicos similares
  a("1000", "Agentes técnicos de engenharia e arquitetura", G1),
  a("1001", "Arquitetos", G1),
  a("1002", "Desenhadores", G1),
  a("1003", "Engenheiros", G1),
  a("1004", "Engenheiros técnicos", G1),
  a("1005", "Geólogos", G1),
  a("1006", "Topógrafos", G1),
  // 2 — Artistas plásticos, atores e músicos
  a("2010", "Artistas de teatro, bailado, cinema, rádio e televisão", G2),
  a("2011", "Artistas de circo", G2),
  a("2012", "Escultores", G2),
  a("2013", "Músicos", G2),
  a("2014", "Pintores", G2),
  a("2015", "Outros artistas", G2),
  a("2019", "Cantores", G2),
  // 3 — Artistas tauromáquicos
  a("3010", "Toureiros", G3),
  a("3019", "Outros artistas tauromáquicos", G3),
  // 4 — Economistas, contabilistas, atuários e técnicos similares
  a("4010", "Atuários", G4),
  a("4011", "Auditores", G4),
  a("4012", "Consultores fiscais", G4),
  a("4013", "Contabilistas", G4),
  a("4014", "Economistas", G4),
  a("4015", "Técnicos oficiais de contas", G4),
  a("4016", "Técnicos similares", G4),
  // 5 — Enfermeiros, parteiras e outros técnicos paramédicos
  a("5010", "Enfermeiros", G5),
  a("5012", "Fisioterapeutas", G5),
  a("5013", "Nutricionistas", G5),
  a("5014", "Parteiras", G5),
  a("5015", "Terapeutas da fala", G5),
  a("5016", "Terapeutas ocupacionais", G5),
  a("5019", "Outros técnicos paramédicos", G5),
  // 6 — Juristas
  a("6010", "Advogados", G6),
  a("6011", "Jurisconsultos", G6),
  a("6012", "Solicitadores", G6),
  // 7 — Médicos
  a("7010", "Dentistas", G7),
  a("7011", "Médicos analistas", G7),
  a("7012", "Médicos cirurgiões", G7),
  a("7013", "Médicos de bordo em navios", G7),
  a("7014", "Médicos de clínica geral", G7),
  a("7015", "Médicos dentistas", G7),
  a("7016", "Médicos estomatologistas", G7),
  a("7017", "Médicos fisiatras", G7),
  a("7018", "Médicos gastroenterologistas", G7),
  a("7019", "Médicos oftalmologistas", G7),
  a("7020", "Médicos ortopedistas", G7),
  a("7021", "Médicos otorrinolaringologistas", G7),
  a("7022", "Médicos pediatras", G7),
  a("7023", "Médicos radiologistas", G7),
  a("7024", "Médicos de outras especialidades", G7),
  // 8 — Professores e técnicos similares
  a("8010", "Explicadores", G8),
  a("8011", "Formadores", G8),
  a("8012", "Professores", G8),
  // 9 — Profissionais dependentes de nomeação oficial
  a("9010", "Revisores oficiais de contas", G9),
  a("9011", "Notários", G9),
  // 10 — Psicólogos e sociólogos
  a("1010", "Psicólogos", G10),
  a("1011", "Sociólogos", G10),
  // 11 — Químicos
  a("1110", "Analistas", G11),
  // 12 — Sacerdotes
  a("1210", "Sacerdotes de qualquer religião", G12),
  // 13 — Outras pessoas exercendo profissões liberais, técnicas e assimiladas
  a("1310", "Administradores de bens", G13),
  a("1311", "Ajudantes familiares", G13),
  a("1312", "Amas", G13),
  a("1313", "Analistas de sistemas", G13),
  a("1314", "Arqueólogos", G13),
  a("1315", "Assistentes sociais", G13),
  a("1316", "Astrólogos", G13),
  a("1317", "Parapsicólogos", G13),
  a("1318", "Biólogos", G13),
  a("1319", "Comissionistas", G13),
  a("1320", "Consultores", G13),
  a("1321", "Dactilógrafos", G13),
  a("1322", "Decoradores", G13),
  a("1323", "Desportistas", G13),
  a("1324", "Engomadores", G13),
  a("1325", "Esteticistas, manicuras e pedicuras", G13),
  a("1326", "Guias-intérpretes", G13),
  a("1327", "Jornalistas e repórteres", G13),
  a("1328", "Louvados", G13),
  a("1329", "Massagistas", G13),
  a("1330", "Mediadores imobiliários", G13),
  a("1331", "Peritos-avaliadores", G13),
  a("1332", "Programadores informáticos", G13),
  a("1333", "Publicitários", G13),
  a("1334", "Tradutores", G13),
  a("1335", "Farmacêuticos", G13),
  a("1336", "Designers", G13),
  // 14 — Veterinários
  a("1410", "Veterinários", G14),
  // 15 — Outros (residual: coeficiente 0,35)
  { label: "1519 · Outros prestadores de serviços", tipo: "outros", grupo: G15 },
  // Categorias adicionais (fora do Art. 151.º) ──────────────────────────
  // Comércio, produção e hotelaria — coeficiente 0,15
  { label: "Venda de bens / comércio", tipo: "vendas", grupo: G_COM },
  { label: "Restauração e bebidas", tipo: "vendas", grupo: G_COM },
  { label: "Alojamento local / hotelaria", tipo: "vendas", grupo: G_COM },
  { label: "Produção / artesanato", tipo: "vendas", grupo: G_COM },
  // Propriedade intelectual — coeficiente 0,95
  { label: "Direitos de autor (obra própria)", tipo: "diretosAutor", grupo: G_PI },
  { label: "Licenciamento de software / propriedade industrial", tipo: "diretosAutor", grupo: G_PI },
  { label: "Royalties / cedência de marca", tipo: "diretosAutor", grupo: G_PI },
  // Alojamento local e regimes especiais (coeficientes próprios) ─────────
  {
    label: "Alojamento local — estabelecimento (hotelaria)",
    tipo: "vendas",
    grupo: "Alojamento e regimes especiais",
    coef: 0.15,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º, al. a) CIRS",
    nota: "Coeficiente 0,15 (hotelaria). Sem retenção (hóspedes/plataformas). Segurança Social sobre 20% (hotelaria).",
  },
  {
    label: "Alojamento local — moradia / apartamento",
    tipo: "vendas",
    grupo: "Alojamento e regimes especiais",
    coef: 0.35,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º CIRS (alojamento local, moradia/apartamento)",
    nota: "Coeficiente 0,35. Em zona de contenção sobe para 0,50. A eventual isenção de Segurança Social depende de exerceres AL em exclusivo — é condicional, não é aplicada automaticamente. Confirma com o teu contabilista.",
  },
  {
    label: "Alojamento local — moradia em zona de contenção",
    tipo: "vendas",
    grupo: "Alojamento e regimes especiais",
    coef: 0.5,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º, al. h) CIRS",
    nota: "Coeficiente 0,50 (zona de pressão urbanística; exige o anexo 13F). A eventual isenção de Segurança Social depende de exerceres AL em exclusivo — é condicional, não é aplicada automaticamente. Confirma com o teu contabilista.",
  },
  {
    label: "Serviços a sociedade própria (transparência fiscal)",
    tipo: "art151",
    grupo: "Alojamento e regimes especiais",
    coef: 1.0,
    regra15: false,
    legalCoef: "Art. 31.º, al. g) CIRS",
    nota: "Coeficiente 1,0 quando prestas serviços a sociedade onde deténs ≥ 5% por mais de 183 dias.",
  },
  // Subsídios e subvenções (categoria B) — coeficientes próprios ──────────
  {
    label: "Subsídio destinado à exploração",
    tipo: "outros",
    grupo: G_SUB,
    coef: 0.1,
    retencao: 0,
    baseSS: "servicos",
    regra15: false,
    legalCoef: "Art. 31.º, al. f) CIRS",
    nota: "Coeficiente 0,10. Inclui também os restantes rendimentos da categoria B não previstos noutras alíneas. O enquadramento na Segurança Social deve ser confirmado com o teu contabilista.",
  },
  {
    label: "Subsídio não destinado à exploração",
    tipo: "outros",
    grupo: G_SUB,
    coef: 0.3,
    retencao: 0,
    baseSS: "servicos",
    regra15: false,
    legalCoef: "Art. 31.º, al. e) CIRS",
    nota: "Coeficiente 0,30. Tributado em 1/5 no ano de recebimento e em cada um dos quatro anos seguintes. O enquadramento na Segurança Social deve ser confirmado com o teu contabilista.",
  },

  // ── Cessão de equipamentos ──────────────────────────────────────────────
  // Art. 101.º, al. b) CIRS: retenção 16,5%; Art. 31.º, al. d): coef. 0,95
  {
    label: "Cessão de uso de equipamentos",
    tipo: "diretosAutor",
    grupo: "Cessão de equipamentos",
    legalCoef: "Art. 31.º, al. d) CIRS — cessão ou utilização de equipamentos",
    nota: "Cedência temporária de equipamentos a terceiros. Coeficiente 0,95 e retenção de 16,5% (Art. 101.º, al. b) CIRS). Distinto da venda — aplica-se quando cedes o uso, não a propriedade.",
  },
  {
    label: "Aluguer de equipamentos / maquinaria",
    tipo: "diretosAutor",
    grupo: "Cessão de equipamentos",
    legalCoef: "Art. 31.º, al. d) CIRS",
    nota: "Coeficiente 0,95 e retenção 16,5%. Consulta o teu contabilista se a atividade principal for comércio.",
  },

  // ── Atividades agrícolas e rurais ───────────────────────────────────────
  // Art. 31.º CIRS: coeficiente 0,10 para atividades agrícolas, silvícolas e pecuárias
  {
    label: "Atividades agrícolas, silvícolas e pecuárias",
    tipo: "outros",
    grupo: "Atividades agrícolas e rurais",
    coef: 0.1,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º CIRS — atividades agrícolas, silvícolas e pecuárias",
    nota: "Coeficiente 0,10. Sem retenção na fonte. Segurança Social calculada sobre 20% do rendimento (equiparado a venda de bens).",
  },
  {
    label: "Atividades aquícolas, avícolas e apícolas",
    tipo: "outros",
    grupo: "Atividades agrícolas e rurais",
    coef: 0.1,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º CIRS — atividades aquícolas, avícolas, apícolas",
    nota: "Coeficiente 0,10. Sem retenção na fonte. Segurança Social sobre 20%.",
  },
  {
    label: "Produção agrícola (outra atividade rural)",
    tipo: "outros",
    grupo: "Atividades agrícolas e rurais",
    coef: 0.1,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º CIRS",
    nota: "Para atividades rurais não listadas acima. Coeficiente 0,10.",
  },

  // ── Criadores, artistas e media ─────────────────────────────────────────
  // Profissões criativas não incluídas no Art. 151.º: coef. 0,35, retenção 11,5% (Art. 101.º, al. c)
  {
    label: "Fotógrafo / fotógrafa",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS — outras prestações de serviços",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Se cederes os direitos de autor das fotografias, parte dos rendimentos pode enquadrar-se em propriedade intelectual (coef. 0,95, ret. 16,5%).",
  },
  {
    label: "Videógrafo / realizador de vídeo",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Tal como na fotografia, a cedência de direitos de autor pode ter enquadramento distinto.",
  },
  {
    label: "Influencer / criador de conteúdo digital",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c) quando o cliente é uma entidade com contabilidade organizada. Patrocínios e publicidade são rendimentos de serviços.",
  },
  {
    label: "DJ profissional",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Se atuares como artista de espetáculo ao vivo e estiveres no Art. 151.º, a retenção é de 23% — confirma com o teu contabilista.",
  },
  {
    label: "Modelo profissional",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c).",
  },
  {
    label: "Escritor / autor (obra própria)",
    tipo: "diretosAutor",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. d) CIRS — titular originário de obra literária",
    nota: "Coeficiente 0,95 para o criador da obra (titular originário). Retenção de 16,5%. Se cederes apenas os direitos de edição/reprodução, o enquadramento mantém-se em propriedade intelectual.",
  },
  {
    label: "Guionista / redator criativo",
    tipo: "diretosAutor",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. d) CIRS",
    nota: "Coeficiente 0,95 quando o rendimento provém de obra própria (direitos de autor). Se for prestação de serviços de escrita sem transferência de direitos, usar coef. 0,35.",
  },

  // ── Serviços em geral ───────────────────────────────────────────────────
  // Profissões de serviços não incluídas no Art. 151.º: coef. 0,35, ret. 11,5% (Art. 101.º, al. c)
  {
    label: "Personal trainer / instrutor de fitness",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Distinto de 1323 Desportistas (atletas profissionais). Aplicável a treino pessoal, aulas de grupo e similares.",
  },
  {
    label: "Cozinheiro / chef freelance",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35 para prestação de serviços de cozinha. Se explorares estabelecimento de restauração próprio, usa a categoria Restauração e bebidas (coef. 0,15).",
  },
  {
    label: "Consultor de marketing / redes sociais",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Se exerceres com o código 1333 (Publicitários) do Art. 151.º, o coeficiente passa a 0,75 e a retenção a 23%.",
  },
  {
    label: "Técnico de informática / suporte IT",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35 para suporte e manutenção informática. Se desenvolveres software, considera 1332 Programadores informáticos (Art. 151.º, coef. 0,75).",
  },
  {
    label: "Explicador / tutor privado",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Alternativa: código 8010 Explicadores do Art. 151.º (coef. 0,75, ret. 23%) se realizares explicações no sentido tradicional.",
  },
  {
    label: "Esteticista / manicure / pedicure",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Alternativa: código 1325 do Art. 151.º (coef. 0,75, ret. 23%) — confirma com o teu contabilista qual o enquadramento mais favorável.",
  },
  {
    label: "Mediador imobiliário (não certificado IMPIC)",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Mediadores certificados pelo IMPIC podem usar o código 1330 do Art. 151.º (coef. 0,75, ret. 23%).",
  },
  {
    label: "Comercial / vendedor freelance (serviços)",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35 para comissionistas de serviços. Se comissionas vendas de bens pode aplicar-se coef. 0,15 (1319 Comissionistas, Art. 151.º).",
  },
  {
    label: "Prestação de serviços (outra — não Art. 151.º)",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Para serviços não enquadráveis em nenhuma das categorias acima. Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c).",
  },

  // ── Comércio e transportes ──────────────────────────────────────────────
  {
    label: "TVDE — motorista (plataformas Uber, Bolt…)",
    tipo: "vendas",
    grupo: G_COM,
    coef: 0.15,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º, al. a) CIRS — transportes (atividade de TVDE)",
    nota: "Coeficiente 0,15 (transporte de passageiros). Sem retenção (as plataformas não retêm na fonte). Segurança Social sobre 20%.",
  },
  {
    label: "Transporte de mercadorias / estafeta",
    tipo: "vendas",
    grupo: G_COM,
    coef: 0.15,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º, al. a) CIRS — transportes",
    nota: "Coeficiente 0,15. Sem retenção. Segurança Social sobre 20%.",
  },
  {
    label: "Atividade comercial ou industrial (outra)",
    tipo: "vendas",
    grupo: G_COM,
    nota: "Para comércio ou indústria não enquadráveis nas categorias acima. Coeficiente 0,15.",
  },
];

/**
 * Resolve o efeito fiscal efetivo de uma atividade: aplica os overrides do
 * regime especial sobre os valores por defeito do `tipo`. É o "pacote de regras"
 * que cada atividade carrega (coeficiente, retenção, base de SS, regra dos 15%).
 */
export function efeitoFiscal(a: Atividade): EfeitoFiscal {
  return {
    coef: a.coef ?? COEFICIENTE_POR_TIPO[a.tipo],
    retencao: a.retencao ?? RETENCAO[a.tipo].value,
    baseSS: a.baseSS ?? BASE_SS_POR_TIPO[a.tipo],
    regra15: a.regra15 ?? (a.tipo === "art151" || a.tipo === "outros"),
    nota: a.nota,
    legalCoef: a.legalCoef ?? "Art. 31.º CIRS",
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  DEDUÇÕES À COLETA (IRS) — valores 2026
// ═══════════════════════════════════════════════════════════════════════
export const DEDUCAO_DEPENDENTE = sv(600, "Art. 78.º-A CIRS — por dependente com mais de 3 anos", "art78aCirs", TODAY);
export const DEDUCAO_DEPENDENTE_BEBE = sv(726, "Art. 78.º-A CIRS — por dependente até 3 anos", "art78aCirs", TODAY);

/**
 * Dedução adicional por dependente com deficiência ≥ 60% (Art. 87.º CIRS).
 * Base: 2,5 × IAS. Acumula com a dedução base por dependente.
 */
export const DEDUCAO_DEPENDENTE_DEFICIENCIA = sv(
  Math.round(2.5 * IAS.value * 100) / 100,
  "Art. 87.º CIRS — 2,5 × IAS por dependente com grau de incapacidade ≥ 60%",
  "portalFinancasArt87",
  TODAY
);

export interface DeducaoLimitada {
  taxa: number;
  limite: number;
}
export const DEDUCAO_DESP_GERAIS = sv<DeducaoLimitada>(
  { taxa: 0.35, limite: 250 },
  "Art. 78.º-B CIRS — despesas gerais familiares: 35% até 250 €/sujeito",
  "art78aCirs",
  TODAY
);
export const DEDUCAO_SAUDE = sv<DeducaoLimitada>(
  { taxa: 0.15, limite: 1000 },
  "Art. 78.º-C CIRS — saúde: 15% até 1.000 €",
  "art78aCirs",
  TODAY
);
export const DEDUCAO_EDUCACAO = sv<DeducaoLimitada>(
  { taxa: 0.3, limite: 800 },
  "Art. 78.º-D CIRS — educação: 30% até 800 €",
  "art78aCirs",
  TODAY
);

/** Dedução de rendas habitação permanente (Art. 78.º-E CIRS): 15% até 900 € (Lei 36/2024). */
export const DEDUCAO_RENDAS = sv<DeducaoLimitada>(
  { taxa: 0.15, limite: 900 },
  "Art. 78.º-E CIRS — rendas de habitação permanente: 15% até 900 € (Lei 36/2024, rendimentos de 2026)",
  "art78aCirs",
  TODAY,
  "Limite atualizado pela Lei 36/2024: 700 € em 2025, 900 € em 2026, 1.000 € a partir de 2027."
);

/** Dedução majorada por dependente (Art. 78.º-A n.º 6 CIRS).
 *  Na lei: 900 € aplica-se a partir do 2.º dependente com até 6 anos.
 *  No simulador: usado como majoração a partir do 3.º dependente (simplificação
 *  conservadora — a UI não recolhe a faixa etária 3–6 anos). */
export const DEDUCAO_DEPENDENTE_3MAIS = sv(
  900,
  "Art. 78.º-A n.º 6 CIRS — 2.º dependente e seguintes até 6 anos (900 €)",
  "art78aCirs",
  TODAY,
  "Na lei: 900 € por dependente a partir do 2.º, até 6 anos. O simulador aplica-a a partir do 3.º (simplificação conservadora — não recolhe faixa 3–6 anos)."
);

/** Divisor do rendimento na tributação conjunta dos casados/unidos de facto. */
export const QUOCIENTE_CONJUGAL = sv(2, "Art. 69.º CIRS — quociente conjugal (divisão por 2)", "art78aCirs", TODAY);

/** Limite global das deduções à coleta (Art. 78.º, n.º 7), escalonado. */
export const LIMITE_GLOBAL_DEDUCOES = sv(
  { semLimiteAte: 8342, limiteAlto: 2500, limiteBaixo: 1000, escalaoSuperior: 80000 },
  "Art. 78.º, n.º 7 CIRS — sem limite até 8.342 € (1.º escalão Art. 68.º 2026); entre 1.000 € e 2.500 € até 80.000 € (Art. 68.º-A); 1.000 € acima",
  "art78aCirs",
  TODAY,
  "semLimiteAte = 1.º escalão Art. 68.º (8.342 € em 2026); escalaoSuperior = 1.º escalão Art. 68.º-A (80.000 €, fixo)."
);

// ═══════════════════════════════════════════════════════════════════════
//  TRIBUTAÇÃO AUTÓNOMA — IRC (Art. 88.º CIRC)
//  ---------------------------------------------------------------------
//  Incide sobre encargos anuais de viaturas e determinadas despesas,
//  independentemente do IRC regular. O custo de aquisição da viatura
//  determina o escalão (não o encargo em si).
//  Thresholds corrigidos pelo OE2025 (€37 500 e €45 000); PHEV criado
//  pelo OE2026 para viaturas Euro 6e-bis com < 80 g CO₂/km.
// ═══════════════════════════════════════════════════════════════════════

/** Limiares do custo de aquisição que determinam o escalão de TA de viaturas. */
export const TA_THRESHOLDS = sv(
  { t1: 37500, t2: 45000 },
  "Art. 88.º, n.os 3 e 11 CIRC — limiares do custo de aquisição (OE2025)",
  "occTA",
  TODAY,
  "Thresholds anteriores (até 2024): €27 500 e €35 000. Atualizados pelo OE2025."
);

export interface TAViaturasTaxas {
  /** Encargos de viatura com custo de aquisição ≤ t1. */
  ate37500: number;
  /** Encargos de viatura com custo de aquisição > t1 e ≤ t2. */
  ate45000: number;
  /** Encargos de viatura com custo de aquisição > t2. */
  acima45000: number;
}

export const TA_VIATURAS_COMBUSTAO = sv<TAViaturasTaxas>(
  { ate37500: 0.08, ate45000: 0.25, acima45000: 0.32 },
  "Art. 88.º, n.º 3 CIRC — viaturas ligeiras de passageiros a gasóleo/gasolina (OE2025)",
  "occTA",
  TODAY,
  "Taxas anteriores (até 2024): 10% / 17,5% / 35%. Substituídas pelo OE2025."
);

export const TA_VIATURAS_PHEV = sv<TAViaturasTaxas>(
  { ate37500: 0.025, ate45000: 0.075, acima45000: 0.15 },
  "Art. 88.º, n.º 11 CIRC — viaturas PHEV (Euro 6e-bis, < 80 g CO₂/km) — OE2026",
  "occTA",
  TODAY,
  "Nova categoria OE2026 para híbridos plug-in conformes Euro 6e-bis. Threshold = custo de aquisição."
);

export const TA_VIATURAS_ELETRICA = sv(
  0,
  "Art. 88.º CIRC — viaturas 100% elétricas: taxa zero",
  "occTA",
  TODAY
);

/** Despesas de representação (n.º 7 do Art. 88.º). */
export const TA_REPRESENTACAO = sv(
  0.10,
  "Art. 88.º, n.º 7 CIRC — despesas de representação: 10%",
  "occTA",
  TODAY
);

/** Ajudas de custo e quilómetros em viatura própria (n.º 9 do Art. 88.º). */
export const TA_AJUDAS_CUSTO = sv(
  0.05,
  "Art. 88.º, n.º 9 CIRC — ajudas de custo e quilómetros em viatura própria: 5%",
  "occTA",
  TODAY
);

/** Despesas não documentadas (n.º 1 do Art. 88.º). */
export const TA_NAO_DOCUMENTADAS = sv(
  0.50,
  "Art. 88.º, n.º 1 CIRC — despesas não documentadas: 50%",
  "occTA",
  TODAY
);

/**
 * Agravamento de +10 p.p. quando há prejuízo fiscal (n.º 14 do Art. 88.º).
 * Não se aplica nos primeiros 3 anos de atividade nem se houve lucro em
 * pelo menos 1 dos 3 exercícios anteriores.
 */
export const TA_AGRAVAMENTO_PREJUIZO = sv(
  0.10,
  "Art. 88.º, n.º 14 CIRC — agravamento de 10 p.p. em caso de prejuízo fiscal",
  "occTA",
  TODAY,
  "Exceção: não se aplica nos primeiros 3 anos ou se houve lucro em ≥1 dos 3 exercícios anteriores."
);

// ═══════════════════════════════════════════════════════════════════════
//  RFAI — Regime Fiscal de Apoio ao Investimento (Art. 22.º–26.º CFI)
//  Verificado: estrategor.pt Jan 2026; santander.pt Abr 2026; OCC Jan 2026.
// ═══════════════════════════════════════════════════════════════════════

export const RFAI_TAXA_INTERIOR = sv(
  0.30,
  "Art. 23.º CFI — 30% do investimento elegível nas regiões Norte, Centro, Alentejo, Açores e Madeira (até €15 M)",
  "cfi",
  TODAY
);

export const RFAI_TAXA_INTERIOR_EXCEDENTE = sv(
  0.10,
  "Art. 23.º CFI — 10% sobre a parcela do investimento que exceda €15 M nas regiões interiores",
  "cfi",
  TODAY
);

export const RFAI_TAXA_LITORAL = sv(
  0.10,
  "Art. 23.º CFI — 10% do investimento elegível nas regiões de Lisboa e Algarve",
  "cfi",
  TODAY
);

export const RFAI_LIMITE_INVESTIMENTO_INTERIOR = sv(
  15_000_000,
  "Art. 23.º CFI — limiar de €15 000 000 para aplicação da taxa de 30%",
  "occRFAI",
  TODAY
);

/**
 * Limite máximo de dedução à coleta: 50% da coleta IRC no período.
 * Nos primeiros 3 anos de atividade elegível, o limite é 100%.
 */
export const RFAI_LIMITE_COLETA = sv(
  0.50,
  "Art. 24.º CFI — dedução limitada a 50% da coleta IRC (100% nos primeiros 3 anos)",
  "occRFAI",
  TODAY
);

/** Exercícios seguintes em que o saldo não deduzido pode ser reportado. */
export const RFAI_REPORTE_ANOS = sv(
  10,
  "Art. 24.º CFI — saldo não deduzido reportável por 10 exercícios seguintes",
  "occRFAI",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  DLRR — Dedução por Lucros Retidos e Reinvestidos (Art. 27.º–34.º CFI)
//  Apenas para PME e Small Mid Cap (≤ 3 000 trabalhadores).
// ═══════════════════════════════════════════════════════════════════════

export const DLRR_TAXA = sv(
  0.10,
  "Art. 29.º CFI — dedução de 10% dos lucros retidos e reinvestidos em ativos elegíveis",
  "occDLRR",
  TODAY
);

export const DLRR_LIMITE_LUCROS = sv(
  5_000_000,
  "Art. 29.º CFI — lucros elegíveis limitados a €5 000 000 por período de tributação",
  "occDLRR",
  TODAY
);

export const DLRR_LIMITE_COLETA = sv(
  0.25,
  "Art. 30.º CFI — dedução limitada a 25% da coleta IRC",
  "occDLRR",
  TODAY
);

export const DLRR_REPORTE_ANOS = sv(
  12,
  "Art. 30.º CFI — saldo não utilizado reportável por 12 exercícios seguintes",
  "occDLRR",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  SIFIDE II — Sistema de Incentivos Fiscais à I&D (Art. 35.º–42.º CFI)
// ═══════════════════════════════════════════════════════════════════════

export const SIFIDE_TAXA_BASE = sv(
  0.325,
  "Art. 36.º CFI — taxa base de 32,5% das despesas com I&D do período",
  "occSIFIDE",
  TODAY
);

export const SIFIDE_TAXA_INCREMENTAL = sv(
  0.50,
  "Art. 36.º CFI — taxa incremental de 50% do aumento de despesas I&D face à média dos 2 anos anteriores",
  "occSIFIDE",
  TODAY
);

/** Montante máximo do incremento elegível para a taxa incremental. */
export const SIFIDE_TETO_INCREMENTAL = sv(
  1_500_000,
  "Art. 36.º CFI — incremento de despesas I&D elegível limitado a €1 500 000",
  "occSIFIDE",
  TODAY
);

/**
 * Majoração adicional para PME que não completaram 2 exercícios e não
 * beneficiaram anteriormente da taxa incremental. Taxa efetiva: 47,5%.
 */
export const SIFIDE_MAJORACAO_PME_JOVEM = sv(
  0.15,
  "Art. 36.º CFI — majoração de 15% para PME < 2 exercícios sem histórico incremental (taxa efetiva 47,5%)",
  "occSIFIDE",
  TODAY
);

export const SIFIDE_REPORTE_ANOS = sv(
  12,
  "Art. 37.º CFI — crédito não deduzido por insuficiência de coleta reportável por 12 exercícios",
  "occSIFIDE",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  IFICI — Incentivo Fiscal à Investigação Científica e Inovação
//  (ex-NHR — Residente Não Habitual). Regime em vigor desde OE2024.
// ═══════════════════════════════════════════════════════════════════════

export const IFICI_TAXA = sv(
  0.20,
  "Art. 58.º-A EBF — IFICI: taxa flat de 20% sobre rendimentos elegíveis (Lei 82/2023/OE2024)",
  "occIFICI",
  TODAY,
  "Substitui o NHR desde 1 jan 2024. Válido por 10 exercícios consecutivos não renováveis. Elegível: investigadores, professores, I&D, startups tecnológicas e atividades de elevado valor acrescentado aprovadas pela AT."
);

export const IFICI_PRAZO_ANOS = sv(
  10,
  "Art. 58.º-A EBF — prazo máximo de 10 exercícios consecutivos",
  "occIFICI",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  DEDUÇÕES POR DEFICIÊNCIA (Art. 87.º CIRS)
//  Grau de incapacidade permanente ≥ 60% comprovado por atestado médico.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Art. 56.º-A CIRS — Exclusão parcial de rendimentos de trabalho/atividade
 * de sujeitos com deficiência ≥ 60%: 15% dos rendimentos Cat. B até €2 500.
 * Reduz o rendimento TRIBUTÁVEL (antes de calcular coleta).
 */
export const EXCLUSAO_DEFICIENCIA_TAXA = sv(
  0.15,
  "Art. 56.º-A CIRS — exclusão de 15% dos rendimentos Cat. B de pessoas com deficiência ≥ 60%",
  "art56aCirs",
  TODAY
);
export const EXCLUSAO_DEFICIENCIA_MAX = sv(
  2_500,
  "Art. 56.º-A CIRS — exclusão máxima de €2 500 por categoria de rendimento",
  "art56aCirs",
  TODAY
);

/**
 * Art. 87.º CIRS — Dedução ADICIONAL à coleta por deficiência ≥ 60%:
 * 4 × IAS por sujeito passivo. Acumula com a exclusão Art. 56.º-A.
 */
export const DEDUCAO_DEFICIENCIA_COLETA = sv(
  Math.round(4 * IAS.value * 100) / 100,
  "Art. 87.º CIRS — dedução à coleta de 4 × IAS por sujeito passivo com grau ≥ 60%",
  "portalFinancasArt87",
  TODAY,
  "Valor 2026: 4 × €537,13 = €2 148,52. Acumula com a exclusão Art. 56.º-A."
);

/** Grau mínimo de incapacidade permanente (comprovado por atestado médico). */
export const DEDUCAO_DEFICIENCIA_GRAU_MINIMO = sv(
  60,
  "Art. 56.º-A / 87.º CIRS — grau mínimo de incapacidade permanente de 60%",
  "portalFinancasArt87",
  TODAY
);

/** Contribuição mínima mensal de SS para trabalhadores independentes. */
export const SS_MIN_MENSAL = sv(
  20,
  "Art. 168.º Código Contributivo — contribuição mínima mensal",
  "segSocialGov",
  TODAY
);

// Valores derivados (calculados, nunca digitados à mão) ──────────────────
export const IAS_VALUE = IAS.value;
export const SS_BASE_MAX_MENSAL_CALC = 12 * IAS_VALUE; // deve igualar SS_BASE_MAX_MENSAL.value
export const IRS_JOVEM_TETO_CALC = IRS_JOVEM.tetoIAS.value * IAS_VALUE; // 55 × IAS

// ═══════════════════════════════════════════════════════════════════════
//  SISTEMA DE GARANTIA — invariantes verificados ao carregar o módulo.
//  Se algo for inconsistente, LANÇA e o build/dev falha imediatamente.
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
//  TRABALHO DEPENDENTE (CATEGORIA A) — vencimento, retenção IRS, SS
//  ---------------------------------------------------------------------
//  Etapa 1 da unificação com trabalhadores por conta de outrem.
//  Tabelas de retenção CROSS-VERIFICADAS contra duas referências
//  independentes (Montepio + CRN Contabilidade) que reproduzem o
//  Despacho 233-A/2026. Para já só a Tabela I (não casado / casado dois
//  titulares, Continente); restantes tabelas/regiões na Etapa seguinte.
// ═══════════════════════════════════════════════════════════════════════

const DEP_TODAY = "2026-06-17";

/** Taxas de contribuição para a Segurança Social — trabalho por conta de outrem. */
export const SS_DEPENDENTE = {
  trabalhador: sv(
    0.11,
    "Taxa contributiva do trabalhador por conta de outrem (11% sobre a remuneração ilíquida)",
    "segSocialGov",
    DEP_TODAY
  ),
  entidade: sv(
    0.2375,
    "Taxa Social Única da entidade empregadora (regime geral)",
    "segSocialGov",
    DEP_TODAY
  ),
  ipss: sv(
    0.223,
    "TSU da entidade — IPSS / entidades sem fins lucrativos",
    "segSocialGov",
    DEP_TODAY
  ),
};

/** Subsídio de refeição — limites diários de isenção (IRS + SS), setor privado 2026. */
export const SUBSIDIO_REFEICAO = {
  dinheiro: sv(
    6.15,
    "Limite diário isento em numerário (Art. 2.º, n.º 3 CIRS)",
    "subsidioRefeicao2026",
    DEP_TODAY
  ),
  cartao: sv(
    10.46,
    "Limite diário isento em cartão/vale de refeição (Art. 2.º, n.º 3 CIRS)",
    "subsidioRefeicao2026",
    DEP_TODAY,
    "Subiu de 6,00€/10,20€ (2025) para 6,15€/10,46€ (2026)."
  ),
};

/** Remuneração mensal até este valor: isenta de retenção na fonte (acompanha o SMN). */
export const RETENCAO_DEP_ISENCAO = sv(
  920,
  "Limiar de isenção de retenção na fonte 2026 (Despacho 233-A/2026)",
  "despachoRetencao2026",
  DEP_TODAY
);

/** Parcela adicional a abater por dependente (Tabela I, Continente 2026). */
export const RETENCAO_DEP_POR_DEPENDENTE = sv(
  21.43,
  "Parcela adicional a abater por dependente (Tabela I, Continente)",
  "despachoRetencao2026",
  DEP_TODAY
);

/**
 * Escalão de uma tabela de retenção na fonte. A `parcelaAbater`:
 *  · `number` → valor fixo em euros;
 *  · `{ coef, base }` → fórmula do mínimo de existência: `taxa × coef × (base − R)`.
 */
export type EscalaoRetencao = {
  /** Limite superior da remuneração mensal (Infinity no último escalão). */
  ate: number;
  /** Taxa marginal máxima. */
  taxa: number;
  parcelaAbater: number | { coef: number; base: number };
};

/**
 * Tabela I de retenção na fonte — Continente 2026, Não casado / Casado dois
 * titulares. Fonte: Despacho 233-A/2026. Valores cross-verificados em duas
 * referências independentes (Montepio + CRN Contabilidade). O Excel oficial
 * da AT não foi diferenciado por máquina (REST anónimo do SharePoint indisp.).
 */
export const RETENCAO_DEP_CONTINENTE_T1 = sv<EscalaoRetencao[]>(
  [
    { ate: 920, taxa: 0, parcelaAbater: 0 },
    { ate: 1042, taxa: 0.125, parcelaAbater: { coef: 2.6, base: 1273.85 } },
    { ate: 1108, taxa: 0.157, parcelaAbater: { coef: 1.35, base: 1554.83 } },
    { ate: 1154, taxa: 0.157, parcelaAbater: 94.71 },
    { ate: 1212, taxa: 0.212, parcelaAbater: 158.18 },
    { ate: 1819, taxa: 0.241, parcelaAbater: 193.33 },
    { ate: 2119, taxa: 0.311, parcelaAbater: 320.66 },
    { ate: 2499, taxa: 0.349, parcelaAbater: 401.19 },
    { ate: 3305, taxa: 0.3836, parcelaAbater: 487.66 },
    { ate: 5547, taxa: 0.3969, parcelaAbater: 531.62 },
    { ate: 20221, taxa: 0.4495, parcelaAbater: 893.75 },
    { ate: Infinity, taxa: 0.4717, parcelaAbater: 1272.31 },
  ],
  "Despacho n.º 233-A/2026 — Tabela I, Continente (trabalho dependente)",
  "despachoRetencao2026",
  DEP_TODAY,
  "Cross-verificado em Montepio + CRN Contabilidade (reproduzem o Despacho 233-A/2026)."
);

export function assertFiscalDataIntegrity(): void {
  const erros: string[] = [];
  const EPS = 0.01;

  const isRate = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
  const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

  // 1) Coerência do IAS com valores derivados.
  if (Math.abs(SS_BASE_MAX_MENSAL_CALC - SS_BASE_MAX_MENSAL.value) > EPS) {
    erros.push(
      `Teto SS (12×IAS=${SS_BASE_MAX_MENSAL_CALC.toFixed(2)}) ≠ SS_BASE_MAX_MENSAL (${SS_BASE_MAX_MENSAL.value}).`
    );
  }
  if (Math.abs(IRS_JOVEM_TETO_CALC - IRS_JOVEM.tetoIAS.value * IAS_VALUE) > EPS) {
    erros.push("Teto do IRS Jovem inconsistente com 55×IAS.");
  }

  // 2) Excesso de IVA = 125% do limite de isenção.
  if (Math.abs(IVA_ISENCAO_EXCESSO.value - IVA_ISENCAO_LIMITE.value * 1.25) > EPS) {
    erros.push("Limiar de excesso de IVA não corresponde a 125% do limite de isenção.");
  }

  // 3) Todas as taxas no intervalo [0, 1].
  (Object.keys(RETENCAO) as TipoAtividade[]).forEach((k) => {
    if (!isRate(RETENCAO[k].value)) erros.push(`Taxa de retenção inválida: ${k}.`);
  });
  if (!isRate(SS_TAXA.value)) erros.push("Taxa de SS inválida.");
  (Object.keys(SS_COEFICIENTE) as BaseSS[]).forEach((k) => {
    if (!isRate(SS_COEFICIENTE[k].value)) erros.push(`Coeficiente SS inválido: ${k}.`);
  });
  (Object.keys(IVA_TAXAS) as Regiao[]).forEach((r) => {
    const t = IVA_TAXAS[r].value;
    (["reduzida", "intermedia", "normal"] as EscalaoIVA[]).forEach((e) => {
      if (!isRate(t[e])) erros.push(`Taxa de IVA inválida: ${r}/${e}.`);
    });
    if (!(t.reduzida < t.intermedia && t.intermedia < t.normal)) {
      erros.push(`Ordem das taxas de IVA incorreta em ${r} (reduzida<intermédia<normal).`);
    }
  });

  // 4) IRS Jovem: anos 1..10 com percentagens válidas e não crescentes.
  const escala = IRS_JOVEM.isencaoPorAno.value;
  let anterior = Infinity;
  for (let ano = 1; ano <= 10; ano++) {
    const v = escala[ano];
    if (v === undefined || !isRate(v)) {
      erros.push(`IRS Jovem: percentagem do ano ${ano} inválida ou em falta.`);
      continue;
    }
    if (v > anterior + EPS) erros.push(`IRS Jovem: isenção do ano ${ano} maior que a do ano anterior.`);
    anterior = v;
  }

  // 4b) Escalões de IRS: limites e taxas estritamente crescentes em [0,1].
  //     (Esta verificação rejeita tabelas inconsistentes — ex.: 2.º escalão
  //      com taxa inferior ao 1.º.)
  const escaloes = ESCALOES_IRS.value;
  let limiteAnterior = 0;
  let taxaAnterior = -1;
  escaloes.forEach((e, idx) => {
    const ultimo = idx === escaloes.length - 1;
    if (!isRate(e.taxa)) erros.push(`Escalão IRS ${idx + 1}: taxa inválida.`);
    if (e.taxa <= taxaAnterior) erros.push(`Escalão IRS ${idx + 1}: taxa não é crescente.`);
    taxaAnterior = e.taxa;
    if (ultimo) {
      if (e.ate !== null) erros.push("Último escalão de IRS deve ter limite null.");
    } else {
      if (e.ate === null || e.ate <= limiteAnterior) {
        erros.push(`Escalão IRS ${idx + 1}: limite superior não é crescente.`);
      } else {
        limiteAnterior = e.ate;
      }
    }
  });
  if (!(DEDUCAO_ESPECIFICA_CATB.value > 0)) erros.push("Dedução específica não positiva.");
  const deducaoEsperada =
    Math.round(Math.max(DEDUCAO_ESPECIFICA_FLOOR, DEDUCAO_ESPECIFICA_IAS_MULT * IAS.value) * 100) / 100;
  if (Math.abs(DEDUCAO_ESPECIFICA_CATB.value - deducaoEsperada) > EPS) {
    erros.push("Dedução específica não corresponde a máx(piso; 8,54 × IAS).");
  }
  if (!isRate(REGIME_15PCT.value)) erros.push("Limiar dos 15% inválido.");
  if (!(MINIMO_EXISTENCIA.value > 0)) erros.push("Mínimo de existência não positivo.");

  // IRC e dividendos.
  [IRC_TAXA_GERAL, IRC_TAXA_PME, DERRAMA_MAX, DIVIDENDOS_TAXA].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Taxa inválida: ${p.legalBasis}.`);
  });
  if (!(IRC_TAXA_PME.value < IRC_TAXA_GERAL.value)) {
    erros.push("Taxa PME de IRC deveria ser inferior à geral.");
  }
  if (!(IRC_LIMITE_PME.value > 0)) erros.push("Limiar PME de IRC não positivo.");

  // Tributação Autónoma.
  if (!(TA_THRESHOLDS.value.t1 > 0 && TA_THRESHOLDS.value.t2 > TA_THRESHOLDS.value.t1)) {
    erros.push("Thresholds de TA inválidos ou não crescentes.");
  }
  [TA_VIATURAS_COMBUSTAO, TA_VIATURAS_PHEV].forEach((p) => {
    const t = p.value;
    if (!(t.ate37500 >= 0 && t.ate45000 > t.ate37500 && t.acima45000 > t.ate45000)) {
      erros.push(`Taxas de TA de viaturas não crescentes: ${p.legalBasis}.`);
    }
    if (!isRate(t.ate37500) || !isRate(t.ate45000) || !isRate(t.acima45000)) {
      erros.push(`Taxas de TA de viaturas fora de [0,1]: ${p.legalBasis}.`);
    }
  });
  if (!isRate(TA_VIATURAS_ELETRICA.value)) erros.push("Taxa TA elétrica inválida.");
  if (TA_VIATURAS_ELETRICA.value !== 0) erros.push("Taxa TA elétrica deveria ser 0.");
  [TA_REPRESENTACAO, TA_AJUDAS_CUSTO, TA_NAO_DOCUMENTADAS, TA_AGRAVAMENTO_PREJUIZO].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Taxa de TA inválida: ${p.legalBasis}.`);
  });

  // RFAI.
  [RFAI_TAXA_INTERIOR, RFAI_TAXA_INTERIOR_EXCEDENTE, RFAI_TAXA_LITORAL, RFAI_LIMITE_COLETA].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Parâmetro RFAI inválido: ${p.legalBasis}.`);
  });
  if (!(RFAI_TAXA_INTERIOR.value > RFAI_TAXA_INTERIOR_EXCEDENTE.value)) {
    erros.push("Taxa RFAI interior deveria ser superior à taxa do excedente.");
  }
  if (!(RFAI_LIMITE_INVESTIMENTO_INTERIOR.value > 0)) erros.push("Limite de investimento RFAI não positivo.");
  if (!(RFAI_REPORTE_ANOS.value > 0)) erros.push("Anos de reporte RFAI não positivos.");

  // DLRR.
  [DLRR_TAXA, DLRR_LIMITE_COLETA].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Parâmetro DLRR inválido: ${p.legalBasis}.`);
  });
  if (!(DLRR_LIMITE_LUCROS.value > 0)) erros.push("Limite de lucros DLRR não positivo.");
  if (!(DLRR_REPORTE_ANOS.value > 0)) erros.push("Anos de reporte DLRR não positivos.");

  // SIFIDE II.
  [SIFIDE_TAXA_BASE, SIFIDE_TAXA_INCREMENTAL, SIFIDE_MAJORACAO_PME_JOVEM].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Taxa SIFIDE inválida: ${p.legalBasis}.`);
  });
  if (!(SIFIDE_TETO_INCREMENTAL.value > 0)) erros.push("Teto incremental SIFIDE não positivo.");
  if (!(SIFIDE_REPORTE_ANOS.value > 0)) erros.push("Anos de reporte SIFIDE não positivos.");
  if (!(SIFIDE_TAXA_BASE.value + SIFIDE_MAJORACAO_PME_JOVEM.value < 1)) {
    erros.push("Soma taxa base SIFIDE + majoração PME jovem deveria ser < 1.");
  }

  // IFICI.
  if (!isRate(IFICI_TAXA.value)) erros.push("Taxa IFICI inválida.");
  if (!(IFICI_PRAZO_ANOS.value > 0)) erros.push("Prazo IFICI não positivo.");

  // Deficiência (Art. 56.º-A + 87.º CIRS).
  if (!isRate(EXCLUSAO_DEFICIENCIA_TAXA.value)) erros.push("Taxa exclusão deficiência Art. 56.º-A inválida.");
  if (!(EXCLUSAO_DEFICIENCIA_MAX.value > 0)) erros.push("Máx exclusão deficiência Art. 56.º-A não positivo.");
  if (!(DEDUCAO_DEFICIENCIA_COLETA.value > 0)) erros.push("Dedução coleta deficiência Art. 87.º não positiva.");
  if (Math.abs(DEDUCAO_DEFICIENCIA_COLETA.value - Math.round(4 * IAS.value * 100) / 100) > EPS) {
    erros.push("Dedução coleta deficiência não corresponde a 4 × IAS.");
  }
  if (!(DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value > 0 && DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value < 100)) {
    erros.push("Grau mínimo de deficiência deve estar entre 0 e 100.");
  }
  if (!(DEDUCAO_DEPENDENTE_DEFICIENCIA.value > 0)) erros.push("Dedução dependente deficiência não positiva.");
  if (Math.abs(DEDUCAO_DEPENDENTE_DEFICIENCIA.value - Math.round(2.5 * IAS.value * 100) / 100) > EPS) {
    erros.push("Dedução dependente deficiência não corresponde a 2,5 × IAS.");
  }
  if (!isRate(DEDUCAO_RENDAS.value.taxa)) erros.push("Taxa dedução rendas inválida.");
  if (!(DEDUCAO_RENDAS.value.limite > 0)) erros.push("Limite dedução rendas não positivo.");
  if (!(SS_MIN_MENSAL.value > 0)) erros.push("SS mínimo mensal não positivo.");

  // Dedução majorada (2.º+ dependente até 6 anos / simplificação 3.º+).
  if (!(DEDUCAO_DEPENDENTE_3MAIS.value >= DEDUCAO_DEPENDENTE.value)) {
    erros.push("Dedução majorada por dependente deveria ser ≥ à dedução base.");
  }

  // Coeficientes do regime simplificado e atividades.
  [
    REGIME_SIMPLIFICADO.coefVendas,
    REGIME_SIMPLIFICADO.coefPropIntelectual,
    REGIME_SIMPLIFICADO.coefAlojamentoMoradia,
    REGIME_SIMPLIFICADO.coefAlojamentoContencao,
    REGIME_SIMPLIFICADO.coefTransparencia,
    REGIME_SIMPLIFICADO.coefSubsidiosNaoExploracao,
    REGIME_SIMPLIFICADO.coefSubsidiosExploracao,
  ].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Coeficiente inválido: ${p.legalBasis}.`);
  });

  // Categoria F: taxas e reduções em [0,1]; taxa reduzida nunca negativa.
  if (!isRate(CATEGORIA_F.taxaHabitacao.value)) erros.push("Taxa de cat. F (habitação) inválida.");
  if (!isRate(CATEGORIA_F.taxaNaoHabitacao.value)) erros.push("Taxa de cat. F (não habitação) inválida.");
  (Object.keys(CATEGORIA_F.reducaoDuracao.value) as DuracaoArrendamento[]).forEach((k) => {
    const red = CATEGORIA_F.reducaoDuracao.value[k];
    if (!isRate(red)) erros.push(`Redução de cat. F inválida: ${k}.`);
    if (CATEGORIA_F.taxaHabitacao.value - red < -EPS) {
      erros.push(`Redução de cat. F (${k}) maior que a taxa base — taxa efetiva negativa.`);
    }
  });
  Object.values(REDUCAO_COEFICIENTE_ANO.value).forEach((v) => {
    if (!isRate(v)) erros.push("Redução de coeficiente por ano de atividade inválida.");
  });
  ATIVIDADES.forEach((a) => {
    if (!a.label || !(a.tipo in RETENCAO)) erros.push(`Atividade inválida: ${a.label}.`);
    if (a.coef !== undefined && !isRate(a.coef)) erros.push(`Coeficiente da atividade inválido: ${a.label}.`);
    if (a.retencao !== undefined && !isRate(a.retencao)) erros.push(`Retenção da atividade inválida: ${a.label}.`);
  });

  // Deduções à coleta.
  if (!(DEDUCAO_DEPENDENTE.value > 0)) erros.push("Dedução por dependente não positiva.");
  if (DEDUCAO_DEPENDENTE_BEBE.value < DEDUCAO_DEPENDENTE.value) {
    erros.push("Dedução do dependente até 3 anos deveria ser ≥ à do dependente normal.");
  }
  [DEDUCAO_DESP_GERAIS, DEDUCAO_SAUDE, DEDUCAO_EDUCACAO].forEach((p) => {
    if (!isRate(p.value.taxa)) erros.push(`Taxa de dedução inválida: ${p.legalBasis}.`);
    if (!(p.value.limite > 0)) erros.push(`Limite de dedução não positivo: ${p.legalBasis}.`);
  });
  if (QUOCIENTE_CONJUGAL.value !== 2) erros.push("Quociente conjugal deveria ser 2.");
  {
    const g = LIMITE_GLOBAL_DEDUCOES.value;
    if (!(g.semLimiteAte < g.escalaoSuperior) || !(g.limiteBaixo < g.limiteAlto)) {
      erros.push("Limite global das deduções inconsistente.");
    }
  }

  // 5) Limites positivos.
  [DISPENSA_RETENCAO_LIMITE, IVA_ISENCAO_LIMITE, IVA_ISENCAO_EXCESSO, REGIME_SIMPLIFICADO.limite].forEach(
    (p) => {
      if (!(p.value > 0)) erros.push(`Limite não positivo: ${p.legalBasis}.`);
    }
  );

  // 5b) Trabalho dependente (Categoria A).
  if (!isRate(SS_DEPENDENTE.trabalhador.value)) erros.push("Taxa SS trabalhador (cat. A) inválida.");
  if (!isRate(SS_DEPENDENTE.entidade.value)) erros.push("Taxa SS entidade/TSU (cat. A) inválida.");
  if (!isRate(SS_DEPENDENTE.ipss.value)) erros.push("Taxa SS IPSS (cat. A) inválida.");
  if (!(SS_DEPENDENTE.trabalhador.value < SS_DEPENDENTE.entidade.value)) {
    erros.push("TSU da entidade deveria exceder a taxa do trabalhador.");
  }
  if (!(SUBSIDIO_REFEICAO.dinheiro.value > 0 && SUBSIDIO_REFEICAO.cartao.value > SUBSIDIO_REFEICAO.dinheiro.value)) {
    erros.push("Limites do subsídio de refeição inválidos (cartão deve exceder dinheiro).");
  }
  if (!(RETENCAO_DEP_ISENCAO.value > 0)) erros.push("Limiar de isenção de retenção (cat. A) não positivo.");
  if (!(RETENCAO_DEP_POR_DEPENDENTE.value > 0)) erros.push("Parcela por dependente (cat. A) não positiva.");
  {
    const t = RETENCAO_DEP_CONTINENTE_T1.value;
    let ateAnt = -1;
    let taxaAnt = -1;
    t.forEach((e, i) => {
      if (!isRate(e.taxa)) erros.push(`Retenção cat. A escalão ${i + 1}: taxa fora de [0,1].`);
      if (e.taxa < taxaAnt - EPS) erros.push(`Retenção cat. A escalão ${i + 1}: taxa decrescente.`);
      taxaAnt = e.taxa;
      if (!(e.ate > ateAnt)) erros.push(`Retenção cat. A escalão ${i + 1}: limite não crescente.`);
      ateAnt = e.ate;
    });
    if (t[t.length - 1].ate !== Infinity) erros.push("Último escalão de retenção cat. A deve ser Infinity.");
  }

  // 6) Proveniência obrigatória: fonte registada + data válida em cada parâmetro.
  const sourced: Sourced<unknown>[] = [
    IAS,
    SS_DEPENDENTE.trabalhador, SS_DEPENDENTE.entidade, SS_DEPENDENTE.ipss,
    SUBSIDIO_REFEICAO.dinheiro, SUBSIDIO_REFEICAO.cartao,
    RETENCAO_DEP_ISENCAO, RETENCAO_DEP_POR_DEPENDENTE, RETENCAO_DEP_CONTINENTE_T1,
    ...Object.values(RETENCAO),
    DISPENSA_RETENCAO_LIMITE,
    IVA_ISENCAO_LIMITE,
    IVA_ISENCAO_EXCESSO,
    ...Object.values(IVA_TAXAS),
    SS_TAXA,
    ...Object.values(SS_COEFICIENTE),
    SS_BASE_MAX_MENSAL,
    SS_ISENCAO_PRIMEIRO_ANO_MESES,
    REGIME_SIMPLIFICADO.limite,
    REGIME_SIMPLIFICADO.coefServicos151,
    REGIME_SIMPLIFICADO.coefOutrosServicos,
    IRS_JOVEM.idadeMax,
    IRS_JOVEM.tetoIAS,
    IRS_JOVEM.isencaoPorAno,
    ESCALOES_IRS,
    DEDUCAO_ESPECIFICA_CATB,
    REGIME_15PCT,
    MINIMO_EXISTENCIA,
    IRC_TAXA_GERAL,
    IRC_TAXA_PME,
    IRC_LIMITE_PME,
    DERRAMA_MAX,
    DIVIDENDOS_TAXA,
    REGIME_SIMPLIFICADO.coefVendas,
    REGIME_SIMPLIFICADO.coefPropIntelectual,
    REGIME_SIMPLIFICADO.coefAlojamentoMoradia,
    REGIME_SIMPLIFICADO.coefAlojamentoContencao,
    REGIME_SIMPLIFICADO.coefTransparencia,
    REGIME_SIMPLIFICADO.coefSubsidiosNaoExploracao,
    REGIME_SIMPLIFICADO.coefSubsidiosExploracao,
    CATEGORIA_F.taxaHabitacao,
    CATEGORIA_F.taxaNaoHabitacao,
    CATEGORIA_F.reducaoDuracao,
    REDUCAO_COEFICIENTE_ANO,
    DEDUCAO_DEPENDENTE,
    DEDUCAO_DEPENDENTE_BEBE,
    DEDUCAO_DEPENDENTE_3MAIS,
    DEDUCAO_DEPENDENTE_DEFICIENCIA,
    DEDUCAO_DESP_GERAIS,
    DEDUCAO_SAUDE,
    DEDUCAO_EDUCACAO,
    DEDUCAO_RENDAS,
    QUOCIENTE_CONJUGAL,
    LIMITE_GLOBAL_DEDUCOES,
    // Deficiência (Art. 56.º-A + Art. 87.º)
    EXCLUSAO_DEFICIENCIA_TAXA,
    EXCLUSAO_DEFICIENCIA_MAX,
    DEDUCAO_DEFICIENCIA_COLETA,
    DEDUCAO_DEFICIENCIA_GRAU_MINIMO,
    DEDUCAO_DEPENDENTE_DEFICIENCIA,
    SS_MIN_MENSAL,
    // Tributação Autónoma
    TA_THRESHOLDS,
    TA_VIATURAS_COMBUSTAO,
    TA_VIATURAS_PHEV,
    TA_VIATURAS_ELETRICA,
    TA_REPRESENTACAO,
    TA_AJUDAS_CUSTO,
    TA_NAO_DOCUMENTADAS,
    TA_AGRAVAMENTO_PREJUIZO,
    // RFAI
    RFAI_TAXA_INTERIOR,
    RFAI_TAXA_INTERIOR_EXCEDENTE,
    RFAI_TAXA_LITORAL,
    RFAI_LIMITE_INVESTIMENTO_INTERIOR,
    RFAI_LIMITE_COLETA,
    RFAI_REPORTE_ANOS,
    // DLRR
    DLRR_TAXA,
    DLRR_LIMITE_LUCROS,
    DLRR_LIMITE_COLETA,
    DLRR_REPORTE_ANOS,
    // SIFIDE II
    SIFIDE_TAXA_BASE,
    SIFIDE_TAXA_INCREMENTAL,
    SIFIDE_TETO_INCREMENTAL,
    SIFIDE_MAJORACAO_PME_JOVEM,
    SIFIDE_REPORTE_ANOS,
    // IFICI
    IFICI_TAXA,
    IFICI_PRAZO_ANOS,
  ];
  sourced.forEach((p) => {
    if (!(p.source in SOURCES)) erros.push(`Fonte não registada: ${p.legalBasis}.`);
    if (!isIsoDate(p.lastVerified)) erros.push(`Data de verificação inválida: ${p.legalBasis}.`);
  });

  if (erros.length > 0) {
    throw new Error(
      `[fiscal-data] Dados fiscais inconsistentes — build bloqueado:\n - ${erros.join("\n - ")}`
    );
  }
}

// Corre na importação do módulo: qualquer página que o use falha o build
// caso os dados estejam inconsistentes. É esta a garantia de integridade.
assertFiscalDataIntegrity();
