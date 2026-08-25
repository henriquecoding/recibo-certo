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
//
//  ── O «lucro» do solver JÁ É LÍQUIDO DE IMPOSTOS ──────────────────────
//
//  Este ficheiro repunha aqui a Segurança Social e o IRS, dividindo o alvo
//  por (1 − fração fiscal). A intenção era certa — «ganhar 2 000 €»
//  significa 2 000 € na mão — mas a conta era feita duas vezes: as mesmas
//  frações já entram no solver como `v`, e portanto `lucroAoPreco()`
//  devolve o que sobra DEPOIS delas.
//
//  Medido: pedir 800 €/mês produzia um preço que rendia 1 219 €/mês —
//  52% acima do pedido. A ferramenta mandava cobrar 41,59 € onde 33,74 €
//  bastavam, e um preço 23% acima do necessário perde negócio.
//
//  Por isso o alvo entra agora tal como vem. Para um trabalhador
//  independente o resultado é o que fica na mão; para uma sociedade é o
//  lucro operacional, porque aí não há SS nem IRS no `v`.
// ═══════════════════════════════════════════════════════════════════════

import type { ContextoPreco, LinhaExplicacao, ResultadoObjetivo } from "../tipos";
import { precificar } from "../motor";
import { cent, dividir, fracao, naoNegativo, num, unidades } from "../numeros";

/**
 * «Quero ganhar X por mês — quanto tenho de cobrar?»
 *
 * X lê-se sempre como o dinheiro que a pessoa quer ver — e quem decide o que
 * isso significa é `vendedor.tipo`, não uma opção: num trabalhador
 * independente a SS e o IRS já estão no `v` do solver, logo o lucro resolvido
 * É líquido; numa sociedade não há SS nem IRS no `v`, logo é lucro
 * operacional, e a conversão até ao bolso do dono vive em `sociedade.ts`.
 *
 * Houve aqui um parâmetro `liquidoPessoal` a prometer escolher entre as duas
 * leituras. Não escolhia nada — nunca foi lido —, e uma opção que não faz
 * nada é pior do que nenhuma: quem a passasse ficava convencido de ter
 * mudado a conta.
 */
export function precoParaGanhar(
  contexto: ContextoPreco,
  ganhoMensal: number,
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
  const temFiscalidade = sonda.fiscal.aplicavel;

  explicacao.push({
    rotulo: "O que queres receber por mês",
    valor: cent(alvo),
    confianca: "estimativa",
  });

  // O alvo entra TAL COMO VEM. Ver o cabeçalho: repor aqui a Segurança
  // Social e o IRS contava-os duas vezes, porque já estão dentro do solver.
  const lucroAlvo = alvo;

  if (temFiscalidade) {
    explicacao.push({
      rotulo: "Segurança Social e IRS",
      valor: 0,
      percentagem: fracao(sonda.fiscal.ssFracao + sonda.fiscal.irsFracao, 0, 0.9),
      confianca: "oficial",
      nota: "Já vêm descontados no preço calculado: o lucro que a ferramenta resolve é o que te fica na mão, não o que o negócio fatura antes de impostos.",
    });
  }

  const novoContexto: ContextoPreco = {
    ...contexto,
    objetivo: { ...contexto.objetivo, modo: "lucro_mensal", valor: lucroAlvo },
  };

  const r = precificar(novoContexto);

  if (!r.ok) {
    return { ok: false, motivo: r.motivoTexto, explicacao };
  }

  explicacao.push({
    rotulo: `Necessário por venda (÷ ${q} vendas)`,
    valor: cent(dividir(lucroAlvo, q)),
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
 *
 * X lê-se como em `precoParaGanhar`, e pela mesma razão não tem opção.
 */
export function unidadesParaGanhar(
  contexto: ContextoPreco,
  pvpPraticado: number,
  ganhoMensal: number,
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

  // Idem: a contribuição por venda que `precificar` devolve já é líquida de
  // Segurança Social e IRS. Dividir o alvo por (1 − fração) mandava fazer
  // 79 vendas onde 52 chegavam.
  const lucroNecessario = alvo;

  const contribuicao = r.margem.contribuicaoUnidade;
  // O total mensal, não a reconstituição a partir do valor por unidade.
  // `fixosPorUnidade × volume` falhava de duas maneiras: vem arredondado ao
  // cêntimo (1 000 €/mês em 7 unidades voltavam como 1 000,02 €) e, a
  // volume ZERO, é zero — as contas fixas desapareciam inteiras. Quem
  // pergunta «quantas tenho de vender?» é justamente quem ainda não
  // declarou volume, e a resposta saía três vezes mais baixa.
  const fixos = r.custo.fixosMensais;

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
  if (r.fiscal.aplicavel) {
    explicacao.push({
      rotulo: "Segurança Social e IRS",
      valor: 0,
      percentagem: fracao(r.fiscal.ssFracao + r.fiscal.irsFracao, 0, 0.9),
      confianca: "oficial",
      nota: "Já descontados na margem de contribuição acima — as vendas contadas aqui são as que te deixam o valor pedido na mão.",
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

  // O MESMO erro do cabeçalho, e este ficou por corrigir: multiplicar o
  // lucro por (1 − SS − IRS) descontava outra vez impostos que o solver já
  // tinha descontado. A 15% de SS e 19% de IRS, o «líquido pessoal» saía a
  // 66% do que a pessoa fica mesmo a ganhar.
  //
  // Para um trabalhador independente o lucro que `precificar` devolve JÁ é
  // o que fica na mão. Para uma sociedade é lucro operacional, e a conversão
  // até ao bolso do dono vive em `sociedade.ts` — não aqui.
  return {
    lucroMensal: cent(r.margem.lucroMensal),
    liquidoPessoalMensal: cent(r.margem.lucroMensal),
    margem: r.margem.margem,
  };
}
