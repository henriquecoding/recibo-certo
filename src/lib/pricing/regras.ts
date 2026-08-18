// ═══════════════════════════════════════════════════════════════════════
//  REGRAS DE MERCADO DA PRICING ENGINE — Portugal
//  ---------------------------------------------------------------------
//  A FRONTEIRA COM `fiscal-data.ts` É DELIBERADA E NÃO SE ATRAVESSA:
//
//    · `fiscal-data.ts` guarda o que o ESTADO IMPÕE (IVA, SS, IRS,
//      coeficientes, retenção). É lei. Este ficheiro NUNCA o duplica.
//    · `regras.ts` guarda o que o MERCADO PRATICA (comissões de canal,
//      taxas de processamento, pressupostos de horas faturáveis) e o que a
//      lei impõe sobre a APRESENTAÇÃO do preço (ASAE, saldos, devoluções).
//
//  Duplicar aqui uma taxa de IVA seria reproduzir exatamente o defeito que
//  o motor `fiscal-iva.ts` foi criado para corrigir. Se um número já vive
//  em `fiscal-data.ts`, importa-se de lá.
//
//  Todo o valor de mercado é um PRESSUPOSTO EDITÁVEL, não um facto. A
//  interface tem de o deixar mudar e tem de dizer a data em que foi visto.
//  Preçários de terceiros mudam sem aviso; uma ferramenta que os apresente
//  como verdade fica errada em silêncio.
// ═══════════════════════════════════════════════════════════════════════

// ─── Proveniência ──────────────────────────────────────────────────────

export type NivelConfiancaRegra = "oficial" | "institucional" | "mercado" | "estimativa";

export interface RegraPricing<T> {
  value: T;
  /** O que a regra diz, em linguagem humana. */
  descricao: string;
  /** Quem o diz. */
  fonte: string;
  fonteUrl: string;
  /** Quando foi visto (ISO 8601). */
  verificadoEm: string;
  /** Desde quando vigora, quando aplicável. */
  vigoraDesde?: string;
  confianca: NivelConfiancaRegra;
  nota?: string;
}

const r = <T>(
  value: T,
  descricao: string,
  fonte: string,
  fonteUrl: string,
  verificadoEm: string,
  confianca: NivelConfiancaRegra,
  extra: { vigoraDesde?: string; nota?: string } = {},
): RegraPricing<T> => ({ value, descricao, fonte, fonteUrl, verificadoEm, confianca, ...extra });

/** Data em que os preçários comerciais desta revisão foram consultados. */
export const REVISAO_PRICING = "2026-08-18" as const;

/** Ao fim de quanto tempo um preçário comercial deixa de ser credível. */
export const VALIDADE_PRECARIO_DIAS = 400;

// ═══════════════════════════════════════════════════════════════════════
//  1. CANAIS DE VENDA — comissões
// ═══════════════════════════════════════════════════════════════════════

export interface CanalComissao {
  id: string;
  rotulo: string;
  /** Fração do valor BRUTO da encomenda (com IVA). Intervalo típico. */
  comissaoMin: number;
  comissaoMax: number;
  /** Valor por omissão dentro do intervalo. */
  comissaoTipica: number;
  /** Mensalidade em euros, se existir. */
  mensalidade: number;
  /** Comissão fixa por venda, em euros. */
  fixaPorVenda: number;
  nota?: string;
}

/**
 * Comissões dos canais que servem Portugal. Os intervalos são reais — a
 * comissão depende da CATEGORIA do produto — e é por isso que a UI mostra
 * um intervalo e deixa o utilizador afinar, em vez de fingir um número
 * único. Uma calculadora que diga «marketplace = 15%» está errada para
 * quase toda a gente.
 */
export const CANAIS_COMISSAO: RegraPricing<CanalComissao[]> = r(
  [
    {
      id: "nenhum",
      rotulo: "Sem intermediário",
      comissaoMin: 0,
      comissaoMax: 0,
      comissaoTipica: 0,
      mensalidade: 0,
      fixaPorVenda: 0,
    },
    {
      id: "amazon",
      rotulo: "Amazon (ES, serve Portugal)",
      comissaoMin: 0.05,
      comissaoMax: 0.22,
      comissaoTipica: 0.15,
      mensalidade: 39,
      fixaPorVenda: 0,
      nota: "Plano profissional 39 €/mês. FBA acresce 2,70–5,90 €/unidade se usares logística Amazon.",
    },
    {
      id: "worten",
      rotulo: "Worten Marketplace",
      comissaoMin: 0.08,
      comissaoMax: 0.18,
      comissaoTipica: 0.13,
      mensalidade: 0,
      fixaPorVenda: 0,
    },
    {
      id: "fnac",
      rotulo: "Fnac Portugal",
      comissaoMin: 0.06,
      comissaoMax: 0.19,
      comissaoTipica: 0.12,
      mensalidade: 0,
      fixaPorVenda: 0,
    },
    {
      id: "kuantokusta",
      rotulo: "KuantoKusta",
      comissaoMin: 0.03,
      comissaoMax: 0.15,
      comissaoTipica: 0.09,
      mensalidade: 0,
      fixaPorVenda: 0,
      nota: "Modelo híbrido: também cobra por clique (0,05–1,50 €). Se usas CPC, entra como custo de aquisição.",
    },
    {
      id: "corteingles",
      rotulo: "El Corte Inglés Portugal",
      comissaoMin: 0.1,
      comissaoMax: 0.25,
      comissaoTipica: 0.17,
      mensalidade: 0,
      fixaPorVenda: 0,
    },
    {
      id: "olx",
      rotulo: "OLX Portugal",
      comissaoMin: 0,
      comissaoMax: 0.1,
      comissaoTipica: 0.05,
      mensalidade: 0,
      fixaPorVenda: 0,
      nota: "Anúncio base gratuito. Destaques 2,49–14,99 €. OLX Entregas ~5%. Planos profissionais 20–150 €/mês.",
    },
    {
      id: "outro",
      rotulo: "Outro marketplace",
      comissaoMin: 0,
      comissaoMax: 0.4,
      comissaoTipica: 0.15,
      mensalidade: 0,
      fixaPorVenda: 0,
    },
  ],
  "Comissões praticadas pelos principais marketplaces com operação em Portugal, por escalão de categoria.",
  "Zunapro — Top marketplaces Portugal; Webfy — Marketplace vs loja própria",
  "https://www.zunapro.com/portugal/en/blog/top-marketplaces-portugal-2025",
  REVISAO_PRICING,
  "mercado",
  { nota: "Preçários de terceiros. Confirma no contrato do teu canal antes de decidir." },
);

// ═══════════════════════════════════════════════════════════════════════
//  2. MEIOS DE PAGAMENTO
// ═══════════════════════════════════════════════════════════════════════

export interface MetodoPagamento {
  id: string;
  rotulo: string;
  /** Fração do valor BRUTO cobrado ao cliente. */
  percentagem: number;
  /** Euros fixos por transação. */
  fixa: number;
  nota?: string;
}

export const METODOS_PAGAMENTO: RegraPricing<MetodoPagamento[]> = r(
  [
    { id: "nenhum", rotulo: "Dinheiro / transferência", percentagem: 0, fixa: 0 },
    {
      id: "stripe_eee",
      rotulo: "Cartão europeu (Stripe)",
      percentagem: 0.015,
      fixa: 0.25,
    },
    {
      id: "stripe_premium",
      rotulo: "Cartão europeu premium (Stripe)",
      percentagem: 0.028,
      fixa: 0.25,
      nota: "Cartões corporate e de recompensas. Se vendes a empresas, é mais comum do que parece.",
    },
    {
      id: "stripe_internacional",
      rotulo: "Cartão internacional (Stripe)",
      percentagem: 0.0315,
      fixa: 0.25,
      nota: "Acresce 2% se houver conversão de moeda.",
    },
    { id: "mbway", rotulo: "MB WAY (via Stripe)", percentagem: 0.015, fixa: 0.25 },
    {
      id: "presencial",
      rotulo: "Terminal presencial (Stripe)",
      percentagem: 0.014,
      fixa: 0.1,
    },
    { id: "outro", rotulo: "Outro", percentagem: 0.02, fixa: 0.25 },
  ],
  "Taxas de processamento de pagamento praticadas em Portugal.",
  "Stripe — preçário Portugal",
  "https://stripe.com/pt/pricing",
  REVISAO_PRICING,
  "mercado",
  { nota: "Litígio (chargeback): 20 € por contestação recebida." },
);

// ═══════════════════════════════════════════════════════════════════════
//  3. PRESSUPOSTOS DE TEMPO
// ═══════════════════════════════════════════════════════════════════════

/**
 * O erro que este bloco existe para impedir: `valor/hora = salário / 160`.
 *
 * Ninguém fatura 160 horas por mês. Há propostas que não fecham, deslocações,
 * administração, formação, prospeção e trabalho pós-venda. Assumir 100% de
 * horas faturáveis subestima o valor/hora em 40 a 80% — e é exatamente o
 * cálculo que a maioria dos freelancers faz de cabeça.
 */
export const TAXA_FATURAVEL_PADRAO = r(
  0.6,
  "Fração do tempo de trabalho efetivamente faturável a clientes. O restante é proposta, prospeção, administração, deslocação, formação e pós-venda.",
  "Pressuposto de gestão de serviços profissionais — editável pelo utilizador",
  "https://www.recibocerto.pt/ferramentas/calcular-preco",
  REVISAO_PRICING,
  "estimativa",
  { nota: "Intervalo defensável: 0,50 a 0,75. Abaixo de 0,50 há um problema de operação, não de preço." },
);

export const SEMANAS_ANO = r(
  52,
  "Semanas num ano civil.",
  "Calendário",
  "https://www.recibocerto.pt",
  REVISAO_PRICING,
  "oficial",
);

export const SEMANAS_FERIAS_PADRAO = r(
  4.4,
  "22 dias úteis de férias ≈ 4,4 semanas. Um trabalhador independente não tem férias pagas: se não trabalha, não fatura — e por isso as férias entram no preço.",
  "Art. 238.º do Código do Trabalho (referência de 22 dias úteis)",
  "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=1047&tabela=leis",
  REVISAO_PRICING,
  "institucional",
);

export const FERIADOS_SEMANAS_EQUIVALENTES = r(
  2.6,
  "13 feriados obrigatórios ≈ 2,6 semanas de 5 dias.",
  "Art. 234.º do Código do Trabalho",
  "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=1047&tabela=leis",
  REVISAO_PRICING,
  "institucional",
);

// ═══════════════════════════════════════════════════════════════════════
//  4. REGRAS LEGAIS DE APRESENTAÇÃO DO PREÇO
// ═══════════════════════════════════════════════════════════════════════

export const PRECO_AO_CONSUMIDOR = r(
  { incluiImpostos: true },
  "O preço indicado ao consumidor é o preço TOTAL, com todos os impostos e encargos incluídos, escrito em dígitos de modo visível, inequívoco e legível.",
  "ASAE — Afixação de preços · Decreto-Lei n.º 138/90, alterado pelo DL n.º 162/99",
  "https://www.asae.gov.pt/perguntas-frequentes1/area-economica/precos/afixacao-de-precos.aspx",
  REVISAO_PRICING,
  "oficial",
);

export const PRECO_UNIDADE_MEDIDA = r(
  { obrigatorio: true },
  "Além do preço de venda, é obrigatório indicar o preço por unidade de medida nos produtos vendidos a granel ou por quantidade.",
  "ASAE — Preço por unidade de medida",
  "https://www.asae.gov.pt/perguntas-frequentes1/area-economica/precos/preco-por-unidade-de-medida.aspx",
  REVISAO_PRICING,
  "oficial",
);

export const REDUCAO_PRECO_30_DIAS = r(
  { dias: 30, diasMaximoSaldosAno: 124, diasAntecedenciaComunicacao: 5 },
  "Ao anunciar uma redução, o preço de referência é o MAIS BAIXO praticado nos 30 dias consecutivos anteriores — incluindo reduções anteriores. Saldos: máximo 124 dias por ano e comunicação à ASAE com 5 dias úteis de antecedência. Promoções não carecem de comunicação.",
  "ASAE — Saldos, promoções e liquidações · DL n.º 70/2007 na redação do DL n.º 109-G/2021",
  "https://www.asae.gov.pt/perguntas-frequentes1/area-economica/praticas-comerciais-saldos.aspx",
  REVISAO_PRICING,
  "oficial",
  { vigoraDesde: "2022-01-01" },
);

export const LIVRE_RESOLUCAO = r(
  { dias: 14, diasForaEstabelecimento: 30, mesesSemInformacao: 12 },
  "Nos contratos à distância o consumidor tem 14 dias para resolver o contrato sem indicar motivo (30 dias fora do estabelecimento). O custo da devolução é do consumidor, salvo acordo ou falta de informação prévia — mas o vendedor reembolsa os portes de entrega originais.",
  "Decreto-Lei n.º 24/2014, arts. 10.º e 13.º",
  "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=2062&tabela=leis",
  REVISAO_PRICING,
  "oficial",
);

export const VENDAS_DISTANCIA_UE = r(
  { limiarAnual: 10000 },
  "Vendas à distância intracomunitárias a consumidores: abaixo de 10 000 €/ano (líquidos de IVA) tributa-se em Portugal; acima, no Estado de destino, com registo local ou adesão ao Balcão Único (OSS).",
  "Ordem dos Contabilistas Certificados · Art. 6.º-A CIVA, arts. 10.º-11.º RITI, Lei n.º 47/2020",
  "https://www.occ.pt/pt-pt/noticias/iva-vendas-intracomunitarias-distancia",
  REVISAO_PRICING,
  "institucional",
  { vigoraDesde: "2021-07-01" },
);

// ═══════════════════════════════════════════════════════════════════════
//  5. TERMINAÇÕES PSICOLÓGICAS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Sugestões comerciais — nunca substituem o preço recomendado.
 *
 * A razão de estarem separadas é de produto, não de código: misturar
 * estratégia comercial com viabilidade financeira faz a pessoa acreditar
 * que 19,90 € é o preço «certo» quando é apenas o preço «redondo». Primeiro
 * mostra-se o preço que o negócio aguenta; só depois o que o cliente lê bem.
 */
export const TERMINACOES_PSICOLOGICAS = r(
  [0.9, 0.95, 0.99, 0.5, 0.0],
  "Terminações de preço com uso comercial estabelecido no retalho.",
  "Prática de retalho — sugestão, não recomendação financeira",
  "https://www.recibocerto.pt/ferramentas/calcular-preco",
  REVISAO_PRICING,
  "estimativa",
);

// ═══════════════════════════════════════════════════════════════════════
//  6. INTEGRIDADE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Mesmo contrato de `assertFiscalDataIntegrity()` e
 * `assertCatalogoFerramentas()`: corre ao importar e faz o build falhar em
 * vez de servir pressupostos inconsistentes.
 */
export function validarRegrasPricing(): string[] {
  const erros: string[] = [];
  const hoje = Date.now();

  const todas: RegraPricing<unknown>[] = [
    CANAIS_COMISSAO,
    METODOS_PAGAMENTO,
    TAXA_FATURAVEL_PADRAO,
    SEMANAS_ANO,
    SEMANAS_FERIAS_PADRAO,
    FERIADOS_SEMANAS_EQUIVALENTES,
    PRECO_AO_CONSUMIDOR,
    PRECO_UNIDADE_MEDIDA,
    REDUCAO_PRECO_30_DIAS,
    LIVRE_RESOLUCAO,
    VENDAS_DISTANCIA_UE,
    TERMINACOES_PSICOLOGICAS,
  ];

  for (const regra of todas) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(regra.verificadoEm)) {
      erros.push(`Regra sem data de verificação válida: ${regra.descricao.slice(0, 60)}…`);
      continue;
    }
    const idade = (hoje - Date.parse(regra.verificadoEm)) / 86_400_000;
    if (idade > VALIDADE_PRECARIO_DIAS) {
      erros.push(
        `Regra verificada há ${Math.round(idade)} dias (limite ${VALIDADE_PRECARIO_DIAS}): ${regra.fonte}`,
      );
    }
    if (!regra.fonteUrl.startsWith("https://")) {
      erros.push(`Regra sem URL https: ${regra.fonte}`);
    }
  }

  // ── Canais: intervalos coerentes ───────────────────────────────────
  const ids = new Set<string>();
  for (const c of CANAIS_COMISSAO.value) {
    if (ids.has(c.id)) erros.push(`Canal com id duplicado: ${c.id}`);
    ids.add(c.id);
    if (c.comissaoMin > c.comissaoMax) {
      erros.push(`[${c.id}] comissaoMin > comissaoMax.`);
    }
    if (c.comissaoTipica < c.comissaoMin || c.comissaoTipica > c.comissaoMax) {
      erros.push(`[${c.id}] comissaoTipica fora do intervalo [${c.comissaoMin}, ${c.comissaoMax}].`);
    }
    if (c.comissaoMax >= 1) {
      erros.push(`[${c.id}] comissão ≥ 100% — nenhum preço seria possível.`);
    }
  }

  // ── Pagamentos ─────────────────────────────────────────────────────
  const idsPag = new Set<string>();
  for (const p of METODOS_PAGAMENTO.value) {
    if (idsPag.has(p.id)) erros.push(`Método de pagamento com id duplicado: ${p.id}`);
    idsPag.add(p.id);
    if (p.percentagem < 0 || p.percentagem >= 0.5) {
      erros.push(`[${p.id}] percentagem de processamento implausível: ${p.percentagem}.`);
    }
    if (p.fixa < 0 || p.fixa > 5) {
      erros.push(`[${p.id}] taxa fixa implausível: ${p.fixa} €.`);
    }
  }

  // ── Tempo ──────────────────────────────────────────────────────────
  const tf = TAXA_FATURAVEL_PADRAO.value;
  if (tf <= 0 || tf >= 1) {
    erros.push("TAXA_FATURAVEL_PADRAO tem de estar estritamente entre 0 e 1 — 1 significaria faturar todas as horas do ano.");
  }
  const semanasIndisponiveis = SEMANAS_FERIAS_PADRAO.value + FERIADOS_SEMANAS_EQUIVALENTES.value;
  if (semanasIndisponiveis >= SEMANAS_ANO.value) {
    erros.push("Férias + feriados ocupam o ano inteiro.");
  }

  return erros;
}

export function assertRegrasPricing(): void {
  const erros = validarRegrasPricing();
  if (erros.length > 0) {
    throw new Error(
      `Regras de pricing inconsistentes (${erros.length}):\n` + erros.map((e) => ` · ${e}`).join("\n"),
    );
  }
}

// ─── Acessos por id (nunca procurar à mão no array) ────────────────────

export const canalPorId = (id: string): CanalComissao | undefined =>
  CANAIS_COMISSAO.value.find((c) => c.id === id);

export const pagamentoPorId = (id: string): MetodoPagamento | undefined =>
  METODOS_PAGAMENTO.value.find((p) => p.id === id);
