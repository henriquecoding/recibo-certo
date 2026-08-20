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
//  número aparecer no ecrã, essa frase aparece com ele —
//  `PROJECAO_NAO_E_SALDO` está em código para poder ser verificada por
//  teste.
//
//  ── O QUE MUDOU NA v2 (§51-54) ─────────────────────────────────────
//  Este módulo deixou de calcular. Agora AGREGA: `fluxos.ts` produz
//  fluxos etiquetados a partir das ofertas, da folha salarial, do IVA e
//  dos investimentos, e a caixa soma-os por mês.
//
//  A diferença não é de arquitetura, é de resultado. A v1 usava três
//  médias — receita ÷ 12, custos ÷ 12, pessoal ÷ 12 — e nenhum destes
//  fluxos é uniforme:
//
//   · o IVA cobrado em janeiro entrega-se em março (mensal) ou em maio
//     (trimestral). Nesse intervalo está na conta sem ser da empresa;
//   · a Segurança Social do mês paga-se no mês seguinte;
//   · os subsídios de férias e Natal saem em junho e dezembro;
//   · quem entra em julho não custa nada de janeiro a junho.
//
//  Cada uma delas cria um mês pior do que a média. E é sempre o mês pior
//  que decide se há dinheiro na conta.
//
//  ── O QUE CONTINUA POR FAZER, E DIZ-SE ─────────────────────────────
//  O IVA dedutível das compras. A projeção fica conservadora nesse ponto
//  — mostra mais IVA a sair do que sairá — e há um pressuposto no livro a
//  dizê-lo. Numa projeção de tesouraria, errar para o lado otimista é o
//  erro que fecha empresas.
// ═══════════════════════════════════════════════════════════════════════

import { cent, fracao, num } from "@/lib/pricing/numeros";
import { agregar, type AgregadoNegocio } from "./agregar";
import { periodicidadeIVA } from "./adapters/iva";
import {
  fluxosDeArranque,
  fluxosDeIVA,
  fluxosDeInvestimento,
  fluxosDePayroll,
  fluxosDeVendas,
  porMes,
  type FluxoCaixa,
} from "./fluxos";
import type { ContextoNegocio, MesCaixa, ResultadoCaixa } from "./tipos";

/** A frase que acompanha sempre uma projeção de caixa. */
export const PROJECAO_NAO_E_SALDO =
  "Projeção de caixa, não saldo bancário real. Mostra quando o dinheiro entra e sai com os prazos que declaraste — não conta o que já tens noutras contas nem obrigações que não estejam aqui.";

/** O que esta projeção ainda não modela, dito em voz alta (§51). */
export const IVA_DEDUTIVEL_NAO_MODELADO =
  "O IVA que suportas nas compras é dedutível e não está nesta projeção. Na prática entregas menos IVA do que aqui aparece — a projeção erra para o lado seguro, de propósito.";

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

export interface OpcoesCaixa {
  /**
   * O periodicidade de IVA, quando se sabe. Passa-se de fora para a caixa
   * não ter de chamar o motor de IVA — e para os testes a poderem fixar.
   */
  periodicidadeIVA?: "mensal" | "trimestral" | null;
}

/**
 * A projeção mês a mês.
 *
 * Função pura e determinística: os mesmos dados dão sempre os mesmos
 * meses. Toda a decisão de CALENDÁRIO vive em `fluxos.ts`; aqui só se
 * soma e se procura o pior mês.
 */
export function projetarCaixa(
  contexto: ContextoNegocio,
  agregado?: AgregadoNegocio,
  opcoes: OpcoesCaixa = {},
): ResultadoCaixa {
  const a = agregado ?? agregar(contexto);
  const horizonte = contexto.procura.horizonteMeses ?? 12;
  const crescimento = num(contexto.procura.crescimentoMensal);

  const escalaDe = (mes: number): number => {
    if (mes < 1) return 0;
    const cresc = Math.pow(1 + crescimento, mes - 1);
    return cresc * fatorSazonal(contexto, (mes - 1) % 12);
  };

  const o = { horizonteMeses: horizonte, escalaDe };

  const fluxos: FluxoCaixa[] = [
    ...fluxosDeArranque(contexto),
    ...fluxosDeInvestimento(contexto),
    ...fluxosDeVendas(contexto, a, o),
    ...fluxosDePayroll(contexto, o),
    ...fluxosDeIVA(a, opcoes.periodicidadeIVA ?? null, o),
  ];

  const agrupados = porMes(fluxos);

  // ── O arranque: tudo o que sai antes do mês 1 ────────────────────
  let saldo = num(contexto.caixa?.saldoInicial);
  for (const f of agrupados.get(0) ?? []) saldo = cent(saldo + f.valor);

  const meses: MesCaixa[] = [];

  for (let mes = 1; mes <= horizonte; mes++) {
    const doMes = agrupados.get(mes) ?? [];

    let recebimentos = 0;
    let pagamentos = 0;
    let investimentos = 0;

    for (const f of doMes) {
      if (f.tipo === "investimento") investimentos += Math.abs(f.valor);
      else if (f.valor >= 0) recebimentos += f.valor;
      else pagamentos += Math.abs(f.valor);
    }

    recebimentos = cent(recebimentos);
    pagamentos = cent(pagamentos);
    investimentos = cent(investimentos);
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
    fluxos,
  };
}

/**
 * A mesma projeção, com a periodicidade de IVA resolvida pelo motor.
 *
 * É esta que o orquestrador chama. Fica separada de `projetarCaixa` para
 * que a projeção continue a poder ser testada sem arrastar o motor de
 * IVA — e para que a periodicidade possa ser fixada num teste.
 */
export function projetarCaixaDoNegocio(
  contexto: ContextoNegocio,
  agregado?: AgregadoNegocio,
): ResultadoCaixa {
  const a = agregado ?? agregar(contexto);
  return projetarCaixa(contexto, a, {
    periodicidadeIVA: periodicidadeIVA(contexto, {
      receitaSemIVAAno: cent(a.receitaSemIVAMes * 12),
      ivaCobradoMes: a.ivaCobradoMes,
    }),
  });
}

/** Os fluxos de um mês, ordenados do maior impacto para o menor. */
export function explicarMes(caixa: ResultadoCaixa, mes: number): FluxoCaixa[] {
  return (caixa.fluxos ?? [])
    .filter((f) => f.mes === mes)
    .sort((x, y) => Math.abs(y.valor) - Math.abs(x.valor));
}
