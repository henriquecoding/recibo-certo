// ═══════════════════════════════════════════════════════════════════════
//  SOCIEDADE — do lucro operacional ao que chega ao dono
//  ---------------------------------------------------------------------
//  Para `vendedor.tipo === "empresa"`, o motor fiscal devolvia zero e uma
//  nota a dizer que o IRC incide sobre o lucro. Correto, e incompleto: a
//  pessoa ficava a saber que o preço lhe dá X de lucro operacional e sem
//  fazer ideia de quanto disso lhe chega ao bolso.
//
//  ── PORQUE É QUE ISTO NÃO PODE ENTRAR NO SOLVER ─────────────────────
//
//  O IRC não é fração da faturação. Incide sobre o lucro tributável, tem
//  escalões, derrama, tributações autónomas e benefícios — e depois ainda
//  há a segunda camada, a de tirar o dinheiro da empresa (salário de
//  gerência ou dividendos), cada uma com o seu IRS.
//
//  Meter isso em `v` seria o mesmo erro que já custou um preço errado com
//  a contabilidade organizada: aplicar a uma base o que incide noutra.
//  Por isso é uma CAMADA POR CIMA do resultado — lê o preço já resolvido,
//  projeta o ano e converte.
//
//  ── A ARMADILHA QUE A ANÁLISE DE JULHO IDENTIFICOU (§1.10) ──────────
//
//  Não apresentar o lucro retido como perdido. O dinheiro que fica na
//  empresa continua a ser do dono — está noutro bolso, não desapareceu.
//
//      riqueza total = líquido pessoal + lucro retido
//
//  Uma ferramenta que mostrasse só o líquido pessoal faria uma sociedade
//  parecer sempre pior do que é, e empurraria as pessoas para uma decisão
//  fiscal errada. `simularEmpresaOpcoes` já devolve as duas medidas; aqui
//  passam as duas para a frente, sempre.
//
//  Nenhum número fiscal é reimplementado: chama-se `simularEmpresaOpcoes`
//  de `fiscal-empresa.ts`, que é o motor que serve o comparador de regimes.
// ═══════════════════════════════════════════════════════════════════════

import { simularEmpresaOpcoes } from "../../fiscal-empresa";
import type { ContextoPreco } from "../tipos";
import { naoNegativo, num } from "../numeros";

export interface ConversaoSociedade {
  /** Faturação anual projetada a partir do preço e do volume esperado. */
  faturacaoAnual: number;
  /** Despesas operacionais anuais, do modelo de custos. */
  despesasAnuais: number;
  /** Lucro antes de IRC. */
  lucroTributavel: number;
  /** IRC + derrama + tributações autónomas. */
  ircTotal: number;
  /** O que sobra na empresa depois do IRC. */
  lucroLiquido: number;
  /** O que chega ao dono, já com o IRS dele. */
  liquidoPessoal: number;
  /** O que ficou na empresa por não ter sido distribuído. NÃO é perdido. */
  lucroRetido: number;
  /** Líquido pessoal + lucro retido. A medida honesta. */
  riquezaTotal: number;
  /** Riqueza total ÷ faturação. */
  taxaEfetiva: number;
  /**
   * A projeção assenta no volume esperado, que é uma estimativa da pessoa.
   * Marcado para a interface não a apresentar como um apuramento.
   */
  estimativa: true;
  notas: string[];
}

export interface EntradaSociedade {
  contexto: ContextoPreco;
  /** Preço líquido unitário já resolvido. */
  precoLiquido: number;
  /** Custos anuais do negócio, os mesmos que alimentaram a fiscalidade. */
  despesasAnuais: number;
}

/**
 * Converte o resultado de preço no que chega ao dono da sociedade.
 *
 * Devolve `null` quando não se aplica (não é sociedade) ou quando não há
 * volume para projetar um ano — sem volume, a projeção seria um número
 * inventado, e um vazio honesto vale mais.
 */
export function converterParaSocio(e: EntradaSociedade): ConversaoSociedade | null {
  const { contexto } = e;
  if (contexto.vendedor.tipo !== "empresa") return null;

  const unidadesMes = Math.max(0, num(contexto.volume?.unidadesMes));
  const preco = naoNegativo(e.precoLiquido);
  if (unidadesMes <= 0 || preco <= 0) return null;

  const faturacaoAnual = preco * unidadesMes * 12;
  const despesasAnuais = naoNegativo(e.despesasAnuais);

  const r = simularEmpresaOpcoes({
    faturacao: faturacaoAnual,
    despesasOper: despesasAnuais,
    // Sem salário de gerência declarado, o motor assume distribuição por
    // dividendos. É o cenário mais simples de explicar e o que a pessoa
    // tem em mente quando pergunta «quanto me chega».
    distribuirDividendos: true,
  });

  const notas: string[] = [
    "O IRC incide sobre o lucro, não sobre a faturação — por isso não entra no preço unitário. Entra aqui, depois de o preço estar decidido.",
  ];

  if (r.lucroRetido > 0.5) {
    notas.push(
      "O lucro que fica na empresa não é dinheiro perdido: continua a ser teu, noutro bolso. É por isso que o número que interessa é a riqueza total, e não só o que passou para a tua conta.",
    );
  }

  notas.push(
    "É uma projeção a partir do volume que esperas vender. Se o volume mudar, tudo isto muda — e um apuramento a sério precisa do teu contabilista.",
  );

  return {
    faturacaoAnual,
    despesasAnuais,
    lucroTributavel: r.lucroTributavel,
    ircTotal: r.ircTotal,
    lucroLiquido: r.lucroLiquido,
    liquidoPessoal: r.liquidoGerente,
    lucroRetido: r.lucroRetido,
    riquezaTotal: r.riquezaTotal,
    taxaEfetiva: r.taxaEfetivaRiqueza,
    estimativa: true,
    notas,
  };
}
