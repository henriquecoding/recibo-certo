/**
 * Adaptador de transição para executar o novo motor linha a linha com as
 * tabelas 2026 já existentes. Não ativa a nova UI nem torna o dataset draft
 * apto para produção; serve para testes cruzados e migração gradual.
 */
import {
  eurCents,
  ratePpm,
  type WithholdingRequest,
  type WithholdingResolution,
  type WithholdingResolver,
} from "../../ReciboCerto-Fiscal-Engine/src";
import { calcularVencimento } from "./fiscal-dependente";
import type { EstadoCivilRet, Regiao } from "./fiscal-data";

const JURISDICTION_REGION: Record<WithholdingRequest["employee"]["jurisdiction"], Regiao> = {
  "PT-CONTINENTE": "continente",
  "PT-MADEIRA": "madeira",
  "PT-ACORES": "acores",
};

const MARITAL_STATUS: Record<WithholdingRequest["employee"]["maritalStatus"], EstadoCivilRet> = {
  not_married: "naoCasado",
  married_single_holder: "casadoUnico",
  married_two_holders: "casadoDois",
};

function retentionForReference(request: WithholdingRequest): number {
  const referenceEuros = request.rateReferenceAmount.cents / 100;
  if (referenceEuros <= 0) return 0;
  return calcularVencimento({
    salarioBruto: referenceEuros,
    dependentes: request.employee.dependants,
    estadoCivil: MARITAL_STATUS[request.employee.maritalStatus],
    deficiencia: request.employee.disability,
    regiao: JURISDICTION_REGION[request.employee.jurisdiction],
    irsJovemAno: request.youthIrs?.invokedWithEmployer ? request.youthIrs.benefitYear : undefined,
    subsidioRefeicaoDia: 0,
    diasUteis: 0,
  }).irsRetido;
}

export const legacy2026WithholdingResolver: WithholdingResolver = (
  request: WithholdingRequest,
): WithholdingResolution => {
  if (request.taxableAmount.cents <= 0 || request.rateReferenceAmount.cents <= 0) {
    return { amount: eurCents(0), effectiveRate: ratePpm(0), trace: [] };
  }

  const referenceRetentionCents = Math.round(retentionForReference(request) * 100);
  const rawRatePpm = Math.round(
    (referenceRetentionCents * 1_000_000) / request.rateReferenceAmount.cents,
  );
  const effectiveRatePpm = request.bucket === "overtime_autonomous"
    ? Math.round(rawRatePpm / 2)
    : rawRatePpm;
  const amountCents = Math.max(0, Math.round(
    (request.taxableAmount.cents * effectiveRatePpm) / 1_000_000,
  ));

  return {
    amount: eurCents(amountCents),
    effectiveRate: ratePpm(Math.min(1_000_000, effectiveRatePpm)),
    trace: [{
      id: `payroll.withholding.${request.bucket}`,
      label: `Retenção de IRS — ${request.bucket}`,
      formula: request.bucket === "overtime_autonomous"
        ? "base_suplementar × 50% × taxa_efetiva_remuneração_mensal"
        : "base_sujeita × taxa_efetiva_da_base_de_referência",
      operands: [
        { name: "base_sujeita", value: request.taxableAmount.cents, unit: "EUR_CENTS" },
        { name: "base_referência", value: request.rateReferenceAmount.cents, unit: "EUR_CENTS" },
        { name: "taxa_efetiva", value: effectiveRatePpm, unit: "PPM" },
      ],
      result: amountCents,
      rounding: "half_up",
      citations: ["pt.at.cirs.99-c", "pt.at.cirs.99-f", "pt.dr.despacho-233-a-2026"],
    }],
    warnings: request.youthIrs
      ? [{
          code: "PAYROLL_YOUTH_IRS_LEGACY_ADAPTER",
          message: "IRS Jovem calculado pelo adaptador legado; exige teste cruzado antes da ativação.",
          severity: "warning",
        }]
      : [],
  };
};
