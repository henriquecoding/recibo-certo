// ═══════════════════════════════════════════════════════════════════════
//  CATÁLOGO LEGAL ÚNICO DOS GUIAS — Portugal 2026
//  ---------------------------------------------------------------------
//  Registo único de fontes usado pelos Guias, pelos testes e pelo monitor
//  de ligações. Substitui os arrays `FONTES` que cada página declarava.
//
//  Duas famílias SEPARADAS POR TIPO (não por um campo `tipo: "oficial"`):
//
//    · LEGAL_SOURCES          → só autoridades competentes. Fundamentam regras.
//    · LEITURAS_COMPLEMENTARES → bancos, OCC, DECO, consultoras, plataformas.
//                                Nunca fundamentam uma regra nem podem ser
//                                apresentadas como publicação oficial.
//
//  Como os dois registos têm TIPOS DISTINTOS, é impossível marcar por engano
//  uma fonte secundária como oficial: o TypeScript rejeita, e
//  `assertLegalSourcesIntegrity()` (corre na importação) rejeita qualquer
//  LegalSource cujo domínio não conste de DOMINIOS_AUTORIZADOS.
//
//  Semântica de `effectiveFrom` / `effectiveTo`:
//    período a que se aplica a AFIRMAÇÃO do ReciboCerto que cita a fonte —
//    não a data de entrada em vigor do diploma. Para conteúdo do ano fiscal
//    corrente é o início desse ano. `consolidada: true` indica que o URL
//    aponta para uma versão permanentemente atualizada.
// ═══════════════════════════════════════════════════════════════════════

import { FISCAL_YEAR } from "@/lib/fiscal-year";

// ─── Autoridades competentes ───────────────────────────────────────────

export type Authority =
  | "AT" // Autoridade Tributária e Aduaneira / Portal das Finanças
  | "DR" // Diário da República / Imprensa Nacional
  | "SS" // Segurança Social
  | "GOV" // Gov.pt / ePortugal / IRN / AMA
  | "EU" // Instituições da União Europeia
  | "OTHER_OFFICIAL"; // outra autoridade pública portuguesa

export const AUTORIDADES: Record<Authority, string> = {
  AT: "Autoridade Tributária e Aduaneira",
  DR: "Diário da República",
  SS: "Segurança Social",
  GOV: "Administração Pública (Gov.pt / ePortugal / IRN)",
  EU: "União Europeia",
  OTHER_OFFICIAL: "Outra autoridade pública",
};

/** Domínios que podem fundamentar uma regra. Fora desta lista → leitura
    complementar. Validado em `assertLegalSourcesIntegrity()` e em CI. */
export const DOMINIOS_AUTORIZADOS: Record<string, Authority> = {
  "info.portaldasfinancas.gov.pt": "AT",
  "www.portaldasfinancas.gov.pt": "AT",
  "faturas.portaldasfinancas.gov.pt": "AT",
  "sitfiscal.portaldasfinancas.gov.pt": "AT",
  "diariodarepublica.pt": "DR",
  "files.diariodarepublica.pt": "DR",
  "www.seg-social.pt": "SS",
  "app.seg-social.pt": "SS",
  "sisscontent.seg-social.pt": "SS",
  "www.gov.pt": "GOV",
  "www2.gov.pt": "GOV",
  "eportugal.gov.pt": "GOV",
  "www.pgdlisboa.pt": "OTHER_OFFICIAL",
  "ec.europa.eu": "EU",
  "vies.ec.europa.eu": "EU",
  "vat-one-stop-shop.ec.europa.eu": "EU",
  "eur-lex.europa.eu": "EU",
};

// ─── Tipos ─────────────────────────────────────────────────────────────

export type SourceType =
  | "law" // diploma completo
  | "code_article" // artigo de um código tributário/laboral
  | "order" // despacho / portaria
  | "official_guide" // guia ou página de serviço de uma autoridade
  | "service"; // serviço transacional (Portal das Finanças, SSD, VIES)

export type SourceStatus = "active" | "changed" | "unavailable" | "historical";

/** Como a página serve o conteúdo — determina se o monitor pode validar
    âncoras no corpo da resposta. O Diário da República é uma aplicação
    OutSystems: devolve 200 com um shell vazio, por isso HTTP 200 nunca
    prova que o artigo certo está lá (falha 3.5 da auditoria). */
export type RenderMode = "html" | "spa" | "pdf";

export interface LegalSource {
  id: string;
  authority: Authority;
  title: string;
  url: string;
  jurisdiction: "PT" | "EU";
  sourceType: SourceType;
  /** Artigo exato (ex.: "78.º-A"). Obrigatório em `code_article`. */
  article?: string;
  subsection?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  /** URL aponta para versão consolidada permanentemente atualizada. */
  consolidada?: boolean;
  renderMode: RenderMode;
  /** Texto que TEM de aparecer no corpo (só verificável em `renderMode: "html"`). */
  expectedAnchors: string[];
  /** Texto que NÃO pode aparecer — apanha versões históricas e erros servidos com HTTP 200. */
  forbiddenAnchors?: string[];
  /**
   * A fonte bloqueia agentes automáticos e responde 403/429 ao monitor.
   *
   * Sem esta marca, `guias:check` terminava com «0 sem problemas · 116
   * avisos · 0 erros»: nenhuma das 116 fontes tinha sido validada, todas
   * tinham devolvido 403, e o zero de erros lia-se como aprovação. Um
   * verificador que nunca falha deixa de ser lido — e o dia em que uma URL
   * passasse a 404 a mensagem seria indistinguível das outras 115.
   *
   * Com a marca, o monitor separa os dois casos e volta a poder falhar:
   *   · fonte SEM a marca que devolve 403  → erro (o bloqueio é novo);
   *   · fonte COM a marca que devolve 403  → esperado, não conta como aviso;
   *   · fonte COM a marca que devolve 404  → erro (o servidor responde, e
   *     responde que o recurso não existe — isso não é bloqueio).
   */
  expectedBlock?: boolean;
  lastCheckedAt: string;
  status: SourceStatus;
  /** Só para `status: "historical"`: porque é que continua no catálogo. */
  historicalReason?: string;
}

/** Leitura complementar: explica, não fundamenta. Sem `authority`
    — estruturalmente impossível apresentá-la como oficial. */
export interface ComplementaryReading {
  id: string;
  publisher: string;
  title: string;
  url: string;
  lastCheckedAt: string;
}

// Âncoras proibidas aplicadas a TODAS as fontes HTML: páginas de erro que o
// servidor devolve com HTTP 200 (PGDL) e rótulos de versão revogada (AT).
export const ANCORAS_PROIBIDAS_GLOBAIS = [
  "A query falhou",
  "versão até 2013",
  "versão até 2011",
] as const;

/**
 * Domínios que sabidamente respondem 403/429 a agentes automáticos.
 *
 * Medido a 2026-07-29: das 116 fontes do catálogo, ZERO puderam ser
 * validadas — todas devolveram 403. O monitor classificava-as como aviso e
 * terminava com «0 erros», o que se lia como aprovação quando na verdade
 * significava que nada tinha sido verificado.
 *
 * Declarar o bloqueio esperado devolve significado ao zero: um 403 vindo
 * daqui é o esperado e não polui o relatório; um 403 de qualquer outro
 * domínio é um bloqueio NOVO e falha; e um 404 vindo daqui falha na mesma,
 * porque um servidor que responde «não existe» não está a bloquear.
 *
 * Uma fonte individual pode divergir desta lista com `expectedBlock`.
 */
export const DOMINIOS_QUE_BLOQUEIAM: readonly string[] = [
  "info.portaldasfinancas.gov.pt",
  "www.portaldasfinancas.gov.pt",
  "faturas.portaldasfinancas.gov.pt",
  "sitfiscal.portaldasfinancas.gov.pt",
  "diariodarepublica.pt",
  "files.diariodarepublica.pt",
  "www.seg-social.pt",
  "app.seg-social.pt",
  "sisscontent.seg-social.pt",
  "www.gov.pt",
  "www2.gov.pt",
  "eportugal.gov.pt",
  // Leituras complementares que também bloqueiam. Não fundamentam regras,
  // mas o monitor visita-as na mesma e um 403 aqui é o esperado, não um
  // link partido.
  "www.pwc.pt",
];

/** Bloqueio esperado desta fonte: `expectedBlock` explícito, ou o domínio. */
export function bloqueioEsperado(fonte: Pick<LegalSource, "url" | "expectedBlock">): boolean {
  if (typeof fonte.expectedBlock === "boolean") return fonte.expectedBlock;
  try {
    return DOMINIOS_QUE_BLOQUEIAM.includes(new URL(fonte.url).host);
  } catch {
    return false;
  }
}

const VERIFICADO = "2026-07-26";
// Data de verificação das fontes e leituras acrescentadas na revisão dos
// guias de «Direitos e cobranças» e dos catorze guias novos.
const VERIFICADO_DIREITOS = "2026-07-29";
const ANO = `${FISCAL_YEAR}-01-01`;

// ─── Fontes oficiais ───────────────────────────────────────────────────

/**
 * Caminhos dos códigos no Portal das Finanças.
 *
 * Só o CIRC tem duas coleções. Isto NÃO é uma convenção do portal — é uma
 * particularidade daquele código, e a auditoria enganou-se ao generalizá-la
 * recomendando `CIRS_2R/`. Verificado contra o portal em 2026-07-27:
 *
 *   · `CIRC_2R/irc87` → 200, "taxa do IRC é de 17 %" (Lei 64/2025) — VIGENTE
 *   · `circ_rep/irc87` → 200, "taxa do IRC é de 25 %" (Lei 64-B/2011) — histórica
 *   · `cirs_rep/irs68` → 200, escalões de 2026 (Lei 73-A/2025) — VIGENTE
 *   · `CIRS_2R/irs68`  → 404. Não existe.
 *
 * Ou seja: para o CIRS, `cirs_rep` É a versão consolidada em vigor; para o
 * CIRC, `circ_rep` é a redação anterior a 2014. Trocar um pelo outro por
 * simetria seria trocar fontes corretas por fontes inexistentes.
 *
 * O tipo abaixo é a barreira: nenhum outro caminho é sequer exprimível.
 */
// `cppt` e `lgt` não têm sufixo de redação: ao contrário do CIRS/CIVA/CIRC,
// a AT serve destes códigos uma única versão, a vigente. Confirmado a
// 2026-07-27 em cppt70/cppt102 e lgt45/lgt48.
type CodigoAT = "cirs_rep" | "civa_rep" | "CIRC_2R" | "bf_rep" | "cppt" | "lgt";

function at(
  id: string,
  artigo: string,
  titulo: string,
  slug: string,
  codigo: CodigoAT,
): LegalSource {
  return {
    id,
    authority: "AT",
    title: titulo,
    url: `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/${codigo}/Pages/${slug}.aspx`,
    jurisdiction: "PT",
    sourceType: "code_article",
    article: artigo,
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "html",
    expectedAnchors: [`Artigo ${artigo}`],
    lastCheckedAt: VERIFICADO,
    status: "active",
  };
}

export const LEGAL_SOURCES = {
  // ── CIRS ─────────────────────────────────────────────────────────────
  // O n.º 6 fixa o MOMENTO da tributação da categoria B e é a norma que
  // explica porque é que se paga IRS de uma fatura que ainda não foi paga.
  // Nota de caminho: o artigo serve-se em `irs3`, não `irs03` (404).
  cirs3: at("cirs3", "3.º", "Art. 3.º CIRS — Rendimentos da categoria B (momento da tributação)", "irs3", "cirs_rep"),
  cirs10: at("cirs10", "10.º", "Art. 10.º CIRS — Mais-valias", "irs10", "cirs_rep"),
  cirs12b: at("cirs12b", "12.º-B", "Art. 12.º-B CIRS — IRS Jovem", "irs12b", "cirs_rep"),
  cirs13: at("cirs13", "13.º", "Art. 13.º CIRS — Sujeito passivo", "irs13", "cirs_rep"),
  cirs25: at("cirs25", "25.º", "Art. 25.º CIRS — Dedução específica do trabalho dependente", "irs25", "cirs_rep"),
  cirs28: at("cirs28", "28.º", "Art. 28.º CIRS — Formas de determinação dos rendimentos empresariais", "irs28", "cirs_rep"),
  cirs31: at("cirs31", "31.º", "Art. 31.º CIRS — Regime simplificado (coeficientes)", "irs31", "cirs_rep"),
  cirs43: at("cirs43", "43.º", "Art. 43.º CIRS — Saldo de mais-valias", "irs43", "cirs_rep"),
  cirs68: at("cirs68", "68.º", "Art. 68.º CIRS — Taxas gerais (escalões)", "irs68", "cirs_rep"),
  cirs69: at("cirs69", "69.º", "Art. 69.º CIRS — Quociente conjugal", "irs69", "cirs_rep"),
  cirs70: at("cirs70", "70.º", "Art. 70.º CIRS — Mínimo de existência", "irs70", "cirs_rep"),
  cirs71: at("cirs71", "71.º", "Art. 71.º CIRS — Taxas liberatórias", "irs71", "cirs_rep"),
  cirs72: at("cirs72", "72.º", "Art. 72.º CIRS — Taxas especiais", "irs72", "cirs_rep"),
  // 3.2 da auditoria: cada artigo das deduções à coleta é uma fonte própria.
  // O Art. 87.º NÃO fundamenta as deduções gerais — trata de pessoas com deficiência.
  cirs78: at("cirs78", "78.º", "Art. 78.º CIRS — Deduções à coleta (regras e limite global)", "irs78", "cirs_rep"),
  cirs78a: at("cirs78a", "78.º-A", "Art. 78.º-A CIRS — Dedução por dependentes e ascendentes", "irs78a", "cirs_rep"),
  cirs78b: at("cirs78b", "78.º-B", "Art. 78.º-B CIRS — Dedução por despesas gerais familiares", "irs78b", "cirs_rep"),
  cirs78c: at("cirs78c", "78.º-C", "Art. 78.º-C CIRS — Dedução por despesas de saúde", "irs78c", "cirs_rep"),
  cirs78d: at("cirs78d", "78.º-D", "Art. 78.º-D CIRS — Dedução por despesas de formação e educação", "irs78d", "cirs_rep"),
  cirs78e: at("cirs78e", "78.º-E", "Art. 78.º-E CIRS — Dedução por encargos com imóveis", "irs78e", "cirs_rep"),
  cirs87: at("cirs87", "87.º", "Art. 87.º CIRS — Deduções relativas a pessoas com deficiência", "irs87", "cirs_rep"),
  cirs97: at("cirs97", "97.º", "Art. 97.º CIRS — Pagamento e reembolso", "irs97", "cirs_rep"),
  cirs101: at("cirs101", "101.º", "Art. 101.º CIRS — Retenção na fonte sobre rendimentos da categoria B", "irs101", "cirs_rep"),
  cirs101b: at("cirs101b", "101.º-B", "Art. 101.º-B CIRS — Dispensa de retenção na fonte", "irs101b", "cirs_rep"),
  cirs102: at("cirs102", "102.º", "Art. 102.º CIRS — Pagamentos por conta", "irs102", "cirs_rep"),

  // ── CIVA ─────────────────────────────────────────────────────────────
  civa6: at("civa6", "6.º", "Art. 6.º CIVA — Localização das operações", "iva6", "civa_rep"),
  civa9: at("civa9", "9.º", "Art. 9.º CIVA — Isenções nas operações internas", "iva9", "civa_rep"),
  civa18: at("civa18", "18.º", "Art. 18.º CIVA — Taxas do imposto", "iva18", "civa_rep"),
  civa33: at("civa33", "33.º", "Art. 33.º CIVA — Cessação de atividade", "iva33", "civa_rep"),
  civa36: at("civa36", "36.º", "Art. 36.º CIVA — Prazo de emissão e formalidades das faturas", "iva36", "civa_rep"),
  civa53: {
    ...at("civa53", "53.º", "Art. 53.º CIVA — Regime de isenção", "artigo-53-o-do-civa", "civa_rep"),
    expectedAnchors: ["Artigo 53.º"],
  },
  // Recuperação do IVA já entregue ao Estado sobre faturas que o cliente
  // não pagou. É o remédio, no IVA, do problema que o Art. 3.º n.º 6 do
  // CIRS cria no IRS.
  //
  // Âncora com espaço antes do hífen — "Artigo 78.º -A" — e não "78.º-A".
  // Não é gralha nossa: é como o portal serve estes três artigos do CIVA,
  // ao contrário dos homólogos do CIRS ("Artigo 78.º-A", sem espaço).
  // Verificado a 2026-07-27. Sem esta distinção o monitor de ligações
  // acusaria as três fontes como inválidas estando elas certas.
  civa78a: {
    ...at("civa78a", "78.º-A", "Art. 78.º-A CIVA — Créditos de cobrança duvidosa e incobráveis", "iva78a", "civa_rep"),
    expectedAnchors: ["Artigo 78.º -A"],
  },
  civa78b: {
    ...at("civa78b", "78.º-B", "Art. 78.º-B CIVA — Procedimento de regularização (pedido de autorização prévia)", "iva78b", "civa_rep"),
    expectedAnchors: ["Artigo 78.º -B"],
  },
  civa78d: {
    ...at("civa78d", "78.º-D", "Art. 78.º-D CIVA — Documentação de suporte da regularização", "iva78d", "civa_rep"),
    expectedAnchors: ["Artigo 78.º -D"],
  },

  civa78c: {
    ...at("civa78c", "78.º-C", "Art. 78.º-C CIVA — Regularização a favor do Estado quando o crédito é recuperado", "iva78c", "civa_rep"),
    expectedAnchors: ["Artigo 78.º -C"],
  },


  // ── Empresas: o ano de vida da sociedade (guias novos) ───────────────
  circ23: at("circ23", "23.º", "Art. 23.º CIRC — Gastos e perdas dedutíveis", "irc23", "CIRC_2R"),
  circ52: at("circ52", "52.º", "Art. 52.º CIRC — Dedução de prejuízos fiscais", "irc52", "CIRC_2R"),
  circ105: at("circ105", "105.º", "Art. 105.º CIRC — Cálculo dos pagamentos por conta", "irc105", "CIRC_2R"),
  circ107: at("circ107", "107.º", "Art. 107.º CIRC — Limitação aos pagamentos por conta", "irc107", "CIRC_2R"),
  cirs40a: at("cirs40a", "40.º-A", "Art. 40.º-A CIRS — Dupla tributação económica (englobamento de lucros a 50%)", "irs40a", "cirs_rep"),
  // ── Trabalho por conta de outrem e proteção social (guias novos) ─────
  //    O Código do Trabalho e os diplomas da Segurança Social são servidos
  //    por aplicação OutSystems no Diário da República: `spa`, sem âncoras.
  dl28_2004: {
    id: "dl28_2004",
    authority: "DR",
    title: "Decreto-Lei n.º 28/2004 — Regime de proteção na doença (versão consolidada)",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2004-34506475",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO_DIREITOS,
    status: "active",
  },
  dl220_2006: {
    id: "dl220_2006",
    authority: "DR",
    title: "Decreto-Lei n.º 220/2006 — Regime de proteção no desemprego (versão consolidada)",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2006-34509975",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO_DIREITOS,
    status: "active",
  },
  dl91_2009: {
    id: "dl91_2009",
    authority: "DR",
    title: "Decreto-Lei n.º 91/2009 — Proteção na parentalidade (versão consolidada)",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2009-34518375",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO_DIREITOS,
    status: "active",
  },
  lei98_2009: {
    id: "lei98_2009",
    authority: "DR",
    title: "Lei n.º 98/2009 — Reparação de acidentes de trabalho (seguro obrigatório)",
    url: "https://diariodarepublica.pt/dr/detalhe/lei/98-2009-490009",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO_DIREITOS,
    status: "active",
  },
  ssDoenca: {
    id: "ssDoenca",
    authority: "SS",
    title: "Subsídio de doença — montante, prazo de garantia e período de espera",
    url: "https://www.seg-social.pt/subsidio-de-doenca",
    jurisdiction: "PT",
    sourceType: "official_guide",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO_DIREITOS,
    status: "active",
  },
  ssDesemprego: {
    id: "ssDesemprego",
    authority: "SS",
    title: "Subsídio de desemprego — prazo de garantia, montante e duração",
    url: "https://www.seg-social.pt/subsidio-de-desemprego",
    jurisdiction: "PT",
    sourceType: "official_guide",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO_DIREITOS,
    status: "active",
  },

  // ── LGT e CPPT — prazos e meios de defesa ────────────────────────────
  lgt23: at("lgt23", "23.º", "Art. 23.º LGT — Responsabilidade tributária subsidiária (reversão, audição prévia e isenção de custas)", "lgt23", "lgt"),
  lgt24: at("lgt24", "24.º", "Art. 24.º LGT — Responsabilidade subsidiária dos membros de corpos sociais", "lgt24", "lgt"),
  cppt203: at("cppt203", "203.º", "Art. 203.º CPPT — Prazo de oposição à execução", "cppt203", "cppt"),
  // O portal serve este artigo com a numeração «198-A.º» no corpo, e não
  // «198.º-A» como o construtor `at()` gera por omissão. Verificado a
  // 2026-07-29: sem esta âncora explícita, o monitor acusava conteúdo em
  // falta numa página que está correta.
  cppt198a: {
    ...at("cppt198a", "198.º-A", "Art. 198.º-A CPPT — Plano oficioso de pagamento em prestações", "cppt198a", "cppt"),
    expectedAnchors: ["Artigo 198-A.º"],
    lastCheckedAt: VERIFICADO_DIREITOS,
  },
  // ── Direitos do credor: taxas de juro e unidade de conta ─────────────
  //    Os dois seguintes são o que faltava ao guia dos juros de mora: a
  //    TAXA. A comercial é semestral, daí o `effectiveTo`.
  avisoJuros2026: {
    id: "avisoJuros2026",
    authority: "DR",
    title: "Aviso n.º 822/2026/2 — Taxas supletivas de juros moratórios comerciais, 1.º semestre de 2026",
    url: "https://diariodarepublica.pt/dr/detalhe/aviso/822-2026-2",
    jurisdiction: "PT",
    sourceType: "order",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-06-30",
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO_DIREITOS,
    status: "active",
  },
  portaria291_2003: {
    id: "portaria291_2003",
    authority: "DR",
    title: "Portaria n.º 291/2003 — Taxa de juros legais e de juros de mora de obrigações civis (4%)",
    url: "https://diariodarepublica.pt/dr/detalhe/portaria/291-2003-632924",
    jurisdiction: "PT",
    sourceType: "order",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO_DIREITOS,
    status: "active",
  },
  // O Art. 43.º NÃO é servido em `lgt43` no Portal das Finanças (404,
  // verificado a 2026-07-27), ao contrário dos 24.º, 45.º, 48.º e 100.º.
  // Cita-se a versão consolidada do Diário da República.
  lgt43: {
    id: "lgt43",
    authority: "DR",
    title: "Art. 43.º LGT — Juros indemnizatórios devidos ao contribuinte",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1998-34438775-118879628",
    jurisdiction: "PT",
    sourceType: "code_article",
    article: "43.º",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  lgt45: at("lgt45", "45.º", "Art. 45.º LGT — Caducidade do direito à liquidação", "lgt45", "lgt"),
  lgt48: at("lgt48", "48.º", "Art. 48.º LGT — Prescrição das dívidas tributárias", "lgt48", "lgt"),
  cppt70: at("cppt70", "70.º", "Art. 70.º CPPT — Prazo e fundamentos da reclamação graciosa", "cppt70", "cppt"),
  cppt102: at("cppt102", "102.º", "Art. 102.º CPPT — Prazo da impugnação judicial", "cppt102", "cppt"),
  cppt169: at("cppt169", "169.º", "Art. 169.º CPPT — Suspensão da execução fiscal", "cppt169", "cppt"),
  cppt196: at("cppt196", "196.º", "Art. 196.º CPPT — Pagamento em prestações", "cppt196", "cppt"),
  cppt199: at("cppt199", "199.º", "Art. 199.º CPPT — Garantias", "cppt199", "cppt"),
  // O CPC não vive no Portal das Finanças. A primeira escolha foi a PGDL,
  // que serve o articulado — mas o servidor devolve intermitentemente uma
  // página de erro com HTTP 200 ("A query falhou"): medido a 2026-07-27,
  // uma em cada três respostas no mesmo URL. Uma fonte que falha ao acaso
  // põe o CI vermelho sem nada ter mudado, por isso cita-se a versão
  // consolidada do Diário da República, como já se faz com o Código do
  // Trabalho. Sendo aplicação OutSystems, é `spa` e sem âncoras.
  cpc738: {
    id: "cpc738",
    authority: "DR",
    title: "Art. 738.º CPC — Bens parcialmente penhoráveis (Código de Processo Civil, versão consolidada)",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2013-34580575",
    jurisdiction: "PT",
    sourceType: "code_article",
    article: "738.º",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },

  // ── CIRC — versões VIGENTES (CIRC_2R). Ver falha 3.1 da auditoria:
  //    o caminho antigo /circ_rep/ serve a redação até 2013 (taxa de 25 %).
  circ87: at("circ87", "87.º", "Art. 87.º CIRC — Taxas de IRC", "irc87", "CIRC_2R"),
  circ88: at("circ88", "88.º", "Art. 88.º CIRC — Tributação autónoma", "irc88", "CIRC_2R"),
  circ104: at("circ104", "104.º", "Art. 104.º CIRC — Pagamentos por conta", "irc104", "CIRC_2R"),
  circ120: at("circ120", "120.º", "Art. 120.º CIRC — Declaração periódica de rendimentos (Modelo 22)", "irc120", "CIRC_2R"),

  // ── EBF ──────────────────────────────────────────────────────────────
  ebf58a: {
    ...at("ebf58a", "58.º-A", "Art. 58.º-A EBF — IFICI (Incentivo Fiscal à Investigação Científica e Inovação)", "EBF58A", "bf_rep"),
    expectedAnchors: ["58.º-A"],
  },

  // ── Diário da República ──────────────────────────────────────────────
  //    Aplicação OutSystems: HTTP 200 com shell vazio → renderMode "spa",
  //    o monitor valida disponibilidade mas nunca âncoras de corpo.
  oe2026: {
    id: "oe2026",
    authority: "DR",
    title: "Lei n.º 73-A/2025 — Orçamento do Estado para 2026",
    url: "https://diariodarepublica.pt/dr/detalhe/lei/73-a-2025",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  csc: {
    id: "csc",
    authority: "DR",
    title: "Código das Sociedades Comerciais (DL n.º 262/86) — versão consolidada",
    // Falha 3.4 da auditoria: o identificador correto é 34443975 (e não 34443375).
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1986-34443975",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ct: {
    id: "ct",
    authority: "DR",
    title: "Código do Trabalho (Lei n.º 7/2009) — versão consolidada",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ct263: {
    id: "ct263",
    authority: "DR",
    title: "Art. 263.º Código do Trabalho — Subsídio de Natal",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475-56397971",
    jurisdiction: "PT",
    sourceType: "code_article",
    article: "263.º",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ct264: {
    id: "ct264",
    authority: "DR",
    title: "Art. 264.º Código do Trabalho — Retribuição do período de férias e subsídio",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475-56397972",
    jurisdiction: "PT",
    sourceType: "code_article",
    article: "264.º",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ct268: {
    id: "ct268",
    authority: "DR",
    title: "Art. 268.º Código do Trabalho — Pagamento de trabalho suplementar",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475-211441912",
    jurisdiction: "PT",
    sourceType: "code_article",
    article: "268.º",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  despachoRetencao2026: {
    id: "despachoRetencao2026",
    authority: "AT",
    // Falha 3.3 da auditoria: estava a apontar para um artigo do Montepio
    // marcado como `oficial`. O texto do despacho é publicado pela AT.
    title: "Despacho n.º 233-A/2026 — Tabelas de retenção na fonte de IRS 2026 (Continente)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Despacho-233-A-2026.pdf",
    jurisdiction: "PT",
    sourceType: "order",
    effectiveFrom: ANO,
    effectiveTo: `${FISCAL_YEAR}-12-31`,
    renderMode: "pdf",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  despachoRetencao2026Dre: {
    id: "despachoRetencao2026Dre",
    authority: "DR",
    title: "Despacho n.º 233-A/2026 — Diário da República, 2.ª série, n.º 3, Suplemento",
    url: "https://files.diariodarepublica.pt/2s/2026/01/003000001/0000200010.pdf",
    jurisdiction: "PT",
    sourceType: "order",
    effectiveFrom: ANO,
    effectiveTo: `${FISCAL_YEAR}-12-31`,
    renderMode: "pdf",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  portaria1011: {
    id: "portaria1011",
    authority: "DR",
    title: "Portaria n.º 1011/2001 — Tabela de atividades do Art. 151.º CIRS",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/portaria/2001-177307831",
    jurisdiction: "PT",
    sourceType: "order",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  codigoContributivo: {
    id: "codigoContributivo",
    authority: "DR",
    title: "Código dos Regimes Contributivos (Lei n.º 110/2009) — versão consolidada",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34540575",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },

  // ── Segurança Social ─────────────────────────────────────────────────
  ssIndependentes: {
    id: "ssIndependentes",
    authority: "SS",
    title: "Trabalhadores independentes — obrigações contributivas · Segurança Social",
    url: "https://www.seg-social.pt/trabalhadores-independentes",
    jurisdiction: "PT",
    sourceType: "official_guide",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ssContaOutrem: {
    id: "ssContaOutrem",
    authority: "SS",
    title: "Trabalhadores por conta de outrem — taxas contributivas · Segurança Social",
    url: "https://www.seg-social.pt/trabalhadores-por-conta-de-outrem",
    jurisdiction: "PT",
    sourceType: "official_guide",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ssParentalidade: {
    id: "ssParentalidade",
    authority: "SS",
    title: "Proteção na parentalidade — condições de atribuição · Segurança Social",
    url: "https://www.seg-social.pt/protecao-na-parentalidade",
    jurisdiction: "PT",
    sourceType: "official_guide",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ssCessacaoAtividade: {
    id: "ssCessacaoAtividade",
    authority: "SS",
    title: "Subsídio por cessação de atividade — condições de atribuição · Segurança Social",
    url: "https://www.seg-social.pt/subsidio-por-cessacao-de-atividade",
    jurisdiction: "PT",
    sourceType: "official_guide",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ssEntidadeContratante: {
    id: "ssEntidadeContratante",
    authority: "SS",
    title: "Entidades contratantes de trabalhadores independentes · Segurança Social",
    url: "https://www.seg-social.pt/entidades-contratantes",
    jurisdiction: "PT",
    sourceType: "official_guide",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ssDireta: {
    id: "ssDireta",
    authority: "SS",
    title: "Segurança Social Direta — declaração trimestral e conta-corrente",
    url: "https://app.seg-social.pt",
    jurisdiction: "PT",
    sourceType: "service",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },

  // ── Gov.pt / ePortugal ───────────────────────────────────────────────
  govTrabIndependente: {
    id: "govTrabIndependente",
    authority: "GOV",
    title: "Trabalhar por conta própria — guia para trabalhadores independentes · Gov.pt",
    url: "https://www.gov.pt/guias/trabalhar-por-conta-propria-guia-para-trabalhadores-independentes/",
    jurisdiction: "PT",
    sourceType: "official_guide",
    effectiveFrom: ANO,
    renderMode: "html",
    expectedAnchors: ["independente"],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  govEmpresaOnline: {
    id: "govEmpresaOnline",
    authority: "GOV",
    title: "Empresa Online e Empresa na Hora · Gov.pt (IRN)",
    url: "https://www2.gov.pt/espaco-empresa/empresa-online",
    jurisdiction: "PT",
    sourceType: "service",
    effectiveFrom: ANO,
    renderMode: "html",
    expectedAnchors: ["Empresa"],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  eportugalEmpresaNaHora: {
    id: "eportugalEmpresaNaHora",
    authority: "GOV",
    title: "Criar uma empresa na hora · Gov.pt",
    // O ePortugal foi integrado no Gov.pt; o endereço antigo redireciona.
    url: "https://www.gov.pt/servicos/criar-uma-empresa-na-hora",
    jurisdiction: "PT",
    sourceType: "service",
    effectiveFrom: ANO,
    renderMode: "html",
    expectedAnchors: ["empresa"],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },

  // ── Serviços da AT ───────────────────────────────────────────────────
  portalFinancas: {
    id: "portalFinancas",
    authority: "AT",
    title: "Portal das Finanças — serviços tributários",
    url: "https://www.portaldasfinancas.gov.pt",
    jurisdiction: "PT",
    sourceType: "service",
    effectiveFrom: ANO,
    renderMode: "html",
    expectedAnchors: ["Finanças"],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  eFatura: {
    id: "eFatura",
    authority: "AT",
    title: "e-Fatura — despesas e faturas comunicadas · AT",
    url: "https://faturas.portaldasfinancas.gov.pt",
    jurisdiction: "PT",
    sourceType: "service",
    effectiveFrom: ANO,
    renderMode: "html",
    expectedAnchors: ["Fatura"],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },

  // ── União Europeia ───────────────────────────────────────────────────
  vies: {
    id: "vies",
    authority: "EU",
    title: "VIES — validação de números de IVA da UE · Comissão Europeia",
    url: "https://ec.europa.eu/taxation_customs/vies/",
    jurisdiction: "EU",
    sourceType: "service",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  // ── Direitos do credor e cobrança ────────────────────────────────────
  //    O Diário da República serve estas páginas por aplicação OutSystems:
  //    HTTP 200 com shell vazio, daí `renderMode: "spa"` — o monitor valida
  //    a disponibilidade mas nunca âncoras de corpo.
  dl62_2013: {
    id: "dl62_2013",
    authority: "DR",
    title: "Decreto-Lei n.º 62/2013 — Atrasos de pagamento em transações comerciais",
    url: "https://diariodarepublica.pt/dr/detalhe/decreto-lei/62-2013-261160",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  dl269_98: {
    id: "dl269_98",
    authority: "DR",
    title: "Decreto-Lei n.º 269/98 — Regime dos procedimentos para cumprimento de obrigações pecuniárias (injunção)",
    url: "https://diariodarepublica.pt/dr/detalhe/decreto-lei/269-1998-207468",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  dl71_2013: {
    id: "dl71_2013",
    authority: "DR",
    title: "Decreto-Lei n.º 71/2013 — Regime de contabilidade de caixa em sede de IVA (versão consolidada)",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2013-56895610",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: ANO,
    consolidada: true,
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  dl34_2025: {
    id: "dl34_2025",
    authority: "DR",
    title: "Decreto-Lei n.º 34/2025 — Altera o limiar de acesso ao regime de IVA de caixa",
    url: "https://diariodarepublica.pt/dr/detalhe/decreto-lei/34-2025-912066243",
    jurisdiction: "PT",
    sourceType: "law",
    effectiveFrom: "2025-07-01",
    renderMode: "spa",
    expectedAnchors: [],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
  ossUe: {
    id: "ossUe",
    authority: "EU",
    // Falha 3.8 da auditoria: o MOSS foi substituído pelo OSS em 1 de julho
    // de 2021 — a terminologia antiga não deve ser usada como regra vigente.
    title: "Balcão Único (OSS) — IVA no comércio eletrónico · Comissão Europeia",
    // O antigo /taxation_customs/business/vat/oss_en redireciona para este
    // portal dedicado; ligamos ao destino final, não ao redirecionamento.
    url: "https://vat-one-stop-shop.ec.europa.eu/index_en",
    jurisdiction: "EU",
    sourceType: "official_guide",
    effectiveFrom: ANO,
    renderMode: "html",
    expectedAnchors: ["OSS"],
    lastCheckedAt: VERIFICADO,
    status: "active",
  },
} as const satisfies Record<string, LegalSource>;

export type LegalSourceId = keyof typeof LEGAL_SOURCES;

// ─── Leitura complementar (nunca fundamenta uma regra) ─────────────────

export const LEITURAS_COMPLEMENTARES = {
  // ── Direitos e cobranças ───────────────────────────────────────────
  //    Os 14 guias desta secção não tinham nenhuma leitura complementar:
  //    o bloco aparecia vazio nas páginas novas e cheio nas antigas, sem
  //    que nada explicasse a diferença.
  occCobranca: { id: "occCobranca", publisher: "OCC", title: "Notícias e guias práticos da Ordem dos Contabilistas Certificados", url: "https://www.occ.pt/pt-pt/noticias/", lastCheckedAt: VERIFICADO_DIREITOS },
  occPagamentoImpostos: { id: "occPagamentoImpostos", publisher: "OCC", title: "Registo público dos contabilistas certificados inscritos", url: "https://www.occ.pt/pt-pt/registo-publico-dos-contabilistas-certificados-inscritos", lastCheckedAt: VERIFICADO_DIREITOS },
  oaJurosMoratorios: { id: "oaJurosMoratorios", publisher: "Ordem dos Advogados", title: "Tabela de taxas de juros moratórios (civis e comerciais)", url: "https://portal.oa.pt/publicacoes/informacao-juridica/direito-nacional/tipo-de-informacao/tabelas-custas-tarifarios-taxas-valores-etc/taxas-de-juros-moratorios/", lastCheckedAt: VERIFICADO_DIREITOS },
  dgertRelacoesLaborais: { id: "dgertRelacoesLaborais", publisher: "DGERT", title: "Direção-Geral do Emprego e das Relações de Trabalho", url: "https://www.dgert.gov.pt/", lastCheckedAt: VERIFICADO_DIREITOS },
  actCondicoesTrabalho: { id: "actCondicoesTrabalho", publisher: "ACT", title: "Autoridade para as Condições do Trabalho — informação e denúncia", url: "https://www.act.gov.pt/", lastCheckedAt: VERIFICADO_DIREITOS },
  decoDividasFiscais: { id: "decoDividasFiscais", publisher: "DECO PROTeste", title: "Impostos — dossiê de informação ao consumidor", url: "https://www.deco.proteste.pt/dinheiro/impostos", lastCheckedAt: VERIFICADO_DIREITOS },
  decoBaixaMedica: { id: "decoBaixaMedica", publisher: "DECO PROTeste", title: "Baixa médica e subsídio de doença: quais as regras?", url: "https://www.deco.proteste.pt/dinheiro/emprego/dicas/baixa-medica-subsidio-doenca-quais-regras", lastCheckedAt: VERIFICADO_DIREITOS },
  decoDesemprego: { id: "decoDesemprego", publisher: "DECO PROTeste", title: "Subsídio de desemprego: regras, prazos e valores", url: "https://www.deco.proteste.pt/dinheiro/emprego/noticias/subsidio-desemprego-regras-prazos-valores", lastCheckedAt: VERIFICADO_DIREITOS },
  montepioParental: { id: "montepioParental", publisher: "Montepio", title: "Licença parental: a quantos dias têm os pais direito", url: "https://www.montepio.org/ei/pessoal/pais-e-professores/licenca-parental-a-quantos-dias-tem-os-pais-direito/", lastCheckedAt: VERIFICADO_DIREITOS },
  montepioDoenca: { id: "montepioDoenca", publisher: "Montepio", title: "Subsídio de doença: regras, valores e prazos", url: "https://www.montepio.org/ei/pessoal/emprego-e-formacao/subsidio-de-doenca-regras-valores-e-prazos/", lastCheckedAt: VERIFICADO_DIREITOS },

  occIva: { id: "occIva", publisher: "OCC", title: "Taxas de IVA em Portugal continental e regiões autónomas", url: "https://www.occ.pt/pt-pt/noticias/iva-taxas-em-portugal-continental-e-acores", lastCheckedAt: VERIFICADO },
  occRegimeSimplificado: { id: "occRegimeSimplificado", publisher: "OCC", title: "IRS — regime simplificado (coeficientes e regra dos 15 %)", url: "https://www.occ.pt/pt-pt/noticias/irs-regime-simplificado-1", lastCheckedAt: VERIFICADO },
  occTa: { id: "occTa", publisher: "OCC", title: "IRC — tributação autónoma (taxas e limiares)", url: "https://portal.occ.pt/pt-pt/noticias/irc-tributacao-autonoma", lastCheckedAt: VERIFICADO },
  occRegisto: { id: "occRegisto", publisher: "OCC", title: "Registo público dos contabilistas certificados inscritos", url: "https://www.occ.pt/pt-pt/registo-publico-dos-contabilistas-certificados-inscritos", lastCheckedAt: VERIFICADO },
  pwcIrs: { id: "pwcIrs", publisher: "PwC", title: "Guia Fiscal 2026 — IRS", url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html", lastCheckedAt: VERIFICADO },
  pwcIrc: { id: "pwcIrc", publisher: "PwC", title: "Guia Fiscal 2026 — IRC", url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irc.html", lastCheckedAt: VERIFICADO },
  pwcSs: { id: "pwcSs", publisher: "PwC", title: "Guia Fiscal 2026 — Segurança Social", url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/seguranca-social.html", lastCheckedAt: VERIFICADO },
  decoRetencao: { id: "decoRetencao", publisher: "DECO PROTeste", title: "Retenção na fonte para recibos verdes", url: "https://www.deco.proteste.pt/dinheiro/impostos/dicas/retencao-fonte-recibos-verdes", lastCheckedAt: VERIFICADO },
  decoCessar: { id: "decoCessar", publisher: "DECO PROTeste", title: "Recibos verdes: fechar atividade nas Finanças", url: "https://www.deco.proteste.pt/dinheiro/impostos/dicas/recibos-verdes-fechar-atividade-financas", lastCheckedAt: VERIFICADO },
  decoIrsJovem: { id: "decoIrsJovem", publisher: "DECO PROTeste", title: "IRS Jovem: o que é e como funciona", url: "https://www.deco.proteste.pt/dinheiro/impostos/dicas/irs-jovem-como-funciona", lastCheckedAt: VERIFICADO },
  decoSs: { id: "decoSs", publisher: "DECO PROTeste", title: "Recibos verdes: obrigações perante a Segurança Social", url: "https://www.deco.proteste.pt/dinheiro/impostos/noticias/recibos-verdes-obrigacoes-trabalhadores-independentes-seguranca-social", lastCheckedAt: VERIFICADO },
  // Continua útil como explicação — mas nunca como o texto do despacho (falha 3.3).
  montepioTabelas: { id: "montepioTabelas", publisher: "Montepio", title: "Tabelas do IRS: taxas de retenção na fonte explicadas", url: "https://www.montepio.org/ei/pessoal/impostos/tabelas-do-irs-conheca-as-taxas-de-retencao-na-fonte/", lastCheckedAt: VERIFICADO },
  montepioDeducoes: { id: "montepioDeducoes", publisher: "Montepio", title: "Deduções à coleta: quanto pode descontar no IRS", url: "https://www.montepio.org/ei/pessoal/impostos/deducoes-a-coleta-saiba-quanto-pode-descontar-no-irs/", lastCheckedAt: VERIFICADO },
  montepioAbrirAtividade: { id: "montepioAbrirAtividade", publisher: "Montepio", title: "Abrir atividade no Portal das Finanças — guia completo", url: "https://www.montepio.org/ei/pessoal/impostos/abrir-atividade-no-portal-das-financas-saiba-tudo-neste-guia-completo/", lastCheckedAt: VERIFICADO },
  montepioSs: { id: "montepioSs", publisher: "Montepio", title: "Trabalhador independente: obrigações para com a Segurança Social", url: "https://www.montepio.org/ei/mais-recentes/trabalhador-independente-obrigacoes-para-com-a-seguranca-social/", lastCheckedAt: VERIFICADO },
  cgdAtoIsolado: { id: "cgdAtoIsolado", publisher: "CGD Saldo Positivo", title: "Ato isolado: o que é, vantagens e obrigações", url: "https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/ato-isolado-o-que-e-vantagens-e-obrigacoes.aspx", lastCheckedAt: VERIFICADO },
  cgdAcumulacao: { id: "cgdAcumulacao", publisher: "CGD Saldo Positivo", title: "Trabalhador dependente que acumula recibos verdes", url: "https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/trabalhador-dependente-acumula-recibos-verdes.aspx", lastCheckedAt: VERIFICADO },
  cgdCessacao: { id: "cgdCessacao", publisher: "CGD Saldo Positivo", title: "Trabalhador independente sem trabalho: subsídio por cessação de atividade", url: "https://www.cgd.pt/Site/Saldo-Positivo/protecao/Pages/subsidio-desemprego-independentes.aspx", lastCheckedAt: VERIFICADO },
  dfAbrirAtividade: { id: "dfAbrirAtividade", publisher: "Doutor Finanças", title: "Como abrir atividade nas Finanças", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/trabalhadores-independentes/como-abrir-atividade-nas-financas-2/", lastCheckedAt: VERIFICADO },
  dfAcumulacao: { id: "dfAcumulacao", publisher: "Doutor Finanças", title: "Acumular trabalho por conta de outrem e recibos verdes no IRS", url: "https://www.doutorfinancas.pt/impostos/irs/acumulo-trabalho-por-conta-de-outrem-e-recibos-verdes-como-preencher-o-irs/", lastCheckedAt: VERIFICADO },
  dfDispensa: { id: "dfDispensa", publisher: "Doutor Finanças", title: "Dispensa de retenção nos recibos verdes", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/trabalhadores-independentes/2-artigos-de-isencao-irs-para-recibos-verdes/", lastCheckedAt: VERIFICADO },
  dfEstrangeiros: { id: "dfEstrangeiros", publisher: "Doutor Finanças", title: "Recibos verdes para empresas estrangeiras: cuidados a ter", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/trabalhadores-independentes/recibos-verdes-para-empresas-estrangeiras-5-cuidados-a-ter/", lastCheckedAt: VERIFICADO },
  dfSuplementar: { id: "dfSuplementar", publisher: "Doutor Finanças", title: "Retenção na fonte sobre trabalho suplementar", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/rendimentos/retencao-na-fonte-sobre-trabalho-suplementar-alteracoes-e-beneficios-fiscais/", lastCheckedAt: VERIFICADO },
  dfLimites: { id: "dfLimites", publisher: "Doutor Finanças", title: "Recibos verdes: há limites para abrir e fechar atividade?", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/trabalhadores-independentes/recibos-verdes-ha-limites-para-abrir-e-fechar-atividade/", lastCheckedAt: VERIFICADO },
  coverflexSubsidioNatal: { id: "coverflexSubsidioNatal", publisher: "Coverflex", title: "Como calcular o subsídio de Natal", url: "https://www.coverflex.com/pt/blog/como-calcular-o-subsidio-de-natal", lastCheckedAt: VERIFICADO },
  coverflexSubsidioFerias: { id: "coverflexSubsidioFerias", publisher: "Coverflex", title: "Subsídio de férias: regras e cálculo", url: "https://www.coverflex.com/pt/blog/subsidio-de-ferias", lastCheckedAt: VERIFICADO },
  coverflexAlimentacao: { id: "coverflexAlimentacao", publisher: "Coverflex", title: "Subsídio de alimentação 2026", url: "https://www.coverflex.com/pt/blog/subsidio-de-alimentacao", lastCheckedAt: VERIFICADO },
  coverflexIrsJovem: { id: "coverflexIrsJovem", publisher: "Coverflex", title: "IRS Jovem 2026", url: "https://www.coverflex.com/pt/blog/irs-jovem", lastCheckedAt: VERIFICADO },
  crnRetencao: { id: "crnRetencao", publisher: "CRN Contabilidade", title: "Retenção na fonte nos recibos verdes em 2026", url: "https://crncontabilidade.pt/blog/retencao-na-fonte-nos-recibos-verdes-quando-aplicar-taxas-mais-comuns-e-como-evitar-pagar-a-mais-2026/", lastCheckedAt: VERIFICADO },
  crnSs: { id: "crnSs", publisher: "CRN Contabilidade", title: "Segurança Social para trabalhadores independentes em 2026", url: "https://crncontabilidade.pt/blog/seguranca-social-para-trabalhadores-independentes-em-2026-quanto-pagar-e-como-calcular/", lastCheckedAt: VERIFICADO },
  crnCessacao: { id: "crnCessacao", publisher: "CRN Contabilidade", title: "Cessação de atividade nas Finanças: quando e como", url: "https://crncontabilidade.pt/blog/cessacao-de-actividade-nas-financas-quando-fazer-e-como/", lastCheckedAt: VERIFICADO },
  snIva: { id: "snIva", publisher: "SimuladorNeto", title: "IVA nos recibos verdes — isenção do Art. 53.º em 2026", url: "https://simuladorneto.pt/blog/iva-recibos-verdes-isencao-artigo-53-2026", lastCheckedAt: VERIFICADO },
  snAcumulacao: { id: "snAcumulacao", publisher: "SimuladorNeto", title: "Acumular trabalho dependente e recibos verdes em 2026", url: "https://simuladorneto.pt/blog/acumular-trabalho-dependente-recibos-verdes-2026", lastCheckedAt: VERIFICADO },
  snEstrangeiros: { id: "snEstrangeiros", publisher: "SimuladorNeto", title: "Recibos verdes e empresas estrangeiras em 2026", url: "https://simuladorneto.pt/blog/recibos-verdes-empresas-estrangeiras-2026", lastCheckedAt: VERIFICADO },
  snCessacao: { id: "snCessacao", publisher: "SimuladorNeto", title: "Cessação de atividade em 2026", url: "https://simuladorneto.pt/blog/cessacao-atividade-recibos-verdes-2026", lastCheckedAt: VERIFICADO },
  snProtecao: { id: "snProtecao", publisher: "SimuladorNeto", title: "Proteção social dos recibos verdes em 2026", url: "https://simuladorneto.pt/blog/protecao-social-recibos-verdes-2026", lastCheckedAt: VERIFICADO },
  ixIva53: { id: "ixIva53", publisher: "InvoiceXpress", title: "Alterações ao regime de isenção de IVA do Art. 53.º", url: "https://invoicexpress.com/blog/alteracoes-regime-isencao-iva-artigo-53/", lastCheckedAt: VERIFICADO },
  especialistaEscaloes: { id: "especialistaEscaloes", publisher: "Especialista do IRS", title: "Escalões de IRS 2026 — tabela atualizada", url: "https://www.especialistadoirs.pt/blog/escaloes-irs-2026-tabela-atualizada", lastCheckedAt: VERIFICADO },
  santanderIrsJovem: { id: "santanderIrsJovem", publisher: "Santander", title: "IRS Jovem", url: "https://www.santander.pt/salto/irs-jovem", lastCheckedAt: VERIFICADO },
  santanderTa: { id: "santanderTa", publisher: "Santander", title: "Tributação autónoma: o que muda em 2026", url: "https://www.santander.pt/salto/tributacao-autonoma", lastCheckedAt: VERIFICADO },
  santanderAbrirAtividade: { id: "santanderAbrirAtividade", publisher: "Santander", title: "Abrir atividade nas Finanças", url: "https://www.santander.pt/salto/abrir-atividade-nas-financas", lastCheckedAt: VERIFICADO },
  vendusDependencia: { id: "vendusDependencia", publisher: "Cegid Vendus", title: "O que é um trabalhador independente economicamente dependente", url: "https://www.vendus.pt/blog/trabalhador-independente-economicamente-dependente/", lastCheckedAt: VERIFICADO },
  comparajaEstrangeiros: { id: "comparajaEstrangeiros", publisher: "ComparaJá", title: "Recibos verdes para empresas estrangeiras", url: "https://www.comparaja.pt/mercado-trabalho/artigos/recibos-verdes-para-empresas-estrangeiras", lastCheckedAt: VERIFICADO },
  fedfinanceIrsJovem: { id: "fedfinanceIrsJovem", publisher: "FedFinance", title: "IRS Jovem 2026: regras, isenções e como pedir", url: "https://www.fedfinance.pt/noticias-conselhos/irs-jovem-2026-regras-isencoes-e-como-pedir-o-seu-beneficio-fiscal", lastCheckedAt: VERIFICADO },
  paddleMor: { id: "paddleMor", publisher: "Paddle", title: "Merchant of Record — documentação e preços (referência comercial datada)", url: "https://www.paddle.com/pricing", lastCheckedAt: VERIFICADO },
  lemonMor: { id: "lemonMor", publisher: "Lemon Squeezy", title: "Merchant of Record — documentação e preços (referência comercial datada)", url: "https://www.lemonsqueezy.com/pricing", lastCheckedAt: VERIFICADO },
} as const satisfies Record<string, ComplementaryReading>;

export type ComplementaryReadingId = keyof typeof LEITURAS_COMPLEMENTARES;

// ─── Acesso ────────────────────────────────────────────────────────────

export const legalSource = (id: LegalSourceId): LegalSource => LEGAL_SOURCES[id];
export const leituraComplementar = (id: ComplementaryReadingId): ComplementaryReading =>
  LEITURAS_COMPLEMENTARES[id];

export function hostDe(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/** Todas as fontes oficiais, ordenadas por autoridade e depois por título. */
export function todasAsFontesOficiais(): LegalSource[] {
  const ordem: Authority[] = ["AT", "DR", "SS", "GOV", "EU", "OTHER_OFFICIAL"];
  return Object.values(LEGAL_SOURCES as Record<string, LegalSource>).sort(
    (a, b) => ordem.indexOf(a.authority) - ordem.indexOf(b.authority) || a.title.localeCompare(b.title, "pt-PT"),
  );
}

// ─── Integridade (corre na importação — falha o build) ─────────────────

export function assertLegalSourcesIntegrity(): void {
  const erros: string[] = [];
  const vistos = new Set<string>();

  for (const [chave, s] of Object.entries(LEGAL_SOURCES as Record<string, LegalSource>)) {
    if (s.id !== chave) erros.push(`Fonte "${chave}": campo id="${s.id}" não coincide com a chave.`);

    const host = hostDe(s.url);
    if (!host) {
      erros.push(`Fonte "${chave}": URL inválido (${s.url}).`);
      continue;
    }
    // Regra 7.2/1 da auditoria: só autoridades competentes fundamentam regras.
    const autoridadeEsperada = DOMINIOS_AUTORIZADOS[host];
    if (!autoridadeEsperada) {
      erros.push(`Fonte "${chave}": domínio "${host}" não é uma autoridade autorizada. Mover para LEITURAS_COMPLEMENTARES.`);
    } else if (autoridadeEsperada !== s.authority) {
      erros.push(`Fonte "${chave}": domínio "${host}" pertence a ${autoridadeEsperada}, mas está declarada como ${s.authority}.`);
    }
    if (!s.url.startsWith("https://")) erros.push(`Fonte "${chave}": tem de usar HTTPS.`);

    // Regra 7.2/4: ligar ao artigo exato, não à página inicial do portal.
    if (s.sourceType === "code_article" && !s.article) {
      erros.push(`Fonte "${chave}": sourceType "code_article" exige o campo "article".`);
    }
    // Regra 7.2/7: HTTP 200 não chega — HTML tem de declarar âncoras esperadas.
    if (s.renderMode === "html" && s.expectedAnchors.length === 0) {
      erros.push(`Fonte "${chave}": renderMode "html" exige pelo menos uma âncora esperada.`);
    }
    // Regra 7.2/6: uma fonte histórica só existe como comparação identificada.
    if (s.status === "historical" && !s.historicalReason) {
      erros.push(`Fonte "${chave}": status "historical" exige "historicalReason" (justificação editorial).`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.lastCheckedAt)) {
      erros.push(`Fonte "${chave}": lastCheckedAt tem de ser uma data ISO (AAAA-MM-DD).`);
    }
    if (s.effectiveTo && s.effectiveTo < s.effectiveFrom) {
      erros.push(`Fonte "${chave}": effectiveTo é anterior a effectiveFrom.`);
    }

    const url = s.url.replace(/\/$/, "");
    if (vistos.has(url)) erros.push(`Fonte "${chave}": URL duplicado no catálogo (${url}).`);
    vistos.add(url);

    // Falha 3.1 da auditoria: o caminho /circ_rep/ serve a redação até 2013.
    if (s.url.includes("/circ_rep/")) {
      erros.push(`Fonte "${chave}": /circ_rep/ é a versão histórica do CIRC. Usar /CIRC_2R/.`);
    }
    // O inverso, para o CIRS: `CIRS_2R` não existe (404 no portal). A
    // auditoria recomendou-o por simetria com o CIRC; seguir a recomendação
    // partia 24 fontes de uma vez. Ver a nota no topo de `at()`.
    if (/\/CIRS_2R\//i.test(s.url) || /\/CIVA_2R\//i.test(s.url)) {
      erros.push(
        `Fonte "${chave}": só o CIRC tem coleção "_2R". Para o CIRS e o CIVA, ` +
          `"cirs_rep"/"civa_rep" SÃO as versões consolidadas em vigor.`,
      );
    }
  }

  for (const [chave, r] of Object.entries(LEITURAS_COMPLEMENTARES as Record<string, ComplementaryReading>)) {
    if (r.id !== chave) erros.push(`Leitura "${chave}": campo id="${r.id}" não coincide com a chave.`);
    if (!r.url.startsWith("https://")) erros.push(`Leitura "${chave}": tem de usar HTTPS.`);
    const host = hostDe(r.url);
    // Falha 3.3 invertida: uma fonte de autoridade não deve ficar escondida
    // como leitura complementar — perde rastreabilidade.
    if (DOMINIOS_AUTORIZADOS[host]) {
      erros.push(`Leitura "${chave}": "${host}" é uma autoridade oficial. Mover para LEGAL_SOURCES.`);
    }
  }

  if (erros.length > 0) {
    throw new Error(`Catálogo legal inconsistente:\n  · ${erros.join("\n  · ")}`);
  }
}

assertLegalSourcesIntegrity();
