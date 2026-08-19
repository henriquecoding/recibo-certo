// ═══════════════════════════════════════════════════════════════════════
//  O CONTRATO DA PRICING ENGINE — tipos e nada mais
//  ---------------------------------------------------------------------
//  Sem React, sem cálculo, sem dados. A mesma disciplina de
//  `ferramentas/tipos.ts`: quem importa o contrato não arrasta o motor.
//
//  O objeto central é o `ContextoPreco`. Ele representa O CENÁRIO COMPLETO
//  e é serializável — cabe em localStorage, cabe num link partilhado, cabe
//  num teste. Tudo o resto deriva dele.
//
//  DISTINÇÃO QUE ESTE FICHEIRO EXISTE PARA TORNAR IMPOSSÍVEL DE PERDER:
//    · preço líquido  ≠ PVP
//    · margem         ≠ markup
//    · custo          ≠ imposto
//    · imposto        ≠ momento de caixa
//  Cada um tem nome próprio e tipo próprio. Nenhum campo se chama só
//  «preço» — porque «preço» é a pergunta, não a resposta.
// ═══════════════════════════════════════════════════════════════════════

import type { EscalaoIVA, Regiao, TipoAtividade, BaseSS } from "../fiscal-data";
import type { ConversaoSociedade } from "./motores/sociedade";
import type { Tesouraria } from "./motores/tesouraria";

export type { EscalaoIVA, Regiao, TipoAtividade, BaseSS };

// ─── 1. O primeiro passo: o que a pessoa quer definir ──────────────────

/**
 * A pergunta de entrada. Não é uma taxonomia de produtos — é a lista de
 * frases que uma pessoa real diria antes de saber que existe a palavra
 * «markup». Cada valor liga a um conjunto diferente de perguntas.
 */
export type CenarioInicial =
  | "produto_revenda"
  | "produto_proprio"
  | "produto_digital"
  | "servico"
  | "servico_hora"
  | "projeto"
  | "encomenda"
  | "loja_online"
  | "marketplace"
  | "objetivo"
  | "ato_isolado"
  | "nao_sei";

export const CENARIOS_INICIAIS = [
  "produto_revenda",
  "produto_proprio",
  "produto_digital",
  "servico",
  "servico_hora",
  "projeto",
  "encomenda",
  "loja_online",
  "marketplace",
  "objetivo",
  "ato_isolado",
  "nao_sei",
] as const;

// ─── 2. Quem vende ─────────────────────────────────────────────────────

/**
 * O enquadramento do vendedor. É a variável que mais muda o resultado em
 * Portugal e a que nenhuma calculadora do mercado pergunta.
 *
 * `nao_sei` não é preguiça: é o estado honesto de quem ainda não abriu
 * atividade. A engine calcula na mesma, com a fiscalidade desligada e um
 * aviso — em vez de exigir uma resposta que a pessoa não tem.
 */
export type TipoVendedor = "ti" | "empresa" | "particular" | "nao_sei";

/** Regime de IVA do VENDEDOR (não da operação). */
export type RegimeIVAVendedor =
  /** Art. 53.º CIVA: não liquida IVA e NÃO deduz o IVA suportado. */
  | "isento_art53"
  /** Regime normal: liquida e deduz. */
  | "normal"
  /** Isento pela natureza da operação (Art. 9.º): idem, sem limiar. */
  | "isento_art9"
  /** Regime da margem (DL 199/96): IVA sobre a margem. */
  | "margem"
  | "nao_sei";

export interface PerfilVendedor {
  tipo: TipoVendedor;
  regimeIVA: RegimeIVAVendedor;
  regiao: Regiao;
  /** Só para `tipo: "ti"` — decide coeficiente de IRS e base de SS. */
  atividade?: TipoAtividade;
  /**
   * A atividade CONCRETA do catálogo `ATIVIDADES`, guardada pelo `label` —
   * a mesma chave que `recibos-contrato.ts` e os guardiões fiscais já usam.
   *
   * Porque não chega o `tipo`: o catálogo tem dezenas de atividades e várias
   * trazem regras próprias (`coef`, `retencao`, `baseSS`, `regra15`) que
   * `efeitoFiscal()` resolve. Ler só os mapas por tipo ignorava esses
   * overrides — e fazia a mesma pessoa escolher a atividade de uma maneira
   * no simulador de recibos verdes e de outra aqui, com números diferentes
   * para o mesmo caso.
   *
   * Continua opcional: sem ela, cai-se no `tipo`, como antes.
   */
  atividadeLabel?: string;
  /** Só para `tipo: "ti"` — 1.º/2.º ano reduzem o coeficiente. */
  anoAtividade?: number;
  /**
   * Faturação anual já prevista, sem contar com o produto a precificar.
   * Serve para calcular o IRS **marginal**: o mesmo euro adicional custa
   * 13% a quem fatura 12 000 € e 43,5% a quem fatura 60 000 €. Sem isto, o
   * imposto marginal seria adivinhado.
   */
  faturacaoAnualPrevista?: number;
  /** Isenções de Segurança Social (1.º ano, acumulação com emprego). */
  isencaoSSPrimeiroAno?: boolean;
  /**
   * Residência fiscal, quando NÃO coincide com `regiao`.
   *
   * As duas respondem a perguntas diferentes: `regiao` governa o IVA, que
   * segue a operação; a residência governa o IRS, que segue a pessoa. Quem
   * reside nos Açores e fatura para Lisboa é tributado às taxas dos Açores;
   * quem reside em Lisboa com estabelecimento na Madeira liquida IVA da
   * Madeira e paga IRS continental.
   *
   * Para quase toda a gente coincidem, e é por isso que o valor por omissão
   * é `regiao` — mas o campo existe para que a coincidência seja uma
   * ESCOLHA e não um pressuposto escondido no código.
   */
  residenciaFiscal?: Regiao;
  acumulaEmprego?: boolean;
  /**
   * Regime de determinação do rendimento (Art. 28.º CIRS). Muda uma
   * afirmação inteira da ferramenta:
   *
   *   · simplificado — o coeficiente do Art. 31.º PRESUME as despesas, e
   *     por isso os custos reais NÃO reduzem o IRS;
   *   · organizada  — o rendimento tributável é receita − despesas, e por
   *     isso os custos reduzem o IRS.
   *
   * Enquanto o campo não existiu, a ferramenta dizia a primeira frase a
   * toda a gente — o único sítio onde podia estar factualmente errada, e
   * não apenas incompleta. Omissão = simplificado, que é o regime da
   * esmagadora maioria de quem passa recibos verdes.
   */
  regimeContabilidade?: "simplificado" | "organizada";
  /**
   * Salário anual BRUTO de categoria A, para quem acumula emprego com
   * recibos verdes — provavelmente o perfil mais comum.
   *
   * O IRS é progressivo sobre o ENGLOBAMENTO das duas categorias: o mesmo
   * euro faturado custa muito mais a quem já tem 30 000 € de salário do
   * que a quem só tem a categoria B. Sem isto, o IRS marginal era
   * calculado como se os recibos verdes fossem o único rendimento.
   *
   * ⚠️ Este valor vai para `simularDeclaracaoIRS({ salarios })`, que sabe
   * aplicar a dedução específica do Art. 25.º. NUNCA para
   * `outrosRendimentos` do núcleo, que espera um valor já líquido — o
   * comentário nesse campo explica porquê, e `verificacao-irs.test.ts`
   * reprova quem o faça.
   */
  salarioBrutoAnual?: number;
  /**
   * Dispensa de retenção na fonte (Art. 101.º-B, n.º 1, al. a) CIRS): quem
   * prevê faturar menos do que `DISPENSA_RETENCAO_LIMITE` no ano pode
   * dispensá-la, escrevendo a menção na fatura-recibo.
   *
   * Muda a TESOURARIA, nunca a margem — a retenção é IRS adiantado, e o
   * invariante que o garante continua a ser testado.
   */
  dispensaRetencao?: boolean;
  /**
   * Ano de rendimentos para o IRS Jovem (Art. 12.º-B CIRS), 1 a 10. A
   * isenção reduz a base sujeita a retenção, e `retencaoNaFonte` já a sabe
   * aplicar — só nunca lhe tinha chegado.
   */
  irsJovemAno?: number;
}

// ─── 3. O que se vende ─────────────────────────────────────────────────

export type NaturezaProduto = "bem" | "servico" | "digital" | "misto";

export interface PerfilProduto {
  natureza: NaturezaProduto;
  /** Escalão de IVA da VENDA. Nada a ver com o da compra. */
  escalaoVenda: EscalaoIVA;
  nome?: string;
}

// ─── 4. Como se vende ──────────────────────────────────────────────────

export type CanalVenda =
  | "loja_fisica"
  | "loja_online"
  | "marketplace"
  | "redes_sociais"
  | "venda_direta"
  | "orcamento"
  | "subscricao"
  | "intermediario";

/**
 * Quem compra. Decide IVA (autoliquidação B2B na UE), retenção na fonte
 * (só empresas portuguesas retêm) e se o preço tem de ser comunicado com
 * IVA incluído (DL 138/90 aplica-se ao consumidor).
 */
export type TipoCliente = "consumidor" | "empresa_pt" | "empresa_ue" | "fora_ue";

export interface PerfilCanal {
  canal: CanalVenda;
  cliente: TipoCliente;
  /** Chave de `CANAIS_COMISSAO` — nunca uma percentagem escrita à mão na UI. */
  marketplaceId?: string;
  /** Comissão do canal, em fração do valor BRUTO da encomenda (com IVA). */
  comissaoPercentagem?: number;
  /** Comissão fixa por venda, em euros. */
  comissaoFixa?: number;
  /** Chave de `METODOS_PAGAMENTO`. */
  metodoPagamentoId?: string;
  /** Taxa de processamento, fração do bruto. */
  pagamentoPercentagem?: number;
  /** Taxa fixa de processamento, em euros. */
  pagamentoFixa?: number;
  /** Afiliado / angariador, fração do valor LÍQUIDO. */
  afiliadoPercentagem?: number;
}

// ─── 5. Custos ─────────────────────────────────────────────────────────

/**
 * Um valor monetário introduzido pelo utilizador que pode vir com ou sem
 * IVA. Nunca se assume: perguntar «este valor inclui IVA?» é a diferença
 * entre um custo certo e um custo 23% errado.
 */
export interface ValorComIVA {
  valor: number;
  incluiIVA: boolean;
  /** Escalão de IVA suportado na compra. */
  escalao: EscalaoIVA;
}

export interface CustoFixo {
  id: string;
  rotulo: string;
  /** Euros por mês. */
  mensal: number;
}

export interface CustoVariavelUnitario {
  id: string;
  rotulo: string;
  /** Euros por unidade vendida. */
  porUnidade: number;
}

export interface EscalaoQuantidade {
  /** A partir desta quantidade... */
  quantidade: number;
  /** ...o custo unitário passa a ser este (sem IVA se `incluiIVA` false). */
  custoUnitario: number;
}

export interface ModeloCustos {
  /** Custo direto de uma unidade: aquisição ou produção. */
  direto: ValorComIVA;
  /** Escalões de quantidade, ordenados ou não — a engine ordena. */
  escaloes?: EscalaoQuantidade[];
  /** Embalagem, portes absorvidos, etiquetas… euros por unidade. */
  variaveis: CustoVariavelUnitario[];
  /** Renda, software, contabilidade, seguros… euros por mês. */
  fixos: CustoFixo[];
  /** Fração de unidades perdidas por desperdício/quebra (0–0,95). */
  desperdicio?: number;
  /** Fração de vendas devolvidas (0–0,95). */
  taxaDevolucao?: number;
  /** Custo médio de tratar uma devolução, em euros (recolha + perda). */
  custoDevolucao?: number;
  /** Portes de entrega pagos pelo vendedor, em euros por venda. */
  portesAbsorvidos?: number;
  /** Custo de aquisição de cliente, em euros. */
  cac?: number;
  /** Fração das vendas que são a clientes NOVOS (0–1). Multiplica o CAC. */
  fracaoClientesNovos?: number;
}

// ─── 6. Tempo (serviços e produção própria) ────────────────────────────

export interface ModeloTempo {
  /** Horas de trabalho por unidade / projeto. */
  horasPorUnidade: number;
  /** Horas de trabalho por semana que a pessoa quer trabalhar. */
  horasSemana: number;
  /** Semanas de férias por ano. */
  semanasFerias: number;
  /** Semanas por ano sem clientes (sazonalidade, arranque). */
  semanasSemCliente: number;
  /**
   * Fração do tempo que é efetivamente faturável. O resto é proposta,
   * prospeção, administração, deslocação, formação e pós-venda. Nunca 1.
   */
  taxaFaturavel: number;
  /** Rendimento líquido anual pretendido, em euros. */
  rendimentoAnualPretendido?: number;
}

// ─── 7. Produção própria ───────────────────────────────────────────────

export interface ComponenteMateria {
  id: string;
  rotulo: string;
  /** Custo do lote comprado. */
  custoLote: ValorComIVA;
  /** Quantas unidades de produto saem desse lote. */
  unidadesPorLote: number;
}

export interface ModeloProducao {
  materias: ComponenteMateria[];
  /** Euros por hora de mão de obra própria ou contratada. */
  custoHoraMaoObra?: number;
  horasPorUnidade?: number;
  /** Energia, consumíveis e desgaste, em euros por unidade. */
  energiaPorUnidade?: number;
  /** Depreciação de equipamento, em euros por mês. */
  depreciacaoMensal?: number;
  /** Unidades produzidas por mês — reparte a depreciação. */
  unidadesMes?: number;
}

// ─── 8. Objetivo ───────────────────────────────────────────────────────

/**
 * Como a pessoa quer chegar ao preço. Não há um caminho «certo» — há o
 * caminho que ela consegue exprimir. A engine traduz todos para o mesmo
 * modelo interno e mostra os equivalentes.
 */
export type ModoObjetivo =
  /** «Quero X% de margem sobre o preço.» */
  | "margem"
  /** «Quero acrescentar X% ao custo.» */
  | "markup"
  /** «Quero ganhar X € por unidade.» */
  | "lucro_unidade"
  /** «Quero ganhar X € por mês.» */
  | "lucro_mensal"
  /** «Quero cobrar X € — diz-me se dá.» */
  | "preco_fixo";

export interface ModeloObjetivo {
  modo: ModoObjetivo;
  /** Fração (0,35 = 35%). Usado em `margem` e `markup`. */
  percentagem?: number;
  /** Euros. Usado em `lucro_unidade`, `lucro_mensal` e `preco_fixo`. */
  valor?: number;
  /** Em `preco_fixo`, o valor introduzido é PVP (com IVA) ou líquido? */
  valorEhPVP?: boolean;
  /**
   * Folga da faixa «margem confortável», em pontos percentuais de margem.
   * Editável porque é um pressuposto, não uma regra.
   */
  folgaConfortavel?: number;
}

// ─── 9. Volume e desconto ──────────────────────────────────────────────

export interface ModeloVolume {
  /** Unidades vendidas por mês (esperadas). */
  unidadesMes: number;
}

export type TipoPromocao =
  | "desconto_simples"
  | "saldos"
  | "promocao"
  | "cupao"
  | "quantidade"
  | "lancamento";

export interface ModeloDesconto {
  tipo: TipoPromocao;
  /** Fração de desconto sobre o PVP (0,10 = 10%). */
  percentagem: number;
  /** Preço mais baixo praticado nos 30 dias anteriores, se conhecido. */
  precoAnterior30Dias?: number;
}

// ─── 10. O contexto completo ───────────────────────────────────────────

export interface ContextoPreco {
  /** Versão do esquema. Migrações futuras dependem disto. */
  versao: 1;
  cenario: CenarioInicial;
  vendedor: PerfilVendedor;
  produto: PerfilProduto;
  canal: PerfilCanal;
  custos: ModeloCustos;
  volume: ModeloVolume;
  objetivo: ModeloObjetivo;
  tempo?: ModeloTempo;
  producao?: ModeloProducao;
  desconto?: ModeloDesconto;
  /** «O preço que eu tinha pensado» (PVP). Alimenta o veredicto. */
  precoPensado?: number;
}

// ─── 11. Resultado ─────────────────────────────────────────────────────

export type NivelConfianca = "oficial" | "mercado" | "estimativa";

export interface LinhaExplicacao {
  rotulo: string;
  /** Euros. Negativo = sai; positivo = entra. */
  valor: number;
  /** Percentagem associada, quando existe (comissão, margem, IVA). */
  percentagem?: number;
  confianca: NivelConfianca;
  /** Base legal ou fonte de mercado. */
  fonte?: string;
  fonteUrl?: string;
  nota?: string;
}

export type MotivoImpossivel =
  /** As comissões e a margem pretendida somam ≥ 100% do preço. */
  | "margem_inalcancavel"
  /** Faltam dados essenciais. */
  | "dados_insuficientes"
  /** O preço fixado não cobre sequer os custos variáveis. */
  | "abaixo_do_custo";

export interface DetalheCustoUnitario {
  /** Custo direto já ajustado por IVA dedutível, desperdício e escalão. */
  direto: number;
  /** Custo direto tal como introduzido, antes dos ajustes. */
  diretoIntroduzido: number;
  /** Euros fixos por unidade (embalagem, portes, taxas fixas, CAC…). */
  variavelFixoPorUnidade: number;
  /** Fração aplicada ao preço LÍQUIDO (afiliado, SS, IRS marginal). */
  fracaoSobreLiquido: number;
  /** Fração aplicada ao PVP (comissão de canal, % de processamento). */
  fracaoSobreBruto: number;
  /** Custo esperado de devoluções, em euros por venda. */
  devolucoes: number;
  /** Quota de custos fixos por unidade ao volume esperado. */
  fixosPorUnidade: number;
  /** Soma de tudo o que varia com a venda, ao preço calculado. */
  variaveisTotais: number;
  /** Custo total por unidade ao preço calculado (variáveis + quota de fixos). */
  total: number;
}

export interface DetalheMargem {
  /** Lucro por unidade, em euros. */
  lucroUnidade: number;
  /** Lucro / preço líquido. */
  margem: number;
  /** Lucro / custo base. */
  markup: number;
  /** Preço líquido − custos variáveis. */
  contribuicaoUnidade: number;
  contribuicaoPercentagem: number;
  contribuicaoMensal: number;
  /** Lucro operacional mensal ao volume esperado. */
  lucroMensal: number;
}

export interface DetalheBreakEven {
  possivel: boolean;
  unidades: number;
  faturacao: number;
  /** Quantos dias de vendas ao ritmo esperado. */
  diasAoRitmoAtual?: number;
  nota?: string;
}

export interface AncoraPreco {
  chave: "piso" | "minimo" | "recomendado" | "confortavel";
  rotulo: string;
  precoLiquido: number;
  pvp: number;
  margem: number;
  explicacao: string;
}

export interface FaixaPreco {
  ancoras: AncoraPreco[];
  /** Sugestões de terminação comercial. Nunca substituem o recomendado. */
  psicologicos: { pvp: number; margem: number; delta: number }[];
}

export interface DetalheFiscalVendedor {
  aplicavel: boolean;
  /** Fração do líquido que sai em Segurança Social. */
  ssFracao: number;
  ssPorUnidade: number;
  /** Taxa marginal de IRS. A BASE sobre que incide vem em `irsBase`. */
  irsFracao: number;
  /**
   * Sobre o que incide o IRS:
   *   · `faturacao` — regime simplificado, o coeficiente do Art. 31.º já
   *     presume as despesas, e a taxa aplica-se ao preço líquido inteiro;
   *   · `lucro`     — contabilidade organizada (Art. 28.º), a taxa aplica-se
   *     ao que sobra depois dos custos dedutíveis.
   * Mostrar a percentagem sem esta distinção faz «24%» aparecer ao lado de
   * um valor em euros que não é 24% do preço.
   */
  irsBase: "faturacao" | "lucro";
  irsPorUnidade: number;
  /** Retenção na fonte: caixa, não custo. */
  retencaoFracao: number;
  retencaoPorUnidade: number;
  /**
   * Faturação da unidade MENOS os impostos pessoais (SS e IRS). Não desconta
   * o custo do produto.
   *
   * ⚠️ NÃO é «o que te fica por venda» — para isso é `margem.lucroUnidade`,
   * que desconta tudo. Num produto de 10 € de custo vendido a 39 €, este
   * campo dá 25,61 € e o que sobra mesmo são 15,61 €. O comentário anterior
   * dizia «depois de tudo» e a diferença era exactamente o custo.
   */
  liquidoPessoalPorUnidade: number;
  notas: string[];
}

export interface DetalheCaixa {
  /** O que o cliente paga. */
  cobradoAoCliente: number;
  /** O que entra na conta na altura da venda. */
  entraNaConta: number;
  /** O que sai depois (IVA a entregar, SS, IRS). */
  saiDepois: number;
}

/**
 * Uma fatia de cada euro cobrado que não chega a ser do vendedor, e sobre
 * o que incide.
 *
 * A distinção `sobreBruto` não é detalhe: 15% de comissão sobre o valor
 * COM IVA são 18,45% do valor sem IVA. Apresentar as duas bases com o
 * mesmo número faz a soma não fechar — e faz a pessoa concluir que o
 * problema é a margem que pediu, quando é a base sobre que a comissão
 * incide.
 */
export interface FracaoDoPreco {
  rotulo: string;
  /** Fração já convertida para o preço LÍQUIDO, comparável com a margem. */
  fracao: number;
  /** `true` quando a taxa original incide sobre o PVP. */
  sobreBruto?: boolean;
  /** A percentagem tal como a pessoa a introduziu, quando difere. */
  fracaoOriginal?: number;
}

/**
 * Onde é que cada euro vai parar, em frações — e quanto sobra.
 *
 * Existe sobretudo para o caso em que NÃO há preço possível. Aí a
 * ferramenta mostrava um retângulo vermelho com uma frase e mais nada:
 * desapareciam a faixa, o cursor, as métricas e os cenários, exatamente
 * no momento em que a pessoa mais precisa de saber QUAL fração está a
 * comer o preço e qual é o teto real. Uma parede não é um diagnóstico.
 */
export interface DiagnosticoPreco {
  /** Fração de cada euro de preço líquido que sobra para margem. */
  disponivel: number;
  /** A margem que foi pedida (em `margem`/`markup`). */
  margemPedida: number;
  /** O teto que estas frações permitem. Acima disto não existe preço. */
  margemMaxima: number;
  /** Quem consome o resto, por ordem decrescente. */
  consumidores: FracaoDoPreco[];
}

export type SeveridadeAviso = "info" | "atencao" | "perigo";

export interface Aviso {
  id: string;
  severidade: SeveridadeAviso;
  titulo: string;
  texto: string;
  fonte?: string;
  fonteUrl?: string;
}

export interface ResultadoPreco {
  ok: boolean;
  impossivel?: MotivoImpossivel;
  motivoTexto?: string;

  precoLiquido: number;
  iva: number;
  pvp: number;
  taxaIVA: number;
  regimeIVA: RegimeIVAVendedor;

  custo: DetalheCustoUnitario;
  margem: DetalheMargem;
  breakEven: DetalheBreakEven;
  faixa: FaixaPreco;
  fiscal: DetalheFiscalVendedor;
  caixa: DetalheCaixa;
  /**
   * Para onde vai cada euro, em frações, e quanto sobra para margem.
   * Preenchido SEMPRE — é o que permite explicar um preço impossível em
   * vez de o anunciar.
   */
  diagnostico: DiagnosticoPreco;
  /**
   * Quanto sai e QUANDO, cruzando o preço com o calendário de obrigações.
   * `null` sem volume declarado — sem ele a projeção seria inventada.
   */
  tesouraria?: Tesouraria | null;

  /** A memória de cálculo: como se chegou aqui. */
  explicacao: LinhaExplicacao[];
  avisos: Aviso[];

  /**
   * Só para sociedades: do lucro operacional ao que chega ao dono.
   * `null` quando não se aplica ou quando não há volume para projetar.
   */
  sociedade?: ConversaoSociedade | null;

  /** Preenchido quando há desconto configurado. */
  desconto?: ResultadoDesconto;
  /** Veredicto sobre `precoPensado`, quando existe. */
  veredicto?: VeredictoPreco;
}

export interface ResultadoDesconto {
  percentagem: number;
  pvpOriginal: number;
  pvpComDesconto: number;
  precoLiquidoComDesconto: number;
  margemAntes: number;
  margemDepois: number;
  lucroAntes: number;
  lucroDepois: number;
  /** Desconto máximo antes de a margem de contribuição chegar a zero. */
  descontoMaximo: number;
  destruiRentabilidade: boolean;
  /** Unidades extra necessárias para manter o mesmo lucro total. */
  unidadesExtraParaCompensar: number | null;
}

export type ClassificacaoVeredicto =
  | "abaixo_do_piso"
  | "abaixo_do_minimo"
  | "sustentavel_apertado"
  | "alinhado"
  | "acima_do_recomendado";

export interface VeredictoPreco {
  classificacao: ClassificacaoVeredicto;
  titulo: string;
  texto: string;
  /** Diferença em euros face ao preço recomendado (PVP). */
  diferenca: number;
  margemNoPrecoPensado: number;
  lucroNoPrecoPensado: number;
}

// ─── 12. Cenários «E se?» ──────────────────────────────────────────────

export type ChaveCenario =
  | "base"
  | "conservador"
  | "recomendado"
  | "ambicioso"
  | "desconto10"
  | "sem_portes"
  | "com_portes"
  | "marketplace"
  | "volume_dobro"
  | "custo_mais_10";

export interface CenarioComparado {
  chave: ChaveCenario;
  rotulo: string;
  descricao: string;
  pvp: number;
  precoLiquido: number;
  margem: number;
  lucroUnidade: number;
  lucroMensal: number;
  breakEvenUnidades: number;
  possivel: boolean;
}

// ─── 13. Objetivo invertido ────────────────────────────────────────────

export interface ResultadoObjetivo {
  ok: boolean;
  motivo?: string;
  /** Preço necessário (PVP) para atingir o objetivo ao volume declarado. */
  pvpNecessario?: number;
  precoLiquidoNecessario?: number;
  /** Unidades necessárias ao preço declarado. */
  unidadesNecessarias?: number;
  /** Faturação anual/mensal necessária. */
  faturacaoMensalNecessaria?: number;
  margemResultante?: number;
  explicacao: LinhaExplicacao[];
}
