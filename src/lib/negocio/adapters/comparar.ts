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
// ═══════════════════════════════════════════════════════════════════════

import type { ComparacaoInput, TipoAtividade } from "@/lib/fiscal";
import type { Regiao } from "@/lib/fiscal-data";
import type { ContextoNegocio, ResultadoNegocio } from "../tipos";

export interface EntradaComparacao {
  brutoAnual: number;
  despesas: number;
  tipo: TipoAtividade;
  residenciaFiscal?: Regiao;
}

/**
 * A atividade do negócio, tal como a pricing engine já a conhece.
 *
 * ⚠️ NUNCA se pergunta a atividade outra vez. Ela foi escolhida na
 * oferta, com o `ActivityCombobox` e o catálogo `ATIVIDADES`; pedi-la de
 * novo aqui criaria uma segunda resposta para a mesma pergunta, e duas
 * respostas divergentes dão dois números diferentes para o mesmo caso.
 *
 * Com várias ofertas, ganha a da oferta com mais peso na receita: é a que
 * domina o rendimento e, portanto, o coeficiente que o IRS vai aplicar.
 */
export function atividadeDominante(negocio: ResultadoNegocio): TipoAtividade {
  const comPeso = [...negocio.ofertas].sort((a, b) => b.peso - a.peso);
  for (const r of comPeso) {
    const atividade = r.oferta.pricing.vendedor.atividade;
    if (atividade) return atividade;
  }
  return "art151";
}

/** O rótulo da atividade concreta, quando a oferta o guardou. */
export function atividadeLabelDominante(negocio: ResultadoNegocio): string | undefined {
  const comPeso = [...negocio.ofertas].sort((a, b) => b.peso - a.peso);
  return comPeso.find((r) => r.oferta.pricing.vendedor.atividadeLabel)?.oferta.pricing.vendedor
    .atividadeLabel;
}

export function paraComparacao(
  negocio: ResultadoNegocio,
  contexto?: ContextoNegocio,
): EntradaComparacao {
  return {
    brutoAnual: negocio.receitaSemIVAAno,
    despesas: negocio.custosOperacionaisAno,
    tipo: atividadeDominante(negocio),
    residenciaFiscal: contexto?.fiscal.regiao,
  };
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
    residenciaFiscal: base.residenciaFiscal,
  };
}
