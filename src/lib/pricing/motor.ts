// ═══════════════════════════════════════════════════════════════════════
//  O ORQUESTRADOR — `precificar(contexto) → resultado`
//  ---------------------------------------------------------------------
//  Uma função pura, síncrona e determinística. Sem rede, sem servidor, sem
//  estado. Corre no browser em microssegundos, o que é o que permite ao
//  slider de preço atualizar tudo em tempo real e mantém a promessa
//  `privacy: "local-only"` do catálogo de ferramentas.
//
//  A ORDEM IMPORTA e é esta, por dependência real:
//
//    IVA → custos → comissões → fiscalidade → SOLVER → margem →
//    break-even → faixa → desconto → veredicto → avisos → explicação
//
//  Repare-se em particular que a fiscalidade vem ANTES do solver. Tem de
//  vir: a Segurança Social e o IRS de um trabalhador independente são
//  frações da FATURAÇÃO, portanto entram na equação do preço ao lado das
//  comissões, e não depois como se fossem imposto sobre o lucro.
// ═══════════════════════════════════════════════════════════════════════

import type {
  Aviso,
  ContextoPreco,
  DetalheCaixa,
  DetalheCustoUnitario,
  DiagnosticoPreco,
  FracaoDoPreco,
  LinhaExplicacao,
  ResultadoPreco,
  VeredictoPreco,
} from "./tipos";
import { cent, dividir, fracao, naoNegativo, num } from "./numeros";
import { calcularCustos } from "./motores/custos";
import { calcularComissoes } from "./motores/comissoes";
import { ivaAEntregar, liquidoDe, pvpDe, situacaoIVAPreco } from "./motores/iva";
import { fiscalidadeVendedor, fracoesFiscais } from "./motores/fiscal-ti";
import {
  custosVariaveisAoPreco,
  fracaoDisponivel,
  lucroAoPreco,
  precoPorLucroUnidade,
  precoPorMargem,
  precoPorMarkup,
  type EntradaSolver,
  type SaidaSolver,
} from "./motores/preco";
import { calcularMargem, margemDeMarkup, markupDeMargem } from "./motores/margem";
import { calcularBreakEven } from "./motores/breakeven";
import { calcularFaixa } from "./motores/recomendacao";
import { calcularDesconto } from "./motores/desconto";
import { calcularTempo } from "./motores/tempo";
import { construirExplicacao } from "./motores/explicacao";
import { reunirAvisos } from "./motores/avisos";
import { converterParaSocio } from "./motores/sociedade";
import { calcularTesouraria } from "./motores/tesouraria";

/** Folga por omissão da âncora «margem confortável», em pontos de margem. */
export const FOLGA_CONFORTAVEL_PADRAO = 0.1;

export function precificar(contexto: ContextoPreco): ResultadoPreco {
  const q = Math.max(0, num(contexto.volume?.unidadesMes));

  // ── 1. IVA ─────────────────────────────────────────────────────────
  // O regime não é a resposta do `select`: é o que `situacaoIVA()` deriva da
  // faturação DECLARADA. Só a faturação declarada entra aqui — a projeção do
  // cenário (preço × unidades × 12) não corrige regime nenhum, porque é uma
  // estimativa nossa. Ela vive em `avisos.ts`, onde já há um preço resolvido
  // e onde o seu lugar é avisar, não mudar o número.
  const iva = situacaoIVAPreco({
    regime: contexto.vendedor.regimeIVA,
    regiao: contexto.vendedor.regiao,
    escalaoVenda: contexto.produto.escalaoVenda,
    faturacaoAnual: contexto.vendedor.faturacaoAnualPrevista,
    tipoVendedor: contexto.vendedor.tipo,
    primeiroAno: (contexto.vendedor.anoAtividade ?? 3) === 1,
    atoIsolado: contexto.cenario === "ato_isolado",
  });

  // ── 2. Custos ──────────────────────────────────────────────────────
  const custos = calcularCustos({
    custos: contexto.custos,
    producao: contexto.producao,
    regiao: contexto.vendedor.regiao,
    deduzIVA: iva.deduz,
    unidadesMes: q,
  });

  // ── 3. Comissões ───────────────────────────────────────────────────
  const comissoes = calcularComissoes(contexto.canal);

  // A mensalidade do canal é custo FIXO, não variável. Somá-la aos
  // custos por unidade seria cobrá-la a cada venda; ignorá-la seria
  // fingir que não existe.
  const fixosMensaisTotais = custos.fixosMensais + comissoes.mensalidade;
  const fixosPorUnidade = q > 0 ? dividir(fixosMensaisTotais, q) : 0;

  // ── 4. Fiscalidade do vendedor (entra ANTES do solver) ─────────────
  //
  //  As despesas anuais do próprio negócio, tal como o modelo de custos as
  //  conhece: o que varia com cada venda ao volume esperado, mais os fixos
  //  do ano. Só têm efeito em contabilidade ORGANIZADA — no simplificado o
  //  coeficiente do Art. 31.º já as presume, e `fracoesFiscais` ignora-as.
  //
  //  Não incluem o custo do tempo: o trabalho do próprio não é uma despesa
  //  dedutível de categoria B, é o rendimento que se está a apurar.
  const despesasAnuais = (custos.diretoAjustado + custos.variaveisFixos + custos.devolucoes) * q * 12 + fixosMensaisTotais * 12;

  const { ssFracao, irsFracao, irsSobreLucro } = fracoesFiscais(contexto.vendedor, {
    despesasAnuais,
  });

  // ── 5. Tempo (serviços) ────────────────────────────────────────────
  //  `fracaoFiscal` serve APENAS o `valorHoraFaturado` — o número que
  //  responde a «quanto tenho de cobrar por hora» e que a interface mostra.
  //  O custo que alimenta o solver é o valor/hora LÍQUIDO: os impostos são
  //  repostos uma só vez, lá dentro. Entram aqui os dois IRS possíveis
  //  porque exatamente um deles é diferente de zero, e em qualquer dos
  //  regimes é o IRS que vai comer este rendimento.
  const tempo = calcularTempo({
    tempo: contexto.tempo,
    custosFixosAnuais: fixosMensaisTotais * 12,
    fracaoFiscal: ssFracao + irsFracao + irsSobreLucro,
  });

  //  O custo do tempo SOMA-SE ao custo direto, não o substitui.
  //
  //  Substituí-lo era um defeito com consequência absurda: uma sessão de
  //  fotografia com 5 € de impressões passava de 243,53 € para 10,96 €,
  //  porque declarar um custo apagava as cinco horas de trabalho. Um
  //  serviço com materiais tem as duas coisas, e o cliente paga as duas.
  const custoTempo = tempo ? naoNegativo(tempo.custoTempoPorUnidade) : 0;
  const custoDiretoFinal = custos.diretoAjustado + custoTempo;

  // ...mas o tempo NÃO é despesa dedutível: o trabalho do próprio é o
  // rendimento que se está a apurar, não um custo da atividade. A mesma
  // linha que `despesasAnuais` acima já respeita.
  const custoDiretoDedutivel = custos.diretoAjustado;

  // ── 6. Montar a equação ────────────────────────────────────────────
  const solver: EntradaSolver = {
    custosEuros: custoDiretoFinal + custos.variaveisFixos,
    fixosTransacao: comissoes.fixos,
    fracaoLiquido: comissoes.sobreLiquido + ssFracao + irsFracao,
    fracaoBruto: comissoes.sobreBruto,
    taxaIVA: iva.taxaVenda,
    // Só a contabilidade organizada põe aqui alguma coisa. No simplificado o
    // IRS já vive em `fracaoLiquido`, porque lá incide mesmo sobre a
    // faturação. Os dois nunca são preenchidos ao mesmo tempo.
    fracaoSobreLucro: irsSobreLucro,
    custosDedutiveis: custoDiretoDedutivel + custos.variaveisFixos,
  };

  // Ao resolver para uma margem/markup, os custos fixos por unidade têm de
  // estar dentro da base — senão a «margem de 35%» é margem de contribuição
  // disfarçada, e o negócio dá prejuízo com a margem em dia.
  const solverComFixos: EntradaSolver = {
    ...solver,
    custosEuros: solver.custosEuros + fixosPorUnidade,
    // A renda, o software e a contabilidade são despesa dedutível como
    // qualquer outra — ao contrário do tempo do próprio.
    custosDedutiveis: (solver.custosDedutiveis ?? 0) + fixosPorUnidade,
  };

  // ── 7. Resolver o preço ────────────────────────────────────────────
  const objetivo = contexto.objetivo ?? { modo: "margem", percentagem: 0.3 };
  const folga = fracao(objetivo.folgaConfortavel ?? FOLGA_CONFORTAVEL_PADRAO, 0, 0.5);

  let saida: SaidaSolver;
  let margemAlvo = 0;

  switch (objetivo.modo) {
    case "markup": {
      const k = Math.max(0, num(objetivo.percentagem));
      saida = precoPorMarkup(solverComFixos, k);
      margemAlvo = margemDeMarkup(k);
      break;
    }
    case "lucro_unidade": {
      saida = precoPorLucroUnidade(solverComFixos, naoNegativo(objetivo.valor));
      margemAlvo = saida.ok ? dividir(naoNegativo(objetivo.valor), saida.precoLiquido) : 0;
      break;
    }
    case "lucro_mensal": {
      const alvoUnidade = q > 0 ? dividir(naoNegativo(objetivo.valor), q) : 0;
      saida = precoPorLucroUnidade(solverComFixos, alvoUnidade);
      margemAlvo = saida.ok ? dividir(alvoUnidade, saida.precoLiquido) : 0;
      break;
    }
    case "preco_fixo": {
      const introduzido = naoNegativo(objetivo.valor);
      const liquido = objetivo.valorEhPVP ? liquidoDe(introduzido, iva.taxaVenda) : introduzido;
      saida = {
        ok: liquido > 0,
        precoLiquido: liquido,
        denominador: 1,
        // Do solver, para não haver uma segunda versão da mesma conta: a
        // cópia à mão que aqui estava esquecia τ e dava uma fração
        // disponível otimista a quem está em contabilidade organizada.
        fracaoDisponivel: fracaoDisponivel(solver),
        motivo: liquido > 0 ? undefined : "dados_insuficientes",
      };
      margemAlvo = liquido > 0 ? dividir(lucroAoPreco(solverComFixos, liquido), liquido) : 0;
      break;
    }
    case "margem":
    default: {
      const m = fracao(objetivo.percentagem ?? 0.3, -1, 0.95);
      saida = precoPorMargem(solverComFixos, m);
      margemAlvo = m;
      break;
    }
  }

  const precoLiquido = saida.ok ? saida.precoLiquido : 0;
  const pvp = pvpDe(precoLiquido, iva.taxaVenda);

  // ── 8. Custos avaliados ao preço ───────────────────────────────────
  const variaveisTotais = custosVariaveisAoPreco(solver, precoLiquido);

  const detalheCusto: DetalheCustoUnitario = {
    direto: cent(custoDiretoFinal),
    diretoIntroduzido: cent(custos.diretoIntroduzido),
    variavelFixoPorUnidade: cent(custos.variaveisFixos + comissoes.fixos),
    fracaoSobreLiquido: solver.fracaoLiquido,
    fracaoSobreBruto: solver.fracaoBruto,
    devolucoes: cent(custos.devolucoes),
    fixosPorUnidade: cent(fixosPorUnidade),
    variaveisTotais: cent(variaveisTotais),
    total: cent(variaveisTotais + fixosPorUnidade),
  };

  // ── 9. Margem ──────────────────────────────────────────────────────
  //  O lucro mede-se com o MESMO solver que resolveu o preço. Medi-lo como
  //  «contribuição − fixos» perdia o escudo fiscal dos custos fixos, e uma
  //  margem pedida de 35% aparecia no ecrã como 33,2% a quem está em
  //  contabilidade organizada — a ferramenta a não entregar o que pediram.
  const lucroUnidade = lucroAoPreco(solverComFixos, precoLiquido);

  const margem = calcularMargem({
    precoLiquido,
    custosVariaveis: variaveisTotais,
    lucroUnidade,
    baseMarkup: custoDiretoFinal + custos.variaveisFixos + comissoes.fixos + fixosPorUnidade,
    unidadesMes: q,
  });

  // A margem que o preço resolvido ENTREGA. É ela — não a pedida — que
  // ancora a faixa: com markup, `margemDeMarkup(k)` ignora comissões e
  // impostos e um markup de 50% dava uma âncora «confortável» ao dobro do
  // preço recomendado.
  const margemEntregue = precoLiquido > 0 ? dividir(lucroUnidade, precoLiquido) : 0;
  if (saida.ok && objetivo.modo !== "margem") {
    margemAlvo = margemEntregue;
  }

  // ── 10. Break-even ─────────────────────────────────────────────────
  const breakEven = calcularBreakEven({
    contribuicaoUnidade: margem.contribuicaoUnidade,
    custosFixosMensais: fixosMensaisTotais,
    pvp,
    unidadesMesEsperadas: q,
  });

  // ── 11. Faixa de preço ─────────────────────────────────────────────
  const faixa = calcularFaixa({
    solver,
    solverComFixos,
    fixosPorUnidade,
    margemAlvo,
    folga,
    precoRecomendado: precoLiquido,
  });

  // ── 12. Fiscalidade em euros ───────────────────────────────────────
  // ── 11-bis. Sociedade: do lucro operacional ao bolso do dono ───────
  //  Camada POR CIMA, nunca dentro do solver: o IRC incide sobre o lucro e
  //  não é fração da faturação. Ver o cabeçalho de `sociedade.ts`.
  const sociedade = converterParaSocio({ contexto, precoLiquido, despesasAnuais });

  const fiscal = fiscalidadeVendedor({
    vendedor: contexto.vendedor,
    cliente: contexto.canal.cliente,
    precoLiquido,
    // O mesmo número que entrou no solver — senão a taxa de IRS mostrada não
    // seria a taxa que formou o preço.
    despesasAnuais,
    // A MESMA base dedutível que o solver usou, avaliada a este preço. As
    // comissões percentuais têm de estar cá: são despesa da atividade, o
    // solver abate-as ao lucro tributável (é o que o termo τ(1 − g(1+t))
    // diz), e deixá-las de fora fazia o IRS em euros do ecrã não bater com
    // o IRS que formou o preço.
    custoDedutivelPorUnidade:
      (solverComFixos.custosDedutiveis ?? 0) +
      comissoes.fixos +
      comissoes.sobreBruto * pvp +
      comissoes.sobreLiquido * precoLiquido,
  });

  // ── 13. Tesouraria ─────────────────────────────────────────────────
  //  O IVA que SAI é o que se entrega: o liquidado menos o dedutível das
  //  compras. Usar o liquidado mandava um revendedor no regime normal
  //  reservar 1 682 €/mês onde lhe saem 532 € — e uma reserva três vezes
  //  maior do que a dívida é um erro tão caro como a reserva a menos.
  const ivaEntregue = ivaAEntregar(precoLiquido, custos.diretoAjustado, iva, custos.ivaDedutivel);

  // O que a comissão consome sai da conta, incida ela sobre o bruto ou
  // sobre o líquido. O afiliado vivia só na margem: um afiliado a 20%
  // desaparecia daqui e a caixa dizia que ficavam 20,00 € onde ficam 16,00 €.
  const comissoesPorUnidade =
    comissoes.fixos + comissoes.sobreBruto * pvp + comissoes.sobreLiquido * precoLiquido;

  const caixa: DetalheCaixa = {
    cobradoAoCliente: cent(pvp),
    entraNaConta: cent(pvp - fiscal.retencaoPorUnidade - comissoesPorUnidade),
    saiDepois: cent(ivaEntregue + fiscal.ssPorUnidade + Math.max(0, fiscal.irsPorUnidade - fiscal.retencaoPorUnidade)),
  };

  // ── 13-bis. Tesouraria: o mesmo dinheiro, mas com data ─────────────
  //  `caixa` diz quanto sai por unidade. Isto diz QUANDO sai, juntando o
  //  preço ao calendário de `prazos.ts`. O IVA que entra é o que se
  //  ENTREGA (já líquido do dedutível), não o que se liquida — é esse o
  //  que sai da conta.
  const tesouraria = calcularTesouraria({
    contexto,
    ivaPorUnidade: ivaEntregue,
    ssPorUnidade: fiscal.ssPorUnidade,
    liquidaIVA: iva.liquida,
    periodicidade: iva.periodicidade,
  });

  // ── 14. Desconto ───────────────────────────────────────────────────
  const desconto =
    contexto.desconto && contexto.desconto.percentagem > 0 && saida.ok
      ? calcularDesconto({
          solver,
          precoLiquido,
          pvp,
          fixosPorUnidade,
          unidadesMes: q,
          desconto: contexto.desconto,
        })
      : undefined;

  // ── 14-bis. O diagnóstico das frações ──────────────────────────────
  //  Quem consome cada euro cobrado, e quanto sobra. É o que transforma
  //  «não há preço possível com estes números» de parede em explicação:
  //  sem isto, o ecrã dizia que o problema existia e não dizia onde.
  const diagnostico = diagnosticar({
    solver: solverComFixos,
    comissoes,
    ssFracao,
    irsFracao,
    irsSobreLucro,
    margemAlvo,
    taxaIVA: iva.taxaVenda,
  });

  // ── 15. Veredicto sobre o preço pensado ────────────────────────────
  const veredicto = contexto.precoPensado
    ? avaliarPrecoPensado({
        precoPensadoPVP: num(contexto.precoPensado),
        taxaIVA: iva.taxaVenda,
        solverComFixos,
        faixa,
      })
    : undefined;

  // ── 16. Avisos e explicação ────────────────────────────────────────
  const avisos: Aviso[] = reunirAvisos({
    contexto,
    situacaoIVA: iva,
    saida,
    margem,
    breakEven,
    fiscal,
    desconto,
    comissoes,
    custos,
    tempo,
    unidadesMes: q,
  });

  const explicacao: LinhaExplicacao[] = construirExplicacao({
    contexto,
    situacaoIVA: iva,
    custos,
    comissoes,
    fiscal,
    tempo,
    precoLiquido,
    pvp,
    fixosPorUnidade,
    lucroUnidade: margem.lucroUnidade,
  });

  return {
    ok: saida.ok,
    impossivel: saida.ok ? undefined : saida.motivo,
    motivoTexto: saida.ok ? undefined : textoImpossivel(saida, margemAlvo),

    // Os três arredondam-se em conjunto, não cada um por si: arredondar o
    // IVA de forma independente parte a identidade PVP = líquido + IVA em
    // um cêntimo, e é dessa incoerência que nascem as reclamações de quem
    // soma a folha de Excel à mão. Invariante 1 da especificação.
    precoLiquido: cent(precoLiquido),
    iva: cent(cent(pvp) - cent(precoLiquido)),
    pvp: cent(pvp),
    taxaIVA: iva.taxaVenda,
    regimeIVA: iva.regime,

    custo: detalheCusto,
    margem: {
      lucroUnidade: cent(margem.lucroUnidade),
      margem: margem.margem,
      markup: margem.markup,
      contribuicaoUnidade: cent(margem.contribuicaoUnidade),
      contribuicaoPercentagem: margem.contribuicaoPercentagem,
      contribuicaoMensal: cent(margem.contribuicaoMensal),
      lucroMensal: cent(margem.lucroMensal),
    },
    breakEven,
    faixa,
    fiscal: {
      ...fiscal,
      ssPorUnidade: cent(fiscal.ssPorUnidade),
      irsPorUnidade: cent(fiscal.irsPorUnidade),
      retencaoPorUnidade: cent(fiscal.retencaoPorUnidade),
      liquidoPessoalPorUnidade: cent(fiscal.liquidoPessoalPorUnidade),
    },
    caixa,
    diagnostico,
    tesouraria,
    explicacao,
    avisos,
    sociedade,
    desconto,
    veredicto,
  };
}

// ─── Auxiliares ────────────────────────────────────────────────────────

/**
 * Para onde vai cada euro cobrado.
 *
 * Tudo é convertido para fração do preço LÍQUIDO, que é a base em que a
 * margem se mede — senão as parcelas não são comparáveis entre si nem
 * com a margem pedida. É por isso que as comissões de canal aparecem
 * multiplicadas por (1 + IVA): 15% do bruto são 18,45% do líquido, e é
 * essa a percentagem que sai mesmo da margem.
 */
function diagnosticar(e: {
  solver: EntradaSolver;
  comissoes: { sobreBruto: number; sobreLiquido: number; detalhe: { rotulo: string; percentagem?: number; base: string }[] };
  ssFracao: number;
  irsFracao: number;
  irsSobreLucro: number;
  margemAlvo: number;
  taxaIVA: number;
}): DiagnosticoPreco {
  const t = fracao(e.taxaIVA, 0, 1);
  const consumidores: FracaoDoPreco[] = [];

  for (const d of e.comissoes.detalhe) {
    if (!d.percentagem || d.percentagem <= 0) continue;
    if (d.base === "bruto") {
      consumidores.push({
        rotulo: d.rotulo,
        fracao: d.percentagem * (1 + t),
        sobreBruto: true,
        fracaoOriginal: d.percentagem,
      });
    } else if (d.base === "liquido") {
      consumidores.push({ rotulo: d.rotulo, fracao: d.percentagem });
    }
  }

  if (e.ssFracao > 0) {
    consumidores.push({ rotulo: "Segurança Social", fracao: e.ssFracao });
  }
  if (e.irsFracao > 0) {
    consumidores.push({ rotulo: "IRS sobre a faturação", fracao: e.irsFracao });
  }
  if (e.irsSobreLucro > 0) {
    consumidores.push({ rotulo: "IRS sobre o lucro", fracao: e.irsSobreLucro });
  }

  const disponivel = fracaoDisponivel(e.solver);

  return {
    disponivel,
    margemPedida: e.margemAlvo,
    // O teto é a fração disponível: uma margem igual a ela deixa o
    // denominador do solver a zero, e daí para cima não existe preço.
    margemMaxima: Math.max(0, disponivel),
    consumidores: consumidores.sort((a, b) => b.fracao - a.fracao),
  };
}

function textoImpossivel(saida: SaidaSolver, margemAlvo: number): string {
  if (saida.motivo === "margem_inalcancavel") {
    const teto = Math.max(0, saida.fracaoDisponivel);
    return `Não existe preço que dê essa margem. Entre comissões e impostos sobre a faturação, só te sobram ${(
      teto * 100
    )
      .toFixed(1)
      .replace(".", ",")}% de cada euro cobrado — e pediste ${(margemAlvo * 100)
      .toFixed(1)
      .replace(".", ",")}%. Subir o preço não resolve, porque as comissões sobem com ele.`;
  }
  return "Faltam dados para calcular o preço.";
}

function avaliarPrecoPensado(e: {
  precoPensadoPVP: number;
  taxaIVA: number;
  /** O solver que resolveu o preço — fixos e escudo fiscal por dentro. */
  solverComFixos: EntradaSolver;
  faixa: ResultadoPreco["faixa"];
}): VeredictoPreco {
  const liquido = liquidoDe(e.precoPensadoPVP, e.taxaIVA);
  const lucro = lucroAoPreco(e.solverComFixos, liquido);
  const margem = liquido > 0 ? dividir(lucro, liquido) : 0;

  const piso = e.faixa.ancoras.find((a) => a.chave === "piso")?.pvp ?? 0;
  const minimo = e.faixa.ancoras.find((a) => a.chave === "minimo")?.pvp ?? 0;
  const recomendado = e.faixa.ancoras.find((a) => a.chave === "recomendado")?.pvp ?? 0;

  const diferenca = cent(e.precoPensadoPVP - recomendado);
  const base = { diferenca, margemNoPrecoPensado: margem, lucroNoPrecoPensado: cent(lucro) };

  if (piso > 0 && e.precoPensadoPVP < piso) {
    return {
      ...base,
      classificacao: "abaixo_do_piso",
      titulo: "A este preço perdes dinheiro em cada venda",
      texto: `Cada venda a ${fmtEuro(e.precoPensadoPVP)} tira-te ${fmtEuro(
        Math.abs(lucro),
      )}. E quanto mais vendes, pior fica — não é um problema de volume.`,
    };
  }

  if (minimo > 0 && e.precoPensadoPVP < minimo) {
    return {
      ...base,
      classificacao: "abaixo_do_minimo",
      titulo: "Cobre os custos da venda, mas não as contas fixas",
      texto: `A ${fmtEuro(e.precoPensadoPVP)} sobra alguma coisa em cada venda, mas não o suficiente para pagar renda, contabilidade e software. Faltam ${fmtEuro(
        minimo - e.precoPensadoPVP,
      )} por unidade.`,
    };
  }

  if (recomendado > 0 && e.precoPensadoPVP < recomendado * 0.97) {
    return {
      ...base,
      classificacao: "sustentavel_apertado",
      titulo: "É sustentável, mas fica abaixo do teu objetivo",
      texto: `Ficas com ${(margem * 100).toFixed(1).replace(".", ",")}% de margem. Para o objetivo que definiste, precisarias de ${fmtEuro(
        recomendado,
      )}.`,
    };
  }

  if (recomendado > 0 && e.precoPensadoPVP > recomendado * 1.03) {
    return {
      ...base,
      classificacao: "acima_do_recomendado",
      titulo: "Acima do necessário — e isso pode ser uma boa notícia",
      texto: `Se o mercado aceitar ${fmtEuro(e.precoPensadoPVP)}, ficas com ${(margem * 100)
        .toFixed(1)
        .replace(".", ",")}% de margem, mais ${fmtEuro(diferenca)} do que o mínimo do teu objetivo.`,
    };
  }

  return {
    ...base,
    classificacao: "alinhado",
    titulo: "O preço que pensaste está alinhado com as contas",
    texto: `A ${fmtEuro(e.precoPensadoPVP)} ficas com ${(margem * 100)
      .toFixed(1)
      .replace(".", ",")}% de margem — praticamente o que o teu objetivo pede.`,
  };
}

const fmtEuro = (n: number): string =>
  `${num(n).toFixed(2).replace(".", ",")} €`;
