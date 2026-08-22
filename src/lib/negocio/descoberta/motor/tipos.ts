// ═══════════════════════════════════════════════════════════════════════
//  O CANDIDATO — o que o motor produz, e que ninguém escreveu
//  ---------------------------------------------------------------------
//  Um `OpportunityCandidate` não é uma entrada de catálogo: é uma
//  COMPOSIÇÃO — problema × modelo de receita × forma de entrega × zona —
//  avaliada contra um contexto concreto. A maior parte dos que este motor
//  produz não corresponde a nenhum dossier escrito à mão, e é esse o
//  objetivo.
//
//  Tudo o que é numérico atravessa `Intervalo`, que exige `Proveniencia`.
//  Não há caminho para pôr um número no resultado sem dizer o que ele é.
// ═══════════════════════════════════════════════════════════════════════

import type { CenarioInicial } from "@/lib/pricing";
import type { MarketRegion } from "@/lib/negocio/market/geografia";
import type { Evidencia, Intervalo, LacunaDeEvidencia } from "../proveniencia";
import type { DimensaoRisco, MercadoAlvo, NaturezaOferta, PadraoReceita } from "../contexto/tipos";
import type { Capacidade, ModeloReceita, Problema, Regulacao } from "../conhecimento/tipos";

export type FormaEntrega = "presencial" | "remoto" | "hibrido";

// ── COMPATIBILIDADE PESSOAL ──────────────────────────────────────────

export type EixoFit =
  | "capacidade"
  | "ativos"
  | "tempo"
  | "capital"
  | "preferencias"
  | "geografia"
  | "equipa";

export interface ContribuicaoFit {
  eixo: EixoFit;
  obtido: number;
  maximo: number;
  /** A frase que explica esta linha. Em pt-PT, para o ecrã. */
  nota: string;
}

// ── RISCO ────────────────────────────────────────────────────────────

export interface RiscoAvaliado {
  dimensao: DimensaoRisco;
  /** 0 = negligenciável, 3 = decisivo. */
  nivel: 0 | 1 | 2 | 3;
  nota: string;
  /** A pessoa declarou tolerar isto? Compara com o perfil de risco. */
  dentroDaTolerancia: boolean;
}

// ── REGULAÇÃO ────────────────────────────────────────────────────────

export interface AvaliacaoRegulatoria {
  requisitos: readonly Regulacao[];
  /** 0–3. Soma ponderada das severidades, com teto. */
  barreira: 0 | 1 | 2 | 3;
  /** Há requisitos que só se confirmam caso a caso? Quase sempre sim. */
  temIncerteza: boolean;
}

// ── PROCURA E OFERTA ─────────────────────────────────────────────────

/**
 * A distinção do ponto 44 do pedido, que é a mais importante do motor.
 *
 * Ausência de concorrentes NÃO é oportunidade: pode ser ausência de
 * procura. Sem sinal de oferta — e o motor não tem nenhum hoje — a única
 * resposta honesta é `desconhecida`, e é essa que aparece.
 */
export type LeituraDeLacuna =
  | "procura-com-pouca-oferta"
  | "procura-com-muita-oferta"
  | "pouca-procura"
  | "desconhecida";

export interface AvaliacaoProcura {
  leitura: LeituraDeLacuna;
  /** As observações que sustentam a leitura. Vazio = `desconhecida`. */
  evidencias: readonly Evidencia[];
  /** O que falta saber para a leitura deixar de ser desconhecida. */
  lacunas: readonly LacunaDeEvidencia[];
  nota: string;
}

// ── VIABILIDADE ──────────────────────────────────────────────────────

export interface AvaliacaoViabilidade {
  investimentoInicial: Intervalo | null;
  custoMensal: Intervalo | null;
  tempoAteReceitaMeses: Intervalo | null;
  /** Cabe no que a pessoa declarou? `null` = não declarou capital. */
  cabeNoCapital: boolean | null;
  /** Cabe no prazo que a pessoa aguenta? `null` = não declarou prazo. */
  cabeNoPrazo: boolean | null;
  /** O que impede uma estimativa mais fina. Sempre presente. */
  limitacoes: readonly string[];
}

// ── SCORE ────────────────────────────────────────────────────────────

/**
 * As dimensões do score. `null` propaga: um eixo sem base para ser
 * avaliado não vale zero — zero é uma afirmação sobre o mercado, ausência
 * é uma afirmação sobre nós.
 */
export interface OpportunityScore {
  fitPessoal: number;
  procura: number | null;
  lacunaDeOferta: number | null;
  economia: number | null;
  exequibilidade: number;
  regulacao: number;
  risco: number;
  geografia: number;
  qualidadeDaEvidencia: number;
  frescura: number | null;
}

export type NivelConfianca = "alta" | "media" | "baixa" | "insuficiente";

export interface AvaliacaoConfianca {
  nivel: NivelConfianca;
  /** 0–1. Quanto do que seria preciso saber está coberto. */
  cobertura: number;
  motivos: readonly string[];
}

// ── STRESS TEST ──────────────────────────────────────────────────────

export interface ObjecaoStress {
  id: string;
  pergunta: string;
  /** `true` quando a objeção se mantém de pé depois de avaliada. */
  procede: boolean;
  resposta: string;
  /** Uma objeção fatal impede a promoção ao topo, por muito que pontue. */
  fatal: boolean;
}

// ── VALIDAÇÃO ────────────────────────────────────────────────────────

export interface PassoValidacao {
  horizonte: "7-dias" | "30-dias" | "90-dias";
  titulo: string;
  detalhe: string;
  /** O que tem de ser verdade no fim para o passo contar como feito. */
  criterio: string;
}

// ── EXPLICAÇÃO ───────────────────────────────────────────────────────

export interface Explicacao {
  /** Porque apareceu, em uma frase dirigida à pessoa. */
  resumo: string;
  aFavor: readonly string[];
  contra: readonly string[];
}

// ── O CANDIDATO ──────────────────────────────────────────────────────

export interface OpportunityCandidate {
  /** Determinístico: deriva da composição, não de um contador. */
  id: string;
  titulo: string;
  /** Uma linha, para o cartão. */
  promessa: string;
  problema: Problema;
  modelo: ModeloReceita;
  entrega: FormaEntrega;
  regiao: MarketRegion;
  setor: string;
  mercado: MercadoAlvo;
  naturezas: readonly NaturezaOferta[];
  padraoReceita: PadraoReceita;
  cenarioPreco: CenarioInicial;

  /** As capacidades da pessoa que este candidato usa. */
  capacidadesUsadas: readonly Capacidade[];

  /** Quando existe um dossier curado equivalente, o seu id. */
  seedTemplateId?: string;

  fit: number;
  fitDetalhe: readonly ContribuicaoFit[];
  viabilidade: AvaliacaoViabilidade;
  regulacao: AvaliacaoRegulatoria;
  procura: AvaliacaoProcura;
  riscos: readonly RiscoAvaliado[];
  scores: OpportunityScore;
  /** O número único que ordena. Nasce dos scores, com pesos declarados. */
  pontuacaoGlobal: number;
  confianca: AvaliacaoConfianca;
  objecoes: readonly ObjecaoStress[];
  explicacao: Explicacao;
  validacao: readonly PassoValidacao[];
  evidencias: readonly Evidencia[];
  lacunas: readonly LacunaDeEvidencia[];
}

// ── DESCARTE ─────────────────────────────────────────────────────────

export type MotivoDescarte =
  | "restricao"
  | "capital"
  | "prazo"
  | "equipa"
  | "regulacao"
  | "geografia"
  | "preferencia"
  | "risco"
  | "duplicado"
  | "stress";

export interface CandidatoDescartado {
  id: string;
  titulo: string;
  motivo: MotivoDescarte;
  /** A explicação, em pt-PT, que demonstra que o motor raciocinou. */
  explicacao: string;
  /** O que teria de mudar para deixar de ser descartado. */
  oQueMudaria?: string;
}
