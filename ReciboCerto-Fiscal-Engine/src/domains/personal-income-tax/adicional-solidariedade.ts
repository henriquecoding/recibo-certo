import { addCents, applyPpm, type Cents, type Ppm, subtractCentsFloor0 } from "../../core/money";
import { findParameter } from "../../core/dataset";
import type { CalculationStep } from "../../core/decision";
import type { Rule } from "../../core/engine";
import type { IsoDate } from "../../core/types";

const FROM_2026 = "2026-01-01" as IsoDate;
const TO_2026 = "2026-12-31" as IsoDate;

/**
 * Regra de demonstração: adicional de solidariedade (Art. 68.º-A CIRS).
 *
 * Prova o padrão ponta-a-ponta (dataset → regra → `core/engine.ts::evaluate`
 * → decisão) com uma regra genuinamente pequena e já corrigida no motor
 * legado nesta sessão (ver `src/lib/fiscal.ts::simularIRSAnual`, P0-02). Não
 * substitui essa correção — é a mesma fórmula, expressa no novo contrato,
 * para mostrar como ficaria uma regra migrada.
 */
export interface AdicionalSolidariedadeInput {
  taxableIncomeCents: Cents;
}

export const adicionalSolidariedadeRule: Rule<AdicionalSolidariedadeInput, Cents> = {
  id: "personal-income-tax.adicional-solidariedade.2026",
  requiredFields: ["taxableIncomeCents"],
  effectivePeriod: { from: FROM_2026, to: TO_2026 },
  jurisdictions: ["PT-CONTINENTE", "PT-MADEIRA", "PT-ACORES"],
  sources: ["art68aCirs"],
  compute(input, dataset) {
    const limiar1 = findParameter(dataset, "adicional_solidariedade_limiar1");
    const limiar2 = findParameter(dataset, "adicional_solidariedade_limiar2");
    const taxa1 = findParameter(dataset, "adicional_solidariedade_taxa1");
    const taxa2 = findParameter(dataset, "adicional_solidariedade_taxa2");
    if (!limiar1 || !limiar2 || !taxa1 || !taxa2) {
      throw new Error(
        "Dataset sem os parâmetros do adicional de solidariedade — dataset inválido para esta regra.",
      );
    }

    const income = input.taxableIncomeCents;
    const parteEntreLimiares = subtractCentsFloor0(
      Math.min(income, limiar2.value) as Cents,
      limiar1.value as Cents,
    );
    const parteAcimaLimiar2 = subtractCentsFloor0(income, limiar2.value as Cents);

    const adicional1 = applyPpm(parteEntreLimiares, taxa1.value as Ppm);
    const adicional2 = applyPpm(parteAcimaLimiar2, taxa2.value as Ppm);
    const total = addCents(adicional1, adicional2);

    const calculation: CalculationStep[] = [
      {
        label: "Parte entre 80 000 € e 250 000 €",
        formula: "min(rendimento, limiar2) - limiar1",
        operands: { rendimento: income, limiar1: limiar1.value, limiar2: limiar2.value },
        result: parteEntreLimiares,
      },
      {
        label: "Parte acima de 250 000 €",
        formula: "max(0, rendimento - limiar2)",
        operands: { rendimento: income, limiar2: limiar2.value },
        result: parteAcimaLimiar2,
      },
      {
        label: "Adicional de solidariedade total",
        formula: "parte1 × taxa1 + parte2 × taxa2",
        operands: { parte1: parteEntreLimiares, taxa1: taxa1.value, parte2: parteAcimaLimiar2, taxa2: taxa2.value },
        roundingPolicy: "half-up",
        result: total,
      },
    ];

    return { value: total, calculation };
  },
};
