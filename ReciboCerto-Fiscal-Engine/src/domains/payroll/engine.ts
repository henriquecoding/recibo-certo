import { addMoney, eurCents, multiplyRate, ratePpm, type Money } from "../../core/money";
import type { FiscalWarning, MissingInput, TraceStep } from "../../core/model";
import { calculateGarnishment } from "./garnishment";
import type {
  PayrollInput,
  PayrollLineInput,
  PayrollLineResult,
  PayrollPolicy,
  PayrollPreparation,
  PayrollResult,
  PayrollTaxBucket,
  WithholdingRequest,
  WithholdingResolution,
  WithholdingResolver,
} from "./types";

interface ResolvedLine {
  input: PayrollLineInput;
  bucket: PayrollTaxBucket;
  cashGross: Money;
  irsTaxable: Money;
  socialSecurityBase: Money;
  rateReferenceAmount?: Money;
  classification: PayrollLineResult["classification"];
  explanation: string;
  citations: readonly string[];
}

type ResolveResult =
  | { kind: "ok"; line: ResolvedLine; trace?: readonly TraceStep[] }
  | { kind: "needs_input"; missing: readonly MissingInput[] }
  | { kind: "unsupported"; reason: string };

const ZERO = eurCents(0);

function sumMoney(values: readonly Money[]): Money {
  return addMoney(ZERO, ...values);
}

function multiplyHundredths(amount: Money, hundredths: number): Money {
  const product = amount.cents * hundredths;
  if (!Number.isSafeInteger(product)) throw new RangeError("O produto monetário excede a precisão segura.");
  return eurCents(Math.round(product / 100));
}

/** (Rm × 12 × horas) ÷ (52 × n), conservando as horas em centésimos. */
function hourlyBaseAmount(reference: Money, hoursHundredths: number, weeklyHoursHundredths: number): Money {
  const numerator = reference.cents * 12 * hoursHundredths;
  const denominator = 52 * weeklyHoursHundredths;
  if (!Number.isSafeInteger(numerator) || denominator <= 0) {
    throw new RangeError("Não foi possível calcular a retribuição horária com precisão segura.");
  }
  return eurCents(Math.round(numerator / denominator));
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function moneyIsNonNegative(value: Money | undefined): boolean {
  return value !== undefined && Number.isSafeInteger(value.cents) && value.cents >= 0;
}

function lineAmountIsValid(line: PayrollLineInput): boolean {
  switch (line.kind) {
    case "base_salary":
    case "seniority":
    case "function_allowance":
    case "shift_allowance":
    case "schedule_exemption":
    case "commission":
    case "holiday_pay":
    case "other_taxable":
    case "performance_award":
    case "cash_shortage_allowance":
    case "prior_years_pay":
      return moneyIsNonNegative(line.amount);
    case "holiday_subsidy":
    case "christmas_subsidy":
      return moneyIsNonNegative(line.amountPaid) && moneyIsNonNegative(line.fullEntitlement);
    case "meal_allowance":
    case "travel_allowance":
      return moneyIsNonNegative(line.dailyAmount);
    case "routed_benefit":
      return line.amount === undefined || moneyIsNonNegative(line.amount);
    case "overtime":
    case "night_work":
    case "unpaid_absence":
      return true;
  }
}

function fixedTaxableLine(line: PayrollLineInput): line is Extract<PayrollLineInput, { kind:
  | "base_salary"
  | "seniority"
  | "function_allowance"
  | "shift_allowance"
  | "schedule_exemption"
  | "commission"
  | "holiday_pay"
  | "other_taxable" }> {
  return [
    "base_salary",
    "seniority",
    "function_allowance",
    "shift_allowance",
    "schedule_exemption",
    "commission",
    "holiday_pay",
    "other_taxable",
  ].includes(line.kind);
}

function requireHourlyReference(input: PayrollInput, lineIndex: number): ResolveResult | undefined {
  if (input.hourlyReferenceRemuneration === undefined) {
    return {
      kind: "needs_input",
      missing: [{
        path: "hourlyReferenceRemuneration",
        reason: `A rubrica lines.${lineIndex} exige Rm para a fórmula horária do artigo 271.º do CT.`,
        expected: "Retribuição mensal relevante, em cêntimos",
      }],
    };
  }
  return undefined;
}

function resolveCompanyCar(line: Extract<PayrollLineInput, { kind: "routed_benefit" }>): ResolveResult {
  const facts = line.facts ?? {};
  const required = ["writtenAgreement", "personalUse", "marketValueJanuary1Cents", "acquisitionValueCents"] as const;
  const missing = required
    .filter((key) => facts[key] === undefined)
    .map((key) => ({
      path: `lines.${line.id}.facts.${key}`,
      reason: "O uso pessoal de viatura só pode ser valorizado com os factos legais documentados.",
      expected: key.endsWith("Cents") ? "Inteiro em cêntimos" : "true ou false",
    }));
  if (missing.length > 0) return { kind: "needs_input", missing };
  if (facts.writtenAgreement !== true || facts.personalUse !== true) {
    return {
      kind: "unsupported",
      reason: "Viatura sem acordo escrito e uso pessoal confirmado exige outro enquadramento; não foi presumido rendimento em espécie.",
    };
  }
  const market = facts.marketValueJanuary1Cents;
  const acquisition = facts.acquisitionValueCents;
  if (!isNonNegativeInteger(market as number) || !isNonNegativeInteger(acquisition as number)) {
    return { kind: "unsupported", reason: "Valores de aquisição/mercado da viatura inválidos." };
  }
  const benefitRate = ratePpm(7_500); // 0,75% por mês
  return {
    kind: "ok",
    line: {
      input: line,
      bucket: "normal_monthly",
      cashGross: ZERO,
      irsTaxable: multiplyRate(eurCents(market as number), benefitRate),
      socialSecurityBase: multiplyRate(eurCents(acquisition as number), benefitRate),
      classification: "taxable",
      explanation: "Benefício não monetário: IRS sobre o valor de mercado em 1 de janeiro e SS sobre o custo de aquisição, ambos a 0,75% por mês.",
      citations: ["pt.at.cirs.2", "pt.at.cirs.24", "pt.dr.codigo-contributivo.current"],
    },
  };
}

function resolveLine(
  line: PayrollLineInput,
  lineIndex: number,
  input: PayrollInput,
  policy: PayrollPolicy,
  fixedMonthlyRemuneration: Money,
): ResolveResult {
  if (fixedTaxableLine(line)) {
    return {
      kind: "ok",
      line: {
        input: line,
        bucket: "normal_monthly",
        cashGross: line.amount,
        irsTaxable: line.amount,
        socialSecurityBase: line.amount,
        classification: "taxable",
        explanation: "Remuneração pecuniária sujeita a IRS e à base contributiva geral.",
        citations: ["pt.at.cirs.2", "pt.dr.codigo-contributivo.current"],
      },
    };
  }

  switch (line.kind) {
    case "performance_award": {
      if (line.socialSecurityRegularity === "unknown") {
        return {
          kind: "needs_input",
          missing: [{
            path: `lines.${lineIndex}.socialSecurityRegularity`,
            reason: "A incidência contributiva do prémio depende da regularidade objetiva prevista no artigo 47.º do CRC.",
            expected: "regular ou not_regular, com suporte documental",
          }],
        };
      }
      const socialSecurityBase = line.socialSecurityRegularity === "regular" ? line.amount : ZERO;
      return {
        kind: "ok",
        line: {
          input: line,
          bucket: "normal_monthly",
          cashGross: line.amount,
          irsTaxable: line.amount,
          socialSecurityBase,
          classification: socialSecurityBase.cents > 0 ? "taxable" : "partially_exempt",
          explanation: socialSecurityBase.cents > 0
            ? "Prémio sujeito a IRS e a SS por ter caráter regular confirmado."
            : "Prémio sujeito a IRS; a exclusão de SS resulta da não regularidade declarada e deve ser auditável.",
          citations: ["pt.at.cirs.2", "pt.dr.codigo-contributivo.current"],
        },
      };
    }

    case "holiday_subsidy":
    case "christmas_subsidy": {
      if (line.fullEntitlement.cents <= 0 || line.amountPaid.cents > line.fullEntitlement.cents) {
        return { kind: "unsupported", reason: `Montantes incoerentes na rubrica ${line.id}: o pagamento deve caber no direito total.` };
      }
      return {
        kind: "ok",
        line: {
          input: line,
          bucket: line.kind === "holiday_subsidy" ? "holiday_subsidy_autonomous" : "christmas_subsidy_autonomous",
          cashGross: line.amountPaid,
          irsTaxable: line.amountPaid,
          socialSecurityBase: line.amountPaid,
          rateReferenceAmount: line.fullEntitlement,
          classification: "taxable",
          explanation: "Subsídio sujeito a retenção autónoma; no fracionamento a taxa é determinada pelo direito total.",
          citations: ["pt.at.cirs.99-c", "pt.dr.codigo-contributivo.current"],
        },
      };
    }

    case "overtime": {
      const referenceIssue = requireHourlyReference(input, lineIndex);
      if (referenceIssue) return referenceIssue;
      if (
        line.annualHoursBeforeHundredths < 10_000
        && line.annualHoursBeforeHundredths + line.hoursHundredths > 10_000
      ) {
        return {
          kind: "needs_input",
          missing: [{
            path: `lines.${lineIndex}`,
            reason: "A rubrica atravessa o limiar anual de 100 horas e deve ser dividida nos dois patamares.",
            expected: "Duas rubricas, uma até e outra acima de 100 horas",
          }],
        };
      }
      const band = line.annualHoursBeforeHundredths >= 10_000 ? "above_100_hours" : "up_to_100_hours";
      const premium = line.collectiveAgreementPremium ?? policy.overtimePremiums[band][line.segment];
      const base = hourlyBaseAmount(
        input.hourlyReferenceRemuneration!,
        line.hoursHundredths,
        input.weeklyHoursHundredths,
      );
      const amount = addMoney(base, multiplyRate(base, premium));
      return {
        kind: "ok",
        line: {
          input: line,
          bucket: "overtime_autonomous",
          cashGross: amount,
          irsTaxable: amount,
          socialSecurityBase: amount,
          classification: "taxable",
          explanation: `Trabalho suplementar calculado pela fórmula horária e acréscimo ${line.collectiveAgreementPremium ? "do IRCT" : "legal"}; retenção de IRS autónoma.`,
          citations: ["pt.dr.codigo-trabalho.current", "pt.at.cirs.99-c", "pt.dr.codigo-contributivo.current"],
        },
        trace: [{
          id: `payroll.line.${line.id}.overtime`,
          label: "Retribuição de trabalho suplementar",
          formula: "(Rm × 12 × horas) ÷ (52 × n) × (1 + acréscimo)",
          operands: [
            { name: "Rm", value: input.hourlyReferenceRemuneration!.cents, unit: "EUR_CENTS" },
            { name: "horas_centésimos", value: line.hoursHundredths, unit: "COUNT" },
            { name: "n_centésimos", value: input.weeklyHoursHundredths, unit: "COUNT" },
            { name: "acréscimo", value: premium.ppm, unit: "PPM" },
          ],
          result: amount.cents,
          rounding: "half_up",
          citations: ["pt.dr.codigo-trabalho.current"],
        }],
      };
    }

    case "night_work": {
      const referenceIssue = requireHourlyReference(input, lineIndex);
      if (referenceIssue) return referenceIssue;
      if (line.regime.type === "unknown") {
        return {
          kind: "needs_input",
          missing: [{
            path: `lines.${lineIndex}.regime`,
            reason: "O trabalho noturno tem exceções legais e pode ser regulado por IRCT.",
            expected: "regime estatutário sem exceção ou prémio do IRCT",
          }],
        };
      }
      const premium = line.regime.type === "collective_agreement"
        ? line.regime.premium
        : policy.standardNightPremium;
      const base = hourlyBaseAmount(
        input.hourlyReferenceRemuneration!,
        line.hoursHundredths,
        input.weeklyHoursHundredths,
      );
      const amount = multiplyRate(base, premium);
      return {
        kind: "ok",
        line: {
          input: line,
          bucket: "normal_monthly",
          cashGross: amount,
          irsTaxable: amount,
          socialSecurityBase: amount,
          classification: "taxable",
          explanation: `Acréscimo de trabalho noturno calculado pelo regime ${line.regime.type === "collective_agreement" ? "do IRCT" : "legal de 25%"}.`,
          citations: ["pt.dr.codigo-trabalho.current", "pt.at.cirs.2", "pt.dr.codigo-contributivo.current"],
        },
      };
    }

    case "unpaid_absence": {
      const referenceIssue = requireHourlyReference(input, lineIndex);
      if (referenceIssue) return referenceIssue;
      const amount = hourlyBaseAmount(
        input.hourlyReferenceRemuneration!,
        line.hoursHundredths,
        input.weeklyHoursHundredths,
      );
      const negative = eurCents(-amount.cents);
      return {
        kind: "ok",
        line: {
          input: line,
          bucket: "normal_monthly",
          cashGross: negative,
          irsTaxable: negative,
          socialSecurityBase: negative,
          classification: "deduction",
          explanation: "Redução da retribuição por ausência não remunerada, valorizada pela fórmula horária.",
          citations: ["pt.dr.codigo-trabalho.current"],
        },
      };
    }

    case "meal_allowance": {
      if (!Number.isSafeInteger(line.days) || line.days < 0) {
        return { kind: "unsupported", reason: `Número de dias inválido na rubrica ${line.id}.` };
      }
      const total = multiplyHundredths(line.dailyAmount, line.days * 100);
      const dailyLimit = line.method === "cash"
        ? policy.mealCashDailyExemption
        : policy.mealCardDailyExemption;
      const exemptDailyCents = Math.min(line.dailyAmount.cents, dailyLimit.cents);
      const exempt = eurCents(exemptDailyCents * line.days);
      const taxable = eurCents(total.cents - exempt.cents);
      return {
        kind: "ok",
        line: {
          input: line,
          bucket: "normal_monthly",
          cashGross: total,
          irsTaxable: taxable,
          socialSecurityBase: taxable,
          classification: taxable.cents === 0 ? "exempt" : "partially_exempt",
          explanation: taxable.cents === 0
            ? "Subsídio de refeição dentro do limite diário aplicável."
            : "Apenas o excesso diário sobre o limite aplicável integra IRS e SS.",
          citations: ["pt.at.cirs.2", "pt.dr.portaria-51-b-2026", "pt.dr.codigo-contributivo.current"],
        },
      };
    }

    case "travel_allowance": {
      const missing: MissingInput[] = [];
      if (line.businessTravelConfirmed === undefined) missing.push({
        path: `lines.${lineIndex}.businessTravelConfirmed`,
        reason: "A exclusão fiscal depende de deslocação ao serviço da entidade patronal.",
      });
      if (line.documentationPresent === undefined) missing.push({
        path: `lines.${lineIndex}.documentationPresent`,
        reason: "A exclusão fiscal depende de prova e documentação da deslocação.",
      });
      if (line.exemptDailyLimit === undefined) missing.push({
        path: `lines.${lineIndex}.exemptDailyLimit`,
        reason: "O limite varia com o enquadramento e deve vir de dataset oficial revisto.",
      });
      if (missing.length > 0) return { kind: "needs_input", missing };
      if (!Number.isSafeInteger(line.days) || line.days < 0) {
        return { kind: "unsupported", reason: `Número de dias inválido na rubrica ${line.id}.` };
      }
      const total = eurCents(line.dailyAmount.cents * line.days);
      const eligible = line.businessTravelConfirmed && line.documentationPresent;
      const exempt = eligible
        ? eurCents(Math.min(line.dailyAmount.cents, line.exemptDailyLimit!.cents) * line.days)
        : ZERO;
      const taxable = eurCents(total.cents - exempt.cents);
      return {
        kind: "ok",
        line: {
          input: line,
          bucket: "normal_monthly",
          cashGross: total,
          irsTaxable: taxable,
          socialSecurityBase: taxable,
          classification: taxable.cents === 0 ? "exempt" : exempt.cents > 0 ? "partially_exempt" : "taxable",
          explanation: eligible
            ? "Deslocação documentada: apenas o excesso sobre o limite fornecido integra IRS e SS."
            : "Sem elegibilidade documental confirmada, o montante foi integralmente sujeito.",
          citations: ["pt.at.cirs.2", "pt.dr.codigo-contributivo.current"],
        },
      };
    }

    case "cash_shortage_allowance": {
      const limit = line.collectiveAgreementLimit
        ?? multiplyRate(fixedMonthlyRemuneration, policy.cashShortageIrsLimitRate);
      const exempt = Math.min(line.amount.cents, limit.cents);
      const taxable = eurCents(line.amount.cents - exempt);
      return {
        kind: "ok",
        line: {
          input: line,
          bucket: "normal_monthly",
          cashGross: line.amount,
          irsTaxable: taxable,
          socialSecurityBase: taxable,
          classification: taxable.cents === 0 ? "exempt" : "partially_exempt",
          explanation: "Apenas a parte acima do limite aplicável foi integrada em IRS e SS.",
          citations: ["pt.at.cirs.2", "pt.dr.codigo-contributivo.current"],
        },
      };
    }

    case "prior_years_pay": {
      if (!line.monthsRepresented || !Number.isSafeInteger(line.monthsRepresented) || line.monthsRepresented < 1) {
        return {
          kind: "needs_input",
          missing: [{
            path: `lines.${lineIndex}.monthsRepresented`,
            reason: "A taxa de retroativos de anos anteriores depende do número de meses a que respeitam.",
            expected: "Inteiro positivo",
          }],
        };
      }
      return {
        kind: "ok",
        line: {
          input: line,
          bucket: "prior_years",
          cashGross: line.amount,
          irsTaxable: line.amount,
          socialSecurityBase: line.amount,
          rateReferenceAmount: eurCents(Math.round(line.amount.cents / line.monthsRepresented)),
          classification: "taxable",
          explanation: "Retroativos sujeitos; a taxa é determinada pelo valor médio mensal e aplicada ao total.",
          citations: ["pt.at.cirs.99-c", "pt.dr.codigo-contributivo.current"],
        },
      };
    }

    case "routed_benefit":
      if (line.benefitKind === "company_car") return resolveCompanyCar(line);
      return {
        kind: "unsupported",
        reason: `A rubrica ${line.benefitKind} foi encaminhada para revisão factual própria; o nome e o montante não bastam para determinar IRS/SS.`,
      };
  }
}

function allocateProportionally(total: Money, lines: readonly ResolvedLine[]): readonly Money[] {
  const weights = lines.map((line) => Math.max(0, line.irsTaxable.cents));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  if (total.cents === 0 || weightTotal === 0) return lines.map(() => ZERO);
  const lastWeightedIndex = weights.reduce((last, weight, index) => weight > 0 ? index : last, -1);
  let allocated = 0;
  return lines.map((_, index) => {
    if (weights[index] === 0) return ZERO;
    if (index === lastWeightedIndex) return eurCents(total.cents - allocated);
    const part = Math.round((total.cents * weights[index]!) / weightTotal);
    allocated += part;
    return eurCents(part);
  });
}

function validWithholdingResolution(resolution: WithholdingResolution, taxable: Money): boolean {
  return moneyIsNonNegative(resolution.amount)
    && resolution.amount.cents <= taxable.cents
    && Number.isSafeInteger(resolution.effectiveRate.ppm)
    && resolution.effectiveRate.ppm >= 0
    && resolution.effectiveRate.ppm <= 1_000_000;
}

function resolveWithholding(
  request: WithholdingRequest,
  resolver: WithholdingResolver,
): WithholdingResolution {
  if (request.taxableAmount.cents <= 0) return { amount: ZERO, effectiveRate: ratePpm(0), trace: [] };
  const resolution = resolver(request);
  if (!validWithholdingResolution(resolution, request.taxableAmount)) {
    throw new RangeError(`O resolvedor devolveu retenção inválida para ${request.bucket}.`);
  }
  return resolution;
}

function prepareIssues(input: PayrollInput): PayrollPreparation | undefined {
  const ids = new Set<string>();
  for (const [index, line] of input.lines.entries()) {
    if (line.id.trim() === "" || ids.has(line.id)) {
      return { kind: "conflict", reasons: [`Identificador de rubrica vazio ou duplicado em lines.${index}.`], trace: [] };
    }
    ids.add(line.id);
    if (!lineAmountIsValid(line)) {
      return { kind: "conflict", reasons: [`Montante inválido em lines.${index}.`], trace: [] };
    }
    if (
      (line.kind === "overtime" || line.kind === "night_work" || line.kind === "unpaid_absence")
      && !isNonNegativeInteger(line.hoursHundredths)
    ) {
      return { kind: "conflict", reasons: [`Horas inválidas em lines.${index}.`], trace: [] };
    }
    if (line.kind === "overtime" && !isNonNegativeInteger(line.annualHoursBeforeHundredths)) {
      return { kind: "conflict", reasons: [`Acumulado anual inválido em lines.${index}.`], trace: [] };
    }
  }
  if (!Number.isSafeInteger(input.weeklyHoursHundredths) || input.weeklyHoursHundredths <= 0) {
    return { kind: "conflict", reasons: ["weeklyHoursHundredths tem de ser um inteiro positivo."], trace: [] };
  }
  if (input.employee.dependants < 0 || !Number.isSafeInteger(input.employee.dependants)) {
    return { kind: "conflict", reasons: ["Número de dependentes inválido."], trace: [] };
  }
  if (input.employee.youthIrs && !input.employee.youthIrs.invokedWithEmployer) {
    return {
      kind: "conflict",
      reasons: ["IRS Jovem indicado sem invocação perante a entidade patronal; o motor não o aplica automaticamente."],
      trace: [],
    };
  }
  return undefined;
}

/**
 * Constrói um recibo linha a linha. O resolvedor de retenção é injetado para
 * manter as tabelas regionais/versionadas fora do algoritmo de rubricas.
 */
export function calculatePayroll(
  input: PayrollInput,
  policy: PayrollPolicy,
  withholdingResolver: WithholdingResolver,
): PayrollPreparation {
  const issue = prepareIssues(input);
  if (issue) return issue;

  const fixedKinds = new Set(["base_salary", "seniority", "function_allowance", "shift_allowance", "schedule_exemption"]);
  const fixedMonthlyRemuneration = sumMoney(
    input.lines
      .filter((line): line is Extract<PayrollLineInput, { amount: Money }> => "amount" in line && fixedKinds.has(line.kind))
      .map((line) => line.amount),
  );

  const resolved: ResolvedLine[] = [];
  const trace: TraceStep[] = [];
  const missing: MissingInput[] = [];
  const unsupported: string[] = [];
  for (const [index, line] of input.lines.entries()) {
    const outcome = resolveLine(line, index, input, policy, fixedMonthlyRemuneration);
    if (outcome.kind === "needs_input") missing.push(...outcome.missing);
    else if (outcome.kind === "unsupported") unsupported.push(outcome.reason);
    else {
      resolved.push(outcome.line);
      trace.push(...(outcome.trace ?? []));
    }
  }
  if (missing.length > 0) return { kind: "needs_input", missing, trace };
  if (unsupported.length > 0) return { kind: "unsupported", reasons: unsupported, trace };

  const normal = resolved.filter((line) => line.bucket === "normal_monthly");
  const overtime = resolved.filter((line) => line.bucket === "overtime_autonomous");
  const individual = resolved.filter((line) =>
    line.bucket === "holiday_subsidy_autonomous"
    || line.bucket === "christmas_subsidy_autonomous"
    || line.bucket === "prior_years");
  const normalTaxable = sumMoney(normal.map((line) => line.irsTaxable));
  const totalSocialSecurityBase = sumMoney(resolved.map((line) => line.socialSecurityBase));
  const totalCashGross = sumMoney(resolved.map((line) => line.cashGross));
  if (normalTaxable.cents < 0 || totalSocialSecurityBase.cents < 0 || totalCashGross.cents < 0) {
    return {
      kind: "conflict",
      reasons: ["As deduções excedem as remunerações do período; confirme ou divida o acerto por períodos."],
      trace,
    };
  }
  const normalResolution = resolveWithholding({
    bucket: "normal_monthly",
    taxableAmount: normalTaxable,
    rateReferenceAmount: normalTaxable,
    employee: input.employee,
    youthIrs: input.employee.youthIrs,
  }, withholdingResolver);
  const overtimeTaxable = sumMoney(overtime.map((line) => line.irsTaxable));
  const overtimeResolution = resolveWithholding({
    bucket: "overtime_autonomous",
    taxableAmount: overtimeTaxable,
    rateReferenceAmount: normalTaxable,
    employee: input.employee,
    youthIrs: input.employee.youthIrs,
  }, withholdingResolver);

  const irsById = new Map<string, Money>();
  const normalAllocation = allocateProportionally(normalResolution.amount, normal);
  const overtimeAllocation = allocateProportionally(overtimeResolution.amount, overtime);
  normal.forEach((line, index) => irsById.set(line.input.id, normalAllocation[index]!));
  overtime.forEach((line, index) => irsById.set(line.input.id, overtimeAllocation[index]!));
  const warnings: FiscalWarning[] = [
    ...(normalResolution.warnings ?? []),
    ...(overtimeResolution.warnings ?? []),
  ];
  trace.push(...normalResolution.trace, ...overtimeResolution.trace);

  for (const line of individual) {
    const resolution = resolveWithholding({
      bucket: line.bucket,
      taxableAmount: line.irsTaxable,
      rateReferenceAmount: line.rateReferenceAmount ?? line.irsTaxable,
      employee: input.employee,
      youthIrs: input.employee.youthIrs,
    }, withholdingResolver);
    irsById.set(line.input.id, resolution.amount);
    trace.push(...resolution.trace);
    warnings.push(...(resolution.warnings ?? []));
  }

  const resultLines: PayrollLineResult[] = resolved.map((line) => {
    const irsWithheld = irsById.get(line.input.id) ?? ZERO;
    const employeeSocialSecurity = line.socialSecurityBase.cents > 0
      ? multiplyRate(line.socialSecurityBase, policy.employeeSocialSecurityRate)
      : line.socialSecurityBase.cents < 0
        ? eurCents(-multiplyRate(eurCents(-line.socialSecurityBase.cents), policy.employeeSocialSecurityRate).cents)
        : ZERO;
    const employerSocialSecurity = line.socialSecurityBase.cents > 0
      ? multiplyRate(line.socialSecurityBase, policy.employerSocialSecurityRate)
      : line.socialSecurityBase.cents < 0
        ? eurCents(-multiplyRate(eurCents(-line.socialSecurityBase.cents), policy.employerSocialSecurityRate).cents)
        : ZERO;
    return {
      id: line.input.id,
      label: line.input.label,
      kind: line.input.kind,
      bucket: line.bucket,
      cashGross: line.cashGross,
      irsTaxable: line.irsTaxable,
      socialSecurityBase: line.socialSecurityBase,
      irsWithheld,
      employeeSocialSecurity,
      employerSocialSecurity,
      netImpact: eurCents(line.cashGross.cents - irsWithheld.cents - employeeSocialSecurity.cents),
      employerCost: eurCents(line.cashGross.cents + employerSocialSecurity.cents),
      classification: line.classification,
      explanation: line.explanation,
      citations: line.citations,
    };
  });

  const netBeforeGarnishment = sumMoney(resultLines.map((line) => line.netImpact));
  const garnishment = calculateGarnishment(netBeforeGarnishment, input.garnishment, policy.minimumMonthlyWage);
  if (garnishment.kind === "needs_input") {
    return { kind: "needs_input", missing: garnishment.missing, trace: [...trace, ...garnishment.trace] };
  }
  trace.push(...garnishment.trace);

  const totals = {
    cashGross: sumMoney(resultLines.map((line) => line.cashGross)),
    irsTaxable: sumMoney(resultLines.map((line) => line.irsTaxable)),
    socialSecurityBase: sumMoney(resultLines.map((line) => line.socialSecurityBase)),
    irsWithheld: sumMoney(resultLines.map((line) => line.irsWithheld)),
    employeeSocialSecurity: sumMoney(resultLines.map((line) => line.employeeSocialSecurity)),
    netBeforeGarnishment,
    garnishment: garnishment.amount,
    netPayable: eurCents(netBeforeGarnishment.cents - garnishment.amount.cents),
    employerSocialSecurity: sumMoney(resultLines.map((line) => line.employerSocialSecurity)),
    employerCost: sumMoney(resultLines.map((line) => line.employerCost)),
  };
  const result: PayrollResult = {
    policyId: policy.id,
    period: input.period,
    lines: resultLines,
    totals,
    trace,
    warnings,
  };
  return { kind: "ready", result };
}
