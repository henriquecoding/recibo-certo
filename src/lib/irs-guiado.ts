// ═══════════════════════════════════════════════════════════════════════
//  SIMULADOR GUIADO DE IRS — metadados, validação e completude
//
//  Lógica pura (sem UI) do simulador por etapas: o catálogo de categorias de
//  rendimento com a respetiva correspondência fiscal (anexos) e explicações
//  pedagógicas, o motor de validação (erros / avisos / oportunidades) baseado
//  em regras legais, o motor de completude (estado por módulo + pontuação) e
//  o mapeamento do estado do formulário para o motor de cálculo.
//
//  Os valores fiscais vêm sempre de `fiscal-data.ts` (fonte de verdade).
// ═══════════════════════════════════════════════════════════════════════

import type { DeclaracaoInput } from "./fiscal";
import type { TipoAtividade, DuracaoArrendamento } from "./fiscal-data";
import {
  IVA_ISENCAO_EXCESSO,
  REGIME_SIMPLIFICADO,
  MAIS_VALIAS_MOBILIARIAS_TAXA,
  CRIPTO_ISENCAO_DIAS,
  MAIS_VALIAS_IMOBILIARIO_INCLUSAO,
  ESCALOES_IRS,
} from "./fiscal-data";
import { fmt, pct } from "./format";

// ─── Categorias de rendimento (triagem) ─────────────────────────────────────
export type RendimentoId =
  | "salarios"
  | "pensoes"
  | "independente"
  | "capitais"
  | "investimentos"
  | "cripto"
  | "imoveis"
  | "imoveisVenda"
  | "estrangeiros";

export interface ModuloMeta {
  id: RendimentoId;
  titulo: string;
  /** Descrição curta para o cartão de triagem. */
  sub: string;
  anexo: string;
  anexoNome: string;
  /** Explicação detalhada (mostrada ao clicar/passar o cursor). */
  explicacao: string;
  /** Identificador do ícone (mapeado na UI). */
  icone: string;
}

/**
 * Catálogo das categorias de rendimento. A ordem define a apresentação na
 * triagem. Cada entrada explica o que é, porque existe, o que se declara e
 * como a informação é usada — e a correspondência com o anexo oficial.
 */
export const MODULOS: ModuloMeta[] = [
  {
    id: "salarios",
    titulo: "Salários",
    sub: "Trabalho por conta de outrem",
    anexo: "Anexo A",
    anexoNome: "Trabalho dependente",
    icone: "Briefcase",
    explicacao:
      "Rendimentos de trabalho dependente (categoria A): vencimentos, subsídios e prémios pagos por entidades empregadoras. Declaram-se no Anexo A o rendimento bruto, as retenções de IRS e os descontos para a Segurança Social. Sobre estes rendimentos aplica-se uma dedução específica (Art. 25.º CIRS) antes do englobamento às taxas progressivas.",
  },
  {
    id: "pensoes",
    titulo: "Pensões",
    sub: "Velhice, invalidez, sobrevivência",
    anexo: "Anexo A",
    anexoNome: "Pensões",
    icone: "User",
    explicacao:
      "Pensões de velhice, invalidez, sobrevivência ou de alimentos (categoria H). Declaram-se no Anexo A e beneficiam de uma dedução específica própria (Art. 53.º CIRS). São englobadas com os restantes rendimentos para o cálculo do IRS.",
  },
  {
    id: "independente",
    titulo: "Trabalho independente",
    sub: "Recibos verdes / atividade empresarial",
    anexo: "Anexo B",
    anexoNome: "Trabalho independente",
    icone: "Invoice",
    explicacao:
      "Rendimentos da categoria B (recibos verdes). No regime simplificado aplica-se um coeficiente ao rendimento bruto (Art. 31.º CIRS) que presume as despesas; em contabilidade organizada tributa-se o lucro real. Declara-se no Anexo B (simplificado) ou Anexo C (contabilidade organizada).",
  },
  {
    id: "capitais",
    titulo: "Dividendos e juros",
    sub: "Distribuições, depósitos, obrigações",
    anexo: "Anexo E",
    anexoNome: "Rendimentos de capitais",
    icone: "Coin",
    explicacao:
      "Rendimentos de capitais (categoria E): dividendos de ações, juros de depósitos, certificados e obrigações. São sujeitos a taxa liberatória de 28% (Art. 71.º CIRS); pode optar-se pelo englobamento, caso em que só 50% dos dividendos de entidades residentes é considerado (Art. 40.º-A). Declaram-se no Anexo E.",
  },
  {
    id: "investimentos",
    titulo: "Ações, ETF e fundos",
    sub: "Mais-valias de valores mobiliários",
    anexo: "Anexo G",
    anexoNome: "Mais-valias mobiliárias",
    icone: "ChartProjection",
    explicacao:
      "Mais-valias de valores mobiliários — ações, ETF, fundos e obrigações (categoria G). Tributa-se o saldo positivo anual (mais-valias menos menos-valias) à taxa de 28% (Art. 72.º CIRS). O englobamento é obrigatório quando os ativos foram detidos menos de 365 dias e o rendimento coletável atinge o último escalão. Declara-se no Anexo G.",
  },
  {
    id: "cripto",
    titulo: "Criptoativos",
    sub: "Ganhos com criptomoedas",
    anexo: "Anexo G",
    anexoNome: "Criptoativos",
    icone: "Globe",
    explicacao:
      "Ganhos com criptoativos (categoria G). Os ativos detidos há 365 dias ou mais estão excluídos de tributação (Art. 10.º n.º 19 CIRS); os detidos há menos de 365 dias são tributados a 28%. A conversão entre criptoativos não realiza ganho — só a venda para moeda com curso legal ou bens. Declara-se no Anexo G.",
  },
  {
    id: "imoveis",
    titulo: "Rendas de imóveis",
    sub: "Arrendamento",
    anexo: "Anexo F",
    anexoNome: "Rendimentos prediais",
    icone: "Home",
    explicacao:
      "Rendas de imóveis arrendados (categoria F). Tributam-se as rendas líquidas das despesas dedutíveis (Art. 41.º CIRS: conservação, IMI, condomínio, seguros) à taxa autónoma de 25% (habitação) ou 28% (não habitacional), com reduções para contratos habitacionais mais longos. Pode optar-se pelo englobamento. Declaram-se no Anexo F.",
  },
  {
    id: "imoveisVenda",
    titulo: "Venda de imóveis",
    sub: "Mais-valias imobiliárias",
    anexo: "Anexo G",
    anexoNome: "Mais-valias imobiliárias",
    icone: "Building",
    explicacao:
      "Mais-valias da venda de imóveis (categoria G). O ganho é a diferença entre o valor de venda e o de aquisição (corrigido), deduzidas as despesas com a compra, a venda e obras de valorização. Para residentes só 50% do saldo é tributado, englobado às taxas progressivas (Art. 43.º n.º 2). O reinvestimento em habitação própria permanente pode excluir a tributação (Art. 10.º n.º 5). Declara-se no Anexo G.",
  },
  {
    id: "estrangeiros",
    titulo: "Rendimentos estrangeiros",
    sub: "Obtidos fora de Portugal",
    anexo: "Anexo J",
    anexoNome: "Rendimentos no estrangeiro",
    icone: "Plane",
    explicacao:
      "Rendimentos obtidos no estrangeiro (Anexo J): trabalho, pensões, capitais, rendas ou mais-valias. Como residente fiscal em Portugal declaram-se aqui todos esses rendimentos, com direito a crédito de imposto por dupla tributação internacional (Art. 81.º CIRS) — deduz-se o menor entre o imposto pago lá fora e a fração da coleta portuguesa correspondente.",
  },
];

export function moduloMeta(id: RendimentoId): ModuloMeta {
  return MODULOS.find((m) => m.id === id) ?? MODULOS[0];
}

// ─── Estado normalizado da declaração ───────────────────────────────────────
export interface EstadoDeclaracao {
  conjunta: boolean;
  dependentes: { normais: number; bebe: number; deficientes: number };
  ascendentes: number;
  deficiencia: boolean;
  ifici: boolean;
  ativos: RendimentoId[];
  salarios: { bruto: number; retencoes: number };
  pensoes: { bruto: number; retencoes: number };
  independente: {
    bruto: number;
    tipo: TipoAtividade;
    coefOverride?: number;
    aplicaRegra15Override?: boolean;
    regime: "simplificado" | "organizada";
    despesas: number;
    retencoes: number;
    anoAtividade: number;
    irsJovemAno: number;
  };
  capitais: { dividendos: number; juros: number; retencoes: number; englobar: boolean };
  investimentos: { saldo: number; algumCurtoPrazo: boolean; englobar: boolean };
  cripto: { curto: number; longo: number; englobar: boolean };
  imoveis: {
    renda: number;
    despesas: number;
    habitacao: boolean;
    duracao: DuracaoArrendamento;
    retencoes: number;
    englobar: boolean;
  };
  imoveisVenda: {
    valorRealizacao: number;
    valorAquisicao: number;
    despesas: number;
    reinvesteHPP: boolean;
    valorReinvestido: number;
  };
  estrangeiros: { rendimento: number; impostoPago: number };
  deducoes: { saude: number; educacao: number; gerais: number; rendas: number };
  pagamentosPorConta: number;
}

/** Mais-valia imobiliária (ganho) a partir dos campos da venda. */
export function ganhoImobiliario(v: EstadoDeclaracao["imoveisVenda"]): number {
  return Math.max(0, v.valorRealizacao - v.valorAquisicao - v.despesas);
}

/** Mapeia o estado do formulário para o input do motor de cálculo. */
export function construirDeclaracaoInput(e: EstadoDeclaracao): DeclaracaoInput {
  const ativo = (id: RendimentoId) => e.ativos.includes(id);
  return {
    conjunta: e.conjunta,
    deficiencia: e.deficiencia,
    ifici: e.ifici,
    dependentesDetalhe: {
      normais: e.dependentes.normais,
      bebe: e.dependentes.bebe,
      deficientes: e.dependentes.deficientes,
    },
    salarios: ativo("salarios") ? { bruto: e.salarios.bruto, retencoes: e.salarios.retencoes } : undefined,
    pensoes: ativo("pensoes") ? { bruto: e.pensoes.bruto, retencoes: e.pensoes.retencoes } : undefined,
    independente: ativo("independente")
      ? {
          brutoAnual: e.independente.bruto,
          tipo: e.independente.tipo,
          coefOverride: e.independente.coefOverride,
          aplicaRegra15Override: e.independente.aplicaRegra15Override,
          anoAtividade: e.independente.anoAtividade,
          regimeContabilidade: e.independente.regime,
          despesasJustificadas: e.independente.despesas,
          retencoesPagas: e.independente.retencoes,
          irsJovemAno: e.independente.irsJovemAno,
        }
      : undefined,
    capitais: ativo("capitais")
      ? {
          dividendos: e.capitais.dividendos,
          juros: e.capitais.juros,
          retencoes: e.capitais.retencoes,
          englobar: e.capitais.englobar,
        }
      : undefined,
    prediais: ativo("imoveis")
      ? {
          rendaAnual: e.imoveis.renda,
          despesas: e.imoveis.despesas,
          habitacao: e.imoveis.habitacao,
          duracao: e.imoveis.duracao,
          retencoes: e.imoveis.retencoes,
          englobar: e.imoveis.englobar,
        }
      : undefined,
    investimentos: ativo("investimentos")
      ? { saldo: e.investimentos.saldo, algumCurtoPrazo: e.investimentos.algumCurtoPrazo, englobar: e.investimentos.englobar }
      : undefined,
    cripto: ativo("cripto")
      ? { ganhoCurtoPrazo: e.cripto.curto, ganhoLongoPrazo: e.cripto.longo, englobar: e.cripto.englobar }
      : undefined,
    imoveisVenda: ativo("imoveisVenda")
      ? {
          ganho: ganhoImobiliario(e.imoveisVenda),
          valorRealizacao: e.imoveisVenda.valorRealizacao,
          valorReinvestido: e.imoveisVenda.valorReinvestido,
          reinvesteHPP: e.imoveisVenda.reinvesteHPP,
        }
      : undefined,
    estrangeiros: ativo("estrangeiros")
      ? { rendimento: e.estrangeiros.rendimento, impostoPago: e.estrangeiros.impostoPago }
      : undefined,
    deducoes: {
      saude: e.deducoes.saude,
      educacao: e.deducoes.educacao,
      gerais: e.deducoes.gerais,
      rendas: e.deducoes.rendas,
    },
    pagamentosPorConta: e.pagamentosPorConta,
  };
}

// ─── Motor de completude ────────────────────────────────────────────────────
export type EstadoModulo = "nao-iniciado" | "em-preenchimento" | "concluido";

/** Determina o estado de preenchimento de um módulo de rendimento. */
export function estadoDoModulo(id: RendimentoId, e: EstadoDeclaracao): EstadoModulo {
  switch (id) {
    case "salarios":
      return e.salarios.bruto > 0 ? (e.salarios.retencoes >= 0 ? "concluido" : "em-preenchimento") : "nao-iniciado";
    case "pensoes":
      return e.pensoes.bruto > 0 ? "concluido" : "nao-iniciado";
    case "independente":
      return e.independente.bruto > 0 ? "concluido" : "nao-iniciado";
    case "capitais":
      return e.capitais.dividendos > 0 || e.capitais.juros > 0 ? "concluido" : "nao-iniciado";
    case "investimentos":
      return e.investimentos.saldo > 0 ? "concluido" : "nao-iniciado";
    case "cripto":
      return e.cripto.curto > 0 || e.cripto.longo > 0 ? "concluido" : "nao-iniciado";
    case "imoveis":
      return e.imoveis.renda > 0 ? "concluido" : "nao-iniciado";
    case "imoveisVenda":
      return e.imoveisVenda.valorRealizacao > 0 && e.imoveisVenda.valorAquisicao > 0
        ? "concluido"
        : e.imoveisVenda.valorRealizacao > 0 || e.imoveisVenda.valorAquisicao > 0
          ? "em-preenchimento"
          : "nao-iniciado";
    case "estrangeiros":
      return e.estrangeiros.rendimento > 0 ? "concluido" : "nao-iniciado";
  }
}

export interface Completude {
  /** Pontuação global 0–100. */
  pontuacao: number;
  /** Por módulo ativo. */
  modulos: Array<{ id: RendimentoId; titulo: string; estado: EstadoModulo }>;
  /** Identificação concluída? */
  identificacao: boolean;
}

export function calcularCompletude(e: EstadoDeclaracao): Completude {
  const modulos = e.ativos.map((id) => ({
    id,
    titulo: moduloMeta(id).titulo,
    estado: estadoDoModulo(id, e),
  }));
  // Identificação conta sempre; cada módulo ativo conta como uma unidade.
  const unidades = 1 + modulos.length;
  const concluidas =
    1 + modulos.filter((m) => m.estado === "concluido").length;
  const pontuacao = Math.round((concluidas / Math.max(1, unidades)) * 100);
  return { pontuacao, modulos, identificacao: true };
}

// ─── Motor de validação ─────────────────────────────────────────────────────
export type NivelValidacao = "erro" | "aviso" | "oportunidade";

export interface Validacao {
  id: string;
  nivel: NivelValidacao;
  titulo: string;
  detalhe: string;
  anexo?: string;
}

const LIMITE_ULTIMO_ESCALAO =
  ESCALOES_IRS.value.length >= 2
    ? ESCALOES_IRS.value[ESCALOES_IRS.value.length - 2].ate ?? Infinity
    : Infinity;

/**
 * Avalia o estado da declaração e devolve erros críticos, avisos de possíveis
 * omissões e oportunidades fiscais previstas legalmente. Cada item explica a
 * razão e a fundamentação. Recebe também o coletável estimado (do motor) para
 * regras dependentes do rendimento.
 */
export function validarDeclaracao(e: EstadoDeclaracao, coletavelEstimado: number): Validacao[] {
  const r: Validacao[] = [];
  const ativo = (id: RendimentoId) => e.ativos.includes(id);

  // ── Erros críticos ──
  if (
    ativo("independente") &&
    e.independente.regime === "simplificado" &&
    e.independente.bruto > REGIME_SIMPLIFICADO.limite.value
  ) {
    r.push({
      id: "simplificado-excede",
      nivel: "erro",
      anexo: "Anexo B",
      titulo: "Regime simplificado acima do limite legal",
      detalhe: `Com faturação superior a ${fmt(REGIME_SIMPLIFICADO.limite.value)}, a contabilidade organizada é obrigatória (Art. 28.º CIRS). Altera o regime do módulo de trabalho independente.`,
    });
  }
  if (ativo("imoveisVenda")) {
    const v = e.imoveisVenda;
    if (v.valorRealizacao > 0 && v.valorAquisicao > 0 && v.valorAquisicao > v.valorRealizacao) {
      r.push({
        id: "venda-menos-valia",
        nivel: "aviso",
        anexo: "Anexo G",
        titulo: "Vendeste o imóvel por menos do que custou",
        detalhe: "O valor de aquisição é superior ao de venda — gera menos-valia, que não acresce imposto mas deve ser declarada. Confirma os valores introduzidos.",
      });
    }
  }

  // ── Avisos (possíveis omissões) ──
  if (ativo("imoveisVenda") && ganhoImobiliario(e.imoveisVenda) > 0 && e.imoveisVenda.despesas === 0) {
    r.push({
      id: "venda-sem-despesas",
      nivel: "aviso",
      anexo: "Anexo G",
      titulo: "Venda de imóvel sem despesas declaradas",
      detalhe: "Despesas com a compra (IMT, escritura, registos), a venda (comissão da imobiliária) e obras de valorização nos últimos 12 anos reduzem a mais-valia tributável. Confirma se não te esqueceste de nenhuma.",
    });
  }
  if (ativo("capitais") && e.capitais.dividendos > 0 && e.capitais.retencoes === 0) {
    r.push({
      id: "dividendos-sem-retencao",
      nivel: "aviso",
      anexo: "Anexo E",
      titulo: "Dividendos sem retenção registada",
      detalhe: "Os dividendos de fonte nacional sofrem normalmente retenção de 28% na fonte. Se não registaste qualquer retenção, confirma se os rendimentos têm origem estrangeira (Anexo J) ou se faltou indicar o valor retido.",
    });
  }
  if (ativo("estrangeiros") && e.estrangeiros.rendimento > 0 && e.estrangeiros.impostoPago === 0) {
    r.push({
      id: "estrangeiro-sem-imposto",
      nivel: "aviso",
      anexo: "Anexo J",
      titulo: "Rendimento estrangeiro sem imposto pago no estrangeiro",
      detalhe: "Se o país da fonte cobrou imposto, indica-o para aproveitares o crédito por dupla tributação (Art. 81.º CIRS). Sem este valor, o rendimento é tributado integralmente em Portugal.",
    });
  }
  if (ativo("cripto") && e.cripto.curto > 0) {
    r.push({
      id: "cripto-curto-prazo",
      nivel: "aviso",
      anexo: "Anexo G",
      titulo: "Criptoativos detidos há menos de 365 dias",
      detalhe: `Estes ganhos são tributados a ${pct(MAIS_VALIAS_MOBILIARIAS_TAXA.value)}. Se conseguires manter os ativos ${CRIPTO_ISENCAO_DIAS.value} dias ou mais antes de vender, o ganho fica excluído de tributação (Art. 10.º n.º 19 CIRS).`,
    });
  }

  // ── Oportunidades ──
  if (
    ativo("investimentos") &&
    e.investimentos.algumCurtoPrazo &&
    e.investimentos.saldo > 0 &&
    coletavelEstimado >= LIMITE_ULTIMO_ESCALAO
  ) {
    r.push({
      id: "mob-englobamento-obrigatorio",
      nivel: "oportunidade",
      anexo: "Anexo G",
      titulo: "Englobamento obrigatório das mais-valias mobiliárias",
      detalhe: `Como detiveste ativos menos de 365 dias e o teu rendimento coletável atinge o último escalão (${fmt(LIMITE_ULTIMO_ESCALAO)}), o englobamento é obrigatório (Art. 72.º n.º 18 CIRS). A simulação já o aplica.`,
    });
  }
  if (ativo("capitais") && (e.capitais.dividendos > 0 || e.capitais.juros > 0) && !e.capitais.englobar && coletavelEstimado < ESCALOES_IRS.value[2].ate!) {
    r.push({
      id: "capitais-englobar",
      nivel: "oportunidade",
      anexo: "Anexo E",
      titulo: "Vale a pena comparar o englobamento dos capitais",
      detalhe: `Com um rendimento coletável baixo, a tua taxa marginal pode ser inferior a ${pct(MAIS_VALIAS_MOBILIARIAS_TAXA.value)}. Experimenta ativar o englobamento no módulo de dividendos e juros para comparar.`,
    });
  }
  if (!e.conjunta && (ativo("salarios") || ativo("independente"))) {
    r.push({
      id: "conjunta",
      nivel: "oportunidade",
      titulo: "Compara tributação conjunta vs. separada",
      detalhe: "Se és casado ou unido de facto, podes optar pela tributação conjunta (quociente conjugal, Art. 69.º CIRS). Quando há grande diferença de rendimentos entre os cônjuges, costuma ser vantajosa. Ativa-a na etapa do agregado.",
    });
  }
  if (ativo("imoveisVenda") && ganhoImobiliario(e.imoveisVenda) > 0 && !e.imoveisVenda.reinvesteHPP) {
    r.push({
      id: "reinvestimento",
      nivel: "oportunidade",
      anexo: "Anexo G",
      titulo: "Reinvestimento em habitação própria",
      detalhe: `Se o imóvel era a tua habitação própria e permanente, reinvestir o valor da venda noutra HPP (sem crédito) exclui a mais-valia da tributação — só ${pct(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} seria tributado de outra forma (Art. 10.º n.º 5 CIRS).`,
    });
  }

  return r;
}

/** Limite de excesso de IVA (reexportado para conveniência da UI). */
export const LIMIAR_IVA_EXCESSO = IVA_ISENCAO_EXCESSO.value;
