// ═══════════════════════════════════════════════════════════════════════
//  NEGÓCIO → COMPARADOR DE REGIMES
//  ---------------------------------------------------------------------
//  O comparador já compara trabalho dependente, recibos verdes e
//  sociedade, com pontos de viragem, dependentes, estado civil, região e
//  IRS Jovem. Nada disso se refaz aqui.
//
//  O que muda é a PERGUNTA que ele responde. Hoje pergunta-se:
//
//      «Para 60 000 € por ano, qual regime dá mais líquido?»
//
//  Com o negócio construído, passa a ser:
//
//      «Para o negócio que acabaste de montar — três ofertas, este
//       volume, esta estrutura — qual regime dá mais líquido?»
//
//  ── O CAMPO QUE NÃO SE PODE ENGANAR ────────────────────────────────
//  `brutoAnual` é bruto SEM IVA. O comparador aplica-lhe o coeficiente do
//  Art. 31.º, a Segurança Social e o IRS; se lá entrasse o valor com IVA,
//  os três cenários ficavam errados ao mesmo tempo e na mesma direção —
//  o que é pior do que um errado, porque a comparação continua a parecer
//  coerente.
//
//  ── E `despesas` ───────────────────────────────────────────────────
//  São as despesas da ATIVIDADE, comuns aos dois regimes. Não incluem SS
//  nem IRS: o comparador calcula-os. `agregar.ts` já os separou.
//
//  ── §46-48: O PORTEFÓLIO MISTO E A ATIVIDADE DESCONHECIDA ──────────
//  Este ficheiro reduzia o negócio inteiro à «atividade dominante» — a
//  natureza fiscal da oferta com mais peso. Isso está errado por duas
//  vias, e as duas custam dinheiro:
//
//   ① 40 000 € de consultoria (coef. 0,75) + 30 000 € de venda de
//      produtos (coef. 0,15) NÃO é 70 000 € de consultoria. Tratados como
//      tal, o rendimento tributável sobe ~18 000 € — e o IRS com ele;
//   ② a base da Segurança Social também difere (70% em serviços, 20% em
//      bens, Art. 162.º do Código Contributivo).
//
//  E quando NENHUMA oferta declarava atividade, a função devolvia
//  `"art151"`. Isso transforma ausência de informação numa decisão
//  fiscal — a pior espécie de pressuposto, porque não aparece em lado
//  nenhum. Agora a ausência tem um nome, e a interface pergunta.
// ═══════════════════════════════════════════════════════════════════════

import type { ComparacaoInput, TipoAtividade } from "@/lib/fiscal";
import {
  BASE_SS_POR_TIPO,
  COEFICIENTE_POR_TIPO,
  SS_COEFICIENTE,
  type Regiao,
} from "@/lib/fiscal-data";
import { cent, dividir } from "@/lib/pricing/numeros";
import type { ContextoNegocio, ResultadoNegocio } from "../tipos";

// ─── O portefólio, por natureza fiscal ─────────────────────────────────

export interface RendimentoPorNatureza {
  natureza: TipoAtividade;
  /** Volume de negócios ANUAL desta natureza, sem IVA. */
  valorAnual: number;
  /** As ofertas que o compõem, para a interface poder explicar. */
  ofertas: string[];
}

/**
 * O que se sabe sobre a natureza fiscal do negócio.
 *
 * `conhecida`    — todas as ofertas com receita declaram atividade;
 * `parcial`      — algumas declaram, outras não;
 * `desconhecida` — nenhuma declara, e não há conta precisa a fazer.
 */
export type EstadoNatureza = "conhecida" | "parcial" | "desconhecida";

export interface PortfolioFiscal {
  estado: EstadoNatureza;
  rendimentos: RendimentoPorNatureza[];
  /** Volume de negócios anual sem natureza fiscal declarada. */
  semNaturezaAnual: number;
  /** Volume de negócios anual total (com e sem natureza). */
  totalAnual: number;
  /**
   * Coeficiente do Art. 31.º, ponderado pelas naturezas conhecidas.
   * `null` quando não há nenhuma — não há média de um conjunto vazio.
   */
  coefIRS: number | null;
  /** Coeficiente da base contributiva, ponderado da mesma maneira. */
  coefSS: number | null;
}

/**
 * O portefólio decomposto por natureza fiscal.
 *
 * ⚠️ NUNCA se pergunta a atividade outra vez. Ela foi escolhida em cada
 * oferta, com o `ActivityCombobox` e o catálogo `ATIVIDADES`; pedi-la de
 * novo aqui criaria uma segunda resposta para a mesma pergunta, e duas
 * respostas divergentes dão dois números diferentes para o mesmo caso.
 *
 * O que se faz é AGREGAR por natureza — não reduzir a uma.
 */
export function portfolioFiscal(
  negocio: ResultadoNegocio,
  contexto?: ContextoNegocio,
): PortfolioFiscal {
  const porNatureza = new Map<TipoAtividade, RendimentoPorNatureza>();
  let semNaturezaMes = 0;

  for (const r of negocio.ofertas) {
    const valorMes = r.mensal.receitaSemIVA;
    if (valorMes <= 0) continue;

    const natureza = r.oferta.pricing.vendedor.atividade;
    if (!natureza) {
      semNaturezaMes += valorMes;
      continue;
    }

    const atual = porNatureza.get(natureza);
    if (atual) {
      atual.valorAnual = cent(atual.valorAnual + valorMes * 12);
      atual.ofertas.push(r.oferta.nome);
    } else {
      porNatureza.set(natureza, {
        natureza,
        valorAnual: cent(valorMes * 12),
        ofertas: [r.oferta.nome],
      });
    }
  }

  // A base declarada em bloco (§6) não passa por ofertas e por isso não
  // tem natureza. Não se lhe atribui uma — é exatamente o caso que §48
  // proíbe resolver em silêncio.
  const daBase = (contexto?.base?.volumeAnual ?? 0) > 0
    ? cent(negocio.receitaSemIVAAno - somaAnual([...porNatureza.values()]) - cent(semNaturezaMes * 12))
    : 0;
  const semNaturezaAnual = cent(semNaturezaMes * 12 + Math.max(0, daBase));

  const rendimentos = [...porNatureza.values()].sort((a, b) => b.valorAnual - a.valorAnual);
  const comNatureza = somaAnual(rendimentos);
  const totalAnual = cent(comNatureza + semNaturezaAnual);

  const estado: EstadoNatureza =
    comNatureza <= 0 ? "desconhecida" : semNaturezaAnual > 0 ? "parcial" : "conhecida";

  return {
    estado,
    rendimentos,
    semNaturezaAnual,
    totalAnual,
    coefIRS: comNatureza > 0 ? ponderar(rendimentos, (n) => COEFICIENTE_POR_TIPO[n]) : null,
    coefSS:
      comNatureza > 0
        ? ponderar(rendimentos, (n) => SS_COEFICIENTE[BASE_SS_POR_TIPO[n]].value)
        : null,
  };
}

const somaAnual = (r: readonly RendimentoPorNatureza[]): number =>
  cent(r.reduce((s, x) => s + x.valorAnual, 0));

/**
 * A média ponderada de um coeficiente pelas naturezas do portefólio.
 *
 * É exata para a parcela do coeficiente: Σ(valor × coef) é o mesmo que
 * total × média ponderada, por definição. Não é uma aproximação — é
 * álgebra, e é o que permite reutilizar o motor sem o forçar a aceitar
 * uma lista.
 */
function ponderar(
  rendimentos: readonly RendimentoPorNatureza[],
  coefDe: (n: TipoAtividade) => number,
): number {
  const total = somaAnual(rendimentos);
  if (total <= 0) return 0;
  const soma = rendimentos.reduce((s, r) => s + r.valorAnual * coefDe(r.natureza), 0);
  return dividir(soma, total);
}

/**
 * A natureza com mais peso — SÓ para rotular, nunca para calcular.
 *
 * Mantida porque a interface precisa de um nome para o cabeçalho da
 * comparação. `null` quando não há nenhuma: §48, a ausência tem um nome.
 */
export function naturezaPrincipal(negocio: ResultadoNegocio): TipoAtividade | null {
  const p = portfolioFiscal(negocio);
  return p.rendimentos[0]?.natureza ?? null;
}

/** O rótulo da atividade concreta, quando a oferta o guardou. */
export function atividadeLabelDominante(negocio: ResultadoNegocio): string | undefined {
  const comPeso = [...negocio.ofertas].sort((a, b) => b.peso - a.peso);
  return comPeso.find((r) => r.oferta.pricing.vendedor.atividadeLabel)?.oferta.pricing.vendedor
    .atividadeLabel;
}

// ─── A entrada do comparador ───────────────────────────────────────────

export interface EntradaComparacao {
  brutoAnual: number;
  despesas: number;
  /**
   * A natureza que o motor recebe em `tipo`. Só é usada com `coefIRS` e
   * `coefSS` a acompanhá-la — os coeficientes é que fazem a conta.
   */
  tipo: TipoAtividade;
  /** Média ponderada do Art. 31.º. `undefined` quando não se sabe. */
  coefIRS?: number;
  /** Média ponderada da base contributiva. */
  coefSS?: number;
  residenciaFiscal?: Regiao;
  /** O portefólio, para a interface poder explicar e avisar. */
  portfolio: PortfolioFiscal;
}

export function paraComparacao(
  negocio: ResultadoNegocio,
  contexto?: ContextoNegocio,
): EntradaComparacao {
  const portfolio = portfolioFiscal(negocio, contexto);

  return {
    brutoAnual: negocio.receitaSemIVAAno,
    despesas: negocio.custosOperacionaisAno,
    // `art151` aparece aqui como valor por omissão do CONTRATO do motor,
    // que exige um `tipo`. Não decide nada: quando há naturezas
    // conhecidas, são `coefIRS` e `coefSS` que mandam; quando não há, a
    // comparação não é apresentada como precisa (ver `comparacaoPossivel`).
    tipo: portfolio.rendimentos[0]?.natureza ?? "art151",
    coefIRS: portfolio.coefIRS ?? undefined,
    coefSS: portfolio.coefSS ?? undefined,
    residenciaFiscal: contexto?.fiscal.regiao,
    portfolio,
  };
}

/**
 * A comparação pode ser apresentada como um número, ou só como intervalo?
 *
 * §48: «nunca fingir precisão». Sem nenhuma natureza declarada, o
 * coeficiente do Art. 31.º pode ir de 0,15 a 0,75 — uma diferença que
 * muda o IRS por um fator de cinco. Apresentar um número nessas condições
 * é apresentar um palpite com autoridade de resultado.
 */
export function comparacaoPossivel(portfolio: PortfolioFiscal): boolean {
  return portfolio.estado !== "desconhecida";
}

/**
 * A entrada completa para `compararRegimes`, com o que o negócio sabe.
 *
 * Situação pessoal (dependentes, estado civil, deduções) NÃO vem daqui:
 * não é informação do negócio, e o comparador já a pede a quem a quiser
 * dar. Preenchê-la com valores por omissão faria a comparação parecer
 * personalizada quando não é.
 */
export function entradaComparacao(
  negocio: ResultadoNegocio,
  contexto?: ContextoNegocio,
): ComparacaoInput {
  const base = paraComparacao(negocio, contexto);
  return {
    brutoAnual: base.brutoAnual,
    despesas: base.despesas,
    tipo: base.tipo,
    coefOverride: base.coefIRS,
    coefBaseSS: base.coefSS,
    residenciaFiscal: base.residenciaFiscal,
  };
}

/**
 * Os dois extremos, para quando a natureza é desconhecida (§48, opção 2).
 *
 * Em vez de escolher uma atividade pela pessoa, mostra-se o intervalo que
 * a escolha dela vai fechar. Um intervalo honesto ensina o que está em
 * jogo; um número inventado esconde-o.
 */
export function extremosDaComparacao(
  negocio: ResultadoNegocio,
  contexto?: ContextoNegocio,
): { maisFavoravel: ComparacaoInput; menosFavoravel: ComparacaoInput } {
  const base = entradaComparacao(negocio, contexto);
  const coefs = Object.entries(COEFICIENTE_POR_TIPO) as [TipoAtividade, number][];
  const menor = coefs.reduce((m, x) => (x[1] < m[1] ? x : m));
  const maior = coefs.reduce((m, x) => (x[1] > m[1] ? x : m));

  return {
    // Coeficiente mais baixo → menos rendimento tributável → mais líquido.
    maisFavoravel: {
      ...base,
      tipo: menor[0],
      coefOverride: menor[1],
      coefBaseSS: SS_COEFICIENTE[BASE_SS_POR_TIPO[menor[0]]].value,
    },
    menosFavoravel: {
      ...base,
      tipo: maior[0],
      coefOverride: maior[1],
      coefBaseSS: SS_COEFICIENTE[BASE_SS_POR_TIPO[maior[0]]].value,
    },
  };
}
