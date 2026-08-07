// ═══════════════════════════════════════════════════════════════════════
//  API pública do sistema de Guias — o resto da app importa daqui.
// ═══════════════════════════════════════════════════════════════════════

export * from "./legal-sources";
export * from "./claims";
export * from "./manifests";

import { legalSource, type LegalSource, type LegalSourceId, LEITURAS_COMPLEMENTARES, type ComplementaryReading, type ComplementaryReadingId } from "./legal-sources";
import { claimsDoGuia, fonteIdsDoGuia, guiaExigeRevisao } from "./claims";
import { GUIDE_MANIFESTS, manifesto, estadoRevisao, type GuideManifest, type EstadoRevisao } from "./manifests";
import { LEITURAS_POR_GUIA_EXPANSAO } from "./expansao/derivar";
import { guiaExpansao } from "./expansao/catalogo";
import { fontesAcrescentadas } from "./expansao/fontes-acrescentadas";

// ─── Fontes de um Guia, já resolvidas e ordenadas ──────────────────────

export interface FontesDoGuia {
  oficiais: LegalSource[];
  complementares: ComplementaryReading[];
}

/** Leitura complementar curada por Guia. Separada dos manifestos porque
    não fundamenta nada — é material de apoio. */
export const LEITURAS_POR_GUIA: Record<string, ComplementaryReadingId[]> = {
  "abrir-atividade": ["dfAbrirAtividade", "montepioAbrirAtividade", "santanderAbrirAtividade"],
  "ato-isolado": ["cgdAtoIsolado"],
  "regime-simplificado": ["occRegimeSimplificado", "pwcIrs"],
  "despesas-dedutiveis": ["occRegimeSimplificado", "pwcIrs"],
  "contabilidade-organizada": ["occRegisto", "pwcIrs"],
  "retencao-na-fonte": ["decoRetencao", "dfDispensa", "crnRetencao"],
  "pagamentos-por-conta": ["pwcIrs"],
  "iva-recibos-verdes": ["occIva", "snIva", "ixIva53"],
  "seguranca-social": ["pwcSs", "montepioSs", "crnSs", "decoSs", "snProtecao"],
  "acumulacao-emprego": ["snAcumulacao", "dfAcumulacao", "cgdAcumulacao", "vendusDependencia"],
  "clientes-estrangeiros": ["dfEstrangeiros", "snEstrangeiros", "comparajaEstrangeiros"],
  "cessar-atividade": ["decoCessar", "snCessacao", "dfLimites", "crnCessacao", "cgdCessacao"],
  "fatura-vs-recibo": ["occRegisto"],
  "merchant-of-record": ["paddleMor", "lemonMor"],
  "recibo-vencimento": ["montepioTabelas", "coverflexAlimentacao"],
  "subsidios-ferias-natal": ["coverflexSubsidioNatal", "coverflexSubsidioFerias"],
  "trabalho-suplementar": ["dfSuplementar"],
  "abrir-empresa": ["pwcIrc"],
  "unipessoal-vs-eni": ["pwcIrc", "pwcIrs"],
  irc: ["pwcIrc"],
  "tributacao-autonoma": ["occTa", "santanderTa"],
  "calendario-fiscal": [],
  "escaloes-irs": ["especialistaEscaloes", "pwcIrs"],
  "irs-jovem": ["decoIrsJovem", "coverflexIrsJovem", "santanderIrsJovem", "fedfinanceIrsJovem"],
  "ifici-nhr": ["pwcIrs"],
  "deducoes-coleta": ["montepioDeducoes", "pwcIrs"],
  "mais-valias": ["pwcIrs"],
  "tributacao-conjunta": ["pwcIrs"],
  "reembolso-irs": ["pwcIrs"],

  // ── Direitos e cobranças ────────────────────────────────────────────
  //    `LEITURAS_POR_GUIA` tinha entrada para 30 guias e para nenhum dos 14
  //    desta secção: o bloco de leitura complementar aparecia vazio nas
  //    páginas novas e cheio nas antigas, sem nada explicar a diferença.
  "fatura-nao-paga": ["occCobranca", "oaJurosMoratorios"],
  "juros-de-mora": ["oaJurosMoratorios", "occCobranca"],
  "cobrar-divida": ["occCobranca", "oaJurosMoratorios"],
  "recuperar-iva-incobravel": ["occIva", "pwcIrs"],
  "iva-de-caixa": ["occIva", "pwcIrs"],
  "contestar-liquidacao": ["decoDividasFiscais", "pwcIrs"],
  "prazos-fiscais-divida": ["decoDividasFiscais"],
  "juros-indemnizatorios": ["decoDividasFiscais", "oaJurosMoratorios"],
  "execucao-fiscal": ["decoDividasFiscais", "occPagamentoImpostos"],
  "plano-prestacoes": ["occPagamentoImpostos", "decoDividasFiscais"],
  "suspender-execucao": ["occPagamentoImpostos", "decoDividasFiscais"],
  "penhora-limites": ["decoDividasFiscais", "oaJurosMoratorios"],
  "reversao-gerentes": ["pwcIrc", "occPagamentoImpostos"],
  "falsos-recibos-verdes": ["actCondicoesTrabalho", "dgertRelacoesLaborais"],

  // ── Empresas (guias novos) ──────────────────────────────────────────
  "salario-gerente-ou-dividendos": ["pwcIrc", "pwcIrs", "pwcSs"],
  "distribuir-lucros": ["pwcIrc", "pwcIrs"],
  "pagamentos-por-conta-irc": ["pwcIrc"],
  "prejuizos-fiscais": ["pwcIrc"],
  "contratar-primeiro-trabalhador": ["pwcSs", "dgertRelacoesLaborais", "actCondicoesTrabalho"],
  "modelo-22-e-ies": ["pwcIrc", "occRegisto"],
  "fechar-empresa": ["pwcIrc", "occRegisto"],

  // ── Conta de outrem (guias novos) ───────────────────────────────────
  "baixa-medica": ["decoBaixaMedica", "montepioDoenca"],
  "licenca-parental": ["montepioParental", "dgertRelacoesLaborais"],
  "subsidio-desemprego": ["decoDesemprego", "pwcSs"],
  "fim-do-contrato": ["dgertRelacoesLaborais", "actCondicoesTrabalho"],
  "ferias-direitos": ["dgertRelacoesLaborais", "actCondicoesTrabalho"],
  "trabalho-noturno-e-turnos": ["dgertRelacoesLaborais", "dfSuplementar"],
  "faltas-ao-trabalho": ["dgertRelacoesLaborais", "actCondicoesTrabalho"],

  // ── Expansão editorial de agosto de 2026 ────────────────────────────
  //    A leitura complementar dos 112 guias novos vem curada no pacote,
  //    guia a guia. Entra por espalhamento para não haver aqui 112 linhas
  //    a repetir o que o catálogo já diz.
  ...(LEITURAS_POR_GUIA_EXPANSAO as Record<string, ComplementaryReadingId[]>),
};

/**
 * As fontes oficiais de um guia.
 *
 * Nos 57 guias antigos derivam das afirmações — uma afirmação sem fonte não
 * existe, e o bloco de fontes é a soma das fontes das afirmações.
 *
 * Nos guias da expansão a lista vem do pacote e é MAIOR do que a base legal
 * da resposta curta: `fontes_oficiais` é `base_legal` mais os portais
 * oficiais (Modelo 3, formulários RFI, páginas de serviço). O leitor que
 * vai executar o procedimento precisa do portal tanto quanto do artigo, e é
 * de `fontes_oficiais.length` que sai a contagem «{n} fontes oficiais» na
 * barra de estado — como o pacote exige.
 */
export function fontesDoGuia(slug: string): FontesDoGuia {
  const ordem: Record<string, number> = { AT: 0, DR: 1, SS: 2, GOV: 3, EU: 4, OTHER_OFFICIAL: 5 };
  const daExpansao = guiaExpansao(slug);
  const doPacote = daExpansao
    ? [...daExpansao.fontesOficiais, ...fontesAcrescentadas(slug)]
    : undefined;
  const ids = (doPacote as LegalSourceId[] | undefined) ?? fonteIdsDoGuia(slug);
  const oficiais = ids
    .map((id: LegalSourceId) => legalSource(id))
    .sort((a, b) => ordem[a.authority] - ordem[b.authority] || a.title.localeCompare(b.title, "pt-PT"));

  const complementares = (LEITURAS_POR_GUIA[slug] ?? []).map((id) => LEITURAS_COMPLEMENTARES[id]);

  return { oficiais, complementares };
}

// ─── Cabeçalho de confiança (ponto 9.4) ────────────────────────────────

export interface ConfiancaDoGuia {
  estado: EstadoRevisao;
  revistoEm: string;
  aplicavelDe: string;
  aplicavelAte?: string;
  numeroFontesOficiais: number;
  afirmacoesPorRever: number;
}

export function confiancaDoGuia(slug: string): ConfiancaDoGuia | null {
  const m = manifesto(slug);
  if (!m) return null;
  const exigeRevisao = guiaExigeRevisao(slug);
  return {
    estado: estadoRevisao(slug, exigeRevisao),
    revistoEm: m.lastReviewedAt,
    aplicavelDe: m.effectiveFrom,
    aplicavelAte: m.effectiveTo,
    numeroFontesOficiais: fontesDoGuia(slug).oficiais.length,
    afirmacoesPorRever: claimsDoGuia(slug).filter((c) => c.confidence === "review_required").length,
  };
}

// ─── Pesquisa (ponto 9.2) ──────────────────────────────────────────────

/** Minúsculas, sem acentos e sem pontuação — para que "acao isolada",
    "ação isolada" e "Acto Isolado" cheguem todos ao mesmo sítio. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface EntradaIndice {
  slug: string;
  /** Campos por ordem decrescente de peso. */
  titulo: string;
  aliases: string;
  /** Os sinónimos um a um, normalizados — para reconhecer quando a consulta
      É um deles, e não apenas quando aparece algures no meio. */
  listaAliases: string[];
  corpo: string;
}

const INDICE: EntradaIndice[] = GUIDE_MANIFESTS.map((m) => ({
  slug: m.slug,
  titulo: normalizar(`${m.title} ${m.navLabel}`),
  aliases: normalizar(m.seo.aliases.join(" ")),
  listaAliases: m.seo.aliases.map(normalizar),
  corpo: normalizar(
    [
      m.descricao,
      m.seo.description,
      m.categoria,
      m.hub,
      ...claimsDoGuia(m.id).map((c) => c.statement),
      // Artigos legais: "78.º-A" tem de ser encontrável por "78 A" e "artigo 78".
      ...fonteIdsDoGuia(m.id).map((id) => { const f = legalSource(id); return `${f.title} ${f.article ?? ""}`; }),
    ].join(" "),
  ),
}));

export interface ResultadoPesquisa {
  manifesto: GuideManifest;
  pontuacao: number;
}

/** Pesquisa por tarefa e linguagem comum, não só por texto literal do
    título. Cada termo tem de aparecer algures (AND); a pontuação favorece
    títulos e sinónimos. */
export function pesquisarGuias(consulta: string, limite = 12): ResultadoPesquisa[] {
  const frase = normalizar(consulta);
  const termos = frase.split(" ").filter((t) => t.length >= 2);
  if (termos.length === 0) return [];

  const resultados: ResultadoPesquisa[] = [];
  for (const e of INDICE) {
    let pontuacao = 0;
    let todosPresentes = true;

    // A consulta INTEIRA vale mais do que a soma das palavras soltas.
    //
    // Com 57 guias a pontuação por termo chegava. Com 169 deixou de chegar:
    // "passar recibo" é um sinónimo declarado de `fatura-vs-recibo`, mas
    // passou a perder para um guia cujo TÍTULO calha ter as duas palavras
    // ("Reformado a passar recibos verdes") — dois acertos de título valem
    // 20, um sinónimo exato valia 12. Quem escreve "passar recibo" quer
    // saber que documento emitir, não o caso particular de um pensionista.
    //
    // Um sinónimo que é exatamente a consulta é o sinal mais forte que este
    // índice tem: alguém previu aquela pergunta e apontou-lhe um guia.
    if (e.listaAliases.includes(frase)) pontuacao += 30;
    else if (e.aliases.includes(frase)) pontuacao += 8;
    if (e.titulo.includes(frase)) pontuacao += 12;

    for (const termo of termos) {
      const noTitulo = e.titulo.includes(termo);
      const nosAliases = e.aliases.includes(termo);
      const noCorpo = e.corpo.includes(termo);
      if (!noTitulo && !nosAliases && !noCorpo) {
        todosPresentes = false;
        break;
      }
      pontuacao += noTitulo ? 10 : 0;
      pontuacao += nosAliases ? 6 : 0;
      pontuacao += noCorpo ? 1 : 0;
    }

    if (todosPresentes) {
      const m = manifesto(e.slug);
      if (m) resultados.push({ manifesto: m, pontuacao });
    }
  }

  return resultados.sort((a, b) => b.pontuacao - a.pontuacao).slice(0, limite);
}

export * from "./historico";
