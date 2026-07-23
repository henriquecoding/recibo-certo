// ─────────────────────────────────────────────────────────────────────
//  Motor de Heranças e Sucessões (Portugal)
//  ---------------------------------------------------------------------
//  Portugal NÃO tem imposto sucessório (abolido em 2004). Este motor tem
//  duas camadas:
//    1. PARTILHA (Direito Civil): meação do cônjuge + quinhão de cada
//       herdeiro (sucessão legítima OU testamento com quota disponível).
//    2. IMPOSTO DO SELO (Fiscal): 10% por herdeiro NÃO isento; a família
//       direta (cônjuge/unido de facto, descendentes, ascendentes) é isenta.
//
//  Todas as taxas e frações vêm da fonte de verdade `fiscal-data.ts`. Onde a
//  exatidão depende de dados que o utilizador não dá (testamento complexo,
//  avaliações, representação detalhada), o motor devolve um AVISO e remete
//  para notário/advogado/contabilista — nunca inventa um resultado.
// ─────────────────────────────────────────────────────────────────────

import {
  IS_TRANSMISSAO_GRATUITA,
  IS_DOACAO_IMOVEL,
  IS_DOACAO_MINIMO_ISENTO,
  MEACAO_FRACAO,
  CONJUGE_QUOTA_MINIMA,
  CONJUGE_ASCENDENTES_QUOTAS,
  LEGITIMA,
  relacaoIsentaSelo,
  MAIS_VALIAS_IMOBILIARIO_INCLUSAO,
  type RelacaoSucessoria,
  type ConfigLegitima,
} from "@/lib/fiscal-data";
import { irsProgressivo } from "@/lib/fiscal";

export type { RelacaoSucessoria, ConfigLegitima } from "@/lib/fiscal-data";

const sanitize = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ─── Tipos de entrada ──────────────────────────────────────────────────

export type RegimeBens =
  | "comunhao_adquiridos"
  | "comunhao_geral"
  | "separacao"
  | "sem_conjuge";

/** Um imóvel do acervo, avaliado pelo VPT (caderneta predial). */
export interface ImovelHeranca {
  rotulo?: string;
  vpt: number;
  /** Bem comum do casal (relevante só em regime de comunhão). */
  comum: boolean;
}

export interface Patrimonio {
  imoveis: ImovelHeranca[];
  /** Outros bens comuns do casal (depósitos, veículos, etc.). */
  outrosBensComuns: number;
  /** Bens próprios do falecido (herdados, anteriores ao casamento, etc.). */
  outrosBensProprios: number;
  /** Dívidas e encargos da herança (deduzidos ao acervo). */
  dividas: number;
}

export type Ascendentes = "nenhum" | "pais" | "avos";

/** Destino da quota disponível quando há testamento. */
export interface Testamento {
  usaQuotaDisponivel: boolean;
  /** Relação do beneficiário da quota disponível com o falecido. */
  beneficiario: RelacaoSucessoria;
  /** Fração da quota disponível efetivamente deixada (0–1; defeito 1). */
  fracao?: number;
  rotuloBeneficiario?: string;
}

export interface ConfigFamiliar {
  temConjuge: boolean;
  /** Casado (herdeiro legitimário) vs unido de facto (só herda por testamento). */
  vinculoConjuge: "casado" | "unido_facto";
  regimeBens: RegimeBens;
  /** Filhos vivos (descendentes de 1.º grau). */
  nFilhos: number;
  /** Ramos representados por netos de um filho pré-falecido (cada ramo conta como 1). */
  nRamosNetos: number;
  /** Ascendentes vivos (só relevam se não houver descendentes). */
  ascendentes: Ascendentes;
  /**
   * Quantos ascendentes do grau indicado estão vivos — cada um é herdeiro
   * autónomo e reparte a quota dos ascendentes em partes iguais (Art. 2142.º/
   * 2136.º CC). Pais: 1 ou 2. Avós: 1 a 4. Defeito: 1 (retrocompatível).
   */
  nAscendentes?: number;
  testamento?: Testamento;
}

/** Máximo de ascendentes vivos do grau (2 pais; 4 avós). */
function maxAscendentes(grau: Ascendentes): number {
  return grau === "avos" ? 4 : grau === "pais" ? 2 : 0;
}

/** Nº de ascendentes vivos, limitado ao máximo do grau (mínimo 1 se houver grau). */
function nAscendentesVivos(config: ConfigFamiliar): number {
  if (config.ascendentes === "nenhum") return 0;
  const max = maxAscendentes(config.ascendentes);
  return Math.min(max, Math.max(1, Math.floor(config.nAscendentes ?? 1)));
}

// ─── Camada 1: Meação ───────────────────────────────────────────────────

export interface ResultadoMeacao {
  totalComum: number;
  totalProprio: number;
  meacaoConjuge: number;
  herancaBruta: number;
  herancaLiquida: number;
  dividas: number;
}

/**
 * Separa a meação do cônjuge (metade dos bens comuns, em regime de comunhão)
 * e apura a herança líquida (acervo do falecido − dívidas). A meação NÃO é
 * herança nem é tributada.
 */
export function calcularMeacao(
  patrimonio: Patrimonio,
  regime: RegimeBens,
  vinculoConjuge: "casado" | "unido_facto" = "casado",
): ResultadoMeacao {
  const imoveisComuns = patrimonio.imoveis.filter((i) => i.comum).reduce((s, i) => s + sanitize(i.vpt), 0);
  const imoveisProprios = patrimonio.imoveis.filter((i) => !i.comum).reduce((s, i) => s + sanitize(i.vpt), 0);
  const totalComum = imoveisComuns + sanitize(patrimonio.outrosBensComuns);
  const totalProprio = imoveisProprios + sanitize(patrimonio.outrosBensProprios);
  const dividas = sanitize(patrimonio.dividas);

  // Só há meação num casamento em comunhão. União de facto e separação não têm.
  const temMeacao =
    vinculoConjuge === "casado" &&
    (regime === "comunhao_adquiridos" || regime === "comunhao_geral");

  const meacaoConjuge = temMeacao ? totalComum * MEACAO_FRACAO.value : 0;
  const herancaBruta = temMeacao
    ? totalProprio + totalComum * (1 - MEACAO_FRACAO.value)
    : totalProprio + totalComum;
  const herancaLiquida = Math.max(0, herancaBruta - dividas);

  return {
    totalComum: round2(totalComum),
    totalProprio: round2(totalProprio),
    meacaoConjuge: round2(meacaoConjuge),
    herancaBruta: round2(herancaBruta),
    herancaLiquida: round2(herancaLiquida),
    dividas: round2(dividas),
  };
}

// ─── Camada 1: Partilha (quinhão de cada herdeiro) ──────────────────────

export interface Quinhao {
  id: string;
  rotulo: string;
  relacao: RelacaoSucessoria;
  fracao: number;
  valor: number;
  fundamento: string;
}

export interface ResultadoPartilha {
  herancaLiquida: number;
  temTestamento: boolean;
  legitimaFracao: number;
  disponivelFracao: number;
  configLegitima: ConfigLegitima | null;
  quinhoes: Quinhao[];
  avisos: string[];
}

/** Número de estirpes de descendentes (filhos vivos + ramos de netos). */
function ramosDescendentes(config: ConfigFamiliar): number {
  return Math.max(0, Math.floor(config.nFilhos)) + Math.max(0, Math.floor(config.nRamosNetos));
}

/** Cônjuge casado é herdeiro legitimário; unido de facto NÃO é (só por testamento). */
function conjugeHerdeiro(config: ConfigFamiliar): boolean {
  return config.temConjuge && config.vinculoConjuge === "casado";
}

/** Resolve a configuração de legítima aplicável (para a quota disponível). */
export function resolverConfigLegitima(config: ConfigFamiliar): ConfigLegitima | null {
  const conj = conjugeHerdeiro(config);
  const nDesc = ramosDescendentes(config);
  if (conj && nDesc > 0) return "conjuge_descendentes";
  if (conj && config.ascendentes !== "nenhum") return "conjuge_ascendentes";
  if (conj) return "conjuge_so";
  if (nDesc === 1) return "descendentes_1";
  if (nDesc >= 2) return "descendentes_2mais";
  if (config.ascendentes === "pais") return "ascendentes_pais";
  if (config.ascendentes === "avos") return "ascendentes_avos";
  return null;
}

interface QuotaBase {
  rotulo: string;
  relacao: RelacaoSucessoria;
  fracao: number;
  fundamento: string;
}

/**
 * Quotas da sucessão legítima (sem testamento) — proporções de cada herdeiro
 * na herança, conforme os Art. 2133.º–2144.º do Código Civil.
 */
function quotasSucessaoLegitima(config: ConfigFamiliar): { quotas: QuotaBase[]; avisos: string[] } {
  const avisos: string[] = [];
  const conj = conjugeHerdeiro(config);
  const nDesc = ramosDescendentes(config);
  const quotas: QuotaBase[] = [];

  if (config.temConjuge && config.vinculoConjuge === "unido_facto") {
    avisos.push(
      "A união de facto NÃO confere direitos sucessórios automáticos: o companheiro só herda se houver testamento (embora possa ter direito de habitação da casa de morada). É, ainda assim, isento de Imposto do Selo.",
    );
  }

  const rotuloFilhos = (i: number, total: number) => (total === 1 ? "Filho(a)" : `Filho(a) ${i + 1}`);
  const filhosVivos = Math.max(0, Math.floor(config.nFilhos));
  const ramosNetos = Math.max(0, Math.floor(config.nRamosNetos));

  const distribuirDescendentes = (fracaoTotal: number, fundamento: string) => {
    for (let i = 0; i < filhosVivos; i++) {
      quotas.push({ rotulo: rotuloFilhos(i, nDesc), relacao: "filho", fracao: fracaoTotal / nDesc, fundamento });
    }
    for (let i = 0; i < ramosNetos; i++) {
      quotas.push({
        rotulo: ramosNetos === 1 ? "Netos (representação)" : `Netos — ramo ${i + 1} (representação)`,
        relacao: "neto",
        fracao: fracaoTotal / nDesc,
        fundamento: "Art. 2138.º–2140.º CC (representação)",
      });
    }
  };

  // Ascendentes: cada progenitor/avô vivo é herdeiro autónomo e reparte a quota
  // dos ascendentes em partes iguais por cabeça (Art. 2136.º/2142.º CC). O
  // casamento entre os progenitores é irrelevante — conta a filiação.
  const grauPais = config.ascendentes === "pais";
  const nAsc = nAscendentesVivos(config);
  const rotuloAscendente = (i: number) => {
    if (nAsc <= 1) return grauPais ? "Progenitor(a)" : "Avô/avó";
    return grauPais ? `Progenitor(a) ${i + 1}` : `Avô/avó ${i + 1}`;
  };
  const distribuirAscendentes = (fracaoTotal: number, fundamento: string) => {
    for (let i = 0; i < nAsc; i++) {
      quotas.push({
        rotulo: rotuloAscendente(i),
        relacao: grauPais ? "pai" : "avo",
        fracao: fracaoTotal / nAsc,
        fundamento,
      });
    }
    if (!grauPais && nAsc > 1) {
      avisos.push(
        "Com avós, a herança divide-se primeiro em duas metades — linha paterna e linha materna — e só depois por cabeça dentro de cada linha (Art. 2142.º CC). Se os dois lados não tiverem o mesmo número de avós vivos, a partilha exata difere da divisão por cabeça mostrada aqui — confirma com um notário.",
      );
    }
  };

  if (conj && nDesc > 0) {
    // Cônjuge + descendentes: por cabeça, cônjuge nunca < 1/4 (Art. 2139.º).
    const cabecas = 1 + nDesc;
    const porCabeca = 1 / cabecas;
    const fracaoConjuge = Math.max(porCabeca, CONJUGE_QUOTA_MINIMA.value);
    quotas.push({ rotulo: "Cônjuge", relacao: "conjuge", fracao: fracaoConjuge, fundamento: "Art. 2139.º CC" });
    distribuirDescendentes(1 - fracaoConjuge, "Art. 2139.º CC");
  } else if (conj && config.ascendentes !== "nenhum") {
    // Cônjuge + ascendentes: cônjuge 2/3, ascendentes 1/3 (Art. 2142.º).
    quotas.push({
      rotulo: "Cônjuge",
      relacao: "conjuge",
      fracao: CONJUGE_ASCENDENTES_QUOTAS.conjuge,
      fundamento: CONJUGE_ASCENDENTES_QUOTAS.base,
    });
    distribuirAscendentes(CONJUGE_ASCENDENTES_QUOTAS.ascendentes, CONJUGE_ASCENDENTES_QUOTAS.base);
  } else if (conj) {
    // Só cônjuge (Art. 2144.º).
    quotas.push({ rotulo: "Cônjuge", relacao: "conjuge", fracao: 1, fundamento: "Art. 2144.º CC" });
  } else if (nDesc > 0) {
    // Só descendentes, por cabeça (Art. 2136.º–2138.º).
    distribuirDescendentes(1, "Art. 2136.º–2138.º CC");
  } else if (config.ascendentes !== "nenhum") {
    // Só ascendentes (Art. 2133.º/2142.º) — repartidos por cabeça.
    distribuirAscendentes(1, "Art. 2133.º/2142.º CC");
  } else {
    // Sem cônjuge e sem legitimários: irmãos/colaterais e, na falta, o Estado.
    avisos.push(
      "Sem cônjuge, descendentes ou ascendentes, a herança segue para irmãos e outros colaterais até ao 4.º grau; na falta de todos, para o Estado (Art. 2133.º e 2152.º CC). Indica os herdeiros no modo completo para uma estimativa.",
    );
  }

  return { quotas, avisos };
}

/**
 * Partilha completa: aplica testamento (quota disponível) ou sucessão
 * legítima, e devolve o quinhão de cada herdeiro em € e %.
 */
export function calcularPartilha(config: ConfigFamiliar, herancaLiquida: number): ResultadoPartilha {
  const heranca = sanitize(herancaLiquida);
  const avisos: string[] = [];
  const configLegitima = resolverConfigLegitima(config);
  const legitimaFracao = configLegitima ? LEGITIMA[configLegitima].fracao : 0;
  const disponivelFracao = configLegitima ? 1 - legitimaFracao : 1;

  const base = quotasSucessaoLegitima(config);
  avisos.push(...base.avisos);

  const testamento = config.testamento;
  const usaTestamento = !!testamento?.usaQuotaDisponivel && configLegitima !== null;

  let quotasFinais: QuotaBase[];

  if (usaTestamento && testamento) {
    // Legitimários repartem a LEGÍTIMA na proporção da sucessão legítima; a
    // quota disponível (ou a fração dela deixada) vai para o beneficiário.
    const fracaoDeixada = Math.min(1, Math.max(0, testamento.fracao ?? 1));
    const disponivelDeixada = disponivelFracao * fracaoDeixada;
    const legitimaEfetiva = 1 - disponivelDeixada; // legítima + parte não deixada da disponível

    quotasFinais = base.quotas.map((q) => ({ ...q, fracao: q.fracao * legitimaEfetiva }));

    const beneficiarioExistente = quotasFinais.find((q) => q.relacao === testamento.beneficiario);
    const rotuloBenef =
      testamento.rotuloBeneficiario ??
      `Beneficiário do testamento${beneficiarioExistente ? "" : ` (${testamento.beneficiario})`}`;
    quotasFinais.push({
      rotulo: rotuloBenef,
      relacao: testamento.beneficiario,
      fracao: disponivelDeixada,
      fundamento: "Quota disponível — testamento (Art. 2156.º/2179.º CC)",
    });
    avisos.push(
      "Com testamento, a legítima é repartida pelos herdeiros legitimários e a quota disponível segue a vontade do testador. Um testamento pode ter deixas específicas por bem que este modelo simplifica — confirma com um notário/advogado.",
    );
  } else {
    quotasFinais = base.quotas;
    if (testamento?.usaQuotaDisponivel && configLegitima === null) {
      avisos.push(
        "Sem herdeiros legitimários, toda a herança é quota disponível e pode ser deixada livremente por testamento.",
      );
    }
  }

  const quinhoes: Quinhao[] = quotasFinais
    .filter((q) => q.fracao > 1e-9)
    .map((q, i) => ({
      id: `q${i}`,
      rotulo: q.rotulo,
      relacao: q.relacao,
      fracao: q.fracao,
      valor: round2(heranca * q.fracao),
      fundamento: q.fundamento,
    }));

  if (heranca === 0) {
    avisos.push("A herança líquida é zero (ou as dívidas igualam/excedem o acervo): não há valor a partilhar.");
  }

  return {
    herancaLiquida: round2(heranca),
    temTestamento: usaTestamento,
    legitimaFracao,
    disponivelFracao,
    configLegitima,
    quinhoes,
    avisos,
  };
}

// ─── Camada 2: Imposto do Selo (heranças) ───────────────────────────────

export interface SeloHerdeiro {
  id: string;
  rotulo: string;
  relacao: RelacaoSucessoria;
  isento: boolean;
  taxa: number;
  base: number;
  imposto: number;
}

export interface ResultadoSeloHeranca {
  linhas: SeloHerdeiro[];
  total: number;
  todosIsentos: boolean;
}

/**
 * Imposto do Selo por herdeiro numa herança (transmissão por morte):
 * família direta isenta (Art. 6.º al. e CIS); restantes 10% (Verba 1.2).
 * A Verba 1.1 (0,8% sobre imóveis) NÃO se aplica a heranças.
 */
export function impostoSeloHeranca(quinhoes: Quinhao[]): ResultadoSeloHeranca {
  const linhas: SeloHerdeiro[] = quinhoes.map((q) => {
    const isento = relacaoIsentaSelo(q.relacao);
    const taxa = isento ? 0 : IS_TRANSMISSAO_GRATUITA.value;
    return {
      id: q.id,
      rotulo: q.rotulo,
      relacao: q.relacao,
      isento,
      taxa,
      base: q.valor,
      imposto: round2(q.valor * taxa),
    };
  });
  const total = round2(linhas.reduce((s, l) => s + l.imposto, 0));
  return { linhas, total, todosIsentos: total === 0 };
}

// ─── Resultado agregado (para a UI) ─────────────────────────────────────

export interface ResultadoHeranca {
  meacao: ResultadoMeacao;
  partilha: ResultadoPartilha;
  selo: ResultadoSeloHeranca;
  avisos: string[];
}

/** Une meação + partilha + Imposto do Selo num único resultado. */
export function simularHeranca(config: ConfigFamiliar, patrimonio: Patrimonio): ResultadoHeranca {
  const meacao = calcularMeacao(patrimonio, config.regimeBens, config.vinculoConjuge);
  const partilha = calcularPartilha(config, meacao.herancaLiquida);
  const selo = impostoSeloHeranca(partilha.quinhoes);
  return { meacao, partilha, selo, avisos: partilha.avisos };
}

// ─── Ramo doação em vida (comparação) ───────────────────────────────────

export interface DoacaoBem {
  tipo: "imovel" | "outro";
  valor: number;
}

export interface ResultadoSeloDoacao {
  totalBens: number;
  imoveis: number;
  isentoVerba12: boolean;
  verba12: number;
  verba11: number;
  total: number;
  avisos: string[];
}

/**
 * Imposto do Selo numa DOAÇÃO em vida: Verba 1.2 (10%) — isenta para família
 * direta e para valores até 500€; e Verba 1.1 (0,8% sobre imóveis) — devida
 * MESMO por família direta, ao contrário da herança.
 */
export function impostoSeloDoacao(bens: DoacaoBem[], relacao: RelacaoSucessoria): ResultadoSeloDoacao {
  const totalBens = bens.reduce((s, b) => s + sanitize(b.valor), 0);
  const imoveis = bens.filter((b) => b.tipo === "imovel").reduce((s, b) => s + sanitize(b.valor), 0);
  const isento = relacaoIsentaSelo(relacao);
  const acimaMinimo = totalBens > IS_DOACAO_MINIMO_ISENTO.value;

  const verba12 = isento || !acimaMinimo ? 0 : round2(totalBens * IS_TRANSMISSAO_GRATUITA.value);
  const verba11 = round2(imoveis * IS_DOACAO_IMOVEL.value);

  const avisos: string[] = [];
  if (isento && imoveis > 0) {
    avisos.push(
      "Mesmo entre família direta, a DOAÇÃO de imóveis paga 0,8% de Imposto do Selo (Verba 1.1) — ao contrário da herança, que é totalmente isenta.",
    );
  }
  if (!acimaMinimo && !isento) {
    avisos.push("Doações de valor até 500€ não são tributadas (Verba 1.2).");
  }

  return {
    totalBens: round2(totalBens),
    imoveis: round2(imoveis),
    isentoVerba12: isento,
    verba12,
    verba11,
    total: round2(verba12 + verba11),
    avisos,
  };
}

export interface ComparacaoHerancaDoacao {
  relacao: RelacaoSucessoria;
  impostoHeranca: number;
  impostoDoacao: number;
  diferenca: number;
  herancaMaisBarata: boolean;
  detalheDoacao: ResultadoSeloDoacao;
  nota: string;
}

/**
 * Compara transmitir os mesmos bens por HERANÇA (0 para família) vs por
 * DOAÇÃO em vida (0,8% sobre imóveis para família; 10%+0,8% para não família).
 */
export function compararHerancaVsDoacao(
  bens: DoacaoBem[],
  relacao: RelacaoSucessoria,
): ComparacaoHerancaDoacao {
  const detalheDoacao = impostoSeloDoacao(bens, relacao);
  const total = bens.reduce((s, b) => s + sanitize(b.valor), 0);
  // Numa herança, a família direta é totalmente isenta; não-família paga 10%.
  const impostoHeranca = relacaoIsentaSelo(relacao) ? 0 : round2(total * IS_TRANSMISSAO_GRATUITA.value);
  const diferenca = round2(detalheDoacao.total - impostoHeranca);

  let nota: string;
  if (relacaoIsentaSelo(relacao)) {
    nota =
      detalheDoacao.imoveis > 0
        ? "Herdar é isento; doar os imóveis em vida custa 0,8%. Fora do imóvel, ambas são isentas para família direta."
        : "Sem imóveis, herdar e doar são ambas isentas para a família direta.";
  } else {
    nota = "Para quem não é família direta, ambas pagam 10%; a doação de imóveis acrescenta ainda 0,8%.";
  }

  return {
    relacao,
    impostoHeranca,
    impostoDoacao: detalheDoacao.total,
    diferenca,
    herancaMaisBarata: impostoHeranca <= detalheDoacao.total,
    detalheDoacao,
    nota,
  };
}

// ─── Mais-valias futuras de imóvel herdado (reutiliza IRS) ───────────────

export interface MaisValiasHerancaInput {
  /** Valor considerado para Imposto do Selo à data do óbito = VPT (Art. 45.º CIRS). */
  vptHeranca: number;
  valorVenda: number;
  despesas?: number;
  residente?: boolean;
  /** Rendimento coletável do resto do agregado, para estimar a taxa marginal. */
  rendimentoBase?: number;
}

export interface MaisValiasHerancaResult {
  valorAquisicao: number;
  ganho: number;
  incluido: number;
  impostoEstimado: number;
  taxaEfetiva: number;
  avisos: string[];
}

/**
 * Estima o IRS de mais-valias se um imóvel herdado for vendido. Valor de
 * aquisição = valor para Imposto do Selo/VPT (Art. 45.º CIRS). Residentes:
 * só 50% do ganho é englobado (Art. 43.º); o imposto é a diferença marginal
 * de IRS sobre o rendimento-base. É uma estimativa — sem coeficiente de
 * desvalorização detalhado nem isenções de reinvestimento.
 */
export function maisValiasImovelHerdado(input: MaisValiasHerancaInput): MaisValiasHerancaResult {
  const valorAquisicao = sanitize(input.vptHeranca);
  const ganho = Math.max(0, sanitize(input.valorVenda) - valorAquisicao - sanitize(input.despesas ?? 0));
  const residente = input.residente ?? true;
  const incluido = residente ? ganho * MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value : ganho;
  const base = sanitize(input.rendimentoBase ?? 0);
  const impostoEstimado = Math.max(0, round2(irsProgressivo(base + incluido) - irsProgressivo(base)));

  const avisos = [
    "Estimativa: usa o VPT como valor de aquisição (Art. 45.º CIRS) e não aplica o coeficiente de desvalorização da moeda nem eventuais isenções (habitação própria/reinvestimento). Confirma com um contabilista.",
  ];
  if (!residente) {
    avisos.push("Para não residentes, confirma a inclusão aplicável (desde 2023, também 50% em muitos casos).");
  }

  return {
    valorAquisicao: round2(valorAquisicao),
    ganho: round2(ganho),
    incluido: round2(incluido),
    impostoEstimado,
    taxaEfetiva: ganho > 0 ? impostoEstimado / ganho : 0,
    avisos,
  };
}
