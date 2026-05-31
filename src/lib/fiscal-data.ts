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
export const DATA_LAST_REVIEW = "2026-05-30" as const;

// ─── Registo de fontes (evita repetir URLs longos) ─────────────────────
export interface Source {
  label: string;
  url: string;
}

export const SOURCES = {
  portalFinancasIVA: {
    label: "Art. 53.º do CIVA — Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx",
  },
  occIVA: {
    label: "IVA — Taxas em Portugal continental e regiões autónomas · Ordem dos Contabilistas Certificados",
    url: "https://www.occ.pt/pt-pt/noticias/iva-taxas-em-portugal-continental-e-acores",
  },
  decoRetencao: {
    label: "Retenção na fonte para recibos verdes · DECO PROteste",
    url: "https://www.deco.proteste.pt/dinheiro/impostos/dicas/retencao-fonte-recibos-verdes",
  },
  doutorFinancasDispensa: {
    label: "Dispensa de retenção (Art. 101.º-B CIRS) · Doutor Finanças",
    url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/trabalhadores-independentes/2-artigos-de-isencao-irs-para-recibos-verdes/",
  },
  pwcGuiaSS: {
    label: "Guia Fiscal 2026 — Segurança Social · PwC",
    url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/seguranca-social.html",
  },
  pwcGuiaIRS: {
    label: "Guia Fiscal 2026 — IRS (regime simplificado) · PwC",
    url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html",
  },
  segSocialTI: {
    label: "Trabalhador independente: obrigações para com a Segurança Social · Montepio",
    url: "https://www.montepio.org/ei/mais-recentes/trabalhador-independente-obrigacoes-para-com-a-seguranca-social/",
  },
  decoIRSJovem: {
    label: "IRS Jovem: o que é e como funciona em 2026 · DECO PROteste",
    url: "https://www.deco.proteste.pt/dinheiro/impostos/dicas/irs-jovem-como-funciona",
  },
  escaloesIRS: {
    label: "Escalões de IRS 2026 — tabela atualizada · Especialista do IRS",
    url: "https://www.especialistadoirs.pt/blog/escaloes-irs-2026-tabela-atualizada",
  },
  deducaoEspecifica: {
    label: "Deduções específicas no IRS — valores · Montepio",
    url: "https://www.montepio.org/ei/mais-recentes/deducoes-especificas-no-irs-saiba-o-que-sao-e-os-valores/",
  },
  occRegimeSimplificado: {
    label: "IRS — Regime simplificado (coeficientes e regra dos 15%) · Ordem dos Contabilistas Certificados",
    url: "https://www.occ.pt/pt-pt/noticias/irs-regime-simplificado-1",
  },
  minimoExistencia: {
    label: "Mínimo de existência: até que valor não paga IRS · CGD Saldo Positivo",
    url: "https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/minimo-de-existencia.aspx",
  },
  pwcIRC: {
    label: "IRC no OE 2026 — taxas gerais e reduzida PME · PwC",
    url: "https://www.pwc.pt/pt/pwcinforfisco/orcamentoestado/irc.html",
  },
  dividendos: {
    label: "Art. 71.º CIRS — taxas liberatórias (dividendos) · Portal das Finanças",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs71.aspx",
  },
  portaria151: {
    label: "Tabela de atividades do Art. 151.º CIRS — Portaria 1011/2001 · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/portaria/2001-177307831",
  },
  art31: {
    label: "Art. 31.º CIRS — coeficientes do regime simplificado · Portal das Finanças",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs31.aspx",
  },
  alojamentoLocal: {
    label: "IRS do alojamento local — coeficientes (0,15 / 0,35 / 0,50) · Ordem dos Contabilistas Certificados",
    url: "https://www.occ.pt/pt-pt/noticias/irs-regime-simplificado-alojamento-local",
  },
  retencaoEstrangeiro: {
    label: "Retenção na fonte e clientes estrangeiros (Art. 101.º CIRS) · Doutor Finanças",
    url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/trabalhadores-independentes/recibos-verdes-para-empresas-estrangeiras-5-cuidados-a-ter/",
  },
  deducoesColeta: {
    label: "Deduções à coleta do IRS — valores e limites · Montepio",
    url: "https://www.montepio.org/ei/pessoal/impostos/deducoes-a-coleta-saiba-quanto-pode-descontar-no-irs/",
  },
  art72: {
    label: "Art. 72.º CIRS — taxas especiais (rendimentos prediais, categoria F) · Portal das Finanças",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs72.aspx",
  },
  rendasPrediais: {
    label: "IRS — rendimentos prediais e tributação autónoma · Ordem dos Contabilistas Certificados",
    url: "https://www.occ.pt/pt-pt/noticias/irs-rendimentos-prediais-e-tributacao-autonoma",
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

const TODAY = "2026-05-30";

// ═══════════════════════════════════════════════════════════════════════
//  INDEXANTE DOS APOIOS SOCIAIS (IAS) — base de vários limites
// ═══════════════════════════════════════════════════════════════════════
export const IAS = sv(
  537.13,
  "Indexante dos Apoios Sociais (IAS) 2026",
  "pwcGuiaSS",
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
    "decoRetencao",
    TODAY,
    "Profissões liberais. Reduzida de 25% para 23% pelo OE2025; mantém-se em 2026."
  ),
  outros: sv(
    0.115,
    "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    "decoRetencao",
    TODAY
  ),
  vendas: sv(
    0,
    "Vendas de bens/mercadorias — não sujeitas a retenção na fonte",
    "decoRetencao",
    TODAY,
    "A retenção na fonte incide sobre prestações de serviços, não sobre vendas de bens."
  ),
  diretosAutor: sv(
    0.165,
    "Art. 101.º CIRS — direitos de autor e propriedade intelectual",
    "decoRetencao",
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
  "doutorFinancasDispensa",
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
    { reduzida: 0.05, intermedia: 0.12, normal: 0.22 },
    "Art. 18.º CIVA — Região Autónoma da Madeira",
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
  "segSocialTI",
  TODAY
);

/** Coeficiente do rendimento relevante consoante a natureza da atividade. */
export type BaseSS = "servicos" | "bens";
export const SS_COEFICIENTE: Record<BaseSS, Sourced<number>> = {
  servicos: sv(0.7, "Art. 162.º Código Contributivo — prestação de serviços", "segSocialTI", TODAY),
  bens: sv(
    0.2,
    "Art. 162.º Código Contributivo — produção/venda de bens, hotelaria e restauração",
    "segSocialTI",
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
  "pwcGuiaSS",
  TODAY
);

export const SS_ISENCAO_PRIMEIRO_ANO_MESES = sv(
  12,
  "Art. 157.º Código Contributivo — isenção nos primeiros 12 meses de atividade",
  "segSocialTI",
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
    "pwcGuiaIRS",
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
  idadeMax: sv(35, "Regime IRS Jovem — até 35 anos no último dia do ano", "decoIRSJovem", TODAY),
  /** Teto anual de rendimento isento = 55 × IAS. */
  tetoIAS: sv(55, "Teto anual de isenção = 55 × IAS", "decoIRSJovem", TODAY),
  /** Percentagem de isenção por ano de obtenção de rendimentos (1 a 10). */
  isencaoPorAno: sv<Record<number, number>>(
    { 1: 1.0, 2: 0.75, 3: 0.75, 4: 0.75, 5: 0.5, 6: 0.5, 7: 0.5, 8: 0.25, 9: 0.25, 10: 0.25 },
    "Regime IRS Jovem — 100% (1.º), 75% (2.º–4.º), 50% (5.º–7.º), 25% (8.º–10.º)",
    "decoIRSJovem",
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
  "escaloesIRS",
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
  "minimoExistencia",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  IRC — para o comparador "recibos verdes vs empresa" (sociedade)
// ═══════════════════════════════════════════════════════════════════════
export const IRC_TAXA_GERAL = sv(
  0.19,
  "Art. 87.º CIRC — taxa geral 2026 (reduzida de 20% para 19% pelo OE2026)",
  "pwcIRC",
  TODAY
);
export const IRC_TAXA_PME = sv(
  0.15,
  "Art. 87.º CIRC — taxa reduzida PME nos primeiros 50.000 € de matéria coletável",
  "pwcIRC",
  TODAY
);
export const IRC_LIMITE_PME = sv(50000, "Art. 87.º CIRC — limiar da taxa reduzida PME", "pwcIRC", TODAY);
export const DERRAMA_MAX = sv(0.015, "Derrama municipal — taxa máxima legal sobre o lucro tributável", "pwcIRC", TODAY);
export const DIVIDENDOS_TAXA = sv(
  0.28,
  "Art. 71.º CIRS — taxa liberatória sobre dividendos distribuídos",
  "dividendos",
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
export const DEDUCAO_DEPENDENTE = sv(600, "Art. 78.º-A CIRS — por dependente com mais de 3 anos", "deducoesColeta", TODAY);
export const DEDUCAO_DEPENDENTE_BEBE = sv(726, "Art. 78.º-A CIRS — por dependente até 3 anos", "deducoesColeta", TODAY);

export interface DeducaoLimitada {
  taxa: number;
  limite: number;
}
export const DEDUCAO_DESP_GERAIS = sv<DeducaoLimitada>(
  { taxa: 0.35, limite: 250 },
  "Art. 78.º-B CIRS — despesas gerais familiares: 35% até 250 €/sujeito",
  "deducoesColeta",
  TODAY
);
export const DEDUCAO_SAUDE = sv<DeducaoLimitada>(
  { taxa: 0.15, limite: 1000 },
  "Art. 78.º-C CIRS — saúde: 15% até 1.000 €",
  "deducoesColeta",
  TODAY
);
export const DEDUCAO_EDUCACAO = sv<DeducaoLimitada>(
  { taxa: 0.3, limite: 800 },
  "Art. 78.º-D CIRS — educação: 30% até 800 €",
  "deducoesColeta",
  TODAY
);

/** Divisor do rendimento na tributação conjunta dos casados/unidos de facto. */
export const QUOCIENTE_CONJUGAL = sv(2, "Art. 69.º CIRS — quociente conjugal (divisão por 2)", "deducoesColeta", TODAY);

/** Limite global das deduções à coleta (Art. 78.º, n.º 7), escalonado. */
export const LIMITE_GLOBAL_DEDUCOES = sv(
  { semLimiteAte: 8059, limiteAlto: 2500, limiteBaixo: 1000, escalaoSuperior: 86634 },
  "Art. 78.º, n.º 7 CIRS — sem limite até 8.059 €; entre 1.000 € e 2.500 € até 86.634 €; 1.000 € acima",
  "deducoesColeta",
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

  // 6) Proveniência obrigatória: fonte registada + data válida em cada parâmetro.
  const sourced: Sourced<unknown>[] = [
    IAS,
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
    DEDUCAO_DESP_GERAIS,
    DEDUCAO_SAUDE,
    DEDUCAO_EDUCACAO,
    QUOCIENTE_CONJUGAL,
    LIMITE_GLOBAL_DEDUCOES,
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
