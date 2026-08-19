// ═══════════════════════════════════════════════════════════════════════
//  CAIXA — porque um negócio lucrativo pode ficar sem dinheiro
//  ---------------------------------------------------------------------
//  O lucro diz se o modelo funciona. A caixa diz se se sobrevive até lá.
//  São coisas diferentes e a confusão entre as duas é a causa clássica de
//  falência de negócios rentáveis: fatura-se a 60 dias, paga-se ao
//  fornecedor a 30, e em abril não há dinheiro para a folha de salários
//  apesar de o ano fechar com lucro.
//
//  ── COPY OBRIGATÓRIA ───────────────────────────────────────────────
//  Isto é uma PROJEÇÃO DE CAIXA, não um saldo bancário. Sempre que este
//  número aparecer no ecrã, essa frase aparece com ele. Ver §21 do
//  relatório e `PROJECAO_NAO_E_SALDO` mais abaixo — está em código para
//  poder ser verificada por teste.
//
//  ── O QUE ESTA VERSÃO NÃO FAZ ──────────────────────────────────────
//  Não integra o calendário fiscal completo. O IVA entregue e a Segurança
//  Social têm datas próprias (`prazos.ts` sabe-as, e a pricing engine já
//  as usa em `motores/tesouraria.ts`), mas cruzá-las com um horizonte de
//  36 meses e três ofertas exige decisões de periodicidade que ainda não
//  estão tomadas. Um vazio explicado vale mais do que um número
//  plausível — e por isso o IVA aparece como fluxo neutro declarado, não
//  como omissão silenciosa.
// ═══════════════════════════════════════════════════════════════════════

import { cent, dividir, fracao, naoNegativo, num } from "@/lib/pricing/numeros";
import { agregar, type AgregadoNegocio } from "./agregar";
import type { ContextoNegocio, MesCaixa, ResultadoCaixa } from "./tipos";

/** A frase que acompanha sempre uma projeção de caixa. */
export const PROJECAO_NAO_E_SALDO =
  "Projeção de caixa, não saldo bancário real. Mostra quando o dinheiro entra e sai com os prazos que declaraste — não conta o que já tens noutras contas nem obrigações que não estejam aqui.";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** O fator de sazonalidade de um mês, 1 quando não há sazonalidade. */
function fatorSazonal(contexto: ContextoNegocio, mesDoAno: number): number {
  if (contexto.procura.modo !== "sazonal") return 1;
  const fatores = contexto.ofertas
    .map((o) => o.sazonalidade)
    .filter((s): s is number[] => Array.isArray(s) && s.length === 12);
  if (fatores.length === 0) return 1;
  // Média simples: uma média ponderada pela receita exigiria recalcular o
  // agregado a cada mês, e a diferença não justifica o custo.
  return fatores.reduce((s, f) => s + fracao(f[mesDoAno], 0, 5), 0) / fatores.length;
}

/**
 * A projeção mês a mês.
 *
 * O modelo é o do §21, com um só refinamento: os prazos deslocam os
 * fluxos em vez de os mudar de valor. Faturar em janeiro e receber em
 * março não muda a receita de janeiro — muda o mês em que o dinheiro
 * aparece na conta, que é exatamente a informação que falta a quem só vê
 * a demonstração de resultados.
 */
export function projetarCaixa(
  contexto: ContextoNegocio,
  agregado?: AgregadoNegocio,
): ResultadoCaixa {
  const a = agregado ?? agregar(contexto);
  const c = contexto.caixa;

  const horizonte = contexto.procura.horizonteMeses ?? 12;
  const crescimento = num(contexto.procura.crescimentoMensal);

  const saldoInicial = num(c?.saldoInicial);
  const financiamento = naoNegativo(c?.financiamentoInicial);
  const atrasoRecebimento = Math.round(dividir(naoNegativo(c?.prazoRecebimentoDias), 30));
  const atrasoPagamento = Math.round(dividir(naoNegativo(c?.prazoFornecedorDias), 30));

  // Os investimentos com mês declarado saem nesse mês; os outros saem
  // antes de abrir (mês 0), que é quando se pagam mesmo.
  const investimentosPorMes = new Map<number, number>();
  for (const inv of contexto.estrutura?.investimentosIniciais ?? []) {
    const mes = Math.max(0, Math.round(num(inv.mes ?? 0)));
    investimentosPorMes.set(mes, (investimentosPorMes.get(mes) ?? 0) + naoNegativo(inv.valor));
  }
  const arranque =
    naoNegativo(c?.stockInicial) + naoNegativo(c?.caucao) + (investimentosPorMes.get(0) ?? 0);

  const meses: MesCaixa[] = [];
  let saldo = saldoInicial + financiamento - arranque;

  const receitaBase = a.receitaClienteMes;
  const variavelBase = a.custosVariaveisMes;
  const fixosBase = a.custosFixosMes;

  const escalaDe = (mes: number): number => {
    if (mes < 1) return 0;
    const cresc = Math.pow(1 + crescimento, mes - 1);
    return cresc * fatorSazonal(contexto, (mes - 1) % 12);
  };

  for (let mes = 1; mes <= horizonte; mes++) {
    // Recebe-se o que se faturou há `atrasoRecebimento` meses. Antes
    // disso não entra nada — é esse o buraco que a projeção existe para
    // mostrar.
    const mesFaturado = mes - atrasoRecebimento;
    const recebimentos = cent(receitaBase * escalaDe(mesFaturado));

    const mesComprado = mes - atrasoPagamento;
    const pagamentosVariaveis = cent(variavelBase * escalaDe(mesComprado));

    // O IVA cobrado é dinheiro do Estado a passar pela conta: entra com o
    // recebimento e sai na entrega. Neutraliza-se no mesmo mês em vez de
    // se fingir que é receita — ver o cabeçalho sobre o calendário.
    const ivaNeutro = cent(a.ivaCobradoMes * escalaDe(mesFaturado));

    const investimentos = cent(investimentosPorMes.get(mes) ?? 0);
    const pagamentos = cent(pagamentosVariaveis + fixosBase + ivaNeutro);
    const fluxo = cent(recebimentos - pagamentos - investimentos);

    saldo = cent(saldo + fluxo);

    meses.push({
      mes,
      rotulo: MESES[(mes - 1) % 12],
      recebimentos,
      pagamentos,
      investimentos,
      fluxo,
      saldoFim: saldo,
    });
  }

  const minimo = meses.reduce(
    (m, x) => (x.saldoFim < m.saldoFim ? x : m),
    meses[0] ?? { mes: 0, rotulo: "—", saldoFim: saldo, recebimentos: 0, pagamentos: 0, investimentos: 0, fluxo: 0 },
  );

  // O primeiro mês a partir do qual o saldo nunca mais fica negativo.
  let equilibrio: number | null = null;
  for (let i = meses.length - 1; i >= 0; i--) {
    if (meses[i].saldoFim < 0) break;
    equilibrio = meses[i].mes;
  }

  return {
    meses,
    saldoMinimo: minimo.saldoFim,
    mesDoSaldoMinimo: minimo.mes,
    rotuloDoMesMinimo: minimo.rotulo,
    // Uma folga de 10% sobre o buraco: chegar a zero exato não é
    // sobreviver — é ficar sem margem para o primeiro imprevisto.
    capitalAdicionalNecessario: minimo.saldoFim < 0 ? cent(Math.abs(minimo.saldoFim) * 1.1) : 0,
    mesesAteEquilibrio: equilibrio,
  };
}
