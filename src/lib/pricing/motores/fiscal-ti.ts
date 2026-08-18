// ═══════════════════════════════════════════════════════════════════════
//  MOTOR FISCAL DO VENDEDOR — a parte que só faz sentido em Portugal
//  ---------------------------------------------------------------------
//  Este é o motor que distingue esta ferramenta de qualquer calculadora de
//  preço traduzida do inglês ou copiada do Brasil.
//
//  DUAS AFIRMAÇÕES QUE PARECEM ERRADAS E ESTÃO CERTAS:
//
//  ① A Segurança Social de um trabalhador independente é um CUSTO VARIÁVEL
//    SOBRE A FATURAÇÃO, não um imposto sobre o lucro.
//    A base de incidência é o rendimento relevante — 70% dos serviços ou
//    20% da venda de bens — e não o lucro. À taxa de 21,4%, cada euro de
//    serviços prestados leva ≈ 14,98 cêntimos de Segurança Social, ganhe-se
//    ou perca-se dinheiro nessa venda.
//    Consequência de produto: comprar melhor NÃO reduz a Segurança Social.
//
//  ② No regime simplificado, os custos NÃO reduzem o IRS.
//    O rendimento tributável é faturação × coeficiente (Art. 31.º CIRS). O
//    coeficiente já PRESUME as despesas. Quem negoceia melhor com o
//    fornecedor não paga menos imposto — fica só com mais margem.
//    Isto inverte a intuição de quem aprendeu precificação em conteúdo
//    brasileiro, onde as despesas abatem.
//
//  Daqui sai uma fração `v` que entra na equação do preço em `preco.ts` ao
//  lado das comissões — porque é da mesma natureza: uma percentagem que
//  sai de cada euro faturado.
//
//  ③ A RETENÇÃO NA FONTE NÃO É CUSTO. É adiantamento de IRS. Aparece à
//    parte, na linha da tesouraria, e nunca reduz a margem. Confundi-los
//    faz o vendedor achar que precisa de cobrar mais 23% — e perder
//    negócio por causa de um erro de contabilidade mental.
//
//  Nada de IRS ou de Segurança Social é reimplementado aqui: chama-se
//  `contribuicoesSS()` e `simularIRSAnual()` de `fiscal.ts`.
// ═══════════════════════════════════════════════════════════════════════

import { contribuicoesSS, simularIRSAnual, retencaoNaFonte } from "../../fiscal";
import { BASE_SS_POR_TIPO, RETENCAO, SS_COEFICIENTE, SS_TAXA } from "../../fiscal-data";
import type { DetalheFiscalVendedor, PerfilVendedor, TipoCliente } from "../tipos";
import { dividir, fracao, naoNegativo } from "../numeros";

/**
 * Intervalo usado para a derivada discreta do IRS.
 *
 * Porquê 1 000 € e não 1 €: o IRS tem degraus (escalões, mínimo de
 * existência, regra dos 15%). Um delta de 1 € pode cair inteiramente dentro
 * de um degrau e devolver 0% ou 48% consoante o cêntimo — números
 * verdadeiros e inúteis. Mil euros é a ordem de grandeza de uma decisão de
 * preço real e produz uma taxa marginal estável.
 */
const DELTA_MARGINAL = 1000;

export interface EntradaFiscalVendedor {
  vendedor: PerfilVendedor;
  cliente: TipoCliente;
  /** Preço líquido unitário, para converter frações em euros. */
  precoLiquido: number;
}

const VAZIO: DetalheFiscalVendedor = {
  aplicavel: false,
  ssFracao: 0,
  ssPorUnidade: 0,
  irsFracao: 0,
  irsPorUnidade: 0,
  retencaoFracao: 0,
  retencaoPorUnidade: 0,
  liquidoPessoalPorUnidade: 0,
  notas: [],
};

/**
 * Frações fiscais marginais do vendedor: quanto de cada euro faturado sai
 * em Segurança Social e em IRS. Independente do preço — por isso pode ser
 * calculada ANTES de resolver a equação do preço, que é precisamente o que
 * `preco.ts` precisa.
 */
export function fracoesFiscais(vendedor: PerfilVendedor): {
  ssFracao: number;
  irsFracao: number;
  notas: string[];
} {
  const notas: string[] = [];

  if (vendedor.tipo !== "ti") {
    if (vendedor.tipo === "empresa") {
      notas.push(
        "Numa sociedade, o IRC incide sobre o lucro — não sobre a faturação. Por isso não entra no preço unitário: entra depois, na conversão do lucro operacional em lucro líquido.",
      );
    }
    return { ssFracao: 0, irsFracao: 0, notas };
  }

  const atividade = vendedor.atividade ?? "art151";
  const baseSS = BASE_SS_POR_TIPO[atividade];
  const faturacaoBase = naoNegativo(vendedor.faturacaoAnualPrevista);

  // ── Segurança Social: derivada discreta, para respeitar o teto ──────
  const isencoes = {
    primeiroAno: !!vendedor.isencaoSSPrimeiroAno,
    acumulaEmprego: !!vendedor.acumulaEmprego,
  };

  // A derivada discreta é o método certo — exceto num ponto: em zero.
  // Aí, `contribuicoesSS(0)` é zero por construção e `contribuicoesSS(1000)`
  // já paga a contribuição MÍNIMA de 20 €/mês, o que dá uma «taxa marginal»
  // de 24% que não é taxa nenhuma: é um degrau fixo dividido por um delta
  // pequeno. Sem faturação declarada, a resposta honesta é a taxa da banda
  // normal — coeficiente × taxa contributiva.
  const ssFracao = (() => {
    if (isencoes.primeiroAno) return 0;
    if (isencoes.acumulaEmprego && faturacaoBase <= 0) return 0;
    if (faturacaoBase <= 0) return SS_COEFICIENTE[baseSS].value * SS_TAXA.value;
    const ss0 = contribuicoesSS(faturacaoBase, baseSS, isencoes).contribuicaoAnual;
    const ss1 = contribuicoesSS(faturacaoBase + DELTA_MARGINAL, baseSS, isencoes).contribuicaoAnual;
    return fracao(dividir(ss1 - ss0, DELTA_MARGINAL), 0, 0.5);
  })();

  if (vendedor.isencaoSSPrimeiroAno) {
    notas.push(
      "Estás no primeiro ano de atividade: a isenção do Art. 157.º do Código Contributivo dispensa-te da Segurança Social. Isto acaba — e o teu preço tem de aguentar o ano seguinte, não só este.",
    );
  } else if (ssFracao === 0 && faturacaoBase > 0) {
    notas.push(
      "Não estás a pagar Segurança Social marginal — ou por dispensa, ou por já teres atingido o teto de 12 × IAS.",
    );
  } else if (ssFracao > 0) {
    notas.push(
      baseSS === "servicos"
        ? "A Segurança Social incide sobre 70% do que faturas em serviços, não sobre o teu lucro. Reduzir custos não a reduz."
        : "Na venda de bens a Segurança Social incide sobre 20% do que faturas — bastante menos do que nos serviços.",
    );
  }

  // ── IRS marginal: derivada discreta de `simularIRSAnual` ────────────
  let irsFracao = 0;
  if (faturacaoBase > 0) {
    const base = simularIRSAnual({
      brutoAnual: faturacaoBase,
      tipo: atividade,
      anoAtividade: vendedor.anoAtividade ?? 3,
    });
    const mais = simularIRSAnual({
      brutoAnual: faturacaoBase + DELTA_MARGINAL,
      tipo: atividade,
      anoAtividade: vendedor.anoAtividade ?? 3,
    });
    irsFracao = fracao(dividir(mais.irsEstimado - base.irsEstimado, DELTA_MARGINAL), 0, 0.6);

    notas.push(
      "No regime simplificado o IRS incide sobre um coeficiente da faturação — as tuas despesas reais não o reduzem. É por isso que uma compra mais barata te dá margem, mas não te dá menos imposto.",
    );
  } else {
    notas.push(
      "Sem faturação anual prevista não dá para estimar o IRS marginal: o mesmo euro custa 13% a quem fatura 12 000 € e 43,5% a quem fatura 60 000 €. Preenche a faturação anual para veres o número real.",
    );
  }

  return { ssFracao, irsFracao, notas };
}

/**
 * Retenção na fonte aplicável à venda.
 *
 * Só há retenção quando o ADQUIRENTE tem contabilidade organizada em
 * Portugal — ou seja, quando se vende a uma empresa portuguesa. Vender ao
 * consumidor final não gera retenção nenhuma, e é uma confusão comum.
 */
export function fracaoRetencao(vendedor: PerfilVendedor, cliente: TipoCliente): number {
  if (vendedor.tipo !== "ti") return 0;
  if (cliente !== "empresa_pt") return 0;

  const atividade = vendedor.atividade ?? "art151";
  const taxa = RETENCAO[atividade].value;

  // `retencaoNaFonte` conhece a dispensa do Art. 101.º-B e o IRS Jovem.
  // Chamamo-la com 100 € para extrair a taxa efetiva sem duplicar regras.
  const sobre100 = retencaoNaFonte(100, taxa);
  return fracao(dividir(sobre100, 100), 0, 0.5);
}

export function fiscalidadeVendedor(entrada: EntradaFiscalVendedor): DetalheFiscalVendedor {
  const { vendedor, cliente, precoLiquido } = entrada;

  if (vendedor.tipo !== "ti") {
    const { notas } = fracoesFiscais(vendedor);
    return { ...VAZIO, notas };
  }

  const { ssFracao, irsFracao, notas } = fracoesFiscais(vendedor);
  const retFracao = fracaoRetencao(vendedor, cliente);
  const p = naoNegativo(precoLiquido);

  const ssPorUnidade = p * ssFracao;
  const irsPorUnidade = p * irsFracao;
  const retencaoPorUnidade = p * retFracao;

  if (retFracao > 0) {
    notas.push(
      `O teu cliente empresa retém ${(retFracao * 100).toFixed(1).replace(".", ",")}% na fonte. Isso não é um custo — é IRS adiantado. Afeta a tua tesouraria, não a tua margem.`,
    );
  }

  return {
    aplicavel: true,
    ssFracao,
    ssPorUnidade,
    irsFracao,
    irsPorUnidade,
    retencaoFracao: retFracao,
    retencaoPorUnidade,
    liquidoPessoalPorUnidade: p - ssPorUnidade - irsPorUnidade,
    notas,
  };
}
