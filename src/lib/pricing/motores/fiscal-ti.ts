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
//  ② No regime SIMPLIFICADO, os custos NÃO reduzem o IRS.
//    O rendimento tributável é faturação × coeficiente (Art. 31.º CIRS). O
//    coeficiente já PRESUME as despesas. Quem negoceia melhor com o
//    fornecedor não paga menos imposto — fica só com mais margem.
//    Isto inverte a intuição de quem aprendeu precificação em conteúdo
//    brasileiro, onde as despesas abatem.
//
//    ⚠️ E é FALSO na contabilidade ORGANIZADA, onde o rendimento tributável
//    é receita − despesas e os custos abatem mesmo. A frase é condicional,
//    e o campo que a condiciona é `vendedor.regimeContabilidade`. Enquanto
//    ele não existiu, esta afirmação era feita a toda a gente — o único
//    sítio onde a ferramenta podia estar factualmente errada.
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
//  `contribuicoesSS()` e `simularDeclaracaoIRS()` de `fiscal.ts`.
// ═══════════════════════════════════════════════════════════════════════

import { contribuicoesSS, simularDeclaracaoIRS, retencaoNaFonte } from "../../fiscal";
import {
  ATIVIDADES,
  BASE_SS_POR_TIPO,
  DISPENSA_RETENCAO_LIMITE,
  RETENCAO,
  SS_COEFICIENTE,
  SS_TAXA,
  efeitoFiscal,
} from "../../fiscal-data";
import type { Atividade } from "../../fiscal-data";
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

/**
 * A atividade concreta do catálogo, quando o perfil a tem. É por aqui que
 * `efeitoFiscal()` entra — e com ele os overrides por atividade que os mapas
 * por tipo não conhecem.
 */
export function atividadeDoPerfil(vendedor: PerfilVendedor): Atividade | null {
  if (!vendedor.atividadeLabel) return null;
  return ATIVIDADES.find((a) => a.label === vendedor.atividadeLabel) ?? null;
}

/** Regras fiscais efetivas: da atividade concreta, ou dos mapas por tipo. */
function regrasDe(vendedor: PerfilVendedor) {
  const atv = atividadeDoPerfil(vendedor);
  const tipo = atv?.tipo ?? vendedor.atividade ?? "art151";
  const ef = atv ? efeitoFiscal(atv) : null;
  return {
    atv,
    tipo,
    baseSS: ef?.baseSS ?? BASE_SS_POR_TIPO[tipo],
    retencao: ef?.retencao ?? RETENCAO[tipo].value,
    coef: ef?.coef,
    regra15: ef?.regra15,
  };
}

export interface EntradaFiscalVendedor {
  vendedor: PerfilVendedor;
  cliente: TipoCliente;
  /** Preço líquido unitário, para converter frações em euros. */
  precoLiquido: number;
  /**
   * As MESMAS despesas anuais que o solver usou. Tem de ser o mesmo número:
   * se o detalhe mostrado ao utilizador fosse calculado com outras despesas,
   * a taxa de IRS no ecrã não seria a que formou o preço.
   */
  despesasAnuais?: number;
  /**
   * Custo dedutível por unidade, para converter a taxa marginal de IRS em
   * euros quando ela incide sobre o LUCRO (contabilidade organizada). No
   * regime simplificado é ignorado: lá o imposto incide sobre a faturação.
   */
  custoDedutivelPorUnidade?: number;
}

const VAZIO: DetalheFiscalVendedor = {
  aplicavel: false,
  ssFracao: 0,
  ssPorUnidade: 0,
  irsFracao: 0,
  irsBase: "faturacao",
  irsPorUnidade: 0,
  retencaoFracao: 0,
  retencaoPorUnidade: 0,
  liquidoPessoalPorUnidade: 0,
  notas: [],
};

export interface OpcoesFracoesFiscais {
  /**
   * Despesas anuais documentadas do próprio negócio, derivadas do modelo de
   * custos. Só têm efeito no regime de contabilidade ORGANIZADA — no
   * simplificado o coeficiente do Art. 31.º já as presume, e somá-las
   * outra vez seria deduzi-las duas vezes.
   */
  despesasAnuais?: number;
}

/**
 * Frações fiscais marginais do vendedor: quanto de cada euro faturado sai
 * em Segurança Social e em IRS. Independente do preço — por isso pode ser
 * calculada ANTES de resolver a equação do preço, que é precisamente o que
 * `preco.ts` precisa.
 */
export function fracoesFiscais(
  vendedor: PerfilVendedor,
  opcoes: OpcoesFracoesFiscais = {},
): {
  ssFracao: number;
  /** IRS que incide sobre a FATURAÇÃO (regime simplificado). */
  irsFracao: number;
  /**
   * IRS que incide sobre o LUCRO (contabilidade organizada). Exatamente um
   * destes dois é diferente de zero — nunca ambos, porque são o mesmo
   * imposto medido em bases diferentes. Somá-los contaria o IRS duas vezes.
   */
  irsSobreLucro: number;
  notas: string[];
} {
  const notas: string[] = [];

  if (vendedor.tipo !== "ti") {
    if (vendedor.tipo === "empresa") {
      notas.push(
        "Numa sociedade, o IRC incide sobre o lucro — não sobre a faturação. Por isso não entra no preço unitário: entra depois, na conversão do lucro operacional em lucro líquido.",
      );
    }
    return { ssFracao: 0, irsFracao: 0, irsSobreLucro: 0, notas };
  }

  const regras = regrasDe(vendedor);
  const atividade = regras.tipo;
  const baseSS = regras.baseSS;
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

  // ── IRS marginal: derivada discreta da DECLARAÇÃO ───────────────────
  //
  //  Porquê `simularDeclaracaoIRS` e não o núcleo `simularIRSAnual`:
  //  o IRS é progressivo sobre o ENGLOBAMENTO. Quem tem salário e passa
  //  recibos verdes ao lado — provavelmente o perfil mais comum — enfrenta
  //  uma taxa marginal muito mais alta, porque a categoria B empilha em
  //  cima da categoria A. Calcular como se a categoria B fosse o único
  //  rendimento subestimava o imposto de toda essa gente.
  //
  //  O salário entra como `salarios`, para o motor lhe aplicar a dedução
  //  específica do Art. 25.º. NUNCA como `outrosRendimentos` — esse campo
  //  espera um valor já líquido, e alimentá-lo com um bruto é o erro que
  //  já custou entre 940 € e 2 050 € de IRS a mais em três ecrãs.
  const regimeContabilidade = vendedor.regimeContabilidade ?? "simplificado";
  const organizada = regimeContabilidade === "organizada";
  const despesasJustificadas = organizada ? naoNegativo(opcoes.despesasAnuais) : 0;
  const salarioBruto = naoNegativo(vendedor.salarioBrutoAnual);

  let irsFracao = 0;
  if (faturacaoBase > 0) {
    const irsCom = (bruto: number) =>
      simularDeclaracaoIRS({
        salarios: salarioBruto > 0 ? { bruto: salarioBruto } : undefined,
        independente: {
          brutoAnual: bruto,
          tipo: atividade,
          // Os overrides da atividade concreta, quando existem: há
          // atividades com coeficiente e regra dos 15% próprios.
          coefOverride: regras.coef,
          aplicaRegra15Override: regras.regra15,
          anoAtividade: vendedor.anoAtividade ?? 3,
          regimeContabilidade,
          despesasJustificadas,
        },
      }).irsTotal;

    irsFracao = fracao(
      dividir(irsCom(faturacaoBase + DELTA_MARGINAL) - irsCom(faturacaoBase), DELTA_MARGINAL),
      0,
      0.6,
    );

    notas.push(
      organizada
        ? "Estás em contabilidade organizada: o IRS incide sobre a receita MENOS as despesas documentadas. Ao contrário do regime simplificado, aqui reduzir custos reduz mesmo o imposto — mas obriga a ter tudo documentado."
        : "No regime simplificado o IRS incide sobre um coeficiente da faturação — as tuas despesas reais não o reduzem. É por isso que uma compra mais barata te dá margem, mas não te dá menos imposto.",
    );

    if (salarioBruto > 0) {
      notas.push(
        `Como já tens ${Math.round(salarioBruto).toLocaleString("pt-PT")} € de salário, cada euro que faturas entra POR CIMA dele no englobamento — e por isso leva uma taxa mais alta do que levaria se os recibos verdes fossem o teu único rendimento.`,
      );
    }
  } else {
    notas.push(
      "Sem faturação anual prevista não dá para estimar o IRS marginal: o mesmo euro custa 13% a quem fatura 12 000 € e 43,5% a quem fatura 60 000 €. Preenche a faturação anual para veres o número real.",
    );
  }

  // A MESMA taxa marginal, encaminhada para a base em que o imposto
  // realmente incide. No simplificado o tributável é faturação × coeficiente
  // (Art. 31.º) — logo é fração da faturação. Na organizada é
  // receita − despesas (Art. 28.º) — logo é fração do lucro, e o solver
  // aplica-lhe o escudo fiscal dos custos.
  return {
    ssFracao,
    irsFracao: organizada ? 0 : irsFracao,
    irsSobreLucro: organizada ? irsFracao : 0,
    notas,
  };
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

  // A taxa da atividade concreta, quando a há — várias têm taxa própria que
  // `RETENCAO[tipo]` não conhece.
  const taxa = regrasDe(vendedor).retencao;

  // `retencaoNaFonte` conhece a dispensa do Art. 101.º-B e o IRS Jovem —
  // e durante algum tempo foi chamada sem lhe passar nenhum dos dois, o que
  // dava retenção a quem estava dispensado e a base cheia a quem tem
  // isenção de IRS Jovem. Chamamo-la com 100 € para extrair a taxa efetiva
  // sem duplicar regras.
  const sobre100 = retencaoNaFonte(100, taxa, {
    dispensa: vendedor.dispensaRetencao,
    irsJovemAno: vendedor.irsJovemAno,
  });
  return fracao(dividir(sobre100, 100), 0, 0.5);
}

export function fiscalidadeVendedor(entrada: EntradaFiscalVendedor): DetalheFiscalVendedor {
  const { vendedor, cliente, precoLiquido, despesasAnuais } = entrada;

  if (vendedor.tipo !== "ti") {
    const { notas } = fracoesFiscais(vendedor, { despesasAnuais });
    return { ...VAZIO, notas };
  }

  const { ssFracao, irsFracao, irsSobreLucro, notas } = fracoesFiscais(vendedor, {
    despesasAnuais,
  });
  const retFracao = fracaoRetencao(vendedor, cliente);
  const p = naoNegativo(precoLiquido);

  const ssPorUnidade = p * ssFracao;

  // Em contabilidade organizada o IRS incide sobre o LUCRO, e por isso os
  // euros por unidade medem-se sobre o que sobra depois do custo dedutível —
  // não sobre o preço inteiro. A `irsFracao` mostrada continua a ser a taxa
  // marginal verdadeira; o que muda é a base sobre a qual se aplica, e é por
  // isso que `irsBase` existe: sem ela, a interface mostraria «24% de IRS»
  // ao lado de um valor em euros que não é 24% do preço.
  const organizada = irsSobreLucro > 0;
  const lucroTributavel = Math.max(0, p - naoNegativo(entrada.custoDedutivelPorUnidade));
  const irsPorUnidade = organizada ? lucroTributavel * irsSobreLucro : p * irsFracao;
  const retencaoPorUnidade = p * retFracao;

  if (retFracao > 0) {
    notas.push(
      `O teu cliente empresa retém ${(retFracao * 100).toFixed(1).replace(".", ",")}% na fonte. Isso não é um custo — é IRS adiantado. Afeta a tua tesouraria, não a tua margem.`,
    );
    // A dispensa existe e quase ninguém a conhece. Só se sugere a quem a
    // pode mesmo pedir: o limiar é sobre a faturação PREVISTA do ano.
    const faturacao = naoNegativo(vendedor.faturacaoAnualPrevista);
    if (!vendedor.dispensaRetencao && faturacao > 0 && faturacao < DISPENSA_RETENCAO_LIMITE.value) {
      notas.push(
        `Com menos de ${DISPENSA_RETENCAO_LIMITE.value.toLocaleString("pt-PT")} € de faturação anual prevista podes DISPENSAR a retenção (Art. 101.º-B, n.º 1, al. a) CIRS): escreves a menção na fatura-recibo e recebes o valor inteiro, acertando tudo no IRS. Não muda o imposto — muda quando o pagas.`,
      );
    }
  } else if (vendedor.dispensaRetencao && cliente === "empresa_pt") {
    notas.push(
      "Dispensaste a retenção na fonte: recebes o valor inteiro de cada fatura. O IRS não desaparece — vem todo de uma vez no acerto anual, e convém ter isso reservado.",
    );
  }

  return {
    aplicavel: true,
    ssFracao,
    ssPorUnidade,
    irsFracao: organizada ? irsSobreLucro : irsFracao,
    irsBase: organizada ? "lucro" : "faturacao",
    irsPorUnidade,
    retencaoFracao: retFracao,
    retencaoPorUnidade,
    liquidoPessoalPorUnidade: p - ssPorUnidade - irsPorUnidade,
    notas,
  };
}
