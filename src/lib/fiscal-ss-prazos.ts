// Prazos da Segurança Social do trabalhador independente.
//
// Viviam dentro de `GuardiaoSS.tsx` — um componente de UI a exportar regras
// que os testes fiscais importavam. Passam para a camada de domínio, onde
// podem ser usadas sem arrastar React.

import { SS_TAXA, SS_COEFICIENTE, type BaseSS } from "@/lib/fiscal-data";

/** Contribuição do trimestre para uma base de incidência. */
export function calcularSS(rendimentoTrimestre: number, baseSS: BaseSS = "servicos"): number {
  return rendimentoTrimestre * SS_COEFICIENTE[baseSS].value * SS_TAXA.value;
}

/**
 * Prazo da DECLARAÇÃO trimestral de rendimentos à Segurança Social:
 * até ao último dia do mês seguinte ao fim do trimestre.
 * Q1 (jan–mar) → 30 abr · Q2 → 31 jul · Q3 → 31 out · Q4 → 31 jan (ano+1).
 *
 * O PAGAMENTO não é trimestral: a contribuição é MENSAL, entre o dia 10 e
 * o dia 20 do mês seguinte àquele a que respeita (Art. 43.º do Código dos
 * Regimes Contributivos). Ver `proximoPagamentoSS`.
 */
export function prazoDeclaracaoSS(trimestreIndex: number, ano: number): Date {
  switch (trimestreIndex) {
    case 0: return new Date(ano, 3, 30);
    case 1: return new Date(ano, 6, 31);
    case 2: return new Date(ano, 9, 31);
    case 3: return new Date(ano + 1, 0, 31);
    default: return new Date(ano, 3, 30);
  }
}

/**
 * Data-limite (dia 20) do pagamento mensal seguinte a partir de uma data de
 * referência: a contribuição do mês M paga-se entre 10 e 20 de M+1.
 */
export function proximoPagamentoSS(ref: Date): Date {
  const alvo = new Date(ref.getFullYear(), ref.getMonth(), 20);
  if (ref.getDate() > 20) alvo.setMonth(alvo.getMonth() + 1);
  return alvo;
}
