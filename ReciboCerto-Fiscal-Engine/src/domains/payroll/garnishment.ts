import { eurCents, minMoney, type Money } from "../../core/money";
import type { MissingInput, TraceStep } from "../../core/model";
import type { GarnishmentOrder } from "./types";

export type GarnishmentResult =
  | { kind: "ok"; amount: Money; trace: readonly TraceStep[] }
  | { kind: "needs_input"; missing: readonly MissingInput[]; trace: readonly TraceStep[] };

/**
 * Apura apenas o limite aritmético geral do artigo 738.º do CPC.
 * Ordens de alimentos e decisões judiciais usam sempre o montante da ordem.
 */
export function calculateGarnishment(
  netAfterMandatoryDeductions: Money,
  order: GarnishmentOrder | undefined,
  minimumMonthlyWage: Money,
): GarnishmentResult {
  if (!order || netAfterMandatoryDeductions.cents <= 0) {
    return { kind: "ok", amount: eurCents(0), trace: [] };
  }

  if (order.type !== "ordinary") {
    if (order.orderedAmount === undefined) {
      return {
        kind: "needs_input",
        missing: [{
          path: "garnishment.orderedAmount",
          reason: "A obrigação de alimentos ou decisão judicial não pode ser inferida pela regra geral.",
          expected: "Montante constante da ordem judicial",
        }],
        trace: [],
      };
    }
    const amount = minMoney(order.orderedAmount, netAfterMandatoryDeductions);
    return {
      kind: "ok",
      amount,
      trace: [{
        id: "payroll.garnishment.court-order",
        label: "Penhora limitada ao líquido disponível e ao valor da ordem",
        formula: "min(valor_ordem, líquido_após_deduções_obrigatórias)",
        operands: [
          { name: "valor_ordem", value: order.orderedAmount.cents, unit: "EUR_CENTS" },
          { name: "líquido", value: netAfterMandatoryDeductions.cents, unit: "EUR_CENTS" },
        ],
        result: amount.cents,
        rounding: "towards_zero",
        citations: ["pt.dr.cpc.738"],
      }],
    };
  }

  if (order.otherIncomeAvailable === undefined) {
    return {
      kind: "needs_input",
      missing: [{
        path: "garnishment.otherIncomeAvailable",
        reason: "O mínimo protegido de uma RMMG depende da inexistência de outros rendimentos.",
        expected: "true ou false",
      }],
      trace: [],
    };
  }

  const net = netAfterMandatoryDeductions.cents;
  const twoThirds = Math.floor((net * 2) / 3);
  const lowerProtected = order.otherIncomeAvailable ? 0 : minimumMonthlyWage.cents;
  const upperProtected = minimumMonthlyWage.cents * 3;
  const protectedAmount = Math.min(net, Math.max(lowerProtected, Math.min(twoThirds, upperProtected)));
  const amount = eurCents(net - protectedAmount);

  return {
    kind: "ok",
    amount,
    trace: [{
      id: "payroll.garnishment.ordinary",
      label: "Limite geral de penhora de vencimento",
      formula: "líquido - min(líquido, max(mínimo_protegido, min(2/3 × líquido, 3 × RMMG)))",
      operands: [
        { name: "líquido", value: net, unit: "EUR_CENTS" },
        { name: "RMMG", value: minimumMonthlyWage.cents, unit: "EUR_CENTS" },
        { name: "outros_rendimentos", value: order.otherIncomeAvailable, unit: "TEXT" },
      ],
      result: amount.cents,
      rounding: "down",
      citations: ["pt.dr.cpc.738", "pt.dr.decreto-lei-139-2025"],
    }],
  };
}
