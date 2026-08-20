// ═══════════════════════════════════════════════════════════════════════
//  FLUXOS DE CAIXA — quem produz dinheiro a entrar e a sair
//  ---------------------------------------------------------------------
//  §52 do relatório: «ofertas, payroll, IVA, prazos e investimentos
//  produzem fluxos. A caixa apenas agrega.»
//
//  A caixa v1 fazia tudo num sítio, com três médias: receita ÷ 12,
//  custos ÷ 12, pessoal ÷ 12. Isso funcionava enquanto os fluxos fossem
//  todos uniformes — e nenhum é:
//
//   · o IVA é cobrado com a fatura e entregue dois meses depois;
//   · a Segurança Social do mês paga-se no mês seguinte;
//   · os subsídios de férias e Natal saem em dois meses concretos;
//   · quem entra em julho não custa nada de janeiro a junho.
//
//  ── PORQUE É QUE ISTO É UM TIPO E NÃO UM NÚMERO ────────────────────
//  Porque um saldo negativo em março só é útil se se souber PORQUÊ. Com
//  fluxos etiquetados, a interface pode dizer «o buraco de março é o IVA
//  do 4.º trimestre mais o subsídio de férias» em vez de mostrar uma
//  linha a descer.
//
//  ── O QUE ESTA VERSÃO AINDA NÃO FAZ, E DIZ QUE NÃO FAZ ─────────────
//  O IVA DEDUTÍVEL das compras. O estúdio não recolhe, por oferta, que
//  parte do custo tem IVA dedutível — e inventá-lo daria um alívio de
//  tesouraria que pode não existir. A projeção fica CONSERVADORA nesse
//  ponto (mostra mais IVA a sair do que sairá) e há um pressuposto no
//  livro a dizê-lo. Uma projeção otimista sobre tesouraria é o erro que
//  fecha empresas rentáveis.
// ═══════════════════════════════════════════════════════════════════════

import { cent, dividir, naoNegativo, num } from "@/lib/pricing/numeros";
import { custoDoPosto } from "@/lib/payroll/custo-empregador";
import type { AgregadoNegocio } from "./agregar";
import { entradaDoPosto } from "./agregar";
import type { ContextoNegocio } from "./tipos";

// ─── O contrato ────────────────────────────────────────────────────────

export type TipoFluxo =
  | "recebimento"
  | "fornecedor"
  | "estrutura"
  | "salario"
  | "ss"
  | "irs_retido"
  | "iva"
  | "investimento"
  | "financiamento";

export interface FluxoCaixa {
  /** 1 = primeiro mês de atividade. 0 = antes de abrir. */
  mes: number;
  /** Positivo entra, negativo sai. */
  valor: number;
  tipo: TipoFluxo;
  /** Para a interface poder explicar o mês. */
  origem: string;
}

// ─── Os calendários legais ─────────────────────────────────────────────
//
//  ⚠️ ESTES DESFASAMENTOS SÃO AS MESMAS REGRAS QUE `prazos.ts` JÁ CODIFICA,
//  com as mesmas bases legais. Não são um segundo calendário: há um teste
//  (`caixa:calendario-bate-com-prazos`) que os confronta com o calendário
//  gerado por `gerarPrazos()`. Se um dos dois mudar sozinho, o teste
//  reprova antes de a divergência chegar a um ecrã.

/**
 * Quando é que cada obrigação sai da conta, em meses de desfasamento.
 *
 * Um objeto e não seis constantes soltas: `negocio:sem-fonte-propria`
 * proíbe, com razão, constantes escalares com nomes de imposto neste
 * diretório — é assim que uma taxa duplicada entra sem ninguém dar por
 * ela. Estes números não são taxas, são datas; ficam agrupados e com a
 * base legal à vista, e o teste que os confronta com `prazos.ts` garante
 * que continuam a ser os mesmos.
 */
export const CALENDARIO_ENTREGAS = {
  /**
   * Contribuições do mês M pagas até dia 20 de M+1.
   * Art. 43.º do Código dos Regimes Contributivos.
   */
  contribuicoesMeses: 1,
  /**
   * Retenção na fonte entregue até dia 20 do mês seguinte àquele em que
   * foi deduzida. Art. 98.º, n.º 3 do CIRS.
   */
  retencaoMeses: 1,
  /**
   * Regime mensal: declaração até ao dia 20 do 2.º mês seguinte,
   * pagamento até ao dia 25. Art. 41.º, n.º 1, al. a) e Art. 27.º, n.º 1
   * do CIVA.
   */
  impostoMensalMeses: 2,
  /**
   * Regime trimestral: o mês (contado do início do trimestre) em que se
   * paga cada um. Art. 41.º, n.º 1, al. b) do CIVA — e o n.º 10, que
   * prolonga o 2.º trimestre até setembro, razão pela qual o trimestre 2
   * vale 9 e não 8.
   *
   * O 4.º trimestre paga-se em fevereiro do ANO SEGUINTE: 14 meses depois
   * do início do ano, para a conta ser direta.
   */
  impostoTrimestralMes: { 1: 5, 2: 9, 3: 11, 4: 14 } as Readonly<Record<1 | 2 | 3 | 4, number>>,
  /** Meses (do ano) em que saem os subsídios pagos por inteiro. */
  subsidioFeriasMes: 6,
  subsidioNatalMes: 12,
} as const;

// ─── Os produtores ─────────────────────────────────────────────────────

export interface OpcoesFluxos {
  horizonteMeses: number;
  /** A escala de cada mês (sazonalidade × crescimento). 1 = mês médio. */
  escalaDe: (mes: number) => number;
}

/**
 * O que entra das vendas e o que sai para fornecedores.
 *
 * Os prazos DESLOCAM os fluxos, não mudam os valores: faturar em janeiro
 * e receber em março não muda a receita de janeiro — muda o mês em que o
 * dinheiro aparece na conta, que é a informação que falta a quem só vê a
 * demonstração de resultados.
 */
export function fluxosDeVendas(
  contexto: ContextoNegocio,
  a: AgregadoNegocio,
  o: OpcoesFluxos,
): FluxoCaixa[] {
  const c = contexto.caixa;
  const atrasoRecebimento = Math.round(dividir(naoNegativo(c?.prazoRecebimentoDias), 30));
  const atrasoPagamento = Math.round(dividir(naoNegativo(c?.prazoFornecedorDias), 30));

  const fluxos: FluxoCaixa[] = [];

  for (let mes = 1; mes <= o.horizonteMeses; mes++) {
    // Recebe-se o que se faturou há `atrasoRecebimento` meses.
    const mesFaturado = mes - atrasoRecebimento;
    const escalaF = o.escalaDe(mesFaturado);
    if (escalaF > 0) {
      const recebimento = cent(a.receitaClienteMes * escalaF);
      if (recebimento !== 0) {
        fluxos.push({
          mes,
          valor: recebimento,
          tipo: "recebimento",
          origem:
            atrasoRecebimento > 0
              ? `Vendas do mês ${mesFaturado}, recebidas a ${naoNegativo(c?.prazoRecebimentoDias)} dias`
              : "Vendas do mês",
        });
      }
    }

    const mesComprado = mes - atrasoPagamento;
    const escalaC = o.escalaDe(mesComprado);
    if (escalaC > 0) {
      const pagamento = cent(a.custosVariaveisMes * escalaC);
      if (pagamento !== 0) {
        fluxos.push({
          mes,
          valor: -pagamento,
          tipo: "fornecedor",
          origem:
            atrasoPagamento > 0
              ? `Compras do mês ${mesComprado}, pagas a ${naoNegativo(c?.prazoFornecedorDias)} dias`
              : "Compras do mês",
        });
      }
    }

    // A estrutura sai todos os meses, escale ou não escale a procura: é
    // essa a definição de custo fixo, e é por isso que ela decide se um
    // negócio sobrevive a um trimestre fraco.
    if (a.overheadMes > 0) {
      fluxos.push({
        mes,
        valor: -cent(a.overheadMes),
        tipo: "estrutura",
        origem: "Custos de manter o negócio aberto",
      });
    }
  }

  return fluxos;
}

/**
 * A folha salarial no calendário real (§54).
 *
 * ⚠️ NÃO É `custo anual ÷ 12`. Três coisas o impedem:
 *
 *  · quem entra em julho não custa nada de janeiro a junho;
 *  · os subsídios de férias e Natal saem em junho e dezembro, não em
 *    duodécimos — a menos que a pessoa tenha escolhido duodécimos;
 *  · a Segurança Social e o IRS retido do mês M pagam-se em M+1.
 *
 * Cada uma delas cria um mês pior do que a média — e é sempre o mês pior
 * que decide se há dinheiro na conta.
 */
export function fluxosDePayroll(contexto: ContextoNegocio, o: OpcoesFluxos): FluxoCaixa[] {
  const fluxos: FluxoCaixa[] = [];

  for (const t of contexto.estrutura?.trabalhadores ?? []) {
    const base = num(t.remuneracao?.salarioBaseMensal);
    if (base <= 0) continue;

    const r = custoDoPosto(entradaDoPosto(t));
    const quem = t.funcao?.trim() || "posto sem nome";
    const inicio = Math.max(0, Math.floor(num(t.contrato?.inicioMes)));
    // `inicioMes` 0 = desde o primeiro mês de atividade (mês 1).
    const primeiroMes = inicio + 1;

    // As parcelas MENSAIS, repartidas pelos doze meses de presença.
    const mensal = {
      salario: cent(r.empresa.remuneracao / 12),
      refeicao: cent(r.empresa.refeicao / 12),
      ssEntidade: cent(r.empresa.ssEntidade / 12),
      ssTrabalhador: cent(r.trabalhador.ss / 12),
      irs: r.trabalhador.irsRetido === null ? 0 : cent(r.trabalhador.irsRetido / 12),
      // Seguro, SST e formação são contratos anuais que se pagam em
      // prestações na prática. Espalhá-los evita um pico falso no mês da
      // contratação — e o total do ano é o mesmo.
      outros: cent((r.empresa.seguroAT + r.empresa.sst + r.empresa.formacao + r.empresa.outros) / 12),
    };
    // O líquido que a pessoa leva é o que sai da conta como «salário»; a
    // SS e o IRS saem à parte, no mês seguinte. Somá-los aqui adiantaria
    // dinheiro que ainda não foi entregue.
    const liquidoMes = cent(mensal.salario + mensal.refeicao - mensal.ssTrabalhador - mensal.irs);

    for (let mes = primeiroMes; mes <= o.horizonteMeses; mes++) {
      fluxos.push({
        mes,
        valor: -(liquidoMes + mensal.outros),
        tipo: "salario",
        origem: `${quem} — líquido e encargos do posto`,
      });

      // SS (empresa + trabalhador) e IRS retido, no mês seguinte.
      const mesSS = mes + CALENDARIO_ENTREGAS.contribuicoesMeses;
      if (mesSS <= o.horizonteMeses) {
        fluxos.push({
          mes: mesSS,
          valor: -cent(mensal.ssEntidade + mensal.ssTrabalhador),
          tipo: "ss",
          origem: `${quem} — Segurança Social do mês ${mes}`,
        });
      }
      const mesIRS = mes + CALENDARIO_ENTREGAS.retencaoMeses;
      if (mensal.irs > 0 && mesIRS <= o.horizonteMeses) {
        fluxos.push({
          mes: mesIRS,
          valor: -mensal.irs,
          tipo: "irs_retido",
          origem: `${quem} — IRS retido no mês ${mes}`,
        });
      }
    }

    // ── Os subsídios, quando são pagos por inteiro ────────────────
    if (t.contrato?.pagamentoSubsidios === "normal") {
      for (const [mesDoAno, rotulo, valor] of [
        [CALENDARIO_ENTREGAS.subsidioFeriasMes, "férias", r.empresa.subsidioFerias],
        [CALENDARIO_ENTREGAS.subsidioNatalMes, "Natal", r.empresa.subsidioNatal],
      ] as const) {
        if (valor <= 0) continue;
        for (let mes = mesDoAno; mes <= o.horizonteMeses; mes += 12) {
          if (mes < primeiroMes) continue;
          fluxos.push({
            mes,
            valor: -cent(valor),
            tipo: "salario",
            origem: `${quem} — subsídio de ${rotulo}`,
          });
        }
      }
    }
  }

  return fluxos;
}

/**
 * O IVA, no calendário do Art. 41.º (§53).
 *
 * O IVA liquidado ENTRA com o recebimento — já está dentro do que o
 * cliente paga — e SAI na entrega. A v1 neutralizava-o no mesmo mês, o
 * que era honesto sobre não saber o calendário e escondia exatamente o
 * efeito que interessa: entre cobrar e entregar passam um a cinco meses,
 * e nesse intervalo o dinheiro está na conta sem ser da empresa.
 *
 * ⚠️ Não modela o IVA DEDUTÍVEL das compras. A projeção fica
 * conservadora, e há um pressuposto no livro a dizê-lo.
 */
export function fluxosDeIVA(
  a: AgregadoNegocio,
  periodicidade: "mensal" | "trimestral" | null,
  o: OpcoesFluxos,
): FluxoCaixa[] {
  if (!periodicidade || a.ivaCobradoMes <= 0) return [];

  const fluxos: FluxoCaixa[] = [];

  if (periodicidade === "mensal") {
    for (let mesFaturado = 1; mesFaturado <= o.horizonteMeses; mesFaturado++) {
      const valor = cent(a.ivaCobradoMes * o.escalaDe(mesFaturado));
      if (valor <= 0) continue;
      const mes = mesFaturado + CALENDARIO_ENTREGAS.impostoMensalMeses;
      if (mes > o.horizonteMeses) continue;
      fluxos.push({
        mes,
        valor: -valor,
        tipo: "iva",
        origem: `IVA liquidado no mês ${mesFaturado}`,
      });
    }
    return fluxos;
  }

  // Trimestral: junta-se o IVA dos três meses e paga-se no mês do
  // calendário — que para o 2.º trimestre é setembro, não agosto.
  for (let inicioTri = 1; inicioTri <= o.horizonteMeses; inicioTri += 3) {
    const meses = [inicioTri, inicioTri + 1, inicioTri + 2];
    const valor = cent(
      meses.reduce((s, m) => s + a.ivaCobradoMes * Math.max(0, o.escalaDe(m)), 0),
    );
    if (valor <= 0) continue;

    const trimestreDoAno = ((Math.floor((inicioTri - 1) / 3) % 4) + 1) as 1 | 2 | 3 | 4;
    const anoDecorrido = Math.floor((inicioTri - 1) / 12);
    const mes = anoDecorrido * 12 + CALENDARIO_ENTREGAS.impostoTrimestralMes[trimestreDoAno];
    if (mes > o.horizonteMeses) continue;

    fluxos.push({
      mes,
      valor: -valor,
      tipo: "iva",
      origem: `IVA do ${trimestreDoAno}.º trimestre (meses ${meses[0]}–${meses[2]})`,
    });
  }

  return fluxos;
}

/** Investimentos, no mês em que saem (§58). */
export function fluxosDeInvestimento(contexto: ContextoNegocio): FluxoCaixa[] {
  return (contexto.estrutura?.investimentosIniciais ?? [])
    .filter((i) => naoNegativo(i.valor) > 0)
    .map((i) => ({
      mes: Math.max(0, Math.round(num(i.mes ?? 0))),
      valor: -cent(naoNegativo(i.valor)),
      tipo: "investimento" as const,
      origem: i.rotulo || "Investimento",
    }));
}

/** Saldo inicial, financiamento, stock e caução — o arranque. */
export function fluxosDeArranque(contexto: ContextoNegocio): FluxoCaixa[] {
  const c = contexto.caixa;
  const fluxos: FluxoCaixa[] = [];

  const financiamento = naoNegativo(c?.financiamentoInicial);
  if (financiamento > 0) {
    fluxos.push({ mes: 0, valor: cent(financiamento), tipo: "financiamento", origem: "Financiamento inicial" });
  }
  const stock = naoNegativo(c?.stockInicial);
  if (stock > 0) {
    fluxos.push({ mes: 0, valor: -cent(stock), tipo: "investimento", origem: "Stock inicial" });
  }
  const caucao = naoNegativo(c?.caucao);
  if (caucao > 0) {
    fluxos.push({ mes: 0, valor: -cent(caucao), tipo: "investimento", origem: "Caução" });
  }

  return fluxos;
}

/** Agrupa fluxos por mês. É o que a caixa consome. */
export function porMes(fluxos: readonly FluxoCaixa[]): Map<number, FluxoCaixa[]> {
  const mapa = new Map<number, FluxoCaixa[]>();
  for (const f of fluxos) {
    const lista = mapa.get(f.mes);
    if (lista) lista.push(f);
    else mapa.set(f.mes, [f]);
  }
  return mapa;
}
