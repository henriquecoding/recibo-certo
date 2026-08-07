// ═══════════════════════════════════════════════════════════════════════
//  A TABELA DE DADOS DE CADA GUIA, DERIVADA DO MOTOR FISCAL
//  ---------------------------------------------------------------------
//  Este módulo existe para que nenhum número fiscal seja escrito duas vezes
//  no repositório.
//
//  O pacote de expansão trouxe os seus valores como TEXTO — "0,50%",
//  "600 000 €", "maio e agosto". Servem de rasto do que o pacote entregou e
//  ficam em `conteudo.ts`, intocados. Mas não é deles que a página vive: um
//  número em texto não é validado por ninguém, não entra numa conta, e no
//  dia em que o Orçamento do Estado o mudar continua ali, com ar de certo.
//
//  O que a página mostra sai de `fiscal-data.ts`, onde cada valor tem tipo,
//  base legal, fonte e data de verificação, e onde
//  `assertFiscalDataIntegrity()` o valida no arranque. Aqui só se escolhe
//  QUE valores cada guia mostra e como se leem em português.
//
//  Guias sem entrada aqui continuam a mostrar a tabela do pacote — são os
//  andaimes, que não estão publicados. `guias:expansao` não deixa nenhum
//  guia COM CORPO ficar nessa situação: o teste falha se um guia publicado
//  mostrar um número que o motor não conhece.
// ═══════════════════════════════════════════════════════════════════════

import type { TAViaturasTaxas } from "@/lib/fiscal-data";
import {
  DEPRECIACAO,
  ELEMENTOS_REDUZIDO_VALOR,
  ICE,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  RFAI_TAXA_INTERIOR,
  RFAI_TAXA_INTERIOR_EXCEDENTE,
  RFAI_TAXA_LITORAL,
  RFAI_LIMITE_INVESTIMENTO_INTERIOR,
  RFAI_LIMITE_COLETA,
  RFAI_REPORTE_ANOS,
  SIFIDE_TAXA_BASE,
  SIFIDE_TAXA_INCREMENTAL,
  SIFIDE_TETO_INCREMENTAL,
  SIFIDE_MAJORACAO_PME_JOVEM,
  SIFIDE_REPORTE_ANOS,
  STOCK_OPTIONS_STARTUP,
  STOCK_OPTIONS_TAXA_EFETIVA,
  TA_AJUDAS_CUSTO,
  TA_VIATURAS_COMBUSTAO,
  TA_VIATURAS_ELETRICA,
  TA_VIATURAS_PHEV,
  TA_ELETRICA_LIMITE_CUSTO,
  TA_AGRAVAMENTO_PREJUIZO,
  AJUDAS_CUSTO,
  SS_DEPENDENTE,
  SMN,
  AIMI,
  CAPITAIS_TAXA_LIBERATORIA,
  AJUSTE_BASE_SS,
  CATEGORIA_F,
  COIMAS_RGIT,
  CREDITO_TRIBUTARIO_INDISPONIVEL,
  CREDITO_IMPOSTO_ESTRANGEIRO,
  DEDUCAO_ESPECIFICA_PENSOES,
  DECLARACAO_PERIODICA_IVA,
  DEDUCAO_ASCENDENTE,
  DEDUCAO_ASCENDENTE_UNICO,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_BEBE,
  DEDUCAO_LARES,
  DEPENDENTES_IRS,
  DISPENSA_COIMA,
  EXCLUSAO_DEFICIENCIA_MAX,
  EXCLUSAO_DEFICIENCIA_TAXA,
  EXCLUSAO_DEFICIENCIA_TAXA_PENSOES,
  DEDUCAO_DEFICIENCIA_COLETA,
  DEDUCAO_DEFICIENCIA_GRAU_MINIMO,
  DEFICIENCIA_ART87,
  FATURACAO_PRAZOS,
  GUARDA_PARTILHADA,
  ENTIDADE_CONTRATANTE,
  ENTIDADE_CONTRATANTE_LIMIAR_CALC,
  DEDUCAO_PPR,
  DIVIDENDOS_ENGLOBAMENTO_FRACAO,
  CRIPTO_ISENCAO_DIAS,
  CRIPTO_REMUNERACAO,
  CRIPTO_TAXA_CURTO_PRAZO,
  DISPENSA_RETENCAO_LIMITE,
  FALTA_ENTREGA_PRESTACAO,
  IAS,
  IMI_AGRAVAMENTO_DEVOLUTO,
  IMI_ISENCAO_BAIXOS_RENDIMENTOS,
  IMI_ISENCAO_RENDIMENTO_LIMITE,
  IMI_ISENCAO_VPT_LIMITE,
  IMI_MESES_LIQUIDACAO,
  IMI_MINIMO_LIQUIDACAO,
  IMI_PRESTACOES,
  IMI_TAXA_OFFSHORE,
  IMI_TAXA_PADRAO,
  IMI_TAXA_RUSTICO,
  IMI_TAXA_URBANO_MAX,
  IMT_ESCALOES,
  IMT_ISENCAO_JOVEM,
  IMT_PRAZO_PAGAMENTO_DIAS,
  IMT_TAXA_COMERCIAL,
  IMT_TAXA_RUSTICO,
  IRS_AUTOMATICO,
  ISENCAO_IVA_REGIME,
  IVA_ISENCAO_EXCESSO,
  IVA_ISENCAO_LIMITE,
  IVA_TAXAS,
  ISENCOES_CIVA_PROFISSOES,
  IS_CREDITO,
  IS_DOACAO_IMOVEL,
  IS_TAXA_AQUISICAO,
  IS_TRANSMISSAO_GRATUITA,
  MINIMO_EXISTENCIA,
  MAIS_VALIAS_EXCLUSAO_DETENCAO,
  MAIS_VALIAS_IMOBILIARIO_INCLUSAO,
  MAIS_VALIAS_IMOVEIS,
  MAIS_VALIAS_MOBILIARIAS_TAXA,
  MAIS_VALIAS_REINVESTIMENTO_MESES,
  MAIS_VALIAS_REPORTE,
  NAO_RESIDENTES,
  OIC_NACIONAIS,
  PENSAO_ALIMENTOS_IRS,
  PPR_RESGATE,
  PPR_TAXA_EFETIVA_CONDICOES_LEGAIS,
  PRAZO_MODELO1_MESES,
  PROGRAMA_REGRESSAR,
  PROGRAMA_REGRESSAR_TETO_CALC,
  PROPRIEDADE_INTELECTUAL_EBF,
  REDUCAO_COIMA,
  REGULARIZACAO_IVA,
  REGIME_15PCT,
  REGIME_SIMPLIFICADO,
  RETENCAO,
  RENDIMENTO_MUNDIAL,
  REPRESENTANTE_FISCAL,
  RESIDENCIA_FISCAL,
  REVISAO_E_RECLAMACAO,
  SS_BASE_MAX_MENSAL,
  SS_MIN_MENSAL,
  SS_ACUMULACAO_LIMITE_IAS,
  SS_ACUMULACAO_LIMITE_MENSAL,
  SS_COEFICIENTE,
  SS_ISENCAO_PRIMEIRO_ANO_MESES,
  SS_TAXA,
  TRANSMISSAO_GRATUITA_PARTICIPACAO,
  SUBSIDIO_DESEMPREGO,
  SUBSIDIO_DOENCA,
  type EscalaoIMT,
} from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";
import type { DadoAnual } from "./conteudo";

/** Um valor do motor, pronto a mostrar, com a chave de onde veio. */
export interface DadoDoMotor extends DadoAnual {
  /** Nome do parâmetro em `fiscal-data.ts`. É o que torna a origem
      verificável — e o que o `engineBindings` do manifesto declara. */
  binding: string;
}

const d = (
  binding: string,
  label: string,
  valor: string,
  nota: string,
): DadoDoMotor => ({ binding, label, valor, nota, porConfirmar: false });

/** «maio e novembro» · «maio, agosto e novembro» — lista em português. */
const enumerar = (itens: readonly string[]): string =>
  itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;

/** «até 100 €» · «entre 100 € e 500 €» · «superior a 500 €» */
function faixa(anterior: number | null, ate: number | null): string {
  if (anterior === null) return `até ${fmt(ate ?? 0)}`;
  if (ate === null) return `superior a ${fmt(anterior)}`;
  return `entre ${fmt(anterior)} e ${fmt(ate)}`;
}

const prestacoesIMI = (): DadoDoMotor[] => {
  let anterior: number | null = null;
  return IMI_PRESTACOES.value.map((p) => {
    const linha = d(
      "IMI_PRESTACOES",
      `Prazo — IMI ${faixa(anterior, p.ateEuros)}`,
      enumerar(p.meses),
      `${p.meses.length === 1 ? "prestação única" : `${p.meses.length} prestações`} · art. 120.º, n.º 1 CIMI`,
    );
    anterior = p.ateEuros;
    return linha;
  });
};

/** O topo do 1.º escalão de uma tabela do art. 17.º — o limiar da isenção. */
const topoPrimeiroEscalao = (escaloes: readonly EscalaoIMT[]): number =>
  escaloes[0]?.ate ?? 0;

/** Onde acaba a taxa marginal e começa a taxa única. */
const topoMarginais = (escaloes: readonly EscalaoIMT[]): number =>
  [...escaloes].reverse().find((e) => !e.taxaUnica)?.ate ?? 0;

/**
 * O bloco comum aos guias por profissão.
 *
 * O pacote repete o mesmo aviso nos dez: o CAE e o enquadramento no art.
 * 151.º determinam coeficiente e retenção, e não se generaliza por nome de
 * profissão. A resposta editorial é mostrar os DOIS enquadramentos lado a
 * lado — quem lê vê a diferença que a escolha faz, em vez de receber um
 * número que pode não ser o dele.
 */
const enquadramentoCategoriaB = (): DadoDoMotor[] => [
  d("REGIME_SIMPLIFICADO", "Coeficiente — profissão da tabela do art. 151.º", pctExato(REGIME_SIMPLIFICADO.coefServicos151.value), "do rendimento bruto vai a imposto · art. 31.º, n.º 1, al. b) CIRS"),
  d("REGIME_SIMPLIFICADO", "Coeficiente — outras prestações de serviços", pctExato(REGIME_SIMPLIFICADO.coefOutrosServicos.value), "atividade identificada por CAE e não constante da tabela do art. 151.º · art. 31.º, n.º 1, al. c) CIRS"),
  d("REGIME_SIMPLIFICADO", "Coeficiente — vendas de bens", pctExato(REGIME_SIMPLIFICADO.coefVendas.value), "e também restauração e hotelaria · art. 31.º, n.º 1, al. a) CIRS"),
  d("RETENCAO", "Retenção — profissão do art. 151.º", pctExato(RETENCAO.art151.value), "sobre o valor da fatura, quando o cliente tem contabilidade organizada · art. 101.º, n.º 1, al. a) CIRS"),
  d("RETENCAO", "Retenção — outras atividades", pctExato(RETENCAO.outros.value), "art. 101.º CIRS"),
  d("RETENCAO", "Retenção — vendas de bens", pctExato(RETENCAO.vendas.value), "a retenção incide sobre prestações de serviços, não sobre vendas"),
  d("REGIME_15PCT", "Despesas a justificar", pctExato(REGIME_15PCT.value), "do rendimento bruto, nos coeficientes de serviços; a parte não justificada é acrescida ao rendimento tributável · art. 31.º CIRS"),
  d("DISPENSA_RETENCAO_LIMITE", "Dispensa de retenção", `até ${fmt(DISPENSA_RETENCAO_LIMITE.value)}`, "de rendimento anual estimado da categoria B · art. 101.º-B, n.º 1, al. a) CIRS"),
  d("IVA_ISENCAO_LIMITE", "Isenção de IVA", `até ${fmt(IVA_ISENCAO_LIMITE.value)}`, "de volume de negócios · art. 53.º CIVA"),
  d("SS_TAXA", "Taxa contributiva", pctExato(SS_TAXA.value), "sobre a base de incidência · Código dos Regimes Contributivos"),
  d("SS_COEFICIENTE", "Base de incidência — serviços", pctExato(SS_COEFICIENTE.servicos.value), "do rendimento de prestação de serviços declarado no trimestre"),
  d("SS_COEFICIENTE", "Base de incidência — vendas", pctExato(SS_COEFICIENTE.bens.value), "do rendimento de venda de bens"),
  d("SS_ISENCAO_PRIMEIRO_ANO_MESES", "Isenção de contribuições no início", `${SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses`, "a contar do início de atividade; é o fim desta isenção que muda a conta no segundo ano"),
];

// As taxas de tributação autónoma de viaturas vêm por escalão de custo de
// aquisição, num objeto de três campos. Serializar aqui evita escrever à
// mão três percentagens que o motor já tem.
const taxasPorEscalao = (t: TAViaturasTaxas): string =>
  [t.ate37500, t.ate45000, t.acima45000].map((v) => pctExato(v)).join(" · ");

export const DADOS_MOTOR: Record<string, DadoDoMotor[]> = {
  imi: [
    d("IMI_TAXA_PADRAO", "Taxa — prédios urbanos", `${pctExato(IMI_TAXA_PADRAO.value)} a ${pctExato(IMI_TAXA_URBANO_MAX.value)}`, "intervalo legal; cada município fixa a sua, podendo fixá-la por freguesia · art. 112.º, n.º 1, al. c) CIMI"),
    d("IMI_TAXA_RUSTICO", "Taxa — prédios rústicos", pctExato(IMI_TAXA_RUSTICO.value), "fixa, não depende do município · art. 112.º, n.º 1, al. a) CIMI"),
    ...prestacoesIMI(),
    d("IMI_MESES_LIQUIDACAO", "Liquidação pela AT", enumerar(IMI_MESES_LIQUIDACAO.value), "do ano seguinte àquele a que o imposto respeita · art. 113.º, n.º 2 CIMI"),
    d("IMI_MINIMO_LIQUIDACAO", "Mínimo de cobrança", fmt(IMI_MINIMO_LIQUIDACAO.value), "abaixo deste montante não há sequer liquidação · art. 113.º, n.º 6 CIMI"),
    d("IMI_ISENCAO_BAIXOS_RENDIMENTOS", "Isenção permanente — rendimento do agregado", `≤ ${fmt(IMI_ISENCAO_RENDIMENTO_LIMITE)}`, `${IMI_ISENCAO_BAIXOS_RENDIMENTOS.multiplicadorRendimento.value} × 14 IAS, com o IAS de ${fmt(IAS.value)} · art. 11.º-A, n.º 1 CIMI`),
    d("IMI_ISENCAO_BAIXOS_RENDIMENTOS", "Isenção permanente — VPT global do agregado", `≤ ${fmt(IMI_ISENCAO_VPT_LIMITE)}`, `${IMI_ISENCAO_BAIXOS_RENDIMENTOS.multiplicadorVpt.value} × 14 IAS · reconhecida oficiosamente pela AT, todos os anos`),
    d("IMI_AGRAVAMENTO_DEVOLUTO", "Prédios devolutos há mais de um ano e ruínas", `taxa × ${IMI_AGRAVAMENTO_DEVOLUTO.value}`, "art. 112.º, n.º 3 CIMI"),
    d("IMI_TAXA_OFFSHORE", "Titular com domicílio em regime fiscal mais favorável", pctExato(IMI_TAXA_OFFSHORE.value), "art. 112.º, n.º 4 CIMI"),
  ],

  imt: [
    d("IMT_ESCALOES", "Isenção jovem — total", `até ${fmt(topoPrimeiroEscalao(IMT_ESCALOES.value.jovem))}`, "topo do 1.º escalão da tabela da al. b) — 35 anos ou menos, primeira aquisição de habitação própria e permanente"),
    d("IMT_ESCALOES", "Isenção jovem — isenção parcial", `${fmt(topoPrimeiroEscalao(IMT_ESCALOES.value.jovem))} a ${fmt(topoMarginais(IMT_ESCALOES.value.jovem))}`, `só o excedente é tributado, à taxa marginal de ${pctExato(IMT_ESCALOES.value.jovem[1]?.taxa ?? 0)}`),
    d("IMT_ISENCAO_JOVEM", "Isenção jovem — idade", `${IMT_ISENCAO_JOVEM.idadeMaxima.value} anos ou menos`, "à data da transmissão, e sem ser considerado dependente no ano · art. 9.º, n.º 2 CIMT"),
    d("IMT_ISENCAO_JOVEM", "Isenção jovem — janela sem propriedade", `${IMT_ISENCAO_JOVEM.anosSemPropriedade.value} anos`, "exclui quem foi titular de prédio urbano habitacional nesse período · art. 9.º, n.º 3 CIMT"),
    d("IMT_ESCALOES", "Habitação própria permanente — isento até", fmt(topoPrimeiroEscalao(IMT_ESCALOES.value.hpp)), "1.º escalão da tabela da al. a); acima disso, taxa marginal e parcela a abater"),
    d("IMT_ESCALOES", "Habitação secundária — taxa do 1.º escalão", pctExato(IMT_ESCALOES.value.secundaria[0]?.taxa ?? 0), "paga desde o primeiro euro, ao contrário da habitação própria permanente"),
    d("IMT_TAXA_RUSTICO", "Prédios rústicos", pctExato(IMT_TAXA_RUSTICO.value), "taxa única · art. 17.º, n.º 1, al. d) CIMT"),
    d("IMT_TAXA_COMERCIAL", "Outros prédios urbanos", pctExato(IMT_TAXA_COMERCIAL.value), "taxa única · art. 17.º, n.º 1, al. e) CIMT"),
    d("IS_TAXA_AQUISICAO", "Imposto do selo na escritura", pctExato(IS_TAXA_AQUISICAO.value), "sobre a mesma base do IMT, sem escalões · verba 1.1 da Tabela Geral"),
    d("IMT_PRAZO_PAGAMENTO_DIAS", "Prazo de pagamento", `${IMT_PRAZO_PAGAMENTO_DIAS.value} dias`, "no próprio dia da liquidação ou nos 30 dias seguintes, sob pena de esta ficar sem efeito · art. 36.º, n.º 1 CIMT"),
  ],

  aimi: [
    d("AIMI", "Dedução — pessoa singular", fmt(AIMI.deducaoSingular.value), "e o mesmo montante para heranças indivisas; as pessoas coletivas não têm dedução · art. 135.º-C, n.º 2 CIMI"),
    d("AIMI", "Taxa — pessoas singulares e heranças indivisas", pctExato(AIMI.taxaSingular.value), "sobre o valor que sobra depois da dedução · art. 135.º-F, n.º 1 CIMI"),
    d("AIMI", "Taxa — pessoas coletivas", pctExato(AIMI.taxaColetiva.value), "sem dedução, sobre a soma toda · art. 135.º-F, n.º 1 CIMI"),
    d("AIMI", `Taxa marginal acima de ${fmt(AIMI.limiar1M.value)}`, pctExato(AIMI.taxaMarginal1M.value), "sobre o valor tributável antes da dedução; com opção conjunta, o limiar conta ao dobro · art. 135.º-F, n.º 2 CIMI"),
    d("AIMI", `Taxa marginal acima de ${fmt(AIMI.limiar2M.value)}`, pctExato(AIMI.taxaMarginal2M.value), "art. 135.º-F, n.º 3 CIMI"),
    d("AIMI", "Entidades em regime fiscal mais favorável", pctExato(AIMI.taxaOffshore.value), "não se aplica a pessoas singulares · art. 135.º-F, n.os 5 e 6 CIMI"),
    d("AIMI", "Liquidação", AIMI.mesLiquidacao.value, "com base nas matrizes a 1 de janeiro — data diferente da do IMI · art. 135.º-G CIMI"),
    d("AIMI", "Pagamento", AIMI.mesPagamento.value, "documento de cobrança enviado até ao fim do mês anterior · art. 135.º-H CIMI"),
  ],

  "vpt-reavaliacao": [
    d("IMI_TAXA_PADRAO", "Porque é que o VPT importa", `${pctExato(IMI_TAXA_PADRAO.value)} a ${pctExato(IMI_TAXA_URBANO_MAX.value)} ao ano`, "é sobre o VPT que a taxa de IMI do teu município incide, todos os anos · art. 112.º CIMI"),
    d("AIMI", "E importa outra vez acima da dedução do AIMI", fmt(AIMI.deducaoSingular.value), "o VPT de cada imóvel entra na soma que o AIMI tributa · art. 135.º-C CIMI"),
    d("MAIS_VALIAS_IMOBILIARIO_INCLUSAO", "Cuidado antes de vender", `${pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} da mais-valia é tributada`, "um VPT mais baixo pode aumentar a mais-valia quando o imóvel foi adquirido por valor patrimonial · art. 43.º CIRS"),
  ],

  "imposto-selo-compra-casa": [
    d("IS_TAXA_AQUISICAO", "Selo sobre a escritura", pctExato(IS_TAXA_AQUISICAO.value), "sobre o valor que serve de base ao IMT — o maior entre preço e VPT · verba 1.1 da Tabela Geral"),
    d("IS_CREDITO", "Selo do crédito — prazo inferior a 1 ano", pctExato(IS_CREDITO.ateUmAnoPorMes.value, 3), "por cada mês ou fração, sobre o capital · verba 17.1.1"),
    d("IS_CREDITO", "Selo do crédito — prazo ≥ 1 ano", pctExato(IS_CREDITO.umAnoOuMais.value), "sobre o capital · verba 17.1.2"),
    d("IS_CREDITO", "Selo do crédito — prazo ≥ 5 anos", pctExato(IS_CREDITO.cincoAnosOuMais.value), "é a taxa do crédito à habitação típico · verba 17.1.3"),
    d("IMT_PRAZO_PAGAMENTO_DIAS", "Prazo quando liquidado com o IMT", `${IMT_PRAZO_PAGAMENTO_DIAS.value} dias`, "segue o prazo do art. 36.º CIMT, que tem de estar cumprido antes da escritura"),
  ],

  "arrendamento-categoria-f": [
    d("CATEGORIA_F", "Taxa autónoma — arrendamento habitacional", pctExato(CATEGORIA_F.taxaHabitacao.value), "sobre o rendimento líquido, depois das deduções do art. 41.º · art. 72.º, n.º 2 CIRS"),
    d("CATEGORIA_F", "Taxa autónoma — arrendamento não habitacional", pctExato(CATEGORIA_F.taxaNaoHabitacao.value), "loja, escritório, armazém, publicidade · art. 72.º, n.º 1, al. e) CIRS"),
    d("CATEGORIA_F", "Redução — contrato de 5 a 10 anos", `−${pctExato(CATEGORIA_F.reducaoDuracao.value["5a10"])} (pontos)`, `fica em ${pctExato(CATEGORIA_F.taxaHabitacao.value - CATEGORIA_F.reducaoDuracao.value["5a10"])} · art. 72.º, n.º 3 CIRS`),
    d("CATEGORIA_F", "Redução — contrato de 10 a 20 anos", `−${pctExato(CATEGORIA_F.reducaoDuracao.value["10a20"])} (pontos)`, `fica em ${pctExato(CATEGORIA_F.taxaHabitacao.value - CATEGORIA_F.reducaoDuracao.value["10a20"])} · art. 72.º, n.º 4 CIRS`),
    d("CATEGORIA_F", "Redução — contrato de 20 anos ou mais", `−${pctExato(CATEGORIA_F.reducaoDuracao.value["20mais"])} (pontos)`, `fica em ${pctExato(CATEGORIA_F.taxaHabitacao.value - CATEGORIA_F.reducaoDuracao.value["20mais"])} · art. 72.º, n.º 5 CIRS`),
    d("CATEGORIA_F", "Redução por cada renovação de igual duração", `−${pctExato(CATEGORIA_F.reducaoPorRenovacao.value)} (pontos)`, `só nos contratos de 5 a 10 anos, até ao teto de ${pctExato(CATEGORIA_F.reducaoRenovacaoMax.value)} · art. 72.º, n.º 3 CIRS`),
    d("CATEGORIA_F", "Reporte de perdas da categoria F", `${CATEGORIA_F.reporteDePerdasAnos.value} anos`, "caduca se o prédio não gerar rendimentos da categoria F em 36 meses dos 5 anos seguintes · art. 55.º CIRS"),
  ],

  "despesas-senhorio": [
    d("CATEGORIA_F", "Obras de conservação antes do arrendamento", `${CATEGORIA_F.obrasAntesArrendamentoMeses.value} meses`, "dedutíveis se o imóvel não tiver tido outro fim entretanto · art. 41.º, n.º 7 CIRS"),
    d("MAIS_VALIAS_IMOVEIS", "Encargos com valorização — janela para a mais-valia", `${MAIS_VALIAS_IMOVEIS.encargosValorizacaoAnos.value} anos`, "não deduzem à renda, mas acrescem ao valor de aquisição quando vendes · art. 51.º, n.º 1, al. a) CIRS"),
    d("CATEGORIA_F", "Reporte de perdas", `${CATEGORIA_F.reporteDePerdasAnos.value} anos`, "só contra resultados positivos da mesma categoria · art. 55.º, n.º 1, al. b) CIRS"),
  ],

  "recibo-renda-modelo-44": [
    d("CATEGORIA_F", "Declaração anual de rendas (alternativa ao recibo)", CATEGORIA_F.prazoDeclaracaoRendas.value, "por referência ao ano anterior · art. 115.º, n.º 5, al. b) CIRS, na redação do DL 49/2025"),
  ],

  "mais-valias-imoveis": [
    d("MAIS_VALIAS_IMOBILIARIO_INCLUSAO", "Parte tributada da mais-valia", pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value), "do saldo entre mais-valias e menos-valias do ano · art. 43.º, n.º 2, al. b) CIRS"),
    d("MAIS_VALIAS_IMOVEIS", "Habitação própria permanente antes da venda", `${MAIS_VALIAS_IMOVEIS.hppAntesDaVendaMeses.value} meses`, "comprovada pelo domicílio fiscal · art. 10.º, n.º 5, al. e) CIRS"),
    d("MAIS_VALIAS_IMOVEIS", "Reinvestimento — janela anterior à venda", `${MAIS_VALIAS_IMOVEIS.reinvestimentoAntesMeses.value} meses`, "a janela abre antes da venda, não só depois · art. 10.º, n.º 5, al. b) CIRS"),
    d("MAIS_VALIAS_REINVESTIMENTO_MESES", "Reinvestimento — janela posterior à venda", `${MAIS_VALIAS_REINVESTIMENTO_MESES.value} meses`, "contados da data da realização · art. 10.º, n.º 5, al. b) CIRS"),
    d("MAIS_VALIAS_IMOVEIS", "Afetar a habitação o imóvel comprado", `${MAIS_VALIAS_IMOVEIS.afetacaoAposReinvestimentoMeses.value} meses`, "após o reinvestimento · art. 10.º, n.º 6, al. a) CIRS"),
    d("MAIS_VALIAS_IMOVEIS", "Inscrição na matriz (construção ou obras)", `${MAIS_VALIAS_IMOVEIS.inscricaoMatrizMeses.value} meses`, "desde a realização, com afetação a habitação até ao fim do 5.º ano seguinte · art. 10.º, n.º 6, al. b) CIRS"),
    d("MAIS_VALIAS_IMOVEIS", "Reinvestir para arrendar — contrato", `${MAIS_VALIAS_IMOVEIS.arrendamentoContratoMeses.value} meses`, "arrendamento habitacional dentro dos limites de renda do DL 97/2026 · art. 10.º, n.º 8, al. a) CIRS"),
    d("MAIS_VALIAS_IMOVEIS", "Reinvestir para arrendar — manutenção", `${MAIS_VALIAS_IMOVEIS.arrendamentoManutencaoMeses.value} meses`, "seguidos ou interpolados, nos primeiros cinco anos · art. 10.º, n.º 8, al. b) CIRS"),
    d("MAIS_VALIAS_IMOVEIS", "Encargos com valorização", `${MAIS_VALIAS_IMOVEIS.encargosValorizacaoAnos.value} anos`, "acrescem ao valor de aquisição, com prova · art. 51.º, n.º 1, al. a) CIRS"),
    d("MAIS_VALIAS_IMOVEIS", "Imóvel com apoio público não reembolsável", `${pctExato(MAIS_VALIAS_IMOVEIS.apoioPublicoLimiarVpt.value)} do VPT · ${MAIS_VALIAS_IMOVEIS.apoioPublicoAnos.value} anos`, "acima daquele apoio e vendido antes desse prazo, o saldo é tributado por inteiro · art. 43.º, n.º 2, al. a) CIRS"),
  ],

  "alojamento-local": [
    d("REGIME_SIMPLIFICADO", "Coeficiente — regime simplificado", String(REGIME_SIMPLIFICADO.coefAlojamentoMoradia.value).replace(".", ","), "moradia ou apartamento; excluído da alínea das atividades hoteleiras · art. 31.º, n.º 1, al. c) CIRS"),
    d("REGIME_SIMPLIFICADO", "Coeficiente — áreas de contenção", String(REGIME_SIMPLIFICADO.coefAlojamentoContencao.value).replace(".", ","), "a delimitação é municipal e muda: verifica-a por morada, na câmara do teu concelho · art. 31.º, n.º 1, al. h) CIRS"),
  ],

  "al-vs-arrendamento": [
    d("REGIME_SIMPLIFICADO", "Alojamento local — coeficiente", String(REGIME_SIMPLIFICADO.coefAlojamentoMoradia.value).replace(".", ","), "aplicado ao rendimento BRUTO, e o resultado é englobado com os teus outros rendimentos"),
    d("CATEGORIA_F", "Arrendamento habitacional — taxa autónoma", pctExato(CATEGORIA_F.taxaHabitacao.value), "aplicada ao rendimento LÍQUIDO, e não englobada"),
    d("CATEGORIA_F", "Arrendamento longo — taxa mínima possível", pctExato(CATEGORIA_F.taxaHabitacao.value - CATEGORIA_F.reducaoDuracao.value["20mais"]), "contratos de 20 anos ou mais · art. 72.º, n.º 5 CIRS"),
  ],

  "herdar-imovel": [
    d("IS_TRANSMISSAO_GRATUITA", "Taxa geral — transmissões gratuitas", pctExato(IS_TRANSMISSAO_GRATUITA.value), "proporcional, não progressiva · verba 1.2 da Tabela Geral"),
    d("PRAZO_MODELO1_MESES", "Prazo da participação à AT", `fim do ${PRAZO_MODELO1_MESES.value}.º mês seguinte`, "improrrogável, salvo motivo justificado (adiamento até 60 dias) · art. 26.º, n.os 3 e 5 CIS"),
    d("MAIS_VALIAS_IMOBILIARIO_INCLUSAO", "Se venderes o que herdaste", `${pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} da mais-valia é tributada`, "com valor de aquisição igual ao considerado para o imposto do selo · arts. 43.º e 45.º CIRS"),
  ],

  // ── Investir e poupar ───────────────────────────────────────────────

  "anexo-j": [
    d("RENDIMENTO_MUNDIAL", "Regra de base", "rendimento mundial", "sendo residente, o IRS incide sobre a totalidade dos teus rendimentos, incluindo os obtidos fora de Portugal · art. 15.º, n.º 1 CIRS"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Crédito de imposto — o limite", "o menor dos dois", "imposto pago lá fora ou fração da coleta portuguesa correspondente a esse rendimento · art. 81.º, n.º 1 CIRS"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Crédito que a coleta não absorveu", `${CREDITO_IMPOSTO_ESTRANGEIRO.reporteAnos.value} anos`, "por insuficiência de coleta, o remanescente deduz-se nos períodos seguintes · art. 81.º, n.º 3 CIRS"),
  ],

  "corretoras-estrangeiras-irs": [
    d("MAIS_VALIAS_MOBILIARIAS_TAXA", "Mais-valias de valores mobiliários", pctExato(MAIS_VALIAS_MOBILIARIAS_TAXA.value), "taxa especial sobre o saldo positivo do ano, com opção de englobamento · art. 72.º CIRS"),
    d("CAPITAIS_TAXA_LIBERATORIA", "Dividendos e juros", pctExato(CAPITAIS_TAXA_LIBERATORIA.value), "taxa liberatória do art. 71.º, n.º 1 CIRS — quando o pagador é estrangeiro, não há retenção cá e o rendimento é declarado"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Imposto retido na origem", "o menor dos dois", "crédito limitado ao imposto pago lá fora ou à fração da coleta portuguesa — e, havendo convenção, ao que ela permitia reter · art. 81.º CIRS"),
    d("MAIS_VALIAS_REPORTE", "Reporte de menos-valias", `${MAIS_VALIAS_REPORTE.anos.value} anos`, "só se optares pelo englobamento no ano da perda · art. 55.º, n.º 1, al. d) CIRS"),
  ],

  "cripto-365-dias": [
    d("CRIPTO_ISENCAO_DIAS", "Detenção igual ou superior a 365 dias", "excluída de tributação", `a exclusão do art. 10.º, n.º 19 CIRS conta a partir de ${CRIPTO_ISENCAO_DIAS.value} dias — mas a operação continua declarável`),
    d("CRIPTO_TAXA_CURTO_PRAZO", "Detenção inferior a 365 dias", pctExato(CRIPTO_TAXA_CURTO_PRAZO.value), "taxa especial sobre o saldo, com opção de englobamento · arts. 10.º, n.º 1, al. k) e 72.º CIRS"),
    d("MAIS_VALIAS_REPORTE", "Reporte de menos-valias", `${MAIS_VALIAS_REPORTE.anos.value} anos`, "as operações com criptoativos são a al. k) do n.º 1 do art. 10.º, abrangida pelo reporte · art. 55.º, n.º 1, al. d) CIRS"),
    d("MAIS_VALIAS_REPORTE", "Condição do reporte", "englobamento no ano da perda", "sem a opção exercida nesse ano, o saldo negativo não transita · art. 55.º, n.º 1, al. d) CIRS"),
  ],

  "rendimentos-capitais-categoria-e": [
    d("CAPITAIS_TAXA_LIBERATORIA", "Taxa liberatória", pctExato(CAPITAIS_TAXA_LIBERATORIA.value), "retenção na fonte a título definitivo sobre rendimentos de capitais obtidos em território português · art. 71.º, n.º 1 CIRS"),
    d("RENDIMENTO_MUNDIAL", "Pagador estrangeiro", "declarável no Anexo J", "não há retenção cá, mas o rendimento é tributado na mesma — és tributado pelo rendimento mundial · art. 15.º, n.º 1 CIRS"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Imposto retido lá fora", "o menor dos dois", "crédito limitado ao imposto pago ou à fração da coleta portuguesa · art. 81.º, n.º 1 CIRS"),
  ],

  "dividendos-irs": [
    d("CAPITAIS_TAXA_LIBERATORIA", "Taxa liberatória", pctExato(CAPITAIS_TAXA_LIBERATORIA.value), "retenção na fonte a título definitivo; o dividendo chega-te já líquido · art. 71.º, n.º 1 CIRS"),
    d("DIVIDENDOS_ENGLOBAMENTO_FRACAO", "Se optares pelo englobamento", `só ${pctExato(DIVIDENDOS_ENGLOBAMENTO_FRACAO.value)} do lucro conta`, "os lucros já tributados em IRC entram por metade no rendimento coletável · art. 40.º-A, n.º 1 CIRS"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Dividendos de fonte estrangeira", "o menor dos dois", "não há retenção liberatória cá; há crédito de imposto, limitado ao imposto pago lá ou à fração da coleta portuguesa · art. 81.º CIRS"),
  ],

  "credito-imposto-estrangeiro": [
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "O limite geral", "o menor dos dois", "imposto pago no estrangeiro, ou fração da coleta do IRS correspondente a esses rendimentos · art. 81.º, n.º 1 CIRS"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "O segundo limite, havendo convenção", "o que a convenção permitia reter", "a dedução não pode ultrapassar o imposto pago nos termos previstos pela convenção · art. 81.º, n.º 2 CIRS"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Coleta insuficiente no ano", `${CREDITO_IMPOSTO_ESTRANGEIRO.reporteAnos.value} anos`, "o remanescente deduz-se à coleta dos períodos de tributação seguintes · art. 81.º, n.º 3 CIRS"),
    d("RENDIMENTO_MUNDIAL", "Porque é que o crédito existe", "rendimento mundial", "sendo residente, és tributado cá sobre o que ganhas lá — o crédito é o que evita pagar duas vezes · art. 15.º, n.º 1 CIRS"),
  ],

  "etf-irs": [
    d("MAIS_VALIAS_MOBILIARIAS_TAXA", "Mais-valias na alienação", pctExato(MAIS_VALIAS_MOBILIARIAS_TAXA.value), "taxa especial sobre o saldo do ano, com opção de englobamento · art. 72.º, n.º 1 CIRS"),
    d("CAPITAIS_TAXA_LIBERATORIA", "Distribuições", pctExato(CAPITAIS_TAXA_LIBERATORIA.value), "rendimentos de capitais; retenção liberatória quando pagos por entidade portuguesa · arts. 5.º e 71.º CIRS"),
    d("OIC_NACIONAIS", "Fundo português — resgate", pctExato(OIC_NACIONAIS.retencaoResgate.value), "retenção na fonte a título definitivo, já com a exclusão por tempo de detenção · art. 22.º-A, n.º 1, al. b) EBF"),
    d("OIC_NACIONAIS", "Fundo português — o que o fundo não paga", "capitais, prediais e mais-valias", "não entram no lucro tributável do fundo: o imposto aparece à saída, no participante · art. 22.º, n.º 3 EBF"),
    d("OIC_NACIONAIS", "Comprado em mercado secundário e não comunicado", "retenção sobre o bruto", "sem a comunicação da data e do valor de aquisição, a retenção incide sobre todo o resgate, não só sobre o ganho · art. 22.º-A, n.os 10 e 11 EBF"),
    d("MAIS_VALIAS_EXCLUSAO_DETENCAO", "Excluído — detido de 2 a 5 anos", pctExato(MAIS_VALIAS_EXCLUSAO_DETENCAO.de2a5Anos.value), "do rendimento, não da taxa · art. 43.º, n.º 5, al. a) CIRS"),
    d("MAIS_VALIAS_EXCLUSAO_DETENCAO", "Excluído — detido de 5 a 8 anos", pctExato(MAIS_VALIAS_EXCLUSAO_DETENCAO.de5a8Anos.value), "art. 43.º, n.º 5, al. b) CIRS"),
    d("MAIS_VALIAS_EXCLUSAO_DETENCAO", "Excluído — detido há 8 anos ou mais", pctExato(MAIS_VALIAS_EXCLUSAO_DETENCAO.mais8Anos.value), "art. 43.º, n.º 5, al. c) CIRS"),
    d("MAIS_VALIAS_EXCLUSAO_DETENCAO", "A que ativos se aplica a escada", MAIS_VALIAS_EXCLUSAO_DETENCAO.ambito.value, "ficam de fora o que não é admitido à negociação e os fundos fechados · art. 43.º, n.º 5 CIRS"),
    d("MAIS_VALIAS_REPORTE", "Reporte de menos-valias", `${MAIS_VALIAS_REPORTE.anos.value} anos`, "só com englobamento no ano da perda · art. 55.º, n.º 1, al. d) CIRS"),
  ],

  "ppr-irs": [
    d("DEDUCAO_PPR", "Dedução à coleta", pctExato(DEDUCAO_PPR.value.taxa), "dos valores aplicados no ano, com limite por idade · art. 21.º, n.º 2 EBF"),
    d("DEDUCAO_PPR", "Limite — menos de 35 anos", fmt(DEDUCAO_PPR.value.ate35), "limite máximo anual da dedução · art. 21.º, n.º 2, al. a) EBF"),
    d("DEDUCAO_PPR", "Limite — dos 35 aos 50 anos", fmt(DEDUCAO_PPR.value.de35a50), "art. 21.º, n.º 2, al. b) EBF"),
    d("DEDUCAO_PPR", "Limite — mais de 50 anos", fmt(DEDUCAO_PPR.value.mais50), "art. 21.º, n.º 2, al. c) EBF"),
    d("PPR_TAXA_EFETIVA_CONDICOES_LEGAIS", "Resgate nas condições legais", pctExato(PPR_TAXA_EFETIVA_CONDICOES_LEGAIS), `dois quintos do rendimento tributados a ${pctExato(PPR_RESGATE.taxaAutonoma.value)} · art. 21.º, n.º 3, al. b) EBF`),
    d("PPR_RESGATE", "Resgate fora das condições", pctExato(PPR_RESGATE.taxaForaDasCondicoes.value), "sobre o rendimento, sem a redução a dois quintos · art. 21.º, n.º 5 EBF"),
    d("PPR_RESGATE", "Deduções a devolver", `+${pctExato(PPR_RESGATE.majoracaoAnual.value)} por ano`, "as importâncias deduzidas são majoradas por cada ano ou fração decorrido e acrescidas à coleta · art. 21.º, n.º 4 EBF"),
    d("PPR_RESGATE", "Prazo que dispensa a devolução", `${PPR_RESGATE.anosParaDispensa.value} anos`, "a contar de cada entrega, ocorrendo uma das situações definidas na lei — ou em caso de morte do subscritor · art. 21.º, n.º 4 EBF"),
  ],

  "cripto-staking-mining": [
    d("CRIPTO_REMUNERACAO", "Recompensa paga em euros", "categoria E, ao receber", "quaisquer formas de remuneração decorrentes de operações com criptoativos são rendimentos de capitais · art. 5.º, n.º 2, al. u) CIRS"),
    d("CRIPTO_REMUNERACAO", "Recompensa paga na própria cripto", "categoria G, ao alienar", "não há tributação na receção: é tributada como mais-valia no momento da alienação do que foi recebido · art. 5.º, n.º 11 CIRS"),
    d("CRIPTO_ISENCAO_DIAS", "Contagem para a exclusão", `${CRIPTO_ISENCAO_DIAS.value} dias`, "aplicada aos criptoativos recebidos, a partir do momento em que passam a ser teus · art. 10.º, n.º 19 CIRS"),
  ],

  "reporte-menos-valias": [
    d("MAIS_VALIAS_REPORTE", "Reporte — valores mobiliários e criptoativos", `${MAIS_VALIAS_REPORTE.anos.value} anos`, "saldo negativo das operações das als. b), c), e), f), g), h) e k) do n.º 1 do art. 10.º · art. 55.º, n.º 1, al. d) CIRS"),
    d("MAIS_VALIAS_REPORTE", "A condição", "englobamento no ano da perda", "«quando o sujeito passivo opte ou seja obrigado a englobar esses rendimentos» · art. 55.º, n.º 1, al. d) CIRS"),
    d("MAIS_VALIAS_REPORTE", "Reporte — mais-valias imobiliárias", `${MAIS_VALIAS_REPORTE.anosImobiliario.value} anos`, "a percentagem do saldo negativo a que se refere o n.º 2 do art. 43.º · art. 55.º, n.º 1, al. c) CIRS"),
    d("MAIS_VALIAS_IMOBILIARIO_INCLUSAO", "O que transita nas imobiliárias", pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value), "é a mesma fração que é tributada quando o saldo é positivo · art. 43.º, n.º 2 CIRS"),
  ],

  "imovel-empresa-ou-pessoal": [
    d("AIMI", "AIMI — dedução que a empresa não tem", fmt(AIMI.deducaoSingular.value), "só pessoas singulares e heranças indivisas · art. 135.º-C, n.º 2 CIMI"),
    d("AIMI", "AIMI — taxa da empresa", pctExato(AIMI.taxaColetiva.value), "sobre a soma toda dos VPT, sem dedução · art. 135.º-F, n.º 1 CIMI"),
    d("AIMI", "AIMI — imóvel da empresa em uso pessoal", pctExato(AIMI.taxaSingular.value), "tributado à taxa das pessoas singulares, e identificado no anexo à declaração de rendimentos · art. 135.º-F, n.º 4 CIMI"),
    d("MAIS_VALIAS_IMOBILIARIO_INCLUSAO", "Mais-valia — em nome pessoal", `${pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} tributada`, "em IRC não há regra equivalente: a mais-valia entra por inteiro no lucro tributável · art. 43.º CIRS"),
    d("IMT_TAXA_COMERCIAL", "Tirar o imóvel da empresa", pctExato(IMT_TAXA_COMERCIAL.value), "é uma transmissão: há IMT outra vez, sobre o maior entre o valor do ato e o VPT · arts. 12.º e 17.º CIMT"),
  ],

  // ── Trabalhar com o estrangeiro ──────────────────────────────────────
  //    Tudo nesta secção pende de uma pergunta só — és residente fiscal ou
  //    não? — e é por isso que os critérios do art. 16.º aparecem em mais
  //    do que um guia. Não é repetição: é a mesma norma vista do lado de
  //    quem chega, de quem sai e de quem nunca cá viveu.
  "residencia-fiscal": [
    d("RESIDENCIA_FISCAL", "Critério temporal", `mais de ${RESIDENCIA_FISCAL.diasPermanencia.value} dias`, `seguidos ou interpolados, em qualquer período de ${RESIDENCIA_FISCAL.janelaMeses.value} meses com início ou fim no ano em causa · art. 16.º, n.º 1, al. a) CIRS`),
    d("RESIDENCIA_FISCAL", "O que conta como dia", RESIDENCIA_FISCAL.contaComoDia.value, "art. 16.º, n.º 2 CIRS"),
    d("RESIDENCIA_FISCAL", "Critério da habitação", RESIDENCIA_FISCAL.criterioHabitacao.value, "basta um dia do período, e dispensa a contagem · art. 16.º, n.º 1, al. b) CIRS"),
    d("RESIDENCIA_FISCAL", "Início da residência", RESIDENCIA_FISCAL.inicioResidencia.value, "salvo quem tenha sido residente em qualquer dia do ano anterior — nesse caso, desde 1 de janeiro · art. 16.º, n.º 3 CIRS"),
    d("RESIDENCIA_FISCAL", "Fim da residência", RESIDENCIA_FISCAL.fimResidencia.value, "art. 16.º, n.º 4 CIRS"),
    d("RESIDENCIA_FISCAL", "Aferida por pessoa", "cada sujeito passivo do agregado", "num casal, um pode ser residente e o outro não · art. 16.º, n.º 5 CIRS"),
    d("RENDIMENTO_MUNDIAL", "Efeito de ser residente", "tributação pelo rendimento mundial", "o IRS incide sobre a totalidade dos rendimentos, incluindo os obtidos fora · art. 15.º, n.º 1 CIRS"),
    d("RESIDENCIA_FISCAL", "Prazo para comunicar a alteração", `${RESIDENCIA_FISCAL.prazoComunicarDias.value} dias`, "e a mudança de domicílio é ineficaz enquanto não for comunicada · art. 19.º, n.os 4 e 5 LGT"),
  ],

  "sair-de-portugal": [
    d("RESIDENCIA_FISCAL", "Prazo para comunicar a saída", `${RESIDENCIA_FISCAL.prazoComunicarDias.value} dias`, "a contar da alteração do estatuto de residência · art. 19.º, n.º 5 LGT"),
    d("RESIDENCIA_FISCAL", "Sem comunicação", "a mudança não produz efeitos", "é ineficaz a mudança de domicílio enquanto não for comunicada à administração tributária · art. 19.º, n.º 4 LGT"),
    d("RESIDENCIA_FISCAL", "Fim da residência", RESIDENCIA_FISCAL.fimResidencia.value, "art. 16.º, n.º 4 CIRS"),
    d("RESIDENCIA_FISCAL", "Residente todo o ano da saída, se", RESIDENCIA_FISCAL.residenteTodoOAnoDaSaida.value, `condições cumulativas; cai se provares tributação lá fora a taxa não inferior a ${pctExato(RESIDENCIA_FISCAL.limiarTributacaoNoEstrangeiro.value)} da portuguesa · art. 16.º, n.os 14 e 15 CIRS`),
    d("RESIDENCIA_FISCAL", "Sair e voltar no ano seguinte", RESIDENCIA_FISCAL.regressoNoAnoSeguinte.value, "art. 16.º, n.º 16 CIRS"),
    d("RESIDENCIA_FISCAL", "Mudança para regime fiscal mais favorável", `${RESIDENCIA_FISCAL.paraisoFiscalAnos.value} anos`, "nacionais portugueses continuam havidos como residentes no ano da mudança e nos quatro seguintes, salvo prova de razões atendíveis · art. 16.º, n.º 6 CIRS"),
    d("REPRESENTANTE_FISCAL", "Ausência que obriga a representante", `mais de ${REPRESENTANTE_FISCAL.ausenciaMeses.value} meses`, "art. 19.º, n.º 6 LGT"),
  ],

  "nao-residentes-irs": [
    d("RENDIMENTO_MUNDIAL", "Âmbito", "apenas rendimentos obtidos em Portugal", "sendo não residente, o IRS incide unicamente sobre os rendimentos obtidos em território português · art. 15.º, n.º 2 CIRS"),
    d("NAO_RESIDENTES", "Trabalho, categoria B e pensões", pctExato(NAO_RESIDENTES.taxaTrabalhoEPensoes.value), "retenção liberatória, mesmo em ato isolado · art. 71.º, n.º 4, als. a) e c) CIRS"),
    d("NAO_RESIDENTES", "Rendimentos de capitais", pctExato(NAO_RESIDENTES.taxaCapitais.value), "a mesma taxa dos residentes · art. 71.º, n.º 1, al. a) CIRS"),
    d("NAO_RESIDENTES", "Restantes rendimentos", pctExato(NAO_RESIDENTES.taxaOutrosRendimentos.value), "os que não são imputáveis a estabelecimento estável nem sofreram retenção liberatória · art. 72.º, n.º 1, al. b) CIRS"),
    d("NAO_RESIDENTES", "Com estabelecimento estável cá", pctExato(NAO_RESIDENTES.taxaEstabelecimentoEstavel.value), "art. 72.º, n.º 6, al. a) CIRS"),
    d("NAO_RESIDENTES", "Sobre que valor incide", NAO_RESIDENTES.incideSobre.value, "é daqui que vem a ausência de deduções; exceto pensões, que têm a dedução do art. 53.º · art. 71.º, n.º 8 CIRS"),
    d("NAO_RESIDENTES", "Sem retenção até", "à retribuição mínima mensal garantida", "no trabalho ou serviços prestados a uma única entidade, mediante declaração escrita · art. 71.º, n.os 5 e 6 CIRS"),
    d("NAO_RESIDENTES", "Opção pelas taxas progressivas", NAO_RESIDENTES.opcaoTaxasProgressivas.value, "contam todos os rendimentos, incluindo os obtidos fora · art. 72.º, n.os 15 e 16 CIRS"),
    d("NAO_RESIDENTES", "Prazo para pedir a devolução", `${NAO_RESIDENTES.devolucaoPrazoAnos.value} anos`, "contados do final do ano civil seguinte ao do facto tributário · art. 71.º, n.º 13 CIRS"),
  ],

  "programa-regressar": [
    d("PROGRAMA_REGRESSAR", "Exclusão", pctExato(PROGRAMA_REGRESSAR.exclusao.value), "dos rendimentos do trabalho dependente e dos empresariais e profissionais — categorias A e B · art. 12.º-A, n.º 1 CIRS"),
    d("PROGRAMA_REGRESSAR_TETO_CALC", "Teto anual da exclusão", fmt(PROGRAMA_REGRESSAR_TETO_CALC), "limite superior do primeiro escalão do art. 68.º-A; morde no montante excluído, não no rendimento · art. 12.º-A, n.º 1 CIRS"),
    d("PROGRAMA_REGRESSAR", "Duração", `${PROGRAMA_REGRESSAR.anos.value} anos`, "art. 12.º-A, n.º 1 CIRS"),
    d("PROGRAMA_REGRESSAR", "Anos sem ser residente", `${PROGRAMA_REGRESSAR.anosSemResidencia.value} anos`, "não ter sido considerado residente em território português em qualquer dos cinco anos anteriores · art. 12.º-A, n.º 1, al. b) CIRS"),
    d("PROGRAMA_REGRESSAR", "Último ano para se tornar residente", String(PROGRAMA_REGRESSAR.ultimoAnoParaSeTornarResidente.value), "é o ano-limite da redação em vigor; a janela já foi prorrogada antes · art. 12.º-A, n.º 1, al. a) CIRS"),
    d("PROGRAMA_REGRESSAR", "Só para quem já cá foi residente", "sim", "é o regime dos EX-residentes: quem nunca cá viveu não é elegível · art. 12.º-A, n.º 1, al. c) CIRS"),
    d("PROGRAMA_REGRESSAR", "Acumula com o residente não habitual", "não", "art. 12.º-A, n.º 2 CIRS"),
  ],

  "representante-fiscal": [
    d("REPRESENTANTE_FISCAL", "Quem tem de designar", REPRESENTANTE_FISCAL.obrigatorioPara.value, "art. 19.º, n.º 6 LGT"),
    d("REPRESENTANTE_FISCAL", "Ausência que ativa a obrigação", `mais de ${REPRESENTANTE_FISCAL.ausenciaMeses.value} meses`, "vale para quem reside cá e se ausenta · art. 19.º, n.º 6 LGT"),
    d("REPRESENTANTE_FISCAL", "Onde é facultativa", REPRESENTANTE_FISCAL.facultativoPara.value, "a lei fixa o critério, não uma lista de países · art. 19.º, n.º 8 LGT"),
    d("REPRESENTANTE_FISCAL", "A alternativa, para qualquer país", "aderir às notificações eletrónicas", "morada única digital, notificações e citações eletrónicas no Portal das Finanças ou caixa postal eletrónica · art. 19.º, n.º 15 LGT"),
    d("REPRESENTANTE_FISCAL", "O que se perde sem representante", REPRESENTANTE_FISCAL.semRepresentante.value, "art. 19.º, n.º 7 LGT"),
    d("REPRESENTANTE_FISCAL", "Renúncia — prazo da AT", `${REPRESENTANTE_FISCAL.renunciaPrazoDias.value} dias`, "desde que tenha decorrido um ano da nomeação ou haja novo representante · art. 19.º, n.os 9 e 10 LGT"),
  ],

  "convencao-dupla-tributacao": [
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "O que o crédito nunca ultrapassa", "o menor dos dois limites", `${CREDITO_IMPOSTO_ESTRANGEIRO.duploLimite.value.join(" · ")} · art. 81.º, n.º 1 CIRS`),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Havendo convenção", "o teto é o da convenção", "a dedução não pode ultrapassar o imposto pago no estrangeiro nos termos previstos pela convenção · art. 81.º, n.º 2 CIRS"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Reporte por insuficiência de coleta", `${CREDITO_IMPOSTO_ESTRANGEIRO.reporteAnos.value} anos`, "art. 81.º, n.º 3 CIRS"),
    d("RENDIMENTO_MUNDIAL", "Porque é que a convenção é precisa", "tributação pelo rendimento mundial", "é a sujeição do art. 15.º, n.º 1 que cria a dupla tributação que a convenção reparte"),
  ],

  "modelo-21-rfi": [
    d("NAO_RESIDENTES", "O que o formulário evita", `retenção de ${pctExato(NAO_RESIDENTES.taxaTrabalhoEPensoes.value)} ou ${pctExato(NAO_RESIDENTES.taxaCapitais.value)}`, "conforme a categoria; a convenção reduz ou dispensa · arts. 71.º e 72.º CIRS"),
    d("NAO_RESIDENTES", "Se a retenção já foi feita", `${NAO_RESIDENTES.devolucaoPrazoAnos.value} anos para pedir devolução`, "contados do final do ano civil seguinte ao do facto tributário · art. 71.º, n.º 13 CIRS"),
  ],

  "primeiro-ano-fiscal-portugal": [
    d("RESIDENCIA_FISCAL", "Quando começas a ser residente", RESIDENCIA_FISCAL.inicioResidencia.value, "art. 16.º, n.º 3 CIRS"),
    d("RESIDENCIA_FISCAL", "Critério temporal", `mais de ${RESIDENCIA_FISCAL.diasPermanencia.value} dias`, `em qualquer período de ${RESIDENCIA_FISCAL.janelaMeses.value} meses com início ou fim no ano em causa · art. 16.º, n.º 1, al. a) CIRS`),
    d("RESIDENCIA_FISCAL", "Prazo para comunicar a alteração", `${RESIDENCIA_FISCAL.prazoComunicarDias.value} dias`, "art. 19.º, n.º 5 LGT"),
    d("RENDIMENTO_MUNDIAL", "O que muda quando passas a residente", "tributação pelo rendimento mundial", "art. 15.º, n.º 1 CIRS"),
    d("PROGRAMA_REGRESSAR", "Só para quem já cá foi residente", "sim", "quem chega pela primeira vez não é elegível para o regime dos ex-residentes · art. 12.º-A, n.º 1, al. c) CIRS"),
  ],

  "nomada-digital-d8": [
    d("RESIDENCIA_FISCAL", "Quando Portugal passa a tributar-te", `mais de ${RESIDENCIA_FISCAL.diasPermanencia.value} dias`, `em qualquer período de ${RESIDENCIA_FISCAL.janelaMeses.value} meses — ou antes disso, pelo critério da habitação · art. 16.º, n.º 1 CIRS`),
    d("RESIDENCIA_FISCAL", "O que conta como dia", RESIDENCIA_FISCAL.contaComoDia.value, "art. 16.º, n.º 2 CIRS"),
    d("RENDIMENTO_MUNDIAL", "O que passa a ser tributado", "a totalidade dos rendimentos", "incluindo os obtidos fora de Portugal, venham de onde vierem · art. 15.º, n.º 1 CIRS"),
    d("RESIDENCIA_FISCAL", "Prazo para comunicar a alteração", `${RESIDENCIA_FISCAL.prazoComunicarDias.value} dias`, "art. 19.º, n.º 5 LGT"),
  ],

  "remoto-empresa-estrangeira": [
    d("RENDIMENTO_MUNDIAL", "Sendo residente cá", "tributação pelo rendimento mundial", "a sede do empregador não muda a sujeição · art. 15.º, n.º 1 CIRS"),
    d("REGIME_SIMPLIFICADO", "Recibos verdes — coeficiente dos serviços", pctExato(REGIME_SIMPLIFICADO.coefServicos151.value), "do rendimento bruto vai a imposto no regime simplificado, nas profissões da tabela do art. 151.º · art. 31.º, n.º 1, al. b) CIRS"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Se houver imposto retido lá fora", `crédito até ${CREDITO_IMPOSTO_ESTRANGEIRO.reporteAnos.value} anos`, "pelo menor dos dois limites, com reporte por insuficiência de coleta · art. 81.º CIRS"),
  ],

  // ── Por profissão ────────────────────────────────────────────────────
  //    O pacote põe o mesmo aviso nos dez guias: «o código CAE e o
  //    enquadramento no art. 151.º determinam coeficiente e retenção —
  //    verificar caso a caso e nunca generalizar por nome de profissão».
  //    É por isso que estas tabelas mostram SEMPRE os dois enquadramentos
  //    lado a lado, em vez de escolher um por profissão.
  ...Object.fromEntries(
    (
      [
        "tvde-motorista",
        "estafeta-plataformas",
        "criadores-de-conteudo",
        "plataformas-subscricao",
        "freelancer-tecnologia",
        "mediacao-comissoes",
        "arquitetos-engenheiros",
      ] as const
    ).map((slug) => [slug, enquadramentoCategoriaB()]),
  ),

  "profissionais-saude": [
    d("ISENCOES_CIVA_PROFISSOES", "Isenção de IVA — quem", ISENCOES_CIVA_PROFISSOES.saude.value, "a isenção é pela profissão de quem presta, não pelo tema do serviço · art. 9.º, n.º 1) CIVA"),
    d("ISENCOES_CIVA_PROFISSOES", "Que tipo de isenção é", "incompleta", "isenta a operação e retira o direito à dedução do IVA suportado nas compras"),
    ...enquadramentoCategoriaB(),
  ],

  "formadores-explicadores": [
    d("ISENCOES_CIVA_PROFISSOES", "Isento — explicações", ISENCOES_CIVA_PROFISSOES.licoes.value, "isenção pela natureza do serviço: não depende de reconhecimento nem de volume de negócios · art. 9.º, n.º 11) CIVA"),
    d("ISENCOES_CIVA_PROFISSOES", "Isento — formação profissional", ISENCOES_CIVA_PROFISSOES.formacaoProfissional.value, "exige reconhecimento ministerial; sem ele, a formação cai na regra geral · art. 9.º, n.º 10) CIVA"),
    ...enquadramentoCategoriaB(),
  ],

  "artistas-direitos-autor": [
    d("PROPRIEDADE_INTELECTUAL_EBF", "Considerado no englobamento", pctExato(PROPRIEDADE_INTELECTUAL_EBF.fracaoEnglobada.value), "do valor do rendimento, líquido de outros benefícios · art. 58.º, n.º 1 EBF"),
    d("PROPRIEDADE_INTELECTUAL_EBF", "Teto do que se pode excluir", fmt(PROPRIEDADE_INTELECTUAL_EBF.limiteExclusao.value), "morde no montante EXCLUÍDO, não no rendimento · art. 58.º, n.º 3 EBF"),
    d("PROPRIEDADE_INTELECTUAL_EBF", "Só ao titular originário", "sim", "cessionários, herdeiros e editoras ficam de fora · art. 58.º, n.º 1 EBF"),
    d("PROPRIEDADE_INTELECTUAL_EBF", "Abrange", PROPRIEDADE_INTELECTUAL_EBF.incluidas.value, "art. 58.º, n.º 1 EBF"),
    d("PROPRIEDADE_INTELECTUAL_EBF", "Fica de fora", PROPRIEDADE_INTELECTUAL_EBF.excluidas.value, "exclusões expressas · art. 58.º, n.º 2 EBF"),
    d("REGIME_SIMPLIFICADO", "Coeficiente da propriedade intelectual", pctExato(REGIME_SIMPLIFICADO.coefPropIntelectual.value), "na categoria B, quando o rendimento é da cessão ou utilização de direitos · art. 31.º, n.º 1, al. d) CIRS"),
    d("RETENCAO", "Retenção sobre direitos de autor", pctExato(RETENCAO.diretosAutor.value), "art. 101.º CIRS"),
  ],

  // ── Preparar o IRS · Direitos e cobranças ────────────────────────────
  //    Dispensa e redução de coima não são graus da mesma coisa: têm
  //    pressupostos diferentes (arts. 29.º e 30.º do RGIT) e quem confunde
  //    as duas pede a errada. As tabelas mostram-nas separadas.
  "coimas-fiscais": [
    d("COIMAS_RGIT", "Falta ou atraso de declarações", `${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}`, "art. 116.º, n.º 1 RGIT"),
    d("COIMAS_RGIT", "Início, alteração ou cessação de atividade", `${fmt(COIMAS_RGIT.inicioAlteracaoCessacaoMin.value)} a ${fmt(COIMAS_RGIT.inicioAlteracaoCessacaoMax.value)}`, "art. 117.º, n.º 2 RGIT"),
    d("FALTA_ENTREGA_PRESTACAO", "Falta de entrega da prestação — negligência", `${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMin.value)} a ${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMax.value)}`, "do imposto em falta · art. 114.º, n.º 2 RGIT"),
    d("FALTA_ENTREGA_PRESTACAO", "Falta de entrega da prestação — dolo", `até ${FALTA_ENTREGA_PRESTACAO.doloFatorMax.value}× o valor em falta`, "coima variável entre o valor da prestação em falta e o seu dobro · art. 114.º, n.º 1 RGIT"),
    d("REDUCAO_COIMA", "Redução — antes de qualquer ação da AT", pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value), "do montante mínimo legal · art. 30.º, n.º 1, al. a) RGIT"),
    d("REDUCAO_COIMA", "Redução — até à audição prévia na inspeção", pctExato(REDUCAO_COIMA.ateAudicaoPrevia.value), "do montante mínimo legal · art. 30.º, n.º 1, al. b) RGIT"),
    d("COIMAS_RGIT", "Mínimo a pagar", fmt(COIMAS_RGIT.minimoAPagar.value), "art. 26.º, n.º 3 RGIT"),
    d("COIMAS_RGIT", "Mínimo a pagar, havendo redução", fmt(COIMAS_RGIT.minimoComReducao.value), "é este piso que manda no caso comum · art. 26.º, n.º 3 RGIT"),
    d("DISPENSA_COIMA", "Dispensa — historial limpo exigido", `${DISPENSA_COIMA.anosDeHistorialLimpo.value} anos`, "sem condenação por infração tributária e sem ter beneficiado de dispensa ou redução · art. 29.º, n.º 1 RGIT"),
    d("COIMAS_RGIT", "Pessoas singulares", `metade dos limites`, "as coimas aplicáveis a pessoas singulares não podem exceder metade dos limites das coletivas · art. 26.º, n.º 2 RGIT"),
    d("COIMAS_RGIT", "Pessoas coletivas", `limites × ${COIMAS_RGIT.fatorPessoaColetiva.value}`, "os limites dos tipos legais são elevados para o dobro · art. 26.º, n.º 4 RGIT"),
  ],

  "regularizacao-voluntaria": [
    d("REDUCAO_COIMA", "Redução — antes de qualquer ação da AT", pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value), "sem auto de notícia, participação, denúncia ou início de inspeção · art. 30.º, n.º 1, al. a) RGIT"),
    d("REDUCAO_COIMA", "Redução — até à audição prévia", pctExato(REDUCAO_COIMA.ateAudicaoPrevia.value), "já dentro de procedimento de inspeção · art. 30.º, n.º 1, al. b) RGIT"),
    d("REDUCAO_COIMA", "Sobre que valor incide", REDUCAO_COIMA.baseDeCalculo.value, "art. 30.º, n.º 2 RGIT"),
    d("COIMAS_RGIT", "Mínimo a pagar, havendo redução", fmt(COIMAS_RGIT.minimoComReducao.value), "art. 26.º, n.º 3 RGIT"),
    d("REDUCAO_COIMA", "Prazo para pagar", `${REDUCAO_COIMA.prazoPagamentoDias.value} dias`, "posteriores à notificação da coima reduzida, com a situação regularizada no mesmo prazo · art. 30.º, n.º 3, al. a) RGIT"),
    d("REDUCAO_COIMA", "Quando o pedido é implícito", REDUCAO_COIMA.pedidoImplicito.value, "quando a regularização não dependa de tributo a liquidar pelos serviços · art. 30.º, n.º 5 RGIT"),
    d("DISPENSA_COIMA", "Dispensa — quando tem de ser pedida", "no prazo da defesa", "e a falta regularizada até ao termo desse prazo · art. 29.º, n.º 4 RGIT"),
  ],

  "irs-fora-do-prazo": [
    d("COIMAS_RGIT", "Coima base", `${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}`, "art. 116.º, n.º 1 RGIT"),
    d("REDUCAO_COIMA", "Com regularização antes de qualquer ação da AT", pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value), "do montante mínimo legal · art. 30.º, n.º 1, al. a) RGIT"),
    d("COIMAS_RGIT", "Mínimo a pagar, havendo redução", fmt(COIMAS_RGIT.minimoComReducao.value), "art. 26.º, n.º 3 RGIT"),
    d("REDUCAO_COIMA", "Prazo para pagar a coima reduzida", `${REDUCAO_COIMA.prazoPagamentoDias.value} dias`, "art. 30.º, n.º 3, al. a) RGIT"),
    d("REVISAO_E_RECLAMACAO", "Reclamar da liquidação oficiosa", `${REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias`, "prazo da reclamação graciosa · art. 70.º, n.º 1 CPPT"),
  ],

  "declaracao-substituicao": [
    d("REVISAO_E_RECLAMACAO", "Reclamação graciosa", `${REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias`, "contados dos factos do n.º 1 do art. 102.º · art. 70.º, n.º 1 CPPT"),
    d("REVISAO_E_RECLAMACAO", "Revisão por erro dos serviços", `${REVISAO_E_RECLAMACAO.revisaoPorErroDosServicosAnos.value} anos`, "por iniciativa da AT, ou a todo o tempo se o tributo não estiver pago; o pedido do contribuinte interrompe o prazo · art. 78.º, n.os 1 e 7 LGT"),
    d("REVISAO_E_RECLAMACAO", "Injustiça grave ou notória", `${REVISAO_E_RECLAMACAO.injusticaGraveAnos.value} anos`, "autorização excecional do dirigente máximo, se o erro não for imputável a negligência do contribuinte · art. 78.º, n.º 4 LGT"),
    d("REVISAO_E_RECLAMACAO", "Duplicação de coleta", `${REVISAO_E_RECLAMACAO.duplicacaoColetaAnos.value} anos`, "seja qual for o fundamento · art. 78.º, n.º 6 LGT"),
    d("REDUCAO_COIMA", "Se a correção aumentar o imposto", pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value), "do mínimo legal, substituindo antes de qualquer ação da AT · art. 30.º, n.º 1, al. a) RGIT"),
    d("IRS_AUTOMATICO", "Substituir a declaração automática", `${IRS_AUTOMATICO.substituicaoSemPenalidadeDias.value} dias`, "posteriores à liquidação, sem qualquer penalidade · art. 58.º-A, n.º 3 CIRS"),
  ],

  "irs-automatico": [
    d("IRS_AUTOMATICO", "Quem é abrangido", IRS_AUTOMATICO.universoDefinidoPor.value, "o universo não está no artigo: é fixado por decreto regulamentar · art. 58.º-A, n.º 8 CIRS"),
    d("IRS_AUTOMATICO", "Comunicar o agregado familiar", IRS_AUTOMATICO.prazoElementosPessoais.value, "no Portal das Finanças, com autenticação de todos os membros do agregado · art. 58.º-A, n.º 6 CIRS"),
    d("IRS_AUTOMATICO", "Sem essa comunicação", IRS_AUTOMATICO.semComunicacaoDeAgregado.value, "art. 58.º-A, n.º 7 CIRS"),
    d("IRS_AUTOMATICO", "Se não confirmares nem entregares", IRS_AUTOMATICO.seNadaForFeito.value, "não fazer nada não é não entregar · art. 58.º-A, n.º 3 CIRS"),
    d("IRS_AUTOMATICO", "E com que regime de tributação", IRS_AUTOMATICO.regimeSeNadaForFeito.value, "quem beneficiaria da conjunta perde-a por inação · art. 58.º-A, n.º 4, al. b) CIRS"),
    d("IRS_AUTOMATICO", "Corrigir sem penalidade", `${IRS_AUTOMATICO.substituicaoSemPenalidadeDias.value} dias`, "posteriores à liquidação · art. 58.º-A, n.º 3 CIRS"),
  ],

  "e-fatura": [
    d("IRS_AUTOMATICO", "Comunicar o agregado familiar", IRS_AUTOMATICO.prazoElementosPessoais.value, "é o primeiro prazo do ano, e condiciona as deduções por dependentes · art. 58.º-A, n.º 6 CIRS"),
    d("REVISAO_E_RECLAMACAO", "Se o prazo de reclamação passar", `${REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias da liquidação`, "as despesas ainda se declaram manualmente na Modelo 3, e resta a reclamação graciosa · art. 70.º, n.º 1 CPPT"),
  ],

  "reclamar-deducoes": [
    d("REVISAO_E_RECLAMACAO", "Reclamação graciosa da liquidação", `${REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias`, "art. 70.º, n.º 1 CPPT"),
    d("REVISAO_E_RECLAMACAO", "Revisão por erro dos serviços", `${REVISAO_E_RECLAMACAO.revisaoPorErroDosServicosAnos.value} anos`, "art. 78.º, n.º 1 LGT"),
    d("REVISAO_E_RECLAMACAO", "Injustiça grave ou notória", `${REVISAO_E_RECLAMACAO.injusticaGraveAnos.value} anos`, "art. 78.º, n.º 4 LGT"),
    d("IRS_AUTOMATICO", "Substituir a declaração automática", `${IRS_AUTOMATICO.substituicaoSemPenalidadeDias.value} dias`, "posteriores à liquidação, sem penalidade · art. 58.º-A, n.º 3 CIRS"),
  ],

  "inspecao-tributaria": [
    d("REDUCAO_COIMA", "Regularizar até à audição prévia", pctExato(REDUCAO_COIMA.ateAudicaoPrevia.value), "do montante mínimo legal — é a última janela de redução · art. 30.º, n.º 1, al. b) RGIT"),
    d("REDUCAO_COIMA", "Depois de a inspeção começar", `deixa de haver ${pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)}`, "a redução maior exige que nada tenha sido iniciado · art. 30.º, n.º 1, al. a) RGIT"),
    d("REDUCAO_COIMA", "Prazo para pagar a coima reduzida", `${REDUCAO_COIMA.prazoPagamentoDias.value} dias`, "art. 30.º, n.º 3 RGIT"),
    d("REVISAO_E_RECLAMACAO", "Reclamar da liquidação que resulte", `${REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias`, "art. 70.º, n.º 1 CPPT"),
  ],

  //    Os dois valores que o pacote trazia ficam retidos: o período de
  //    cessão vive no CIRE, que não foi possível verificar, e «dívidas
  //    fiscais em regra não abrangidas» é precisamente a questão que o
  //    próprio pacote manda apresentar em aberto. O que se mostra é a
  //    norma de onde a tese nasce — verificada — e nada mais.
  "insolvencia-pessoal": [
    d("CREDITO_TRIBUTARIO_INDISPONIVEL", "A norma de onde tudo parte", CREDITO_TRIBUTARIO_INDISPONIVEL.regra.value, "só podendo fixar-se condições para a sua redução ou extinção com respeito pelos princípios da igualdade e da legalidade tributária · art. 30.º, n.º 2 LGT"),
    d("CREDITO_TRIBUTARIO_INDISPONIVEL", "E o que a torna decisiva", "prevalece sobre legislação especial", "aditado pela Lei n.º 55-A/2010; o Código da Insolvência é legislação especial · art. 30.º, n.º 3 LGT"),
    d("CREDITO_TRIBUTARIO_INDISPONIVEL", "A exoneração abrange dívidas fiscais?", "questão em aberto", "há decisões judiciais em sentidos diferentes; não é matéria a fechar num guia"),
    d("REDUCAO_COIMA", "Alternativa — regularizar antes de qualquer ação da AT", pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value), "do montante mínimo legal da coima · art. 30.º, n.º 1, al. a) RGIT"),
    d("COIMAS_RGIT", "Mínimo a pagar, havendo redução", fmt(COIMAS_RGIT.minimoComReducao.value), "art. 26.º, n.º 3 RGIT"),
  ],

  // ── Gerir contribuições · Reforma ────────────────────────────────────
  //    O eixo é um só e atravessa a secção inteira: a base de incidência
  //    que declaras é, ao mesmo tempo, o que pagas hoje e a remuneração
  //    registada de que sairão a baixa, a parentalidade e a pensão. É por
  //    isso que o ajuste de ±25% aparece em quase todas estas tabelas.
  "declaracao-trimestral-ss": [
    d("SS_COEFICIENTE", "Base de incidência — serviços", pctExato(SS_COEFICIENTE.servicos.value), "do rendimento de prestação de serviços declarado no trimestre"),
    d("SS_COEFICIENTE", "Base de incidência — vendas", pctExato(SS_COEFICIENTE.bens.value), "do rendimento de venda de bens"),
    d("SS_TAXA", "Taxa contributiva", pctExato(SS_TAXA.value), "sobre a base de incidência · Código dos Regimes Contributivos"),
    d("AJUSTE_BASE_SS", "Ajuste voluntário", `±${pctExato(AJUSTE_BASE_SS.amplitude.value)}`, `em intervalos de ${pctExato(AJUSTE_BASE_SS.degrau.value)} sobre a base apurada`),
    d("SS_BASE_MAX_MENSAL", "Teto da base mensal", fmt(SS_BASE_MAX_MENSAL.value), "acima deste valor não há contribuição adicional"),
    d("SS_MIN_MENSAL", "Contribuição mínima mensal", fmt(SS_MIN_MENSAL.value), "existe mesmo em trimestres sem faturação"),
    d("SS_ISENCAO_PRIMEIRO_ANO_MESES", "Isenção no início de atividade", `${SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses`, "a contar do início; é o fim desta isenção que muda a conta no segundo ano"),
  ],

  "isencao-contribuicoes-ss": [
    d("SS_ISENCAO_PRIMEIRO_ANO_MESES", "Início de atividade", `${SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses`, "isenção automática, sem pedido"),
    d("SS_ACUMULACAO_LIMITE_IAS", "Acumulação com trabalho dependente — limiar", `${SS_ACUMULACAO_LIMITE_IAS.value} × IAS`, `remuneração mensal média do trabalho dependente igual ou superior a ${fmt(SS_ACUMULACAO_LIMITE_MENSAL.value)}`),
    d("SS_TAXA", "Taxa quando há obrigação", pctExato(SS_TAXA.value), "sobre a base de incidência"),
    d("SS_COEFICIENTE", "Base de incidência — serviços", pctExato(SS_COEFICIENTE.servicos.value), "é sobre ela que a isenção incide, não sobre a faturação"),
    d("SS_MIN_MENSAL", "O que se paga quando não há isenção", `mínimo de ${fmt(SS_MIN_MENSAL.value)}`, "mesmo sem faturação no trimestre"),
  ],

  "entidade-contratante": [
    d("ENTIDADE_CONTRATANTE", "Quando existe a obrigação", `dependência superior a ${pctExato(ENTIDADE_CONTRATANTE.dependenciaMinima.value)}`, "a entidade beneficia de mais de metade do valor total da atividade do independente"),
    d("ENTIDADE_CONTRATANTE", "Dependência acima de 50% e até 80%", pctExato(ENTIDADE_CONTRATANTE.taxaAte80.value), "taxa da entidade contratante"),
    d("ENTIDADE_CONTRATANTE", "Dependência superior a 80%", pctExato(ENTIDADE_CONTRATANTE.taxaAcima80.value), "taxa da entidade contratante"),
    d("ENTIDADE_CONTRATANTE_LIMIAR_CALC", "Limiar de ativação", `${fmt(ENTIDADE_CONTRATANTE_LIMIAR_CALC)} por ano`, `${ENTIDADE_CONTRATANTE.limiarIAS.value} × IAS de ${fmt(IAS.value)}`),
    d("SS_TAXA", "A tua taxa, para comparar", pctExato(SS_TAXA.value), "a contribuição da entidade contratante é autónoma e não substitui a tua"),
  ],

  "subsidio-doenca-independentes": [
    d("SUBSIDIO_DOENCA", "Prazo de garantia", `${SUBSIDIO_DOENCA.prazoGarantiaMeses.value} meses`, "com registo de remunerações, seguidos ou interpolados · DL 28/2004"),
    d("SUBSIDIO_DOENCA", "Percentagem — até 30 dias", pctExato(SUBSIDIO_DOENCA.escaloes.value[0]?.taxa ?? 0), "da remuneração de referência · DL 28/2004"),
    d("SUBSIDIO_DOENCA", "Percentagem — 31 a 90 dias", pctExato(SUBSIDIO_DOENCA.escaloes.value[1]?.taxa ?? 0), "da remuneração de referência · DL 28/2004"),
    d("SUBSIDIO_DOENCA", "Percentagem — 91 a 365 dias", pctExato(SUBSIDIO_DOENCA.escaloes.value[2]?.taxa ?? 0), "da remuneração de referência · DL 28/2004"),
    d("SUBSIDIO_DOENCA", "Percentagem — mais de 365 dias", pctExato(SUBSIDIO_DOENCA.escaloes.value[3]?.taxa ?? 0), "da remuneração de referência · DL 28/2004"),
    d("SUBSIDIO_DOENCA", "Majoração", `+${pctExato(SUBSIDIO_DOENCA.majoracao.value)}`, `nos escalões mais baixos, quando a remuneração de referência não excede ${fmt(SUBSIDIO_DOENCA.majoracaoRemuneracaoLimite.value)} ou o agregado tem três ou mais descendentes`),
    d("SS_COEFICIENTE", "De onde sai a remuneração de referência", `${pctExato(SS_COEFICIENTE.servicos.value)} do rendimento declarado`, "é a base de incidência que declaraste — e é por isso que baixá-la sai caro aqui"),
    d("AJUSTE_BASE_SS", "O que o ajuste custa aqui", `±${pctExato(AJUSTE_BASE_SS.amplitude.value)}`, "baixar a base baixa a contribuição e, na mesma proporção, o subsídio"),
  ],

  "parentalidade-independentes": [
    d("SS_COEFICIENTE", "De onde sai a remuneração de referência", `${pctExato(SS_COEFICIENTE.servicos.value)} do rendimento declarado`, "é a base de incidência dos meses relevantes"),
    d("AJUSTE_BASE_SS", "O efeito de ter baixado a base", `±${pctExato(AJUSTE_BASE_SS.amplitude.value)}`, `em degraus de ${pctExato(AJUSTE_BASE_SS.degrau.value)}; o subsídio segue a base, não a faturação`),
    d("SS_TAXA", "Taxa contributiva", pctExato(SS_TAXA.value), "sobre a base de incidência"),
    d("SS_MIN_MENSAL", "Contribuição mínima", fmt(SS_MIN_MENSAL.value), "é ela que fixa o piso da remuneração registada de quem fatura pouco"),
  ],

  "desemprego-independentes": [
    d("SUBSIDIO_DESEMPREGO", "Prazo de garantia", `${SUBSIDIO_DESEMPREGO.prazoGarantiaDias.value} dias`, "com registo de remunerações"),
    d("SUBSIDIO_DESEMPREGO", "Percentagem", pctExato(SUBSIDIO_DESEMPREGO.taxa.value), "da remuneração de referência"),
    d("SUBSIDIO_DESEMPREGO", "Limite mínimo", `${SUBSIDIO_DESEMPREGO.minimoIAS.value} × IAS`, `${fmt(SUBSIDIO_DESEMPREGO.minimoIAS.value * IAS.value)} com o IAS de ${fmt(IAS.value)}`),
    d("SUBSIDIO_DESEMPREGO", "Limite máximo", `${SUBSIDIO_DESEMPREGO.maximoIAS.value} × IAS`, `${fmt(SUBSIDIO_DESEMPREGO.maximoIAS.value * IAS.value)} com o IAS de ${fmt(IAS.value)}`),
    d("SUBSIDIO_DESEMPREGO", "Duração", `${SUBSIDIO_DESEMPREGO.duracaoMinimaDias.value} a ${SUBSIDIO_DESEMPREGO.duracaoMaximaDias.value} dias`, "conforme a idade e a carreira contributiva"),
    d("SS_COEFICIENTE", "De onde sai a remuneração de referência", `${pctExato(SS_COEFICIENTE.servicos.value)} do rendimento declarado`, "a base de incidência declarada nas trimestrais"),
  ],

  "seguro-acidentes-independentes": [
    d("SS_TAXA", "O que a contribuição cobre", pctExato(SS_TAXA.value), "doença, parentalidade, desemprego e velhice — não cobre acidentes de trabalho"),
    d("SS_COEFICIENTE", "Base de incidência — serviços", pctExato(SS_COEFICIENTE.servicos.value), "é também a referência habitual do prémio do seguro"),
  ],

  "reforma-independentes": [
    d("SS_TAXA", "Taxa contributiva", pctExato(SS_TAXA.value), "sobre a base de incidência"),
    d("SS_COEFICIENTE", "Base de incidência — serviços", pctExato(SS_COEFICIENTE.servicos.value), "é esta que fica registada na carreira contributiva"),
    d("SS_COEFICIENTE", "Base de incidência — vendas", pctExato(SS_COEFICIENTE.bens.value), "do rendimento de venda de bens"),
    d("AJUSTE_BASE_SS", "Ajuste na declaração trimestral", `±${pctExato(AJUSTE_BASE_SS.amplitude.value)}`, `em degraus de ${pctExato(AJUSTE_BASE_SS.degrau.value)} — baixa a contribuição hoje e a remuneração registada para sempre`),
    d("SS_MIN_MENSAL", "Contribuição mínima mensal", fmt(SS_MIN_MENSAL.value), "fixa o piso da remuneração registada"),
    d("SS_ISENCAO_PRIMEIRO_ANO_MESES", "Período isento no início", `${SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses`, "sem contribuição e, por isso, sem remuneração registada"),
  ],

  "irs-pensionistas": [
    d("DEDUCAO_ESPECIFICA_PENSOES", "Dedução específica", fmt(DEDUCAO_ESPECIFICA_PENSOES.value), "o art. 53.º já não fixa valor próprio: remete para a al. a) do n.º 1 do art. 25.º · art. 53.º, n.º 1 CIRS"),
    d("DEDUCAO_ESPECIFICA_PENSOES", "Rendimentos até esse valor", "deduzem a totalidade", "aos rendimentos brutos de valor igual ou inferior deduz-se a totalidade do seu quantitativo · art. 53.º, n.º 1 CIRS"),
    d("MINIMO_EXISTENCIA", "Mínimo de existência", fmt(MINIMO_EXISTENCIA.value), "valor de referência abaixo do qual não há imposto a pagar · art. 70.º CIRS"),
  ],

  "reformado-recibos-verdes": [
    d("DEDUCAO_ESPECIFICA_PENSOES", "Dedução específica da pensão", fmt(DEDUCAO_ESPECIFICA_PENSOES.value), "art. 53.º, n.º 1 CIRS"),
    d("REGIME_SIMPLIFICADO", "Coeficiente — profissão do art. 151.º", pctExato(REGIME_SIMPLIFICADO.coefServicos151.value), "sobre o rendimento da atividade · art. 31.º, n.º 1, al. b) CIRS"),
    d("REGIME_SIMPLIFICADO", "Coeficiente — outras prestações de serviços", pctExato(REGIME_SIMPLIFICADO.coefOutrosServicos.value), "art. 31.º, n.º 1, al. c) CIRS"),
    d("RETENCAO", "Retenção — profissão do art. 151.º", pctExato(RETENCAO.art151.value), "art. 101.º, n.º 1, al. a) CIRS"),
    d("SS_TAXA", "Taxa contributiva da atividade", pctExato(SS_TAXA.value), "sobre a base de incidência, havendo obrigação de contribuir"),
    d("SS_ISENCAO_PRIMEIRO_ANO_MESES", "Isenção no início de atividade", `${SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses`, "aplica-se também a quem abre atividade já reformado"),
  ],

  "pensao-estrangeira": [
    d("RENDIMENTO_MUNDIAL", "Sendo residente cá", "declaras a pensão em Portugal", "o IRS incide sobre a totalidade dos rendimentos, incluindo os obtidos fora · art. 15.º, n.º 1 CIRS"),
    d("DEDUCAO_ESPECIFICA_PENSOES", "Dedução específica", fmt(DEDUCAO_ESPECIFICA_PENSOES.value), "aplica-se à categoria H, venha a pensão de onde vier · art. 53.º, n.º 1 CIRS"),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Se houve imposto retido lá fora", "o menor dos dois limites", `${CREDITO_IMPOSTO_ESTRANGEIRO.duploLimite.value.join(" · ")} · art. 81.º, n.º 1 CIRS`),
    d("CREDITO_IMPOSTO_ESTRANGEIRO", "Reporte por insuficiência de coleta", `${CREDITO_IMPOSTO_ESTRANGEIRO.reporteAnos.value} anos`, "art. 81.º, n.º 3 CIRS"),
    d("RESIDENCIA_FISCAL", "O que decide onde declaras", `mais de ${RESIDENCIA_FISCAL.diasPermanencia.value} dias`, `em qualquer período de ${RESIDENCIA_FISCAL.janelaMeses.value} meses — ou o critério da habitação · art. 16.º, n.º 1 CIRS`),
  ],

  // ── Faturar ──────────────────────────────────────────────────────────
  //    O bloco do IVA foi lido na coleção CONSOLIDADA (`civa_rep`), já com
  //    a redação do Decreto-Lei n.º 35/2025 — que mudou a epígrafe do art.
  //    53.º e abriu o regime de isenção a sujeitos passivos de outros
  //    Estados-Membros, com um segundo limiar à escala da União.
  "mudar-regime-iva": [
    d("ISENCAO_IVA_REGIME", "Limiar nacional", fmt(ISENCAO_IVA_REGIME.limiarNacional.value), "volume de negócios anual em território nacional, no ano civil anterior · art. 53.º, n.º 1 CIVA"),
    d("ISENCAO_IVA_REGIME", "Ultrapassagem que torna a mudança imediata", `mais de ${pctExato(ISENCAO_IVA_REGIME.excessoQueTornaImediato.value)} do limiar`, `isto é, acima de ${fmt(IVA_ISENCAO_EXCESSO.value)} · art. 58.º, n.º 2, al. b) CIVA`),
    d("ISENCAO_IVA_REGIME", "Ultrapassagem no ano anterior — efeito", ISENCAO_IVA_REGIME.efeitoNoAnoSeguinte.value, "art. 58.º, n.º 4, al. a) CIVA"),
    d("ISENCAO_IVA_REGIME", "Ultrapassagem acima de 25% — efeito", ISENCAO_IVA_REGIME.efeitoImediato.value, "art. 58.º, n.º 4, al. b) CIVA"),
    d("ISENCAO_IVA_REGIME", "Prazo da declaração de alterações", `${ISENCAO_IVA_REGIME.prazoDeclaracaoAlteracoesDiasUteis.value} dias úteis`, "declaração do art. 32.º · art. 58.º, n.º 5 CIVA"),
    d("IVA_TAXAS", "Taxa normal — continente", pctExato(IVA_TAXAS.continente.value.normal), "a que passas a liquidar · art. 18.º CIVA"),
  ],

  "renunciar-isencao-iva": [
    d("ISENCAO_IVA_REGIME", "Limiar da isenção", fmt(ISENCAO_IVA_REGIME.limiarNacional.value), "volume de negócios anual em território nacional · art. 53.º, n.º 1 CIVA"),
    d("ISENCAO_IVA_REGIME", "O que a isenção custa", "sem direito à dedução nem a reembolso", "os isentos estão excluídos do direito à dedução dos arts. 19.º e 20.º · art. 53.º, n.º 3 CIVA"),
    d("IVA_TAXAS", "Taxa normal — continente", pctExato(IVA_TAXAS.continente.value.normal), "a que passarias a liquidar · art. 18.º CIVA"),
    d("IVA_TAXAS", "Taxa intermédia — continente", pctExato(IVA_TAXAS.continente.value.intermedia), "art. 18.º CIVA"),
    d("IVA_TAXAS", "Taxa reduzida — continente", pctExato(IVA_TAXAS.continente.value.reduzida), "art. 18.º CIVA"),
  ],

  "regime-isencao-ue": [
    d("ISENCAO_IVA_REGIME", "Limiar nacional", fmt(ISENCAO_IVA_REGIME.limiarNacional.value), "volume de negócios anual em território nacional · art. 53.º, n.º 1 CIVA"),
    d("ISENCAO_IVA_REGIME", "Limiar na União", fmt(ISENCAO_IVA_REGIME.limiarUniao.value), "o volume de negócios anual na União Europeia não pode exceder este valor · art. 53.º, n.º 2, al. a) CIVA"),
    d("ISENCAO_IVA_REGIME", "Identificação do regime", `sufixo «${ISENCAO_IVA_REGIME.sufixoIdentificacao.value}»`, "número individual obtido no Estado-Membro de estabelecimento · art. 53.º, n.º 2, al. c) CIVA"),
    d("ISENCAO_IVA_REGIME", "Notificação prévia", "ao Estado-Membro de estabelecimento", "de que se pretende beneficiar da isenção no outro território · art. 53.º, n.º 2, al. b) CIVA"),
    d("ISENCAO_IVA_REGIME", "Quando cessa", "ao exceder o limiar da União", "no ano anterior ou no ano em curso · art. 58.º, n.º 3 CIVA"),
    d("ISENCAO_IVA_REGIME", "O que a isenção custa", "sem direito à dedução nem a reembolso", "art. 53.º, n.º 3 CIVA"),
  ],

  "nota-de-credito": [
    d("REGULARIZACAO_IVA", "Anulação ou redução do valor tributável", REGULARIZACAO_IVA.anulacaoAtePeriodoSeguinte.value, "prazo para o fornecedor deduzir o imposto correspondente · art. 78.º, n.º 2 CIVA"),
    d("REGULARIZACAO_IVA", "Imposto liquidado a MENOS", "retificação obrigatória", "sem penalidade até ao final do período seguinte àquele a que respeita a fatura · art. 78.º, n.º 3 CIVA"),
    d("REGULARIZACAO_IVA", "Imposto liquidado a MAIS", `facultativa, ${REGULARIZACAO_IVA.aMaisPrazoAnos.value} anos`, "art. 78.º, n.º 3 CIVA"),
    d("REGULARIZACAO_IVA", "Regularizar a teu favor exige", REGULARIZACAO_IVA.provaExigida.value, "sem ela, a dedução considera-se indevida · art. 78.º, n.º 5 CIVA"),
    d("REGULARIZACAO_IVA", "Do lado de quem recebe a nota de crédito", REGULARIZACAO_IVA.adquirenteCorrigeAte.value, "art. 78.º, n.º 4 CIVA"),
    d("FATURACAO_PRAZOS", "Prazo de emissão da fatura", `${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil`, "seguinte ao momento em que o imposto é devido · art. 36.º, n.º 1, al. a) CIVA"),
  ],

  "autoliquidacao-iva": [
    d("FATURACAO_PRAZOS", "Prazo — prestações intracomunitárias de serviços", `até ao dia ${FATURACAO_PRAZOS.intracomunitariasAteDiaDoMesSeguinte.value} do mês seguinte`, "quando tributáveis no território de outro Estado-Membro · art. 36.º, n.º 1, al. b) CIVA"),
    d("FATURACAO_PRAZOS", "Prazo — regra geral", `${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil`, "seguinte ao momento em que o imposto é devido · art. 36.º, n.º 1, al. a) CIVA"),
    d("IVA_TAXAS", "Taxa normal — continente", pctExato(IVA_TAXAS.continente.value.normal), "a que o adquirente liquida, quando é ele o devedor · art. 18.º CIVA"),
  ],

  "vies": [
    d("ISENCAO_IVA_REGIME", "Estar isento do art. 53.º dispensa o registo?", "não", "o registo para operações intracomunitárias é autónomo do regime de isenção interno"),
    d("FATURACAO_PRAZOS", "Prazo da fatura intracomunitária", `até ao dia ${FATURACAO_PRAZOS.intracomunitariasAteDiaDoMesSeguinte.value} do mês seguinte`, "art. 36.º, n.º 1, al. b) CIVA"),
    d("IVA_TAXAS", "Se o número não for válido", pctExato(IVA_TAXAS.continente.value.normal), "liquidas IVA português à taxa normal, como numa operação interna · art. 18.º CIVA"),
  ],

  "oss-iva": [
    d("IVA_TAXAS", "Portugal continental — taxa normal", pctExato(IVA_TAXAS.continente.value.normal), "cada Estado-Membro tem as suas; é o que torna o OSS necessário · art. 18.º CIVA"),
    d("IVA_TAXAS", "Madeira — taxa normal", pctExato(IVA_TAXAS.madeira.value.normal), "art. 18.º CIVA"),
    d("IVA_TAXAS", "Açores — taxa normal", pctExato(IVA_TAXAS.acores.value.normal), "art. 18.º CIVA"),
    d("FATURACAO_PRAZOS", "Prazo da fatura — regra geral", `${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil`, "art. 36.º, n.º 1, al. a) CIVA"),
  ],

  "ioss": [
    d("IVA_TAXAS", "Taxa aplicável — continente", pctExato(IVA_TAXAS.continente.value.normal), "é a taxa do país de destino que se aplica, não a do vendedor · art. 18.º CIVA"),
    d("FATURACAO_PRAZOS", "Prazo da fatura — regra geral", `${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil`, "art. 36.º, n.º 1, al. a) CIVA"),
  ],

  "atcud-qr-code": [
    d("FATURACAO_PRAZOS", "Prazo de emissão da fatura", `${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil`, "seguinte ao momento em que o imposto é devido · art. 36.º, n.º 1, al. a) CIVA"),
    d("FATURACAO_PRAZOS", "Faturas globais", `${FATURACAO_PRAZOS.globaisDiasUteis.value} dias úteis`, "do termo do período a que respeitam · art. 36.º, n.º 2 CIVA"),
    d("COIMAS_RGIT", "Documento sem os elementos obrigatórios", `${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}`, "falta ou atraso na apresentação ou exibição de documentos · art. 117.º, n.º 1 RGIT"),
  ],

  "faturacao-eletronica": [
    d("FATURACAO_PRAZOS", "Prazo de emissão — regra geral", `${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil`, "não muda com o formato do documento · art. 36.º, n.º 1, al. a) CIVA"),
    d("FATURACAO_PRAZOS", "Prazo — adiantamentos", FATURACAO_PRAZOS.adiantamentos.value, "art. 36.º, n.º 1, al. c) CIVA"),
    d("COIMAS_RGIT", "Falta ou atraso na apresentação de documentos", `${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}`, "art. 117.º, n.º 1 RGIT"),
  ],

  "programa-faturacao-certificado": [
    d("FATURACAO_PRAZOS", "Prazo de emissão — regra geral", `${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil`, "art. 36.º, n.º 1, al. a) CIVA"),
    d("ISENCAO_IVA_REGIME", "Limiar da isenção de IVA, para referência", fmt(ISENCAO_IVA_REGIME.limiarNacional.value), "os limiares do programa certificado são outros, e vivem no DL 28/2019"),
    d("COIMAS_RGIT", "Falta ou atraso na apresentação de documentos", `${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}`, "art. 117.º, n.º 1 RGIT"),
  ],

  // ── Cumprir prazos ───────────────────────────────────────────────────
  //    O pacote dá os prazos da declaração periódica mas não dá o número
  //    que decide qual deles se aplica: o limiar de 650 000 € do art. 41.º.
  //    É ele que separa quem entrega todos os meses de quem entrega por
  //    trimestre — e é o dado mais útil desta secção.
  "declaracao-periodica-iva": [
    d("DECLARACAO_PERIODICA_IVA", "Mensal ou trimestral — o limiar", fmt(DECLARACAO_PERIODICA_IVA.limiarMensal.value), "volume de negócios do ano civil anterior; igual ou superior é mensal, abaixo é trimestral · art. 41.º, n.º 1 CIVA"),
    d("DECLARACAO_PERIODICA_IVA", "Prazo de entrega", `dia ${DECLARACAO_PERIODICA_IVA.diaEntrega.value} do ${DECLARACAO_PERIODICA_IVA.mesesAposPeriodo.value}.º mês seguinte`, "ao mês ou ao trimestre a que respeitam as operações · art. 41.º, n.º 1 CIVA"),
    d("DECLARACAO_PERIODICA_IVA", "Prazo de pagamento", `dia ${DECLARACAO_PERIODICA_IVA.diaPagamento.value} do ${DECLARACAO_PERIODICA_IVA.mesesAposPeriodo.value}.º mês seguinte`, "cinco dias depois da entrega · art. 27.º, n.º 1 CIVA"),
    d("DECLARACAO_PERIODICA_IVA", "Optar pelo regime mensal", "só durante o mês de janeiro", "produzindo efeitos a partir de 1 de janeiro desse ano · art. 41.º, n.º 3, al. b) CIVA"),
    d("REGULARIZACAO_IVA", "Regularizar a teu favor exige", REGULARIZACAO_IVA.provaExigida.value, "art. 78.º, n.º 5 CIVA"),
    d("FALTA_ENTREGA_PRESTACAO", "Não entregar o imposto — negligência", `${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMin.value)} a ${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMax.value)}`, "do imposto em falta · art. 114.º, n.º 2 RGIT"),
  ],

  "saf-t-faturacao": [
    d("COIMAS_RGIT", "Falta ou atraso na comunicação", `${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}`, "por cada período em falta · art. 117.º, n.º 1 RGIT"),
    d("REDUCAO_COIMA", "Comunicar antes de qualquer ação da AT", pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value), "do montante mínimo legal · art. 30.º, n.º 1, al. a) RGIT"),
    d("COIMAS_RGIT", "Mínimo a pagar, havendo redução", fmt(COIMAS_RGIT.minimoComReducao.value), "art. 26.º, n.º 3 RGIT"),
    d("FATURACAO_PRAZOS", "Prazo de emissão da fatura, para referência", `${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil`, "é outro prazo e não se confunde com o da comunicação · art. 36.º, n.º 1, al. a) CIVA"),
  ],

  "declaracao-recapitulativa": [
    d("FATURACAO_PRAZOS", "Prazo da fatura intracomunitária", `até ao dia ${FATURACAO_PRAZOS.intracomunitariasAteDiaDoMesSeguinte.value} do mês seguinte`, "quando o serviço é tributável no território de outro Estado-Membro · art. 36.º, n.º 1, al. b) CIVA"),
    d("ISENCAO_IVA_REGIME", "Estar isento do art. 53.º dispensa?", "não", "a obrigação existe mesmo no regime de isenção — é o ponto que gera mais incumprimento"),
    d("COIMAS_RGIT", "Falta ou atraso na entrega", `${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}`, "art. 117.º, n.º 1 RGIT"),
  ],

  "modelo-10": [
    d("RETENCAO", "Retenção — profissão do art. 151.º", pctExato(RETENCAO.art151.value), "é uma das retenções que a Modelo 10 comunica · art. 101.º, n.º 1, al. a) CIRS"),
    d("RETENCAO", "Retenção — outras atividades", pctExato(RETENCAO.outros.value), "art. 101.º CIRS"),
    d("RETENCAO", "Retenção — direitos de autor", pctExato(RETENCAO.diretosAutor.value), "art. 101.º CIRS"),
    d("COIMAS_RGIT", "Falta ou atraso de declarações", `${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}`, "art. 116.º, n.º 1 RGIT"),
  ],

  "modelo-30": [
    d("NAO_RESIDENTES", "Trabalho, categoria B e pensões", pctExato(NAO_RESIDENTES.taxaTrabalhoEPensoes.value), "retenção liberatória sobre rendimentos obtidos cá por não residentes · art. 71.º, n.º 4 CIRS"),
    d("NAO_RESIDENTES", "Rendimentos de capitais", pctExato(NAO_RESIDENTES.taxaCapitais.value), "art. 71.º, n.º 1, al. a) CIRS"),
    d("NAO_RESIDENTES", "Restantes rendimentos", pctExato(NAO_RESIDENTES.taxaOutrosRendimentos.value), "art. 72.º, n.º 1, al. b) CIRS"),
    d("FALTA_ENTREGA_PRESTACAO", "Não reter — negligência", `${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMin.value)} a ${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMax.value)}`, "do imposto em falta; quem não retém responde pelo imposto · art. 114.º, n.º 2 RGIT"),
    d("FALTA_ENTREGA_PRESTACAO", "Não reter — dolo", `até ${FALTA_ENTREGA_PRESTACAO.doloFatorMax.value}× o valor em falta`, "art. 114.º, n.º 1 RGIT"),
  ],

  "dmr-dmis": [
    d("COIMAS_RGIT", "Falta ou atraso de declarações", `${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}`, "por cada período em falta · art. 116.º, n.º 1 RGIT"),
    d("REDUCAO_COIMA", "Entregar antes de qualquer ação da AT", pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value), "do montante mínimo legal · art. 30.º, n.º 1, al. a) RGIT"),
    d("COIMAS_RGIT", "Mínimo a pagar, havendo redução", fmt(COIMAS_RGIT.minimoComReducao.value), "art. 26.º, n.º 3 RGIT"),
    d("SS_TAXA", "A declaração da Segurança Social é outra", pctExato(SS_TAXA.value), "a DMR fiscal e a declaração de remunerações da Segurança Social são obrigações distintas, para entidades distintas"),
  ],

  "portal-das-financas": [
    d("RESIDENCIA_FISCAL", "Prazo para comunicar a mudança de domicílio", `${RESIDENCIA_FISCAL.prazoComunicarDias.value} dias`, "e a mudança é ineficaz enquanto não for comunicada · art. 19.º, n.os 4 e 5 LGT"),
    d("REPRESENTANTE_FISCAL", "Notificações eletrónicas dispensam representante", "sim", "a obrigatoriedade não é aplicável a quem adira ao serviço · art. 19.º, n.º 15 LGT"),
    d("REVISAO_E_RECLAMACAO", "Reclamar de uma liquidação", `${REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias`, "e o prazo conta-se da notificação — daí a importância de a ler a tempo · art. 70.º, n.º 1 CPPT"),
  ],

  "situacao-regularizada": [
    d("REDUCAO_COIMA", "Regularizar antes de qualquer ação da AT", pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value), "do montante mínimo legal da coima · art. 30.º, n.º 1, al. a) RGIT"),
    d("REDUCAO_COIMA", "Prazo para pagar a coima reduzida", `${REDUCAO_COIMA.prazoPagamentoDias.value} dias`, "e a situação tem de ficar regularizada no mesmo prazo · art. 30.º, n.º 3, al. a) RGIT"),
    d("COIMAS_RGIT", "Mínimo a pagar, havendo redução", fmt(COIMAS_RGIT.minimoComReducao.value), "art. 26.º, n.º 3 RGIT"),
    d("SS_MIN_MENSAL", "A contribuição mínima que gera dívida em silêncio", fmt(SS_MIN_MENSAL.value), "existe mesmo em trimestres sem faturação, e é a origem mais comum de dívida contributiva"),
  ],

  // ── Família e ciclo de vida ──────────────────────────────────────────
  //    O eixo é o art. 13.º: a situação pessoal e familiar que conta é a
  //    do ÚLTIMO DIA DO ANO, e ninguém pode estar em dois agregados. Daí
  //    sai quase tudo o que esta secção resolve.
  "herancas-imposto-selo": [
    d("IS_TRANSMISSAO_GRATUITA", "Taxa geral", pctExato(IS_TRANSMISSAO_GRATUITA.value), "aquisição gratuita de bens: heranças, legados e doações · verba 1.2 TGIS"),
    d("TRANSMISSAO_GRATUITA_PARTICIPACAO", "Quem está isento", TRANSMISSAO_GRATUITA_PARTICIPACAO.isentos.value, "a isenção é do imposto, não da participação · art. 6.º, al. e) CIS"),
    d("TRANSMISSAO_GRATUITA_PARTICIPACAO", "Prazo da participação", `${TRANSMISSAO_GRATUITA_PARTICIPACAO.prazoMeses.value} meses`, "até ao final do 3.º mês seguinte ao do nascimento da obrigação tributária · art. 26.º, n.º 3 CIS"),
    d("TRANSMISSAO_GRATUITA_PARTICIPACAO", "Quem participa", TRANSMISSAO_GRATUITA_PARTICIPACAO.quemParticipa.value, "identificando o cabeça-de-casal todos os beneficiários, estes ficam desonerados · art. 26.º, n.os 1 e 4 CIS"),
    d("TRANSMISSAO_GRATUITA_PARTICIPACAO", "Adiamento máximo", `${TRANSMISSAO_GRATUITA_PARTICIPACAO.adiamentoMaximoDias.value} dias`, "os prazos são improrrogáveis salvo motivo justificado, alegado e provado · art. 26.º, n.º 5 CIS"),
  ],

  "doacoes": [
    d("IS_TRANSMISSAO_GRATUITA", "Imposto do selo — taxa geral", pctExato(IS_TRANSMISSAO_GRATUITA.value), "igual na doação e na herança · verba 1.2 TGIS"),
    d("TRANSMISSAO_GRATUITA_PARTICIPACAO", "Quem está isento, nas duas vias", TRANSMISSAO_GRATUITA_PARTICIPACAO.isentos.value, "art. 6.º, al. e) CIS"),
    d("IS_DOACAO_IMOVEL", "Doação de imóvel — o que a herança não paga", pctExato(IS_DOACAO_IMOVEL.value), "a verba 1.1 incide sobre doações e transmissões onerosas de imóveis, mesmo para família isenta da verba 1.2; a herança não está sujeita a ela"),
    d("TRANSMISSAO_GRATUITA_PARTICIPACAO", "Prazo da participação", `${TRANSMISSAO_GRATUITA_PARTICIPACAO.prazoMeses.value} meses`, "art. 26.º, n.º 3 CIS"),
    d("MAIS_VALIAS_IMOBILIARIO_INCLUSAO", "Se o donatário vender depois", `${pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} da mais-valia é tributada`, "e o valor de aquisição é o que serviu de base ao imposto do selo · arts. 43.º e 45.º CIRS"),
  ],

  "divorcio-irs": [
    d("DEPENDENTES_IRS", "A data que decide o estado civil", DEPENDENTES_IRS.situacaoRelevanteEm.value, "art. 13.º, n.º 8 CIRS"),
    d("DEPENDENTES_IRS", "Um dependente, um agregado", "não pode fazer parte de dois", "art. 13.º, n.º 7 CIRS"),
    d("GUARDA_PARTILHADA", "Dependente em duas declarações", `deduções a ${pctExato(GUARDA_PARTILHADA.fracaoPorSujeitoPassivo.value)} em cada uma`, "art. 78.º, n.º 9 CIRS"),
    d("PENSAO_ALIMENTOS_IRS", "Pensão de alimentos — dedução", pctExato(PENSAO_ALIMENTOS_IRS.taxa.value), "das importâncias comprovadamente suportadas e não reembolsadas · art. 83.º-A, n.º 1 CIRS"),
    d("MAIS_VALIAS_IMOBILIARIO_INCLUSAO", "Venda futura da casa partilhada", `${pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} da mais-valia é tributada`, "art. 43.º, n.º 2, al. b) CIRS"),
  ],

  "pensao-alimentos-irs": [
    d("PENSAO_ALIMENTOS_IRS", "Dedução à coleta", pctExato(PENSAO_ALIMENTOS_IRS.taxa.value), "das importâncias comprovadamente suportadas e não reembolsadas · art. 83.º-A, n.º 1 CIRS"),
    d("PENSAO_ALIMENTOS_IRS", "Limite máximo", "não há", "a norma não fixa teto — é das poucas deduções sem limite · art. 83.º-A, n.º 1 CIRS"),
    d("PENSAO_ALIMENTOS_IRS", "O requisito que decide tudo", PENSAO_ALIMENTOS_IRS.exigeTituloJudicial.value, "um acordo particular entre os pais não abre o direito · art. 83.º-A, n.º 1 CIRS"),
    d("PENSAO_ALIMENTOS_IRS", "Incompatível com declarar o mesmo filho como dependente", "sim", "salvo nos casos em que o beneficiário faça parte do mesmo agregado ou tenha outras deduções do art. 78.º · art. 83.º-A, n.º 1 CIRS"),
    d("DEPENDENTES_IRS", "Para filhos maiores, valem os requisitos do art. 13.º", `até ${DEPENDENTES_IRS.idadeMaxima.value} anos`, "e com rendimentos anuais não superiores ao limite legal · art. 83.º-A, n.º 2 CIRS"),
  ],

  "guarda-partilhada-irs": [
    d("GUARDA_PARTILHADA", "Por defeito, em duas declarações", `${pctExato(GUARDA_PARTILHADA.fracaoPorSujeitoPassivo.value)} das deduções em cada uma`, "art. 78.º, n.º 9 CIRS"),
    d("GUARDA_PARTILHADA", "Prazo de comunicação", GUARDA_PARTILHADA.prazoComunicacao.value, "no Portal das Finanças, por ambos os progenitores · art. 78.º, n.º 11 CIRS"),
    d("GUARDA_PARTILHADA", "Sem comunicação, ou não somando 100%", GUARDA_PARTILHADA.supletivo.value, "art. 78.º, n.º 12 CIRS"),
    d("GUARDA_PARTILHADA", "Para uma partilha diferente de metade", "acordo que a fixe quantitativamente", "não basta acordar: o acordo tem de fixar a percentagem de cada um · art. 78.º, n.º 10 CIRS"),
    d("DEPENDENTES_IRS", "Onde o dependente é considerado", DEPENDENTES_IRS.situacaoRelevanteEm.value, "pela residência fixada na regulação ou, na falta, pela identidade de domicílio fiscal · art. 13.º, n.os 8 e 9 CIRS"),
  ],

  "dependentes-irs": [
    d("DEPENDENTES_IRS", "Idade-limite dos dependentes maiores", `${DEPENDENTES_IRS.idadeMaxima.value} anos`, "art. 13.º, n.º 5, al. b) CIRS"),
    d("DEPENDENTES_IRS", "Limite de rendimentos do dependente", fmt(DEPENDENTES_IRS.limiteRendimentoAnual.value), "a lei remete para a retribuição mínima mensal garantida e não fixa montante próprio · art. 13.º, n.º 5, al. b) CIRS"),
    d("DEPENDENTES_IRS", "Um dependente, um agregado", "não pode fazer parte de dois", "nem, integrando um agregado, ser considerado sujeito passivo autónomo · art. 13.º, n.º 7 CIRS"),
    d("DEDUCAO_DEPENDENTE", "Dedução por dependente", fmt(DEDUCAO_DEPENDENTE.value), "com mais de 3 anos · art. 78.º-A CIRS"),
    d("DEDUCAO_DEPENDENTE_BEBE", "Dedução por dependente até 3 anos", fmt(DEDUCAO_DEPENDENTE_BEBE.value), "art. 78.º-A CIRS"),
    d("GUARDA_PARTILHADA", "Se constar de duas declarações", `${pctExato(GUARDA_PARTILHADA.fracaoPorSujeitoPassivo.value)} em cada uma`, "art. 78.º, n.º 9 CIRS"),
  ],

  "deficiencia-irs": [
    d("DEDUCAO_DEFICIENCIA_GRAU_MINIMO", "Grau mínimo de incapacidade", `${DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value}%`, "permanente, comprovado por atestado médico de incapacidade multiúso · art. 87.º, n.º 5 CIRS"),
    d("EXCLUSAO_DEFICIENCIA_TAXA", "Exclusão — categorias A e B", pctExato(EXCLUSAO_DEFICIENCIA_TAXA.value), "os rendimentos brutos são considerados apenas por 85% · art. 56.º-A, n.º 1, al. a) CIRS"),
    d("EXCLUSAO_DEFICIENCIA_TAXA_PENSOES", "Exclusão — categoria H", pctExato(EXCLUSAO_DEFICIENCIA_TAXA_PENSOES.value), "as pensões são consideradas por 90%, e não por 85% · art. 56.º-A, n.º 1, al. b) CIRS"),
    d("EXCLUSAO_DEFICIENCIA_MAX", "Teto da exclusão", fmt(EXCLUSAO_DEFICIENCIA_MAX.value), "por CATEGORIA de rendimentos, não por titular · art. 56.º-A, n.º 2 CIRS"),
    d("DEDUCAO_DEFICIENCIA_COLETA", "Dedução à coleta do titular", fmt(DEDUCAO_DEFICIENCIA_COLETA.value), "quatro vezes o valor do IAS · art. 87.º, n.º 1 CIRS"),
    d("DEFICIENCIA_ART87", "Por dependente ou ascendente", fmt(DEFICIENCIA_ART87.dependenteOuAscendente.value), "2,5 × IAS por cada um · art. 87.º, n.º 1 CIRS"),
    d("DEFICIENCIA_ART87", "Educação e reabilitação", pctExato(DEFICIENCIA_ART87.educacaoEReabilitacao.value), "da totalidade das despesas, sem teto próprio no artigo · art. 87.º, n.º 2 CIRS"),
    d("DEFICIENCIA_ART87", "Prémios de seguro de vida", pctExato(DEFICIENCIA_ART87.premiosSeguroVida.value), `com o limite de ${pctExato(DEFICIENCIA_ART87.limitePremiosNaColeta.value)} da coleta · art. 87.º, n.os 2 e 4 CIRS`),
    d("DEFICIENCIA_ART87", "Despesa de acompanhamento", fmt(DEFICIENCIA_ART87.acompanhamento.value), `exige grau de invalidez de ${DEFICIENCIA_ART87.grauAcompanhamento.value}% ou superior · art. 87.º, n.º 6 CIRS`),
    d("DEFICIENCIA_ART87", "Deficiência das Forças Armadas", fmt(DEFICIENCIA_ART87.forcasArmadas.value), "acresce 1 × IAS, e as três deduções são cumulativas · art. 87.º, n.os 7 e 8 CIRS"),
    d("DEDUCAO_DEPENDENTE", "Dedução por dependente", fmt(DEDUCAO_DEPENDENTE.value), "acresce às deduções próprias da deficiência · art. 78.º-A CIRS"),
    d("DEPENDENTES_IRS", "Dependentes inaptos para o trabalho", "sem limite de idade", "os filhos maiores inaptos para o trabalho e para angariar meios de subsistência não têm o limite dos 25 anos · art. 13.º, n.º 5, al. c) CIRS"),
  ],

  "ascendentes-lares": [
    d("DEDUCAO_ASCENDENTE", "Dedução por ascendente", fmt(DEDUCAO_ASCENDENTE.value), "por cada ascendente em comunhão de habitação · art. 78.º-A CIRS"),
    d("DEDUCAO_ASCENDENTE_UNICO", "Havendo um só ascendente", fmt(DEDUCAO_ASCENDENTE_UNICO.value), "art. 78.º-A CIRS"),
    d("DEDUCAO_LARES", "Despesas com lares — dedução", pctExato(DEDUCAO_LARES.value.taxa), "dos encargos suportados · art. 84.º CIRS"),
    d("DEDUCAO_LARES", "Despesas com lares — teto", fmt(DEDUCAO_LARES.value.limite), "por agregado, e não por ascendente · art. 84.º CIRS"),
    d("GUARDA_PARTILHADA", "Ascendente em duas declarações", `deduções a ${pctExato(GUARDA_PARTILHADA.fracaoPorSujeitoPassivo.value)} em cada uma`, "a regra do art. 78.º, n.º 9 vale para ascendentes como para dependentes"),
  ],

  // ── Gerir uma empresa ───────────────────────────────────────────────
  "sifide": [
    d("SIFIDE_TAXA_BASE", "Taxa base", pctExato(SIFIDE_TAXA_BASE.value), "das despesas de I&D do período · art. 36.º CFI"),
    d("SIFIDE_TAXA_INCREMENTAL", "Taxa incremental", pctExato(SIFIDE_TAXA_INCREMENTAL.value), "do aumento face à média dos dois anos anteriores · art. 36.º CFI"),
    d("SIFIDE_TETO_INCREMENTAL", "Teto do incremento elegível", fmt(SIFIDE_TETO_INCREMENTAL.value), "limite do aumento a que a taxa incremental se aplica · art. 36.º CFI"),
    d("SIFIDE_MAJORACAO_PME_JOVEM", "Majoração de PME jovem", pctExato(SIFIDE_MAJORACAO_PME_JOVEM.value), "para PME com menos de dois exercícios e sem histórico incremental · art. 36.º CFI"),
    d("SIFIDE_REPORTE_ANOS", "Reporte por insuficiência de coleta", `${SIFIDE_REPORTE_ANOS.value} exercícios`, "o crédito não deduzido não se perde no ano · art. 37.º CFI"),
  ],

  "rfai": [
    d("RFAI_TAXA_INTERIOR", "Dedução — Norte, Centro, Alentejo, Açores e Madeira", pctExato(RFAI_TAXA_INTERIOR.value), "do investimento elegível · art. 23.º CFI"),
    d("RFAI_TAXA_INTERIOR_EXCEDENTE", "Acima do limiar, nessas regiões", pctExato(RFAI_TAXA_INTERIOR_EXCEDENTE.value), "sobre a parcela que exceda o limiar · art. 23.º CFI"),
    d("RFAI_LIMITE_INVESTIMENTO_INTERIOR", "Limiar do investimento", fmt(RFAI_LIMITE_INVESTIMENTO_INTERIOR.value), "acima dele a taxa desce · art. 23.º CFI"),
    d("RFAI_TAXA_LITORAL", "Dedução — Lisboa e Algarve", pctExato(RFAI_TAXA_LITORAL.value), "do investimento elegível · art. 23.º CFI"),
    d("RFAI_LIMITE_COLETA", "Limite da dedução à coleta", pctExato(RFAI_LIMITE_COLETA.value), "da coleta de IRC do período, e a totalidade nos primeiros exercícios de atividade · art. 24.º CFI"),
    d("RFAI_REPORTE_ANOS", "Reporte do saldo", `${RFAI_REPORTE_ANOS.value} exercícios`, "art. 24.º CFI"),
  ],

  "ice-capitalizacao": [
    d("ICE", "Spread sobre a Euribor a 12 meses", `+${ICE.spread.value * 100} pontos percentuais`.replace(".", ","), "aplicado aos aumentos líquidos dos capitais próprios elegíveis · art. 43.º-D, n.º 1 EBF"),
    d("ICE", "Limite — o maior dos dois", fmt(ICE.limiteAbsoluto.value), `ou ${pctExato(ICE.limiteEbitda.value)} do EBITDA fiscal, consoante o que for maior · art. 43.º-D, n.º 4 EBF`),
    d("ICE", "Janela de apuramento", `${ICE.periodosAnteriores.value} períodos anteriores`, "mais o próprio exercício; se o somatório for negativo, considera-se zero · art. 43.º-D, n.º 3 EBF"),
    d("ICE", "Reporte do excedente", `${ICE.reporteAnos.value} períodos`, "a parte que exceda o limite do EBITDA é dedutível mais tarde · art. 43.º-D, n.º 5 EBF"),
    d("ICE", "Aumentos elegíveis desde", ICE.primeiroPeriodoElegivel.value, "art. 43.º-D, n.º 9 EBF"),
    d("ICE", "Condições de acesso", ICE.exigeSituacaoRegularizada.value, "art. 43.º-D, n.º 7 EBF"),
  ],

  "stock-options": [
    d("STOCK_OPTIONS_STARTUP", "Fração do ganho tributada", pctExato(STOCK_OPTIONS_STARTUP.fracaoTributada.value), "os ganhos são considerados em metade do seu valor · art. 43.º-C, n.º 1 EBF"),
    d("STOCK_OPTIONS_STARTUP", "Taxa autónoma", pctExato(STOCK_OPTIONS_STARTUP.taxa.value), "art. 72.º, n.º 1, al. f) CIRS"),
    d("STOCK_OPTIONS_TAXA_EFETIVA", "Taxa efetiva do regime", pctExato(STOCK_OPTIONS_TAXA_EFETIVA), "metade do ganho à taxa autónoma — não está escrita em nenhum artigo, sai do encontro dos dois"),
    d("STOCK_OPTIONS_STARTUP", "Período mínimo de detenção", `${STOCK_OPTIONS_STARTUP.retencaoMinimaAnos.value} ano`, "de manutenção dos direitos subjacentes · art. 43.º-C, n.º 4 EBF"),
    d("STOCK_OPTIONS_STARTUP", "Momentos de tributação", STOCK_OPTIONS_STARTUP.momentosDeTributacao.value, "art. 43.º-C, n.º 4 EBF"),
    d("STOCK_OPTIONS_STARTUP", "Isenção na perda de residência", fmt(STOCK_OPTIONS_STARTUP.isencaoSaidaEmIas.value * IAS.value), `${STOCK_OPTIONS_STARTUP.isencaoSaidaEmIas.value} × IAS, e ${STOCK_OPTIONS_STARTUP.isencaoSaidaUmaVez.value} · art. 43.º-C, n.os 5 e 6 EBF`),
    d("STOCK_OPTIONS_STARTUP", "Participação que exclui do regime", pctExato(STOCK_OPTIONS_STARTUP.participacaoQueExclui.value), "do capital social ou dos direitos de voto, salvo em startups e micro e pequenas empresas · art. 43.º-C, n.os 9 e 10 EBF"),
    d("STOCK_OPTIONS_STARTUP", "Silêncio da entidade", `${STOCK_OPTIONS_STARTUP.prazoRespostaEntidadeDias.value} dias`, "não respondendo ao pedido de confirmação, fica subsidiariamente responsável pelo imposto em falta · art. 43.º-C, n.º 8 EBF"),
  ],

  "amortizacoes-equipamento": [
    d("ELEMENTOS_REDUZIDO_VALOR", "Dedução integral no ano", fmt(ELEMENTOS_REDUZIDO_VALOR.value), "custo unitário até este valor deduz-se todo no período em que é reconhecido · art. 33.º CIRC"),
    d("DEPRECIACAO", "Onde estão as taxas", DEPRECIACAO.taxasNoDecretoRegulamentar.value, "art. 31.º, n.º 1 CIRC"),
    d("DEPRECIACAO", "Sem taxa fixada para o bem", DEPRECIACAO.semTaxaFixada.value, "art. 31.º, n.º 3 CIRC"),
    d("DEPRECIACAO", "Quotas decrescentes — coeficientes", DEPRECIACAO.quotasDecrescentes.value.map((c) => `${String(c.coeficiente).replace(".", ",")} (vida útil ${c.vidaUtil})`).join(" · "), "corrigem a taxa no método das quotas decrescentes · art. 31.º, n.º 4 CIRC"),
    d("DEPRECIACAO", "Ano de entrada em funcionamento", DEPRECIACAO.proporcionalNoAnoDeEntrada.value, "art. 31.º, n.º 7 CIRC"),
    d("DEPRECIACAO", "O que não é aceite como gasto", DEPRECIACAO.naoDedutiveis.value, "art. 34.º, n.º 1 CIRC"),
  ],

  "viatura-empresa": [
    d("TA_VIATURAS_COMBUSTAO", "Tributação autónoma — combustão", taxasPorEscalao(TA_VIATURAS_COMBUSTAO.value), "por escalão de custo de aquisição · art. 88.º, n.º 3 CIRC"),
    d("TA_VIATURAS_PHEV", "Híbridos plug-in", taxasPorEscalao(TA_VIATURAS_PHEV.value), "art. 88.º CIRC"),
    d("TA_VIATURAS_ELETRICA", "Elétricos", pctExato(TA_VIATURAS_ELETRICA.value), `até ao custo de aquisição de ${fmt(TA_ELETRICA_LIMITE_CUSTO.value)} · art. 88.º CIRC`),
    d("TA_AGRAVAMENTO_PREJUIZO", "Agravamento com prejuízo fiscal", `+${TA_AGRAVAMENTO_PREJUIZO.value * 100} pontos`.replace(".", ","), "as taxas sobem quando o exercício dá prejuízo · art. 88.º, n.º 14 CIRC"),
    d("AJUDAS_CUSTO", "Ajudas de custo — limite diário isento", fmt(AJUDAS_CUSTO.nacionalDia.value), "em território nacional, para trabalhadores em geral · art. 2.º, n.º 3, al. d) CIRS"),
    d("TA_AJUDAS_CUSTO", "Tributação autónoma das ajudas e dos quilómetros", pctExato(TA_AJUDAS_CUSTO.value), "quando não faturados a clientes nem tributados em IRS na esfera do beneficiário · art. 88.º, n.º 9 CIRC"),
    d("DEPRECIACAO", "Depreciação da viatura", DEPRECIACAO.naoDedutiveis.value, "art. 34.º, n.º 1, al. e) CIRC"),
  ],

  "suprimentos-prestacoes-suplementares": [
    d("ICE", "Prestações suplementares e o ICE", `+${ICE.spread.value * 100} pontos percentuais`.replace(".", ","), "as entradas em dinheiro contam como aumento de capitais próprios elegíveis; os suprimentos, sendo dívida, não · art. 43.º-D, n.os 1 e 6 EBF"),
    d("ICE", "Reembolso reduz o benefício", ICE.exigeSituacaoRegularizada.value, "as saídas a favor dos titulares entram no cálculo dos aumentos LÍQUIDOS · art. 43.º-D, n.º 6, al. b) EBF"),
    d("IRC_TAXA_GERAL", "IRC — taxa geral", pctExato(IRC_TAXA_GERAL.value), "art. 87.º CIRC"),
    d("IRC_TAXA_PME", "IRC — taxa reduzida de PME", pctExato(IRC_TAXA_PME.value), `sobre os primeiros ${fmt(IRC_LIMITE_PME.value)} de matéria coletável · art. 87.º CIRC`),
  ],

  "obrigacoes-societarias": [
    d("IRC_TAXA_GERAL", "IRC — taxa geral", pctExato(IRC_TAXA_GERAL.value), "art. 87.º CIRC"),
    d("IRC_TAXA_PME", "IRC — taxa reduzida de PME", pctExato(IRC_TAXA_PME.value), `sobre os primeiros ${fmt(IRC_LIMITE_PME.value)} de matéria coletável · art. 87.º CIRC`),
    d("ICE", "Situação fiscal e contributiva", ICE.exigeSituacaoRegularizada.value, "é condição de acesso a benefícios fiscais — e o que mais bloqueia candidaturas · art. 43.º-D, n.º 7 EBF"),
  ],

  "apoios-contratacao-iefp": [
    d("IAS", "Indexante dos Apoios Sociais", fmt(IAS.value), "é a ele que os apoios do IEFP estão indexados, e não a um valor fixo em euros"),
    d("SMN", "Retribuição mínima mensal garantida", fmt(SMN.value), "referência dos apoios e da remuneração mínima do posto de trabalho apoiado"),
    d("SS_DEPENDENTE", "Taxa contributiva da entidade empregadora", pctExato(SS_DEPENDENTE.entidade.value), "regime geral — é sobre ela que incidem as isenções e reduções contributivas"),
    d("SS_DEPENDENTE", "Taxa contributiva do trabalhador", pctExato(SS_DEPENDENTE.trabalhador.value), "sobre a remuneração ilíquida"),
    d("ICE", "Situação regularizada", ICE.exigeSituacaoRegularizada.value, "condição transversal aos apoios públicos — sem ela a candidatura não avança"),
  ],
};

export const dadosDoMotor = (slug: string): DadoDoMotor[] => DADOS_MOTOR[slug] ?? [];

/** Os parâmetros de `fiscal-data.ts` que um guia usa. Alimenta o
    `engineBindings` do manifesto, que até aqui estava vazio na expansão. */
export const bindingsDoGuia = (slug: string): string[] => [
  ...new Set(dadosDoMotor(slug).map((x) => x.binding)),
];
