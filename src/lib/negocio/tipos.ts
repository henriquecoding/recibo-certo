// ═══════════════════════════════════════════════════════════════════════
//  O CONTRATO DO NEGÓCIO — tipos e nada mais
//  ---------------------------------------------------------------------
//  Sem React, sem cálculo fiscal, sem dados. A mesma disciplina de
//  `pricing/tipos.ts`: quem importa o contrato não arrasta o motor.
//
//  ── O QUE ESTA CAMADA É ────────────────────────────────────────────
//  Um ORQUESTRADOR. O ReciboCerto já sabe calcular preços, IRC, IRS,
//  Segurança Social, IVA e comparar regimes. O que faltava era o objeto
//  que diz: «estas três ofertas, estes volumes e esta estrutura formam o
//  MESMO negócio».
//
//  ── O QUE ESTA CAMADA NUNCA É ──────────────────────────────────────
//  Um segundo motor de preço. Um segundo cálculo de IRC. Uma segunda
//  fonte de taxas. Nenhuma percentagem fiscal se escreve neste diretório:
//  o preço vem de `precificar()`, a fiscalidade da sociedade vem de
//  `fiscal-empresa.ts`, e as taxas vêm de `fiscal-data.ts` através deles.
//
//  ── AS DISTINÇÕES QUE ESTE FICHEIRO EXISTE PARA TORNAR IMPOSSÍVEIS
//     DE PERDER ────────────────────────────────────────────────────
//    · receita do cliente   ≠ volume de negócios (o IVA está no meio)
//    · custo da oferta      ≠ custo da estrutura (senão duplica)
//    · resultado operacional ≠ o que fica para a pessoa (falta o imposto)
//    · lucro                ≠ caixa (um negócio lucrativo pode falir)
//    · capacidade           ≠ vontade (20 projetos × 20 h não cabem no mês)
//
//  Nenhum campo se chama só «receita». «Receita» é ambígua exatamente no
//  sítio onde a ambiguidade custa 23%.
// ═══════════════════════════════════════════════════════════════════════

import type { ContextoPreco, ResultadoPreco, Regiao } from "@/lib/pricing/tipos";

export type { ContextoPreco, ResultadoPreco };

// ─── 1. Em que ponto está a pessoa ─────────────────────────────────────

/**
 * A porta de entrada. Não é uma taxonomia de empresas — é o estado real
 * de quem chega, e cada estado começa a conversa noutro sítio.
 */
export type MaturidadeNegocio =
  /** Ainda não vendeu nada. Começa pela oferta. */
  | "ideia"
  /** Já vende. Traz preços e quer validá-los. */
  | "ja_vendo"
  /** Já tem sociedade. Salta para estrutura, otimização e caixa. */
  | "empresa_existente";

export const MATURIDADES: readonly MaturidadeNegocio[] = [
  "ideia",
  "ja_vendo",
  "empresa_existente",
];

export type HorizonteProjecao = 12 | 24 | 36;

// ─── 2. Uma oferta ─────────────────────────────────────────────────────

/** A unidade em que a capacidade se mede. Depende do que se vende. */
export type UnidadeCapacidade = "unidades" | "clientes" | "horas" | "projetos";

/**
 * Os três cenários de volume.
 *
 * Existe para o mesmo motivo que a faixa de preço existe na pricing
 * engine: **nunca devolver um número sem faixa**. «12 clientes por mês» é
 * falsa precisão sobre um palpite; «entre 5 e 20, provavelmente 12» é
 * honesto sobre o que se sabe.
 */
export interface VolumeOferta {
  /** O cenário central — o que a pessoa acha mais provável. */
  esperadoMes: number;
  /** O mau mês. Omisso, deriva-se do esperado. */
  conservadorMes?: number;
  /** O bom mês. Omisso, deriva-se do esperado. */
  ambiciosoMes?: number;
}

export interface CapacidadeOferta {
  unidade: UnidadeCapacidade;
  /** Quantas unidades cabem, no máximo, num mês. */
  maximoMes: number;
  /** Porquê. «40 h/semana a 3 h por sessão» é melhor do que «13». */
  motivo?: string;
  /**
   * `true` quando o limite foi DERIVADO do modelo de tempo da oferta e
   * não escrito à mão. Muda o que se pode dizer: um limite derivado
   * atualiza-se sozinho quando as horas mudam; um limite manual é um
   * pressuposto da pessoa e tem de aparecer no livro de pressupostos.
   */
  derivada?: boolean;
}

export interface OfertaNegocio {
  id: string;
  nome: string;
  /**
   * O contexto COMPLETO da pricing engine. Não se extraem daqui custos,
   * IVA, margens ou comissões à mão: chama-se `precificar()`.
   *
   * Guardar o contexto inteiro (e não só o preço) é o que permite
   * recalcular a oferta com as regras atuais — exatamente o que a página
   * «Os meus preços» já faz com `PrecoGuardado`.
   */
  pricing: ContextoPreco;
  volume: VolumeOferta;
  capacidade?: CapacidadeOferta;
  /**
   * Doze fatores multiplicativos (janeiro a dezembro), 1 = mês médio.
   * Omissa, o ano é uniforme — e isso é um pressuposto que se declara.
   */
  sazonalidade?: number[];
  /**
   * Campos da pricing engine em que a pessoa mexeu MESMO nesta oferta.
   * É o que distingue «o custo é 0 porque é um ficheiro» de «o custo é 0
   * porque ainda não disse nada» — a mesma disciplina de
   * `pricing/preenchimento.ts`, guardada por oferta.
   */
  respondidos: string[];
}

// ─── 3. A estrutura ────────────────────────────────────────────────────

/**
 * Onde é que um custo vive. É o tipo que impede a dupla contagem.
 *
 * A pricing engine aceita custos fixos POR OFERTA (`custos.fixos`), e o
 * modelo de negócio precisa de custos de estrutura. Se «Contabilidade
 * 150 €/mês» existir nos dois, o resultado operacional fica 150 € abaixo
 * da verdade — e ninguém consegue ver porquê olhando para o ecrã.
 */
export type EscopoCusto =
  /** Só desta oferta. Vive em `ContextoPreco.custos.fixos`. */
  | "oferta"
  /** Da empresa inteira. Vive em `EstruturaNegocio.overheadMensal`. */
  | "empresa"
  /** Da empresa, mas repartido pelas ofertas com critério explícito. */
  | "rateado";

export type CategoriaCustoEstrutura =
  | "contabilidade"
  | "software"
  | "sede"
  | "seguros"
  | "marketing"
  | "pessoal"
  | "outro";

export interface CustoEstrutura {
  id: string;
  categoria: CategoriaCustoEstrutura;
  rotulo: string;
  /** Euros por mês. Sem IVA quando o negócio o deduz; ver `notaIVA`. */
  mensal: number;
  escopo?: EscopoCusto;
}

export type CategoriaInvestimento =
  | "equipamento"
  | "obras"
  | "stock"
  | "caucao"
  | "constituicao"
  | "licencas"
  | "outro";

export interface InvestimentoInicial {
  id: string;
  categoria: CategoriaInvestimento;
  rotulo: string;
  /** Euros, uma vez. */
  valor: number;
  /** Mês do horizonte em que sai da conta (0 = antes de abrir). */
  mes?: number;
}

export interface TrabalhadorPlaneado {
  id: string;
  funcao: string;
  /** Salário BRUTO mensal. Os encargos calculam-se, não se pedem. */
  salarioBrutoMensal: number;
  meses: 12 | 14;
  /** Mês do horizonte em que entra. 0 = desde o início. */
  entraNoMes?: number;
}

export interface EstruturaNegocio {
  overheadMensal: CustoEstrutura[];
  investimentosIniciais: InvestimentoInicial[];
  trabalhadores?: TrabalhadorPlaneado[];
}

// ─── 4. A procura ──────────────────────────────────────────────────────

export interface ProcuraNegocio {
  horizonteMeses: HorizonteProjecao;
  /** `sazonal` usa `OfertaNegocio.sazonalidade`; `simples` ignora-a. */
  modo: "simples" | "sazonal";
  /** Crescimento composto mês a mês (0,02 = +2%/mês). */
  crescimentoMensal?: number;
}

// ─── 5. A caixa ────────────────────────────────────────────────────────

export interface CaixaNegocio {
  saldoInicial: number;
  /** Dias entre faturar e receber. 0 = recebimento imediato. */
  prazoRecebimentoDias: number;
  /** Dias entre comprar e pagar ao fornecedor. */
  prazoFornecedorDias: number;
  stockInicial?: number;
  caucao?: number;
  financiamentoInicial?: number;
}

// ─── 6. Preferências de estrutura jurídica ─────────────────────────────

export type EnquadramentoPretendido =
  /** Não é preguiça: é o estado honesto de quem ainda não decidiu. */
  | "nao_sei"
  | "independente"
  | "eni"
  | "sociedade";

export interface PreferenciasEstrutura {
  enquadramento: EnquadramentoPretendido;
  regiao?: Regiao;
  compararAlternativas: boolean;
}

// ─── 7. O contexto completo ────────────────────────────────────────────

export interface ContextoNegocio {
  /** Versão do esquema. As migrações futuras dependem disto. */
  versao: 1;
  id: string;
  nome?: string;
  maturidade: MaturidadeNegocio;
  ofertas: OfertaNegocio[];
  estrutura: EstruturaNegocio;
  procura: ProcuraNegocio;
  caixa?: CaixaNegocio;
  fiscal: PreferenciasEstrutura;
  /** Campos do NEGÓCIO (não das ofertas) em que a pessoa mexeu. */
  respondidos: string[];
  meta: {
    criadoEm: string;
    atualizadoEm: string;
  };
}

// ─── 8. Pressupostos ───────────────────────────────────────────────────

export type OrigemPressuposto = "utilizador" | "default" | "derivado";
export type ImpactoPressuposto = "baixo" | "medio" | "alto";

export interface PressupostoNegocio {
  id: string;
  rotulo: string;
  /** Já formatado para leitura. */
  valor: string;
  origem: OrigemPressuposto;
  impacto: ImpactoPressuposto;
  /** Onde é que se resolve — um id de campo ou de secção. */
  resolverEm?: string;
  /** Porque é que isto muda o resultado. Uma frase. */
  porque?: string;
}

// ─── 9. Avisos ─────────────────────────────────────────────────────────

export type SeveridadeAvisoNegocio = "info" | "atencao" | "perigo";

export interface AvisoNegocio {
  id: string;
  severidade: SeveridadeAvisoNegocio;
  titulo: string;
  texto: string;
  /** Id da oferta a que o aviso diz respeito, quando é de uma só. */
  ofertaId?: string;
}

// ─── 10. Resultado por oferta ──────────────────────────────────────────

/**
 * Os quatro nomes do dinheiro que uma oferta gera. Sem campo genérico
 * `receita` — é a regra §17 do relatório, e é a que impede o erro de 23%.
 */
export interface ReceitaOferta {
  /** O que o cliente paga. PVP × unidades. */
  receitaCliente: number;
  /** Volume de negócios: preço líquido × unidades. É o que a AT chama receita. */
  receitaSemIVA: number;
  /** IVA liquidado. Nunca é receita — é dinheiro do Estado a passar pela conta. */
  ivaCobrado: number;
}

export interface ResultadoOfertaNegocio {
  oferta: OfertaNegocio;
  /** O resultado íntegro da pricing engine. Nada aqui é recalculado. */
  preco: ResultadoPreco;
  /** `false` quando a engine não conseguiu formar preço com estes números. */
  ok: boolean;
  unidadesMes: number;
  mensal: ReceitaOferta;
  /**
   * Custos VARIÁVEIS da operação, por mês, SEM os impostos pessoais do
   * vendedor. Ver o cabeçalho de `agregar.ts` para saber porquê.
   */
  custosVariaveisOperacionaisMes: number;
  /** SS + IRS do trabalhador independente, quando aplicável. */
  encargosVendedorMes: number;
  /** receitaSemIVA − custosVariaveisOperacionais. Antes do overhead. */
  contribuicaoMes: number;
  /** Fração de `contribuicaoMes` sobre `receitaSemIVA`. */
  contribuicaoPercentagem: number;
  /** Peso desta oferta na receita sem IVA do negócio (0–1). */
  peso: number;
  /** Horas de trabalho que este volume consome por mês, quando se sabe. */
  horasMes?: number;
}

// ─── 11. Diagnósticos ──────────────────────────────────────────────────

export type EstadoCapacidade = "folgada" | "apertada" | "excedida" | "desconhecida";

export interface DiagnosticoCapacidade {
  ofertaId: string;
  nome: string;
  unidade: UnidadeCapacidade;
  estado: EstadoCapacidade;
  /** Carga pedida pelo volume esperado. */
  carga: number;
  /** Limite declarado ou derivado. */
  maximo: number;
  /** carga / maximo. > 1 é impossível, não «ambicioso». */
  utilizacao: number;
  mensagem: string;
}

export type EstadoConcentracao = "diversificada" | "moderada" | "concentrada" | "unica";

export interface DiagnosticoConcentracao {
  estado: EstadoConcentracao;
  /** Peso da maior oferta (0–1). */
  maiorPeso: number;
  maiorNome: string;
  /** Índice de Herfindahl–Hirschman normalizado (0–1). */
  hhi: number;
  mensagem: string;
}

export interface BreakEvenNegocio {
  possivel: boolean;
  /**
   * Vendas por mês necessárias para cobrir a estrutura, mantendo o MIX
   * atual. Sem mix (uma oferta), é a conta de sempre.
   */
  vendasMes: number;
  /** Volume de negócios correspondente, sem IVA. */
  receitaSemIVAMes: number;
  /** Vendas esperadas ao mix atual. */
  vendasEsperadasMes: number;
  /** vendasEsperadas − vendasMes. Negativo = ainda falta. */
  folgaVendas: number;
  /** Fração do caminho já feito (0–1+). */
  progresso: number;
  nota?: string;
}

// ─── 12. Sensibilidade ─────────────────────────────────────────────────

export type EixoSensibilidade = "volume" | "preco" | "custo" | "overhead";

export interface ImpactoSensibilidade {
  eixo: EixoSensibilidade;
  rotulo: string;
  /** O choque aplicado (−0,30 = menos 30%). */
  choque: number;
  resultadoOperacionalMes: number;
  /** Diferença face ao cenário base, em euros/mês. */
  delta: number;
  /** `true` quando o choque leva o resultado a negativo. */
  quebra: boolean;
}

export interface EixoTornado {
  eixo: EixoSensibilidade;
  rotulo: string;
  /** Amplitude do resultado entre o pior e o melhor choque deste eixo. */
  amplitude: number;
  melhor: number;
  pior: number;
}

export interface ResultadoSensibilidade {
  base: number;
  impactos: ImpactoSensibilidade[];
  /** Os eixos, ordenados por quanto mexem no resultado. */
  tornado: EixoTornado[];
  /** O eixo que mais mexe. É a premissa a confirmar primeiro. */
  critico?: EixoTornado;
}

// ─── 13. Caixa ─────────────────────────────────────────────────────────

export interface MesCaixa {
  /** 1 = primeiro mês de atividade. */
  mes: number;
  rotulo: string;
  recebimentos: number;
  pagamentos: number;
  investimentos: number;
  fluxo: number;
  saldoFim: number;
}

export interface ResultadoCaixa {
  meses: MesCaixa[];
  saldoMinimo: number;
  mesDoSaldoMinimo: number;
  rotuloDoMesMinimo: string;
  /** Quanto falta para o saldo nunca ficar negativo. 0 = não falta nada. */
  capitalAdicionalNecessario: number;
  /** Meses até o saldo ficar positivo e assim permanecer. `null` se nunca. */
  mesesAteEquilibrio: number | null;
}

// ─── 14. O resultado do negócio ────────────────────────────────────────

/**
 * A confiança do resultado. Estados semânticos, nunca uma percentagem:
 * «83% confiável» é uma precisão que não temos sobre dados que a pessoa
 * estimou de cabeça.
 */
export type ConfiancaNegocio = "exploratorio" | "estimado" | "estruturado";

export interface ResultadoNegocio {
  ofertas: ResultadoOfertaNegocio[];

  // ── Mensal, na vista OPERACIONAL ─────────────────────────────────
  //  «Operacional» quer dizer: antes do imposto sobre o rendimento de
  //  quem recebe o lucro. É a única vista comparável entre independente
  //  e sociedade — e é a que os adaptadores entregam aos motores
  //  fiscais, que calculam o imposto eles próprios.
  receitaClienteMes: number;
  receitaSemIVAMes: number;
  ivaCobradoMes: number;
  custosVariaveisMes: number;
  margemContribuicaoMes: number;
  overheadMes: number;
  custoTrabalhadoresMes: number;
  resultadoOperacionalMes: number;

  // ── Anual, os mesmos números × 12 ────────────────────────────────
  receitaSemIVAAno: number;
  custosOperacionaisAno: number;
  resultadoOperacionalAno: number;

  // ── A vista do BOLSO de quem trabalha por conta própria ──────────
  /** SS + IRS já embutidos no preço das ofertas de trabalhador independente. */
  encargosVendedorMes: number;
  /** resultadoOperacional − encargosVendedor. Só faz sentido em TI. */
  resultadoDepoisEncargosMes: number;
  /** `true` quando alguma oferta tem fiscalidade de TI aplicada. */
  temFiscalidadeVendedor: boolean;

  breakEven: BreakEvenNegocio;
  capacidade: DiagnosticoCapacidade[];
  concentracao: DiagnosticoConcentracao;
  sensibilidade?: ResultadoSensibilidade;
  caixa?: ResultadoCaixa;

  confianca: ConfiancaNegocio;
  pressupostos: PressupostoNegocio[];
  avisos: AvisoNegocio[];
}

// ─── 15. Dupla contagem ────────────────────────────────────────────────

export interface DuplicacaoCusto {
  /** Rótulo normalizado que aparece nos dois sítios. */
  chave: string;
  rotuloOferta: string;
  rotuloEstrutura: string;
  ofertaId: string;
  ofertaNome: string;
  custoEstruturaId: string;
  /** Euros/mês contados a dobrar (o menor dos dois, por prudência). */
  valorDuplicado: number;
  mensagem: string;
}
