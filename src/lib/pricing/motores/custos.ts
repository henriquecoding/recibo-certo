// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE CUSTOS
//  ---------------------------------------------------------------------
//  «Custo do produto» não é um número — são quatro famílias que se
//  comportam de maneira diferente e que a pergunta certa separa:
//
//    · direto      «quanto te custa a unidade que vendes?»
//    · variável    «acontece SÓ quando vendes?»
//    · fixo        «acontece MESMO QUE NÃO vendas?»
//    · oculto      «já contaste o teu tempo? e o desperdício? e as devoluções?»
//
//  E há três subtilezas que quase toda a gente erra:
//
//   1. DESPERDÍCIO DIVIDE, não multiplica. Se 10% se estraga, cada unidade
//      VENDIDA carrega o custo de 1/0,9 = 1,111 unidades produzidas — não
//      de 1,1. A diferença cresce depressa: a 30% de quebra são 1,43 contra
//      1,3, ou seja 10% de custo desaparecido.
//
//   2. DEVOLUÇÕES incluem os portes de ida. O DL 24/2014 obriga o vendedor
//      a reembolsar os portes de entrega originais — logo, uma devolução
//      custa o retorno MAIS a entrega que já foi paga.
//
//   3. ESCALÕES DE QUANTIDADE são uma ESCADA, não uma reta. Comprar 60
//      unidades com escalões a 50 e a 100 dá o preço do escalão de 50.
//      Interpolar linearmente inventa um desconto que o fornecedor não deu.
// ═══════════════════════════════════════════════════════════════════════

import type { ModeloCustos, ModeloProducao, Regiao } from "../tipos";
import { cent, dividir, fracao, naoNegativo, num } from "../numeros";
import { custoRelevante, ivaDedutivel, ivaNaoDedutivel } from "./iva";

export interface ResultadoCustos {
  /** Custo direto por unidade, já com IVA resolvido, escalão e desperdício. */
  diretoAjustado: number;
  /** Antes de desperdício — para poder explicar a diferença. */
  diretoBase: number;
  /** Valor tal como o utilizador o introduziu. */
  diretoIntroduzido: number;
  /** IVA que fica preso no custo por não ser dedutível. */
  ivaPresoNoCusto: number;
  /**
   * IVA suportado na compra que É dedutível, por unidade. Não entra no
   * custo (quem deduz já tem o custo sem IVA) — entra na TESOURARIA, onde
   * abate ao IVA liquidado antes de se entregar o saldo ao Estado.
   */
  ivaDedutivel: number;
  /** Acréscimo em euros causado pelo desperdício. */
  custoDoDesperdicio: number;
  /** Euros por unidade que não dependem do preço. */
  variaveisFixos: number;
  /** Detalhe para a explicação. */
  variaveisDetalhe: { rotulo: string; valor: number }[];
  /** Custo esperado de devoluções por venda. */
  devolucoes: number;
  /** Custos fixos mensais, somados. */
  fixosMensais: number;
  fixosDetalhe: { rotulo: string; valor: number }[];
  /** Quota de custos fixos por unidade ao volume esperado. */
  fixosPorUnidade: number;
}

/**
 * Custo unitário de compra ao volume esperado, respeitando os escalões.
 * A escada escolhe o MAIOR escalão cuja quantidade já foi atingida.
 */
export function custoPorEscalao(
  custoBase: number,
  escaloes: ModeloCustos["escaloes"],
  quantidade: number,
): number {
  const base = naoNegativo(custoBase);
  if (!escaloes || escaloes.length === 0) return base;

  const q = naoNegativo(quantidade);
  const aplicaveis = escaloes
    .filter((e) => naoNegativo(e.quantidade) <= q && naoNegativo(e.custoUnitario) > 0)
    .sort((a, b) => b.quantidade - a.quantidade);

  return aplicaveis.length > 0 ? naoNegativo(aplicaveis[0].custoUnitario) : base;
}

/**
 * Custo unitário de produção própria.
 *
 * A depreciação é o item que as pessoas esquecem sempre: a máquina que
 * custou 3 000 € e dura 5 anos são 50 €/mês que existem quer se produza
 * quer não. Reparti-la pelas unidades produzidas é a única forma de o
 * preço a cobrir.
 */
export function custoProducaoUnitario(
  producao: ModeloProducao | undefined,
  regiao: Regiao,
  deduz: boolean,
): { total: number; detalhe: { rotulo: string; valor: number }[] } {
  const detalhe: { rotulo: string; valor: number }[] = [];
  if (!producao) return { total: 0, detalhe };

  let total = 0;

  for (const m of producao.materias ?? []) {
    const custoLote = custoRelevante(m.custoLote, regiao, deduz);
    const unidades = Math.max(1, naoNegativo(m.unidadesPorLote, 1));
    const porUnidade = dividir(custoLote, unidades);
    if (porUnidade > 0) {
      detalhe.push({ rotulo: m.rotulo || "Matéria-prima", valor: porUnidade });
      total += porUnidade;
    }
  }

  const horas = naoNegativo(producao.horasPorUnidade);
  const custoHora = naoNegativo(producao.custoHoraMaoObra);
  if (horas > 0 && custoHora > 0) {
    const maoObra = horas * custoHora;
    detalhe.push({ rotulo: "Mão de obra", valor: maoObra });
    total += maoObra;
  }

  const energia = naoNegativo(producao.energiaPorUnidade);
  if (energia > 0) {
    detalhe.push({ rotulo: "Energia e consumíveis", valor: energia });
    total += energia;
  }

  const depMensal = naoNegativo(producao.depreciacaoMensal);
  const unidadesMes = naoNegativo(producao.unidadesMes);
  if (depMensal > 0 && unidadesMes > 0) {
    const dep = dividir(depMensal, unidadesMes);
    detalhe.push({ rotulo: "Depreciação de equipamento", valor: dep });
    total += dep;
  }

  return { total, detalhe };
}

export function calcularCustos(input: {
  custos: ModeloCustos;
  producao?: ModeloProducao;
  regiao: Regiao;
  deduzIVA: boolean;
  unidadesMes: number;
}): ResultadoCustos {
  const { custos, producao, regiao, deduzIVA, unidadesMes } = input;
  const q = naoNegativo(unidadesMes);

  // ── 1. Custo direto ────────────────────────────────────────────────
  const producaoRes = custoProducaoUnitario(producao, regiao, deduzIVA);

  const diretoIntroduzido = naoNegativo(custos?.direto?.valor);
  const diretoRelevanteBruto =
    producaoRes.total > 0
      ? producaoRes.total
      : custoRelevante(custos.direto, regiao, deduzIVA);

  // Escalões só se aplicam à compra, não à produção própria.
  const diretoBase =
    producaoRes.total > 0
      ? producaoRes.total
      : custoPorEscalao(diretoRelevanteBruto, custos.escaloes, q);

  // As duas faces do mesmo IVA de compra: o que fica preso no custo (quem
  // não deduz) e o que se recupera na declaração periódica (quem deduz).
  const porUnidadeDasMaterias = (
    imposto: (v: ModeloCustos["direto"]) => number,
  ): number =>
    (producao?.materias ?? []).reduce(
      (soma, m) =>
        soma + dividir(imposto(m.custoLote), Math.max(1, naoNegativo(m.unidadesPorLote, 1))),
      0,
    );

  const ivaPresoNoCusto =
    producaoRes.total > 0
      ? porUnidadeDasMaterias((v) => ivaNaoDedutivel(v, regiao, deduzIVA))
      : ivaNaoDedutivel(custos.direto, regiao, deduzIVA);

  // Escala com o desperdício pela mesma razão que o custo: o IVA suportado
  // é o das unidades COMPRADAS, não o das vendidas.
  const wDesperdicio = fracao(custos.desperdicio, 0, 0.95);
  const ivaDedutivelBase =
    producaoRes.total > 0
      ? porUnidadeDasMaterias((v) => ivaDedutivel(v, regiao, deduzIVA))
      : ivaDedutivel(custos.direto, regiao, deduzIVA);
  const ivaDedutivelPorUnidade =
    wDesperdicio > 0
      ? dividir(ivaDedutivelBase, 1 - wDesperdicio, ivaDedutivelBase)
      : ivaDedutivelBase;

  // ── 2. Desperdício: divide, não multiplica ─────────────────────────
  const w = wDesperdicio;
  const diretoAjustado = w > 0 ? dividir(diretoBase, 1 - w, diretoBase) : diretoBase;
  const custoDoDesperdicio = diretoAjustado - diretoBase;

  // ── 3. Variáveis em euros por unidade ──────────────────────────────
  const variaveisDetalhe: { rotulo: string; valor: number }[] = [];
  let variaveisFixos = 0;

  for (const v of custos.variaveis ?? []) {
    const valor = naoNegativo(v.porUnidade);
    if (valor > 0) {
      variaveisDetalhe.push({ rotulo: v.rotulo || "Custo variável", valor });
      variaveisFixos += valor;
    }
  }

  const portes = naoNegativo(custos.portesAbsorvidos);
  if (portes > 0) {
    variaveisDetalhe.push({ rotulo: "Portes que pagas tu", valor: portes });
    variaveisFixos += portes;
  }

  // CAC só conta na fração de vendas a clientes novos.
  const cac = naoNegativo(custos.cac);
  const fracNovos = fracao(custos.fracaoClientesNovos ?? 1, 0, 1);
  if (cac > 0 && fracNovos > 0) {
    const cacEfetivo = cac * fracNovos;
    variaveisDetalhe.push({
      rotulo: fracNovos < 1 ? `Aquisição de cliente (${Math.round(fracNovos * 100)}% das vendas)` : "Aquisição de cliente",
      valor: cacEfetivo,
    });
    variaveisFixos += cacEfetivo;
  }

  // ── 4. Devoluções ──────────────────────────────────────────────────
  // Inclui os portes de ida porque o DL 24/2014 obriga a reembolsá-los.
  const taxaDev = fracao(custos.taxaDevolucao, 0, 0.95);
  const custoDev = naoNegativo(custos.custoDevolucao);
  const devolucoes = taxaDev > 0 ? taxaDev * (custoDev + portes) : 0;
  if (devolucoes > 0) {
    variaveisDetalhe.push({
      rotulo: `Devoluções esperadas (${(taxaDev * 100).toFixed(1).replace(".", ",")}%)`,
      valor: devolucoes,
    });
  }

  // ── 5. Fixos ───────────────────────────────────────────────────────
  const fixosDetalhe: { rotulo: string; valor: number }[] = [];
  let fixosMensais = 0;
  for (const f of custos.fixos ?? []) {
    const valor = naoNegativo(f.mensal);
    if (valor > 0) {
      fixosDetalhe.push({ rotulo: f.rotulo || "Custo fixo", valor });
      fixosMensais += valor;
    }
  }
  const fixosPorUnidade = q > 0 ? dividir(fixosMensais, q) : 0;

  return {
    diretoAjustado,
    diretoBase,
    diretoIntroduzido,
    ivaPresoNoCusto,
    ivaDedutivel: ivaDedutivelPorUnidade,
    custoDoDesperdicio,
    variaveisFixos: variaveisFixos + devolucoes,
    variaveisDetalhe: producaoRes.detalhe.length > 0
      ? [...producaoRes.detalhe.map((d) => ({ ...d, valor: cent(d.valor) })), ...variaveisDetalhe]
      : variaveisDetalhe,
    devolucoes,
    fixosMensais,
    fixosDetalhe,
    fixosPorUnidade,
  };
}
