// ═══════════════════════════════════════════════════════════════════════
//  INTERNAL KNOWLEDGE ENGINE — o grafo de onde nascem os candidatos
//  ---------------------------------------------------------------------
//  Um catálogo responde «qual destas?». Um grafo responde «o que é que
//  alguém com ISTO consegue atacar?». A diferença não é de tamanho — é de
//  natureza: acrescentar uma competência ao grafo abre dezenas de
//  combinações novas, e acrescentar uma hipótese a um catálogo acrescenta
//  uma hipótese.
//
//  A travessia é esta, e é a do pedido:
//
//     Competência + Ativo  →  Capacidade  →  resolve  →  Problema
//                                                          │
//                                     (de um Cliente, num Setor)
//                                                          ↓
//              Problema × ModeloReceita × Entrega × Região  →  Candidato
//
//  ── AS TRÊS REGRAS DO GRAFO ────────────────────────────────────────
//   1. **Uma entidade descreve o mundo, não uma oportunidade.** «Há casas
//      que mudam de mãos» é um problema; «serviço de coordenação de
//      mudanças» é uma composição, e essa nasce no gerador.
//   2. **Nenhum número sem `Proveniencia`.** Os intervalos de capital e de
//      tempo até receita são estimativas declaradas COMO estimativas, com
//      o método escrito. Não são observações e não se disfarçam de uma.
//   3. **Uma regulação só é afirmada com fonte.** `obrigatorio: null`
//      significa «depende, e não vamos decidir por ti» — que é a resposta
//      correta na maior parte dos casos reais.
// ═══════════════════════════════════════════════════════════════════════

import type { CenarioInicial } from "@/lib/pricing";
import type { MarketRegion } from "@/lib/negocio/market/geografia";
import type { Intervalo, Proveniencia } from "../proveniencia";
import type {
  AtivoId,
  DimensaoRisco,
  MercadoAlvo,
  NaturezaOferta,
  PadraoReceita,
  PublicoAlvo,
} from "../contexto/tipos";

// ── COMPETÊNCIAS ─────────────────────────────────────────────────────

export type FamiliaCompetencia =
  | "operacional"
  | "tecnica"
  | "comercial"
  | "cuidado"
  | "criativa"
  | "manual"
  | "gestao";

export interface Competencia {
  id: string;
  rotulo: string;
  familia: FamiliaCompetencia;
  /** Explica o que conta como esta competência, para a pessoa não inflacionar. */
  descricao: string;
}

// ── CAPACIDADES ──────────────────────────────────────────────────────

/**
 * O que uma pessoa CONSEGUE FAZER, dado o que sabe e o que tem.
 *
 * É a peça que faltava entre competências e problemas. Sem ela, o motor
 * teria de ligar «logística» diretamente a «entregas B2B», e perdia a
 * razão pela qual a ligação existe — que é ter carrinha, carta e rotina.
 */
export interface Capacidade {
  id: string;
  rotulo: string;
  descricao: string;
  competenciasNecessarias: readonly string[];
  competenciasUteis: readonly string[];
  ativosNecessarios: readonly AtivoId[];
  ativosUteis: readonly AtivoId[];
  /** Exige esforço físico continuado? Cruza com a restrição de peso. */
  esforcoFisico: boolean;
  /** Exige presença no local do cliente? */
  presencial: boolean;
}

// ── SETORES ──────────────────────────────────────────────────────────

export interface Setor {
  id: string;
  rotulo: string;
  /** Secções da CAE que costumam enquadrar isto. Indicativo, não fiscal. */
  caeIndicativa: readonly string[];
  /** Este setor é fortemente regulado como um todo? */
  reguladoEmGeral: boolean;
}

// ── REGULAÇÃO ────────────────────────────────────────────────────────

export interface Regulacao {
  id: string;
  rotulo: string;
  /** O que exige, em pt-PT e sem prometer aconselhamento jurídico. */
  exigencia: string;
  /**
   * `true` quando a obrigatoriedade é inequívoca e tem fonte; `null`
   * quando depende do caso concreto — que é a maioria. NUNCA se afirma
   * obrigatoriedade sem fonte: a regra 12 do produto aplica-se aqui.
   */
  obrigatorio: boolean | null;
  proveniencia: Proveniencia;
  /** Peso na barreira de entrada, 0–3. */
  severidade: 0 | 1 | 2 | 3;
}

// ── PROBLEMAS ────────────────────────────────────────────────────────

/** O que faz o problema existir agora. Liga-se aos sinais de mercado. */
export type GatilhoProblema =
  | "evento-de-vida"
  | "obrigacao-legal"
  | "crescimento"
  | "escassez-de-tempo"
  | "escassez-de-pessoas"
  | "envelhecimento"
  | "turismo"
  | "digitalizacao"
  | "sazonalidade"
  | "manutencao"
  | "compra-publica";

export interface Problema {
  id: string;
  /** O problema, do ponto de vista de quem o tem. Nunca uma solução. */
  enunciado: string;
  /** Porque é que isto custa dinheiro ou tempo a alguém. */
  porqueDoi: string;
  setor: string;
  /** Quem tem o problema, descrito como se descreve um cliente. */
  clientes: readonly string[];
  publicos: readonly PublicoAlvo[];
  mercado: MercadoAlvo;
  gatilhos: readonly GatilhoProblema[];
  /** As capacidades que conseguem atacar isto. É a aresta central. */
  capacidades: readonly string[];
  /**
   * As que são INDISPENSÁVEIS. Ausente = qualquer uma das listadas serve.
   *
   * Sem isto, o motor produzia composições semanticamente erradas: quem
   * declarava logística e nenhuma experiência com animais recebia «rotas
   * de recolha e entrega para donos de animais ansiosos», porque a rota
   * é uma das capacidades do problema. É verdade que há uma rota — mas
   * quem compra o serviço está a comprar o cuidado, não a deslocação.
   */
  capacidadesEssenciais?: readonly string[];
  /** Modelos de receita que fazem sentido para este problema. */
  modelos: readonly string[];
  /** Naturezas de oferta compatíveis. */
  naturezas: readonly NaturezaOferta[];
  /** Onde o PROBLEMA existe — nunca onde temos dados. */
  regioes: readonly MarketRegion[];
  /** Séries do motor de evidência que dizem alguma coisa sobre isto. */
  sinais: readonly string[];
  regulacoes: readonly string[];
  /** Repete-se naturalmente, ou é um evento único por cliente? */
  recorrenciaNatural: PadraoReceita;
  /** 0 = sem sazonalidade; 3 = concentrado em poucos meses. */
  sazonalidade: 0 | 1 | 2 | 3;
  /** Riscos que este problema traz por natureza, antes do modelo. */
  riscosProprios: readonly DimensaoRisco[];
  /** Como se prova que o problema existe NESTA zona. Concreto. */
  comoValidar: readonly string[];
  /** O que mataria a hipótese. Tem de poder falhar mesmo. */
  testeDeFalsificacao: string;
  /**
   * O problema é observável em fonte pública portuguesa?
   *
   * `false` é uma resposta legítima e frequente — e é o que impede o motor
   * de prometer evidência que não vai ter.
   */
  procuraObservavel: boolean;
}

// ── MODELOS DE RECEITA ───────────────────────────────────────────────

export interface ModeloReceita {
  id: string;
  rotulo: string;
  /** Como se cobra, numa frase. */
  comoSeCobra: string;
  /** O cenário do motor canónico de preço — a única porta de preço. */
  cenarioPreco: CenarioInicial;
  padrao: PadraoReceita;
  naturezas: readonly NaturezaOferta[];
  precisaStock: boolean;
  precisaLojaFisica: boolean;
  /** Precisa de equipa desde o primeiro dia? Cruza com «sem empregados». */
  precisaEquipa: boolean;
  /** Investimento típico deste MODELO, à parte do problema. */
  capitalTipico: Intervalo;
  /** Meses até à primeira receita, tipicamente. */
  tempoAteReceitaMeses: Intervalo;
  /** 0 = troca horas por dinheiro; 3 = escala sem custo proporcional. */
  escalabilidade: 0 | 1 | 2 | 3;
  /** Riscos que o próprio modelo introduz. */
  riscosProprios: readonly DimensaoRisco[];
}

// ── O GRAFO ──────────────────────────────────────────────────────────

export interface GrafoConhecimento {
  competencias: readonly Competencia[];
  capacidades: readonly Capacidade[];
  setores: readonly Setor[];
  problemas: readonly Problema[];
  modelos: readonly ModeloReceita[];
  regulacoes: readonly Regulacao[];
}
