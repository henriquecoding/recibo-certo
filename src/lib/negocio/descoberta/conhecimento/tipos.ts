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
  AdaptacaoVeiculo,
  AtivoId,
  CapacidadeCargaVeiculo,
  ConfiguracaoVeiculo,
  DimensaoRisco,
  MercadoAlvo,
  NaturezaOferta,
  PadraoReceita,
  PublicoAlvo,
  TipoTerritorio,
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

export interface RequisitoVeiculo {
  configuracoesAceites?: readonly ConfiguracaoVeiculo[];
  /**
   * Faixa mínima de carga. Quando a pessoa declarar quilos, é o piso em
   * quilos da faixa que conta — a faixa nunca inventa um número, apenas
   * nomeia um intervalo (ver `KG_DA_FAIXA`).
   */
  capacidadeCargaMinima?: CapacidadeCargaVeiculo;
  lugaresMinimos?: number;
  /** Abaixo disto continua possível, mas a operação fica limitada. */
  lugaresRecomendados?: number;
  /**
   * Zona de carga mínima, em centímetros. Só se declara quando o trabalho
   * é literalmente sobre volume, e com a referência escrita em `finalidade`.
   */
  dimensaoMinimaCargaCm?: {
    comprimento?: number;
    largura?: number;
    altura?: number;
  };
  adaptacoesNecessarias?: readonly AdaptacaoVeiculo[];
  /** Inspeção válida e uso profissional têm de ser confirmados. */
  prontoParaUsoProfissional?: boolean;
}

/**
 * Um requisito pode aceitar alternativas — por exemplo, viatura ligeira
 * OU de carga. `ativosNecessarios` continua a existir como contrato de
 * compatibilidade; os requisitos refinam-no quando simples presença não
 * chega para provar que o meio serve.
 */
export interface RequisitoAtivo {
  qualquerUmDe: readonly AtivoId[];
  finalidade: string;
  veiculo?: RequisitoVeiculo;
  /** Se desconhecido, a hipótese existe mas não pode ser promovida. */
  confirmarAntesDeRecomendar?: boolean;
}

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
  /** Regras de adequação que vão além de «o id está na lista». */
  requisitosAtivos?: readonly RequisitoAtivo[];
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

// ── QUEM PAGA, EM UNIDADES CONTÁVEIS ─────────────────────────────────

/**
 * A base de clientes de um problema, na única forma que o INE publica ao
 * concelho: empresas de certas divisões da CAE, ou residentes.
 *
 * `TOT` é o total de empresas do concelho, e é a resposta certa para
 * problemas cujo cliente é «uma empresa qualquer» — escolher divisões à
 * mão nesse caso daria uma base parcial com ar de total.
 */
export type BaseDeClientes =
  | {
      tipo: "empresas";
      /** Divisões da CAE, ou `TOT` para o total de empresas. */
      cae: readonly string[];
      /** O que a divisão apanha para além destes clientes. Vai ao ecrã. */
      ressalva?: string;
    }
  | { tipo: "residentes" }
  | {
      tipo: "nao-contavel";
      /** Porque não há base. Publica-se — não se disfarça de zero. */
      porque: string;
    };

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
  /**
   * Quem paga, em unidades CONTÁVEIS por concelho.
   *
   * ┌──────────────────────────────────────────────────────────────────┐
   * │ O TERMO QUE FALTAVA À SUBTRAÇÃO                                   │
   * │                                                                  │
   * │ `motor/procura.ts` escreve há muito, e com razão, que ter dois   │
   * │ sinais não é ter a lacuna: «uma taxa de ocupação e uma contagem  │
   * │ de empresas não se subtraem». O que faltava era a base comum, e  │
   * │ a auditoria (F-15) nomeou-a: operadores POR CLIENTE POSSÍVEL.    │
   * │                                                                  │
   * │ `clientes` acima é prosa para quem lê o dossier. Isto é a mesma  │
   * │ coisa em unidades que o INE publica ao concelho — empresas de    │
   * │ certas divisões da CAE, ou residentes. Com ela, operadores por   │
   * │ mil clientes é calculável para qualquer hipótese, sem um único   │
   * │ dossier escrito à mão.                                            │
   * │                                                                  │
   * │ ── E `nao-contavel` É UMA RESPOSTA ─────────────────────────────│
   * │ Frequente e legítima. Os visitantes de uma cidade não são        │
   * │ residentes nem empresas, e nenhuma fonte os conta ao concelho    │
   * │ como compradores. Escolher uma divisão «parecida» daria um       │
   * │ denominador errado — e um denominador errado não se vê: produz   │
   * │ um rácio plausível e uma conclusão falsa.                         │
   * └──────────────────────────────────────────────────────────────────┘
   */
  baseDeClientes: BaseDeClientes;
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
  /**
   * Onde o problema é MAIS INTENSO — não onde existe.
   *
   * Urbano, suburbano ou rural é provavelmente a variável isolada que
   * mais muda que negócio funciona, e o configurador recolhia-a há muito
   * sem que uma única linha do motor a lesse. A distinção face a
   * `regioes` é deliberada: `regioes` é geografia administrativa,
   * `territoriosIntensos` é densidade — e as duas respondem a perguntas
   * diferentes («existe onde estou?» e «é aqui que dói mais?»).
   *
   * As três entradas são o caso normal e não são preguiça: significam
   * que a densidade não decide este problema. Restringir sem razão seria
   * afirmar uma especificidade que não temos como sustentar.
   */
  territoriosIntensos: readonly TipoTerritorio[];
  /**
   * Gera ocorrências fora do horário normal de trabalho?
   *
   * Cruza com a restrição «não quero trabalhar à noite», que a interface
   * anunciava como «pesa em problemas com ocorrências fora de horas» e
   * que não tinha, no motor, uma única linha a implementá-la.
   */
  ocorrenciasForaDeHoras: boolean;
  /**
   * A procura concentra-se ao fim de semana?
   *
   * Era uma lista literal de três ids dentro de `restricoes.ts`. Um
   * problema novo com procura ao sábado passava incólume e ninguém dava
   * por isso — exatamente o modo de falha que o grafo existe para tornar
   * impossível. Como campo obrigatório, o compilador obriga a responder.
   */
  procuraFimDeSemana: boolean;
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
  /**
   * A receita depende de trazer tráfego — próprio ou do cliente?
   *
   * Cruza com «não quero depender de redes sociais», que a interface
   * anunciava como «pesa em modelos que vivem de tráfego» sem que nada
   * no motor a lesse. Substitui também a lista literal de três ids que
   * o stress test usava para a mesma pergunta.
   */
  dependeTrafegoPago: boolean;
  /**
   * Os primeiros clientes vêm de abordagem direta — feira, banca, porta,
   * contacto a frio? Cruza com «não quero vender porta-a-porta».
   */
  dependeAquisicaoDireta: boolean;
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
