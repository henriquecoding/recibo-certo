// ═══════════════════════════════════════════════════════════════════════
//  OBJETIVO INVERTIDO — o caminho de trás para a frente
//  ---------------------------------------------------------------------
//  A pergunta que as pessoas realmente fazem não é «qual é o meu preço?».
//  É uma destas:
//
//    «Quero ganhar 2 000 € por mês. O que tenho de cobrar?»
//    «Consigo cobrar 25 €. Quantas tenho de vender?»
//    «Consigo vender 100 por mês. Dá para viver disto?»
//
//  Todas se resolvem com a mesma equação do `preco.ts`, lida ao contrário.
//  E há um detalhe português que muda o número: para um trabalhador
//  independente, «ganhar 2 000 €» significa 2 000 € DEPOIS de Segurança
//  Social e IRS — que incidem sobre a faturação. Repor esse valor não é
//  somar; é dividir por (1 − fração fiscal).
//
//  Ignorá-lo faz a ferramenta prometer 2 000 € e entregar 1 500 €.
// ═══════════════════════════════════════════════════════════════════════

import type { ContextoPreco, LinhaExplicacao, ResultadoObjetivo } from "../tipos";
import { precificar } from "../motor";
import { custosVariaveisAoPreco, lucroAoPreco } from "./preco";
import { cent, dividir, fracao, naoNegativo, num, unidades } from "../numeros";

/**
 * «Quero ganhar X por mês — quanto tenho de cobrar?»
 *
 * `liquidoPessoal: true` interpreta X como o que fica DEPOIS de impostos
 * (o que a pessoa quer mesmo dizer). `false` interpreta como lucro
 * operacional do negócio.
 */
export function precoParaGanhar(
  contexto: ContextoPreco,
  ganhoMensal: number,
  liquidoPessoal = true,
): ResultadoObjetivo {
  const explicacao: LinhaExplicacao[] = [];
  const alvo = naoNegativo(ganhoMensal);
  const q = Math.max(0, num(contexto.volume?.unidadesMes));

  if (alvo <= 0 || q <= 0) {
    return {
      ok: false,
      motivo: "Precisamos do quanto queres ganhar e de quantas vendas esperas por mês.",
      explicacao,
    };
  }

  // Uma corrida em vazio dá as frações fiscais e os custos ao contexto atual.
  const sonda = precificar(contexto);
  const fracaoFiscal = sonda.fiscal.aplicavel
    ? fracao(sonda.fiscal.ssFracao + sonda.fiscal.irsFracao, 0, 0.9)
    : 0;

  explicacao.push({
    rotulo: "O que queres receber por mês",
    valor: cent(alvo),
    confianca: "estimativa",
  });

  // Se o alvo é líquido pessoal, o negócio tem de gerar mais do que isso.
  // O lucro operacional está sujeito às mesmas frações que a faturação
  // marginal, por isso repõe-se por divisão, não por soma.
  const lucroOperacionalNecessario =
    liquidoPessoal && fracaoFiscal > 0 ? dividir(alvo, 1 - fracaoFiscal, alvo) : alvo;

  if (liquidoPessoal && fracaoFiscal > 0) {
    explicacao.push({
      rotulo: "Reposição de Segurança Social e IRS",
      valor: cent(lucroOperacionalNecessario - alvo),
      percentagem: fracaoFiscal,
      confianca: "oficial",
      nota: "Para te sobrarem os primeiros, o negócio tem de gerar estes. Não é somar a percentagem — é dividir por (1 − percentagem).",
    });
  }

  const novoContexto: ContextoPreco = {
    ...contexto,
    objetivo: { ...contexto.objetivo, modo: "lucro_mensal", valor: lucroOperacionalNecessario },
  };

  const r = precificar(novoContexto);

  if (!r.ok) {
    return { ok: false, motivo: r.motivoTexto, explicacao };
  }

  explicacao.push({
    rotulo: `Lucro necessário por venda (÷ ${q} vendas)`,
    valor: cent(dividir(lucroOperacionalNecessario, q)),
    confianca: "estimativa",
  });
  explicacao.push({ rotulo: "Preço sem IVA", valor: r.precoLiquido, confianca: "estimativa" });
  explicacao.push({ rotulo: "Preço ao cliente", valor: r.pvp, confianca: "estimativa" });

  return {
    ok: true,
    pvpNecessario: r.pvp,
    precoLiquidoNecessario: r.precoLiquido,
    margemResultante: r.margem.margem,
    faturacaoMensalNecessaria: cent(r.pvp * q),
    explicacao,
  };
}

/**
 * «Consigo cobrar Y — quantas vendas preciso para ganhar X?»
 */
export function unidadesParaGanhar(
  contexto: ContextoPreco,
  pvpPraticado: number,
  ganhoMensal: number,
  liquidoPessoal = true,
): ResultadoObjetivo {
  const explicacao: LinhaExplicacao[] = [];
  const preco = naoNegativo(pvpPraticado);
  const alvo = naoNegativo(ganhoMensal);

  if (preco <= 0) {
    return { ok: false, motivo: "Indica o preço que consegues cobrar.", explicacao };
  }

  const contextoAoPreco: ContextoPreco = {
    ...contexto,
    objetivo: { ...contexto.objetivo, modo: "preco_fixo", valor: preco, valorEhPVP: true },
  };
  const r = precificar(contextoAoPreco);

  const fracaoFiscal = r.fiscal.aplicavel
    ? fracao(r.fiscal.ssFracao + r.fiscal.irsFracao, 0, 0.9)
    : 0;
  const lucroNecessario =
    liquidoPessoal && fracaoFiscal > 0 ? dividir(alvo, 1 - fracaoFiscal, alvo) : alvo;

  const contribuicao = r.margem.contribuicaoUnidade;
  const fixos = r.custo.fixosPorUnidade * Math.max(1, num(contexto.volume.unidadesMes));

  if (contribuicao <= 0) {
    return {
      ok: false,
      motivo: `A ${preco.toFixed(2).replace(".", ",")} € cada venda não cobre os custos que ela própria gera. Não há número de vendas que resolva.`,
      explicacao,
    };
  }

  const n = unidades(dividir(lucroNecessario + fixos, contribuicao));

  explicacao.push({
    rotulo: "Margem de contribuição por venda",
    valor: cent(contribuicao),
    confianca: "estimativa",
  });
  explicacao.push({ rotulo: "Custos fixos por mês", valor: -cent(fixos), confianca: "estimativa" });
  if (lucroNecessario > alvo) {
    explicacao.push({
      rotulo: "Lucro necessário (já com impostos repostos)",
      valor: cent(lucroNecessario),
      percentagem: fracaoFiscal,
      confianca: "oficial",
    });
  }

  return {
    ok: true,
    unidadesNecessarias: n,
    faturacaoMensalNecessaria: cent(n * preco),
    margemResultante: r.margem.margem,
    explicacao,
  };
}

/**
 * «Vendo N por mês a Y — quanto me sobra?» O caminho mais curto de todos, e
 * o mais honesto: nenhuma otimização, só a conta.
 */
export function resultadoAoPreco(
  contexto: ContextoPreco,
  pvpPraticado: number,
): { lucroMensal: number; liquidoPessoalMensal: number; margem: number } {
  const contextoAoPreco: ContextoPreco = {
    ...contexto,
    objetivo: { ...contexto.objetivo, modo: "preco_fixo", valor: pvpPraticado, valorEhPVP: true },
  };
  const r = precificar(contextoAoPreco);
  const q = Math.max(0, num(contexto.volume.unidadesMes));
  const fracaoFiscal = r.fiscal.aplicavel ? r.fiscal.ssFracao + r.fiscal.irsFracao : 0;

  return {
    lucroMensal: cent(r.margem.lucroMensal),
    liquidoPessoalMensal: cent(r.margem.lucroMensal * (1 - fracao(fracaoFiscal, 0, 0.9))),
    margem: r.margem.margem,
  };
}

/** Utilitário para o slider: lucro por unidade a um PVP arbitrário. */
export function lucroAoPVP(
  solver: Parameters<typeof lucroAoPreco>[0],
  pvp: number,
  taxaIVA: number,
  fixosPorUnidade: number,
): { lucro: number; margem: number; contribuicao: number } {
  const liquido = dividir(num(pvp), 1 + fracao(taxaIVA, 0, 1), num(pvp));
  const lucro = lucroAoPreco(solver, liquido) - num(fixosPorUnidade);
  return {
    lucro: cent(lucro),
    margem: liquido > 0 ? dividir(lucro, liquido) : 0,
    contribuicao: cent(liquido - custosVariaveisAoPreco(solver, liquido)),
  };
}
