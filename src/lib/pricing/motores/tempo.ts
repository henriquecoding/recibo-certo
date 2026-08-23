// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE HORAS PRODUTIVAS
//  ---------------------------------------------------------------------
//  O erro mais caro do trabalho independente cabe numa linha:
//
//      valor/hora = salário desejado / 160
//
//  Está errado por três razões que se acumulam:
//
//   1. Ninguém fatura todas as horas que trabalha. Propostas que não
//      fecham, prospeção, administração, deslocações, formação, pós-venda
//      — tudo isso é tempo pago pelo próprio.
//   2. Ninguém trabalha 12 meses. Férias e feriados existem, e quem não
//      tem salário não os recebe: tem de os ter incluído no preço.
//   3. O «salário desejado» é líquido; o que se fatura é bruto. Entre um e
//      outro estão a Segurança Social e o IRS.
//
//  Aplicados os três, o valor/hora real costuma ser 2 a 3 vezes o número
//  ingénuo. É por isso que tanta gente trabalha muito e ganha pouco: não é
//  falta de clientes, é uma divisão mal feita no início.
// ═══════════════════════════════════════════════════════════════════════

import {
  FERIADOS_SEMANAS_EQUIVALENTES,
  SEMANAS_ANO,
  SEMANAS_FERIAS_PADRAO,
  TAXA_FATURAVEL_PADRAO,
} from "../regras";
import type { ModeloTempo } from "../tipos";
import { dividir, fracao, naoNegativo, num } from "../numeros";

export interface ResultadoTempo {
  /** Horas de trabalho por ano, antes de descontar o não faturável. */
  horasTrabalhadasAno: number;
  /** Horas efetivamente faturáveis por ano. */
  horasProdutivasAno: number;
  horasProdutivasMes: number;
  /** Semanas realmente trabalhadas. */
  semanasTrabalhadas: number;
  /** Horas por unidade/projeto. */
  horasPorUnidade: number;
  /**
   * Valor/hora do TEMPO, líquido e SEM estrutura: só o rendimento
   * pretendido a dividir pelas horas faturáveis.
   *
   * ⚠️ As contas fixas NÃO estão aqui de propósito. Quem as reparte é o
   * orquestrador, por unidade e ao volume esperado (`fixosPorUnidade`), e
   * também as somar ao valor/hora contava-as duas vezes: 600 €/mês de
   * contabilidade apareciam como 55,81 € dentro do custo do tempo E como
   * 60 € de custos fixos por unidade, inflando a base de custo em 23%.
   */
  valorHoraLiquido: number;
  /**
   * Valor/hora com a quota das contas fixas por dentro. É o que responde à
   * pergunta isolada «quanto vale a minha hora se ela tiver de pagar tudo»
   * — e é a base de `valorHoraFaturado`. Não entra no solver.
   */
  valorHoraLiquidoComEstrutura: number;
  /**
   * Valor/hora a FATURAR: estrutura por dentro e impostos sobre a faturação
   * repostos. É o número que vai para a proposta — e um RESULTADO para
   * mostrar, nunca uma entrada da equação.
   */
  valorHoraFaturado: number;
  /** Custo de tempo imputado a uma unidade. */
  custoTempoPorUnidade: number;
  notas: string[];
}

export function calcularTempo(input: {
  tempo?: ModeloTempo;
  /**
   * Custos fixos anuais. Entram apenas no valor/hora COM estrutura, que é
   * um número para mostrar — nunca no custo que alimenta o solver, onde as
   * contas fixas já entram repartidas por unidade.
   */
  custosFixosAnuais: number;
  /** Fração da faturação que sai em SS + IRS (de `fiscal-ti.ts`). */
  fracaoFiscal: number;
}): ResultadoTempo | null {
  const t = input.tempo;
  if (!t) return null;

  const notas: string[] = [];

  const horasSemana = naoNegativo(t.horasSemana, 40);
  const semanasFerias = naoNegativo(t.semanasFerias ?? SEMANAS_FERIAS_PADRAO.value);
  const semanasSemCliente = naoNegativo(t.semanasSemCliente);
  const taxaFaturavel = fracao(
    t.taxaFaturavel ?? TAXA_FATURAVEL_PADRAO.value,
    0.05,
    1,
  );

  const semanasTrabalhadas = Math.max(
    1,
    SEMANAS_ANO.value - semanasFerias - FERIADOS_SEMANAS_EQUIVALENTES.value - semanasSemCliente,
  );

  const horasTrabalhadasAno = semanasTrabalhadas * horasSemana;
  const horasProdutivasAno = horasTrabalhadasAno * taxaFaturavel;
  const horasProdutivasMes = dividir(horasProdutivasAno, 12);

  if (taxaFaturavel >= 0.9) {
    notas.push(
      "Estás a assumir que quase todas as horas são faturáveis. Na prática, propostas, administração e deslocações costumam levar 30 a 45% do tempo — vale a pena testar com um número mais conservador.",
    );
  }

  const rendimento = naoNegativo(t.rendimentoAnualPretendido);
  const fixos = naoNegativo(input.custosFixosAnuais);
  const fracaoFiscal = fracao(input.fracaoFiscal, 0, 0.9);

  // O custo do TEMPO é só o rendimento pretendido. As contas fixas são
  // repartidas pelo orquestrador, por unidade — somá-las aqui também seria
  // cobrá-las duas vezes ao mesmo cliente.
  const valorHoraLiquido = horasProdutivasAno > 0 ? dividir(rendimento, horasProdutivasAno) : 0;

  const valorHoraLiquidoComEstrutura =
    horasProdutivasAno > 0 ? dividir(rendimento + fixos, horasProdutivasAno) : 0;

  const valorHoraFaturado =
    fracaoFiscal < 1
      ? dividir(valorHoraLiquidoComEstrutura, 1 - fracaoFiscal, valorHoraLiquidoComEstrutura)
      : valorHoraLiquidoComEstrutura;

  if (rendimento > 0 && horasProdutivasAno > 0) {
    const ingenuo = dividir(rendimento, 12 * horasSemana * 4.33);
    if (ingenuo > 0 && valorHoraFaturado > ingenuo * 1.3) {
      notas.push(
        `A conta rápida — rendimento a dividir pelas horas do mês — daria ${ingenuo
          .toFixed(2)
          .replace(".", ",")} €/hora. Com férias, feriados, horas não faturáveis, contas fixas e impostos, o número real é ${valorHoraFaturado
          .toFixed(2)
          .replace(".", ",")} €/hora.`,
      );
    }
  }

  const horasPorUnidade = naoNegativo(t.horasPorUnidade);

  return {
    horasTrabalhadasAno,
    horasProdutivasAno,
    horasProdutivasMes,
    semanasTrabalhadas,
    horasPorUnidade,
    valorHoraLiquido,
    valorHoraLiquidoComEstrutura,
    valorHoraFaturado,
    // ⚠️ CUSTO É O VALOR LÍQUIDO, NÃO O FATURADO.
    //
    // A reposição dos impostos acontece UMA VEZ, e acontece no solver: a
    // Segurança Social e o IRS entram lá como fração da faturação, ao lado
    // das comissões. Se o custo do tempo já viesse bruteado, o mesmo
    // imposto era aplicado duas vezes e o preço saía inflacionado — a um
    // TI com 15% de SS e 30% de margem, cerca de 57% acima do devido.
    //
    // `valorHoraFaturado` continua a existir porque é a resposta à
    // pergunta «quanto tenho de cobrar por hora» — mas é um RESULTADO para
    // mostrar, não uma entrada para a equação.
    custoTempoPorUnidade: horasPorUnidade * valorHoraLiquido,
    notas,
  };
}

/**
 * Quantas unidades/projetos cabem por mês, dadas as horas produtivas.
 * Serve para o simulador não sugerir um volume fisicamente impossível —
 * o erro clássico de «vende 200 sessões por mês» a quem tem 90 horas.
 */
export function capacidadeMensal(tempo: ResultadoTempo | null): number | null {
  if (!tempo || tempo.horasPorUnidade <= 0) return null;
  return Math.floor(dividir(tempo.horasProdutivasMes, tempo.horasPorUnidade));
}

/** Valor/hora implícito num preço e num tempo. Para o caminho inverso. */
export const valorHoraImplicito = (precoLiquido: number, horas: number): number =>
  horas > 0 ? dividir(num(precoLiquido), horas) : 0;
