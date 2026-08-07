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

import {
  AIMI,
  CATEGORIA_F,
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
  IS_CREDITO,
  IS_TAXA_AQUISICAO,
  IS_TRANSMISSAO_GRATUITA,
  MAIS_VALIAS_IMOBILIARIO_INCLUSAO,
  MAIS_VALIAS_IMOVEIS,
  MAIS_VALIAS_REINVESTIMENTO_MESES,
  PRAZO_MODELO1_MESES,
  REGIME_SIMPLIFICADO,
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

  "imovel-empresa-ou-pessoal": [
    d("AIMI", "AIMI — dedução que a empresa não tem", fmt(AIMI.deducaoSingular.value), "só pessoas singulares e heranças indivisas · art. 135.º-C, n.º 2 CIMI"),
    d("AIMI", "AIMI — taxa da empresa", pctExato(AIMI.taxaColetiva.value), "sobre a soma toda dos VPT, sem dedução · art. 135.º-F, n.º 1 CIMI"),
    d("AIMI", "AIMI — imóvel da empresa em uso pessoal", pctExato(AIMI.taxaSingular.value), "tributado à taxa das pessoas singulares, e identificado no anexo à declaração de rendimentos · art. 135.º-F, n.º 4 CIMI"),
    d("MAIS_VALIAS_IMOBILIARIO_INCLUSAO", "Mais-valia — em nome pessoal", `${pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} tributada`, "em IRC não há regra equivalente: a mais-valia entra por inteiro no lucro tributável · art. 43.º CIRS"),
    d("IMT_TAXA_COMERCIAL", "Tirar o imóvel da empresa", pctExato(IMT_TAXA_COMERCIAL.value), "é uma transmissão: há IMT outra vez, sobre o maior entre o valor do ato e o VPT · arts. 12.º e 17.º CIMT"),
  ],
};

export const dadosDoMotor = (slug: string): DadoDoMotor[] => DADOS_MOTOR[slug] ?? [];

/** Os parâmetros de `fiscal-data.ts` que um guia usa. Alimenta o
    `engineBindings` do manifesto, que até aqui estava vazio na expansão. */
export const bindingsDoGuia = (slug: string): string[] => [
  ...new Set(dadosDoMotor(slug).map((x) => x.binding)),
];
