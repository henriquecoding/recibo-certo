// ═══════════════════════════════════════════════════════════════════════
//  UMA OFERTA — do `ContextoPreco` ao dinheiro que ela gera por mês
//  ---------------------------------------------------------------------
//  Este ficheiro não calcula preço nenhum. Chama `precificar()` e faz
//  três coisas com o que vem de volta:
//
//   1. multiplica pelo volume, com os nomes certos (§17 do relatório);
//   2. SEPARA os impostos pessoais do vendedor dos custos da operação;
//   3. deriva a capacidade a partir do modelo de tempo que já existe.
//
//  ── PORQUE É QUE (2) NÃO É OPCIONAL ────────────────────────────────
//  `resultado.custo.variaveisTotais` inclui a Segurança Social e o IRS de
//  quem passa recibos verdes — e tem de incluir, porque na formação do
//  preço eles são frações da faturação, ao lado das comissões.
//
//  Mas o negócio tem de os separar por duas razões independentes:
//
//   · o motor de empresa recebe `despesasOper` e calcula o IRC ELE
//     PRÓPRIO. Mandar-lhe lá dentro a Segurança Social de um TI seria
//     dar à sociedade uma despesa que ela não tem, e baixar-lhe o IRC
//     com um custo inventado;
//   · o comparador recebe `brutoAnual` e calcula os três enquadramentos
//     ELE PRÓPRIO. Um custo que já contém o imposto de um deles faz o
//     imposto ser contado duas vezes no cenário independente e uma vez a
//     mais nos outros dois.
//
//  A separação é EXATA, não aproximada: parte-se de `variaveisTotais`
//  (que a engine define como «tudo o que não é lucro») e subtraem-se os
//  euros de SS e IRS que a própria engine reporta. A identidade
//  `preçoLíquido = operacional + encargos + contribuição` mantém-se ao
//  cêntimo, e há um teste que a exige.
// ═══════════════════════════════════════════════════════════════════════

import { precificar } from "@/lib/pricing";
import { calcularTempo, capacidadeMensal } from "@/lib/pricing/motores/tempo";
import { cent, dividir, naoNegativo, num } from "@/lib/pricing/numeros";
import type {
  CapacidadeOferta,
  OfertaNegocio,
  ResultadoOfertaNegocio,
  UnidadeCapacidade,
  VolumeOferta,
} from "./tipos";
import type { ContextoPreco, ResultadoPreco } from "@/lib/pricing/tipos";

/** Os três cenários de volume, com os extremos derivados quando faltam. */
export function cenariosDeVolume(v: VolumeOferta): {
  conservador: number;
  esperado: number;
  ambicioso: number;
} {
  const esperado = Math.max(0, Math.round(num(v.esperadoMes)));
  // Derivar em vez de exigir: quem ainda não pensou no mau mês não deve
  // ser obrigado a inventar um número para ver a faixa. −40%/+50% é o
  // pressuposto, e aparece no livro de pressupostos como tal.
  const conservador =
    v.conservadorMes === undefined
      ? Math.max(0, Math.floor(esperado * 0.6))
      : Math.max(0, Math.round(num(v.conservadorMes)));
  const ambicioso =
    v.ambiciosoMes === undefined
      ? Math.max(esperado, Math.ceil(esperado * 1.5))
      : Math.max(0, Math.round(num(v.ambiciosoMes)));

  return { conservador, esperado, ambicioso };
}

/** `true` quando os extremos foram derivados por nós, não escritos. */
export const volumeDerivado = (v: VolumeOferta): boolean =>
  v.conservadorMes === undefined || v.ambiciosoMes === undefined;

/**
 * A unidade em que esta oferta se conta. Sai do cenário da pricing
 * engine — não é mais uma pergunta.
 */
export function unidadeDe(contexto: ContextoPreco): UnidadeCapacidade {
  switch (contexto.cenario) {
    case "servico_hora":
      return "horas";
    case "projeto":
    case "encomenda":
      return "projetos";
    case "servico":
      return "clientes";
    default:
      return "unidades";
  }
}

/**
 * A capacidade máxima desta oferta, derivada do modelo de tempo que a
 * pricing engine já tem.
 *
 * Reutiliza `calcularTempo` + `capacidadeMensal` — os dois só precisam de
 * horas/semana, férias, semanas sem cliente, taxa faturável e horas por
 * unidade, e nenhum deles depende dos custos fixos nem da fração fiscal
 * que se passam a zero aqui. Escrever a divisão outra vez seria uma
 * segunda definição de «horas produtivas» a divergir da primeira.
 *
 * Devolve `null` quando não há tempo declarado: uma revenda não tem
 * capacidade derivável, e inventar uma seria pior do que não ter.
 */
export function capacidadeDerivada(contexto: ContextoPreco): CapacidadeOferta | null {
  if (!contexto.tempo || naoNegativo(contexto.tempo.horasPorUnidade) <= 0) return null;

  const tempo = calcularTempo({ tempo: contexto.tempo, custosFixosAnuais: 0, fracaoFiscal: 0 });
  const maximo = capacidadeMensal(tempo);
  if (maximo === null || maximo <= 0 || !tempo) return null;

  const horas = Math.round(tempo.horasProdutivasMes);
  const porUnidade = contexto.tempo.horasPorUnidade;

  return {
    unidade: unidadeDe(contexto),
    maximoMes: maximo,
    motivo: `${horas} h faturáveis por mês, ${fmtHoras(porUnidade)} por cada`,
    derivada: true,
  };
}

/** A capacidade em vigor: a declarada ganha à derivada. */
export const capacidadeDe = (oferta: OfertaNegocio): CapacidadeOferta | null =>
  oferta.capacidade ?? capacidadeDerivada(oferta.pricing);

/**
 * Horas que um dado volume consome por mês. `undefined` quando a oferta
 * não consome tempo declarado — um ficheiro descarregado não gasta horas.
 */
export function horasConsumidas(contexto: ContextoPreco, unidades: number): number | undefined {
  const h = naoNegativo(contexto.tempo?.horasPorUnidade);
  if (h <= 0) return undefined;
  return h * Math.max(0, unidades);
}

/**
 * O resultado de uma oferta a um volume dado.
 *
 * `peso` fica a zero — só o agregador sabe qual é o total, e preenchê-lo
 * aqui com um valor provisório seria convidar alguém a lê-lo antes de
 * estar certo.
 */
export function calcularOferta(
  oferta: OfertaNegocio,
  opcoes: { unidades?: number } = {},
): ResultadoOfertaNegocio {
  const cenarios = cenariosDeVolume(oferta.volume);
  const unidades = Math.max(0, Math.round(num(opcoes.unidades ?? cenarios.esperado)));

  // O preço é calculado com o volume DA OFERTA, não com o volume do
  // cenário que estamos a testar: os custos fixos por unidade e o
  // break-even da própria engine repartem-se pelo volume esperado, e
  // mudá-lo aqui faria o preço mexer a cada choque de sensibilidade —
  // que é precisamente o que um teste de volume não deve fazer.
  const preco: ResultadoPreco = precificar(oferta.pricing);

  const precoLiquido = num(preco.precoLiquido);
  const pvp = num(preco.pvp);

  const receitaSemIVA = cent(precoLiquido * unidades);
  const receitaCliente = cent(pvp * unidades);
  const ivaCobrado = cent(receitaCliente - receitaSemIVA);

  // ── A separação que este ficheiro existe para fazer ───────────────
  const encargosUnidade = preco.fiscal.aplicavel
    ? naoNegativo(preco.fiscal.ssPorUnidade) + naoNegativo(preco.fiscal.irsPorUnidade)
    : 0;
  // «Tudo o que não é lucro», menos os impostos da pessoa. Por definição,
  // e não por soma de parcelas: somar outra vez as parcelas seria uma
  // segunda definição de custo variável, a divergir da do solver.
  const operacionalUnidade = Math.max(0, num(preco.custo.variaveisTotais) - encargosUnidade);

  const custosVariaveisOperacionaisMes = cent(operacionalUnidade * unidades);
  const encargosVendedorMes = cent(encargosUnidade * unidades);
  const contribuicaoMes = cent(receitaSemIVA - custosVariaveisOperacionaisMes);

  return {
    oferta,
    preco,
    ok: preco.ok,
    unidadesMes: unidades,
    mensal: { receitaCliente, receitaSemIVA, ivaCobrado },
    custosVariaveisOperacionaisMes,
    encargosVendedorMes,
    contribuicaoMes,
    contribuicaoPercentagem: dividir(contribuicaoMes, receitaSemIVA),
    peso: 0,
    horasMes: horasConsumidas(oferta.pricing, unidades),
  };
}

const fmtHoras = (h: number): string => {
  const n = num(h);
  if (n >= 1) return `${n.toFixed(n % 1 === 0 ? 0 : 1).replace(".", ",")} h`;
  return `${Math.round(n * 60)} min`;
};
