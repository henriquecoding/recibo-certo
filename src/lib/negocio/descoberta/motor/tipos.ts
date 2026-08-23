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
import type { MarketOpportunityState } from "@/lib/negocio/market/tipos";
import type { IntensidadeAgregada } from "./intensidade";
import type { IntervaloDePontuacao } from "./scoring";
import type { Evidencia, Intervalo, LacunaDeEvidencia } from "../proveniencia";
import type { DimensaoRisco, MercadoAlvo, NaturezaOferta, PadraoReceita } from "../contexto/tipos";
import type { Capacidade, ModeloReceita, Problema, Regulacao } from "../conhecimento/tipos";

export type FormaEntrega = "presencial" | "remoto" | "hibrido";

// ── COMPATIBILIDADE PESSOAL ──────────────────────────────────────────

/**
 * Os eixos do fit, e só eles.
 *
 * `tempo`, `capital`, `equipa` e `geografia` estavam aqui e saíram: cada
 * um respondia a uma pergunta que outra dimensão do score já respondia, e
 * a soma das duas dava ao encaixe pessoal quase o dobro do peso que a
 * tabela declarava. Ver a matriz de sobreposição em `fit.ts`.
 */
export type EixoFit =
  | "capacidade"
  | "ativos"
  | "experiencia"
  | "preferencias"
  | "ambicao"
  | "limites";

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
  /**
   * A pessoa declarou tolerar isto?
   *
   * `true`  — apurado, e dentro da tolerância.
   * `false` — apurado, e acima dela.
   * `null`  — NÃO apurado: não há afirmação nenhuma a fazer sobre a
   *           tolerância, porque não se mediu o nível.
   *
   * ┌──────────────────────────────────────────────────────────────────┐
   * │ PORQUE É `null` E NÃO `false`                                     │
   * │                                                                  │
   * │ Era `boolean`, e um nível assumido por prudência (nível 2, sem   │
   * │ densidade de operadores apurada) comparava-se com a tolerância   │
   * │ como se tivesse sido medido. Dois consumidores filtravam por     │
   * │ `apurado` e quatro não — e o ecrã dizia, no mesmo cartão, «acima │
   * │ do que aceitas» num chip vermelho e «por não estar apurada, não  │
   * │ conta contra a tua tolerância» na frase por baixo.               │
   * │                                                                  │
   * │ Com `null`, quem consome é OBRIGADO a decidir o que mostrar em   │
   * │ vez de herdar `false` por omissão. O erro deixa de ser possível  │
   * │ por construção, que é a regra desta casa: ausência de            │
   * │ conhecimento não é uma afirmação sobre o negócio.                │
   * └──────────────────────────────────────────────────────────────────┘
   */
  dentroDaTolerancia: boolean | null;
  /**
   * O nível foi MEDIDO, ou assumido por prudência?
   *
   * Um nível assumido é um aviso legítimo e não é uma afirmação sobre o
   * negócio — por isso não conta para a contagem que baixa o score.
   */
  apurado: boolean;
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
  /**
   * A zona está no meio da distribuição — e isso é uma LEITURA, não uma
   * ausência dela. Era dita `desconhecida`, o que a fazia sair do score
   * como se não soubéssemos nada; sabemos, e o que sabemos é que a
   * geografia não decide esta hipótese.
   */
  | "oferta-na-media"
  | "pouca-procura"
  | "desconhecida";

export interface AvaliacaoProcura {
  leitura: LeituraDeLacuna;
  /** As observações que sustentam a leitura. Vazio = `desconhecida`. */
  evidencias: readonly Evidencia[];
  /** O que falta saber para a leitura deixar de ser desconhecida. */
  lacunas: readonly LacunaDeEvidencia[];
  nota: string;
  /**
   * O que as séries DIZEM, contra uma referência declarada.
   *
   * `posicao === null` significa que existe evidência mas não existe
   * régua — e é diferente de não haver evidência nenhuma. O eixo da
   * procura lê isto; nunca o número de linhas.
   */
  intensidade: IntensidadeAgregada;
  /**
   * O estado mais forte do `evidence-gate` entre os packs que
   * contribuíram. É o TETO da confiança, nunca um somatório.
   */
  estadoGate: MarketOpportunityState | null;
  /** Observações que o gate recusou. Contadas, não silenciadas. */
  bloqueadasPeloGate: number;
  /**
   * 0–100 pela idade efetiva das leituras, com meia-vida por tipo de
   * série. `null` quando não há leitura nenhuma. Alimenta a CONFIANÇA,
   * nunca o score — a idade dos dados fala de nós, não do mercado.
   */
  frescura: number | null;
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
  /**
   * Que fração do intervalo de investimento o teto declarado cobre, [0, 1].
   *
   * É isto que o score lê, e não o booleano: um teto que cobre o mínimo
   * de um intervalo de 4 500–30 000 € não cobre o negócio, e o booleano
   * dizia que sim.
   */
  fracaoCapitalCoberta: number | null;
  /** O mesmo para o prazo até à primeira receita. */
  fracaoPrazoCoberta: number | null;
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
}

export type NivelConfianca = "alta" | "media" | "baixa" | "insuficiente";

export interface AvaliacaoConfianca {
  nivel: NivelConfianca;
  /** 0–1. Quanto do que seria preciso saber está coberto. */
  cobertura: number;
  motivos: readonly string[];
  /**
   * Força das evidências e atualidade — as duas dimensões que ESTAVAM no
   * score do negócio e que pertencem aqui.
   *
   * `forcaDaEvidencia` é 0–100 e nasce de quantas observações
   * utilizáveis sustentam a análise; `frescura` é 0–100 e nasce da idade
   * efetiva das leituras, com meia-vida por tipo de série. Nenhuma das
   * duas toca no score: as duas viajam ao lado dele.
   */
  forcaDaEvidencia: number;
  frescura: number | null;
  /** O estado do gate que serve de teto a este nível. */
  tetoDoGate: MarketOpportunityState | null;
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
  /**
   * O mesmo número com a incerteza publicada ao lado.
   *
   * Um ponto único esconde que metade das dimensões pode não ter sido
   * avaliada. O intervalo diz-o: colapsa no ponto quando a cobertura é
   * total, e abre-se quando não é.
   */
  intervaloPontuacao: IntervaloDePontuacao;
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
