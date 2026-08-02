// Cenário do protótipo: salário base de 1 850 €, casado único titular, um
// dependente, IRS Jovem no 3.º ano, subsídio de refeição de 10,20 € em cartão,
// 1,25 h de trabalho suplementar e um prémio de 250 € não regular.
//
// Todos os números do documento saem daqui — do motor, nunca escritos à mão.
import { calculateLegacyPayroll, employerCost, includeMonthlyDuodecimos } from "../src/lib/payroll-simulator-legacy-adapter";
import { prestacoesDoAno } from "../src/lib/export/prestacoes";
import { calcularVencimentoAnual } from "../src/lib/fiscal-dependente";
import { criarProveniencia } from "../src/lib/export/referencia";
import type { DocumentoVencimento } from "../src/lib/export/documento-vencimento";
import { DATA_LAST_REVIEW, SS_DEPENDENTE } from "../src/lib/fiscal-data";
import { pctDoc } from "../src/lib/export/dinheiro";

export const JSON_EXEMPLO = "src/documentos/dados-exemplo.json";

export const CONTEXTO_EXEMPLO = {
  baseSalary: 1_850,
  weeklyHours: 40,
  dependants: 1,
  dependantsWithDisability: 0,
  maritalStatus: "casadoUnico" as const,
  disability: false,
  region: "continente" as const,
  youthIrsBenefitYear: 3,
  meal: { enabled: true, days: 21, dailyAmount: 10.2, card: true },
};

export async function construirDocumentoExemplo(): Promise<DocumentoVencimento> {
  const rubricas = includeMonthlyDuodecimos(
    [
      { id: "extra", type: "overtime_workday_first", amount: 0, hours: 1.25, days: 0, dailyAmount: 0, regularity: "unknown" },
      { id: "premio", type: "performance_award", amount: 250, hours: 0, days: 0, dailyAmount: 0, regularity: "not_regular" },
    ],
    CONTEXTO_EXEMPLO.baseSalary,
    false,
  );
  const calculo = calculateLegacyPayroll(CONTEXTO_EXEMPLO, rubricas);
  const ano = calcularVencimentoAnual({
    salarioBruto: CONTEXTO_EXEMPLO.baseSalary,
    dependentes: CONTEXTO_EXEMPLO.dependants,
    estadoCivil: CONTEXTO_EXEMPLO.maritalStatus,
    irsJovemAno: CONTEXTO_EXEMPLO.youthIrsBenefitYear,
    subsidioRefeicaoDia: CONTEXTO_EXEMPLO.meal.dailyAmount,
    subsidioRefeicaoCartao: CONTEXTO_EXEMPLO.meal.card,
    diasUteis: CONTEXTO_EXEMPLO.meal.days,
  });

  return {
    periodo: "Julho de 2026",
    proveniencia: await criarProveniencia("vencimento", { CONTEXTO_EXEMPLO, rubricas }, new Date("2026-08-01T12:00:00Z")),
    pressupostos: [
      { codigo: "mes", rotulo: "Mês", valor: "Julho de 2026" },
      { codigo: "situacao_familiar", rotulo: "Situação familiar", valor: "Casado · 1 titular" },
      { codigo: "regiao_fiscal", rotulo: "Região fiscal", valor: "Continente" },
      { codigo: "horas_por_semana", rotulo: "Horas por semana", valor: "40 h" },
      { codigo: "dependentes", rotulo: "Dependentes", valor: "1" },
      { codigo: "subsidio_refeicao", rotulo: "Subsídio de refeição", valor: "10,20 €/dia em cartão, 21 dias" },
      { codigo: "irs_jovem", rotulo: "IRS Jovem", valor: "3.º ano" },
    ],
    linhas: calculo.lines,
    mes: calculo.result,
    ano,
    custoEmpresa: employerCost(calculo.result),
    prestacoes: prestacoesDoAno({ base: calculo.input }),
    baseLegal: [
      { norma: "Despacho n.º 233-A/2026", determina: "Tabelas de retenção na fonte aplicadas à remuneração do mês e a cada subsídio", verificadoEm: DATA_LAST_REVIEW },
      { norma: "Código Contributivo, arts. 44.º-48.º", determina: "Base de incidência da Segurança Social e taxas do trabalhador e da entidade", verificadoEm: DATA_LAST_REVIEW },
      { norma: "Art. 2.º, n.º 3 CIRS", determina: "Limite diário isento do subsídio de refeição em cartão", verificadoEm: DATA_LAST_REVIEW },
      { norma: "Art. 99.º-C CIRS", determina: "Retenção autónoma dos subsídios e do trabalho suplementar", verificadoEm: DATA_LAST_REVIEW },
      { norma: "CT arts. 262.º e 271.º", determina: "Retribuição horária que valoriza o trabalho suplementar", verificadoEm: DATA_LAST_REVIEW },
    ],
    ambito: [
      "Não substitui o recibo emitido pela entidade empregadora.",
      "Mostra a retenção na fonte do mês, não o IRS apurado no ano.",
      "Não modela benefícios em espécie nem instrumentos de regulamentação coletiva mais favoráveis.",
      "O custo da empresa não inclui seguro de acidentes de trabalho, formação nem custos indiretos.",
    ],
    memoria: [
      { rubrica: "Retribuição horária", formula: "(retribuição mensal × 12) ÷ (52 × 40 horas)", valor: calculo.result.retribuicaoHoraria, fonte: "CT art. 271.º" },
      { rubrica: "Base da Segurança Social", formula: "soma das rubricas contributivas do mês", valor: calculo.result.baseSS, fonte: "CRC arts. 44.º-48.º" },
      { rubrica: "Segurança Social do trabalhador", formula: `base × ${pctDoc(SS_DEPENDENTE.trabalhador.value)}`, valor: calculo.result.ssTrabalhador, fonte: "CRC art. 53.º" },
      { rubrica: "Retenção da remuneração mensal", formula: "R × taxa marginal − parcela a abater − parcela por dependente", valor: calculo.result.irsBaseMensal, fonte: "Despacho 233-A/2026" },
      { rubrica: "Retenção do trabalho suplementar", formula: "suplementar × 50% da taxa efetiva do mês", valor: calculo.result.suplementarIRS, fonte: "Despacho 233-A/2026, n.º 5 al. f)" },
      { rubrica: "Líquido do mês", formula: "bruto/caixa − Segurança Social − IRS", valor: calculo.result.liquido, fonte: "—" },
    ],
  };
}
