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

import { IVA_TAXAS, SS_DEPENDENTE, type Regiao } from "@/lib/fiscal-data";
import { cent, dividir, naoNegativo, num } from "@/lib/pricing/numeros";
import { calcularOferta } from "./ofertas";
import type {
  BaseDeclarada,
  ContextoNegocio,
  CustoEstrutura,
  EstruturaNegocio,
  ResultadoOfertaNegocio,
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
  return (estrutura?.trabalhadores ?? []).some((t) => num(t.salarioBrutoMensal) > 0);
}

/**
 * O custo mensal de ter alguém contratado — o BRUTO mais a TSU da
 * entidade, repartido pelos 12 meses do ano.
 *
 * A taxa vem de `fiscal-data.ts` (Código Contributivo). Escrevê-la aqui
 * seria criar uma segunda fonte para um número que é lei — o defeito que
 * `assertFiscalDataIntegrity()` existe para apanhar.
 *
 * ⚠️ NÃO inclui subsídio de refeição, seguro de acidentes de trabalho nem
 * formação obrigatória: são custos reais e variáveis por caso, e vão para
 * o overhead como qualquer outra despesa declarada. Um valor inventado
 * para eles seria pior do que a omissão que o pressuposto declara.
 */
export function custoTrabalhadoresMensal(estrutura: EstruturaNegocio | undefined): number {
  const tsu = SS_DEPENDENTE.entidade.value;
  return cent(
    (estrutura?.trabalhadores ?? []).reduce((s, t) => {
      const bruto = Math.max(0, num(t.salarioBrutoMensal));
      const meses = t.meses === 14 ? 14 : 12;
      return s + dividir(bruto * meses * (1 + tsu), 12);
    }, 0),
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
  const base = agregarBase(contexto.base, contexto.fiscal?.regiao);

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
