// ═══════════════════════════════════════════════════════════════════════
//  NEGÓCIO → MOTOR DE IVA
//  ---------------------------------------------------------------------
//  §49-50 e §53 do relatório. `fiscal-iva.ts` já sabe determinar isenção
//  do Art. 53.º, perda de isenção, transição, operação isenta pela
//  natureza, taxa efetiva, região, incoerências e periodicidade
//  mensal/trimestral do Art. 41.º.
//
//  O Estúdio protegia bem a fronteira que mais custa — «IVA cobrado ≠
//  receita» — e não usava mais nada dessa inteligência. A projeção de
//  caixa neutralizava o IVA no mesmo mês por não saber o calendário, e o
//  ecrã nunca dizia em que regime a pessoa provavelmente vai cair.
//
//  ── O QUE ESTE ADAPTER NÃO FAZ ─────────────────────────────────────
//  Não decide nada sobre IVA. Traduz o negócio para a entrada do motor e
//  devolve o que ele responde. §53: «não codificar o limiar outra vez em
//  `negocio/caixa.ts`».
// ═══════════════════════════════════════════════════════════════════════

import { situacaoIVA, type EntidadeIVA, type SituacaoIVA } from "@/lib/fiscal-iva";
import type { RegimeIVA } from "@/lib/fiscal";
import type { RegimeIVAVendedor } from "@/lib/pricing/tipos";
import { regiaoDoNegocio } from "../localizacao";
import type { ContextoNegocio, ResultadoNegocio } from "../tipos";

/**
 * O regime de IVA que as ofertas declaram, no vocabulário do motor.
 *
 * `nao_sei` fica `isento`: é o estado que faz o motor explicar o Art. 53.º
 * em vez de assumir que já se liquida imposto. Assumir «normal» a quem
 * ainda não sabe seria responder por ela à pergunta que ela veio fazer.
 */
export function regimeDoNegocio(contexto: ContextoNegocio): RegimeIVA {
  const regimes = contexto.ofertas
    .map((o) => o.pricing.vendedor.regimeIVA)
    .filter((r): r is RegimeIVAVendedor => Boolean(r));

  // Basta UMA oferta em regime normal para o negócio liquidar IVA: a
  // isenção do Art. 53.º é do sujeito passivo, não da operação.
  if (regimes.some((r) => r === "normal" || r === "margem")) return "normal";
  if (regimes.length > 0 && regimes.every((r) => r === "isento_art9")) return "isento";
  return "isento";
}

/** Sociedade ou trabalhador independente, no vocabulário do motor. */
export function entidadeDoNegocio(contexto: ContextoNegocio): EntidadeIVA {
  return contexto.fiscal.enquadramento === "sociedade" ? "sociedade" : "ti";
}

/**
 * A situação de IVA provável deste negócio.
 *
 * Usa o volume de negócios que o modelo produziu — não um número que se
 * peça outra vez. §0: «uma resposta já dada não volta a ser uma
 * pergunta».
 */
export function situacaoIVADoNegocio(
  contexto: ContextoNegocio,
  negocio: Pick<ResultadoNegocio, "receitaSemIVAAno">,
): SituacaoIVA {
  return situacaoIVA({
    faturacaoAnual: negocio.receitaSemIVAAno,
    regiao: regiaoDoNegocio(contexto),
    regimeEscolhido: regimeDoNegocio(contexto),
    entidade: entidadeDoNegocio(contexto),
  });
}

/**
 * A periodicidade de entrega, para o calendário de caixa (§53).
 *
 * `null` quando o motor não a determina — hoje, para quem não é
 * sociedade. Nesse caso a caixa NÃO inventa um calendário: o IVA fica
 * fora dos fluxos, que é a decisão provisória honesta da v1 e continua a
 * ser a certa enquanto o motor não souber mais.
 */
export function periodicidadeIVA(
  contexto: ContextoNegocio,
  negocio: Pick<ResultadoNegocio, "receitaSemIVAAno" | "ivaCobradoMes">,
): "mensal" | "trimestral" | null {
  if (negocio.ivaCobradoMes <= 0) return null;
  return situacaoIVADoNegocio(contexto, negocio).periodicidade;
}
