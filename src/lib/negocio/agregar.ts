// ═══════════════════════════════════════════════════════════════════════
//  AGREGAR — de várias ofertas a um negócio
//  ---------------------------------------------------------------------
//  A conta é somar. O que não é trivial é somar as coisas CERTAS.
//
//  ── AS TRÊS SOMAS QUE NÃO SE PODEM CONFUNDIR ───────────────────────
//
//    receitaCliente   = PVP × unidades          ← o que o cliente paga
//    receitaSemIVA    = líquido × unidades      ← o volume de negócios
//    ivaCobrado       = a diferença             ← nunca foi receita
//
//  Um adapter que passe `receitaCliente` a um motor que espera volume de
//  negócios inflaciona a faturação em 23% — e o erro não aparece em lado
//  nenhum, porque 23% acima ainda é um número plausível. É por isso que
//  não existe neste diretório nenhum campo chamado só «receita».
//
//  ── A SEGUNDA FRONTEIRA: OPERACIONAL vs BOLSO ──────────────────────
//  `resultadoOperacional` é EBIT: antes do imposto sobre o rendimento de
//  quem fica com o lucro. É a única vista comparável entre independente e
//  sociedade, e é a que os adaptadores entregam aos motores fiscais —
//  que calculam o imposto eles próprios.
//
//  A Segurança Social e o IRS que a pricing engine já pôs dentro do preço
//  de cada oferta de TI saem para uma linha separada
//  (`encargosVendedorMes`). Deixá-los dentro dos custos operacionais faria
//  o comparador cobrar imposto sobre um lucro de que o imposto já tinha
//  sido tirado, nos três cenários.
//
//  ── A TERCEIRA: O OVERHEAD SÓ CONTA UMA VEZ ────────────────────────
//  Um custo de estrutura marcado com `escopo: "oferta"` já está DENTRO do
//  preço de uma oferta (`ContextoPreco.custos.fixos`) — foi a resposta da
//  pessoa à deteção de dupla contagem. Somá-lo outra vez aqui era voltar
//  a criar o defeito que ela acabou de resolver.
// ═══════════════════════════════════════════════════════════════════════

import { IVA_TAXAS, type Regiao } from "@/lib/fiscal-data";
import {
  custoDoPosto,
  type EntradaCustoPosto,
  type ResultadoCustoPosto,
} from "@/lib/payroll/custo-empregador";
import { cent, dividir, naoNegativo, num } from "@/lib/pricing/numeros";
import { regiaoDoNegocio } from "./localizacao";
import { calcularOferta } from "./ofertas";
import type {
  BaseDeclarada,
  ContextoNegocio,
  CustoEstrutura,
  EstruturaNegocio,
  ResultadoOfertaNegocio,
  TrabalhadorPlaneado,
} from "./tipos";

/** As três grandezas mensais que uma base declarada contribui. */
export interface AgregadoBase {
  receitaClienteMes: number;
  receitaSemIVAMes: number;
  ivaCobradoMes: number;
  custosVariaveisMes: number;
}

const BASE_VAZIA: AgregadoBase = {
  receitaClienteMes: 0,
  receitaSemIVAMes: 0,
  ivaCobradoMes: 0,
  custosVariaveisMes: 0,
};

/**
 * O que a base declarada contribui, por mês.
 *
 * ⚠️ A ÚNICA CONVERSÃO QUE ESTA CAMADA FAZ, e faz com a taxa que vem de
 * `fiscal-data.ts`. Escrever 23% aqui criaria a segunda fonte de verdade
 * que este diretório inteiro existe para não ter — e `negocio:sem-fonte-
 * propria` reprova-o.
 *
 * Sem `comIVA`, o valor É o volume de negócios e o IVA fica a zero. Não se
 * infere um IVA liquidado que a pessoa não declarou: a situação de IVA de
 * um negócio depende do regime, da natureza e da região, e é
 * `fiscal-iva.ts` que a sabe determinar — não uma multiplicação otimista.
 */
export function agregarBase(base: BaseDeclarada | undefined, regiao?: Regiao): AgregadoBase {
  if (!base) return BASE_VAZIA;

  const anual = naoNegativo(base.volumeAnual);
  const custosMes = dividir(naoNegativo(base.custosAtividadeAno), 12);

  if (!base.comIVA) {
    const semIVA = dividir(anual, 12);
    return {
      receitaClienteMes: semIVA,
      receitaSemIVAMes: semIVA,
      ivaCobradoMes: 0,
      custosVariaveisMes: cent(custosMes),
    };
  }

  const taxa = IVA_TAXAS[regiao ?? "continente"].value.normal;
  const clienteMes = dividir(anual, 12);
  const semIVAMes = dividir(clienteMes, 1 + taxa);

  return {
    receitaClienteMes: cent(clienteMes),
    receitaSemIVAMes: cent(semIVAMes),
    ivaCobradoMes: cent(clienteMes - semIVAMes),
    custosVariaveisMes: cent(custosMes),
  };
}

/** As somas mensais de um negócio, sem diagnósticos. */
export interface AgregadoNegocio {
  ofertas: ResultadoOfertaNegocio[];
  receitaClienteMes: number;
  receitaSemIVAMes: number;
  ivaCobradoMes: number;
  custosVariaveisMes: number;
  margemContribuicaoMes: number;
  overheadMes: number;
  custoTrabalhadoresMes: number;
  /** overhead + trabalhadores. É o que o break-even tem de cobrir. */
  custosFixosMes: number;
  resultadoOperacionalMes: number;
  encargosVendedorMes: number;
  resultadoDepoisEncargosMes: number;
  temFiscalidadeVendedor: boolean;
  /** Unidades vendidas por mês, somadas. É a base do break-even ao mix. */
  unidadesMes: number;
  /**
   * A parte da receita que veio declarada em bloco, sem ofertas por
   * trás. O break-even precisa de a distinguir: receita sem unidades não
   * se converte em «quantas vendas por mês».
   */
  receitaBaseMes: number;
}

/**
 * O overhead que conta para o negócio.
 *
 * Exclui o que está marcado como `escopo: "oferta"` — esse já vive dentro
 * do preço de uma oferta e voltar a somá-lo é a dupla contagem do §8.
 */
export function overheadMensal(estrutura: EstruturaNegocio | undefined): number {
  return cent(
    (estrutura?.overheadMensal ?? [])
      .filter(contaParaONegocio)
      .reduce((s, c) => s + Math.max(0, num(c.mensal)), 0),
  );
}

export const contaParaONegocio = (c: CustoEstrutura): boolean => c.escopo !== "oferta";

/**
 * Há ALGUÉM contratado, ou só uma linha em branco?
 *
 * §41: `trabalhadores.length > 0` fazia um cartão vazio — sem função e sem
 * salário — subir a confiança do modelo inteiro para «estruturado». Um
 * trabalhador a zero euros não é uma decisão declarada: é um clique em
 * «Adicionar» que ficou por preencher, e não pode valer como resposta.
 * Um pressuposto por confirmar não pode disfarçar-se de pressuposto
 * confirmado só porque ocupa uma linha no ecrã.
 */
export function temTrabalhadorValido(estrutura: EstruturaNegocio | undefined): boolean {
  return (estrutura?.trabalhadores ?? []).some((t) => num(t.remuneracao?.salarioBaseMensal) > 0);
}

/** A entrada do motor de payroll a partir do contrato do negócio. */
export function entradaDoPosto(t: TrabalhadorPlaneado): EntradaCustoPosto {
  const refeicao = t.refeicao?.ativo
    ? {
        valorDia: Math.max(0, num(t.refeicao.valorDia)),
        diasMes: Math.max(0, num(t.refeicao.diasMes)),
        cartao: t.refeicao.cartao,
      }
    : undefined;

  return {
    salarioBaseMensal: Math.max(0, num(t.remuneracao?.salarioBaseMensal)),
    pagamentoSubsidios: t.contrato?.pagamentoSubsidios ?? "normal",
    inicioMes: Math.max(0, num(t.contrato?.inicioMes)),
    refeicao,
    // `undefined` e `0` são coisas diferentes: `undefined` é «ainda não
    // sei» (vira pressuposto), `0` é «não pago nada». Preservar essa
    // diferença é o que separa uma estimativa de uma omissão.
    seguroAT: { anual: t.seguroAT?.premioAnual },
    sst: { anual: t.sst?.custoAnual },
    formacao: { anual: t.formacao?.custoAnual },
    outrosAnual: num(t.outrosAnual),
    perfil: t.perfil,
  };
}

/** O custo completo de cada posto, calculado uma vez e reutilizado. */
export function custosDosPostos(
  estrutura: EstruturaNegocio | undefined,
): { trabalhador: TrabalhadorPlaneado; custo: ResultadoCustoPosto }[] {
  return (estrutura?.trabalhadores ?? [])
    .filter((t) => num(t.remuneracao?.salarioBaseMensal) > 0)
    .map((t) => ({ trabalhador: t, custo: custoDoPosto(entradaDoPosto(t)) }));
}

/**
 * O custo mensal ESTABILIZADO de ter alguém contratado.
 *
 * ── O QUE MUDOU NA v2 (§25-27) ─────────────────────────────────────
 * Era `bruto × meses × (1 + TSU) ÷ 12`, e ficava por aí. Deixava de fora
 * o subsídio de refeição, o seguro de acidentes de trabalho (que é
 * obrigatório desde o primeiro dia), a medicina do trabalho e a formação
 * — tudo dinheiro que sai da empresa todos os meses.
 *
 * Agora delega em `lib/payroll/custo-empregador.ts`, que chama o motor de
 * vencimento. Nenhuma fórmula de salários vive neste diretório (§26), e a
 * TSU já não é escrita aqui: chega através do motor que a lê de
 * `fiscal-data.ts`.
 *
 * ⚠️ ESTABILIZADO quer dizer: como se a pessoa lá estivesse o ano
 * inteiro. É o número certo para o break-even. O PRIMEIRO ANO, com a data
 * de entrada respeitada, é `custoTrabalhadoresPrimeiroAnoMensal()` — e
 * confundi-los faz um negócio que contrata em julho parecer que paga doze
 * meses de salários no primeiro ano (§38).
 */
export function custoTrabalhadoresMensal(estrutura: EstruturaNegocio | undefined): number {
  return cent(
    custosDosPostos(estrutura).reduce((s, p) => s + p.custo.empresa.custoMedioMensal, 0),
  );
}

/**
 * O mesmo custo, mas só com os meses em que cada pessoa trabalha (§38).
 *
 * `entraNoMes` existia no contrato v1 e não fechava o ciclo: a conta
 * anual ignorava-o, e o primeiro ano de um negócio que contrata a meio do
 * ano saía sistematicamente acima da verdade.
 */
export function custoTrabalhadoresPrimeiroAnoMensal(
  estrutura: EstruturaNegocio | undefined,
): number {
  return cent(
    custosDosPostos(estrutura).reduce((s, p) => s + p.custo.primeiroAno.custoMedioMensal, 0),
  );
}

/**
 * Agrega o negócio a um conjunto de volumes.
 *
 * `volumes` permite correr o mesmo negócio com outras unidades por oferta
 * — é o que a sensibilidade usa para os choques de volume sem tocar no
 * contexto guardado.
 */
export function agregar(
  contexto: ContextoNegocio,
  opcoes: { volumes?: Readonly<Record<string, number>> } = {},
): AgregadoNegocio {
  const resultados = contexto.ofertas.map((oferta) =>
    calcularOferta(oferta, { unidades: opcoes.volumes?.[oferta.id] }),
  );

  // A base declarada soma-se às ofertas; não as substitui. Quem começou
  // pela contabilidade e depois modelou uma oferta nova quer as duas
  // coisas no mesmo negócio — e é aqui, e só aqui, que se juntam.
  const base = agregarBase(contexto.base, regiaoDoNegocio(contexto));

  const receitaSemIVAMes = cent(
    resultados.reduce((s, r) => s + r.mensal.receitaSemIVA, 0) + base.receitaSemIVAMes,
  );
  const receitaClienteMes = cent(
    resultados.reduce((s, r) => s + r.mensal.receitaCliente, 0) + base.receitaClienteMes,
  );
  const ivaCobradoMes = cent(receitaClienteMes - receitaSemIVAMes);

  const custosVariaveisMes = cent(
    resultados.reduce((s, r) => s + r.custosVariaveisOperacionaisMes, 0) + base.custosVariaveisMes,
  );
  const encargosVendedorMes = cent(resultados.reduce((s, r) => s + r.encargosVendedorMes, 0));
  const margemContribuicaoMes = cent(receitaSemIVAMes - custosVariaveisMes);

  const overheadMes = overheadMensal(contexto.estrutura);
  const custoTrabalhadoresMes = custoTrabalhadoresMensal(contexto.estrutura);
  const custosFixosMes = cent(overheadMes + custoTrabalhadoresMes);

  const resultadoOperacionalMes = cent(margemContribuicaoMes - custosFixosMes);

  // O peso só existe depois de haver total — preenchê-lo dentro de
  // `calcularOferta` teria dado um número que ninguém podia usar.
  const comPeso = resultados.map((r) => ({
    ...r,
    peso: dividir(r.mensal.receitaSemIVA, receitaSemIVAMes),
  }));

  return {
    ofertas: comPeso,
    receitaClienteMes,
    receitaSemIVAMes,
    ivaCobradoMes,
    custosVariaveisMes,
    margemContribuicaoMes,
    overheadMes,
    custoTrabalhadoresMes,
    custosFixosMes,
    resultadoOperacionalMes,
    encargosVendedorMes,
    resultadoDepoisEncargosMes: cent(resultadoOperacionalMes - encargosVendedorMes),
    temFiscalidadeVendedor: resultados.some((r) => r.preco.fiscal.aplicavel),
    unidadesMes: resultados.reduce((s, r) => s + r.unidadesMes, 0),
    receitaBaseMes: base.receitaSemIVAMes,
  };
}

/**
 * Os custos operacionais ANUAIS — variáveis mais fixos, sem os impostos
 * pessoais do vendedor.
 *
 * É este o número que vai para `despesasOper` do motor de empresa e para
 * `despesas` do comparador. Ambos calculam o imposto a partir dele; se
 * lhe metêssemos SS e IRS de um TI, os dois estariam a deduzir ao lucro
 * um imposto que ainda não foi calculado.
 */
export const custosOperacionaisAnuais = (a: AgregadoNegocio): number =>
  cent((a.custosVariaveisMes + a.custosFixosMes) * 12);
