import { describe, expect, it } from "vitest";
import {
  assessHiringSupports,
  assessMinimumWage,
  assessVacation,
  eurCents,
  eurFromDecimal,
  isEngineCompatible,
  LEGAL_LOCATORS,
  planEmploymentOffer,
  PT_EMPLOYER_2026,
  ratePpm,
  resolveCitation,
  selectEmploymentPolicy,
  supportAmountWithMajorations,
  TALENT_MINIMUM_MONTHLY_SALARY,
  type MinimumWageVerdict,
  type SupportFactSheet,
} from "../src";
import { offerInput, testBundle, withholding10 } from "./employment-offer-fixtures";

/**
 * Casos dourados e portões do relatório mestre de 31 de agosto de 2026.
 *
 * Cada bloco fecha um item do backlog P0. O critério não é «passa»: é que a
 * regressão que o relatório descreve volte a falhar se alguém a repuser.
 */

const plan = (input: Parameters<typeof planEmploymentOffer>[0]) =>
  planEmploymentOffer(input, testBundle(withholding10));

const workingTime = {
  paidWeeklyHoursHundredths: 4_000,
  averageWeeklyHoursHundredths: 4_000,
  partTime: false,
  fullTimeFraction: ratePpm(1_000_000),
  citations: [],
} as const;

// ─── MOT-P0-001: gate do release ───────────────────────────────────────────

describe("MOT-P0-001 — o motor público só aceita um release publicado", () => {
  it("o seletor devolve o release em revisão para uma data coberta", () => {
    const selection = selectEmploymentPolicy({
      simulationAsOf: "2026-08-31",
      workPeriod: "2026-08",
      payDate: "2026-08-31",
      jurisdiction: "PT-CONTINENTE",
      withholding: withholding10,
    });
    expect(selection.kind).toBe("ready");
    if (selection.kind !== "ready") return;
    expect(selection.bundle.release.status).toBe("reviewed");
    expect(selection.bundle.usage).toBe("public");
  });

  it("um release em revisão avisa que não está aprovado", () => {
    const selection = selectEmploymentPolicy({
      simulationAsOf: "2026-08-31",
      workPeriod: "2026-08",
      payDate: "2026-08-31",
      jurisdiction: "PT-CONTINENTE",
      withholding: withholding10,
    });
    if (selection.kind !== "ready") throw new Error("esperava um release");
    expect(selection.warnings.some((w) => w.code === "RELEASE_NOT_APPROVED")).toBe(true);
  });

  it("nenhum release chega a `approved` sem revisão profissional registada", () => {
    // O manifesto não pode declarar-se aprovado com uma só assinatura: é a
    // aprovação dupla do relatório (§7.5).
    for (const release of [PT_EMPLOYER_2026]) {
      if (release.status !== "approved") continue;
      expect(
        release.approvals.some((approval) => approval.role === "professional_review"),
      ).toBe(true);
    }
  });

  it("o release ativo é compatível com a versão do motor", () => {
    expect(isEngineCompatible(PT_EMPLOYER_2026)).toBe(true);
  });

  it("a cobertura é declarada domínio a domínio, sem selo global", () => {
    const provenance = (() => {
      const prepared = plan(offerInput());
      if (prepared.kind !== "ready") throw new Error("esperava um resultado");
      return prepared.result.provenance;
    })();
    expect(provenance.coverage.termination).toBe("unsupported");
    expect(provenance.policyApproved).toBe(false);
  });
});

// ─── MOT-P0-002: claims derivadas ──────────────────────────────────────────

describe("MOT-P0-002 — rever os dados não é aprovar a política", () => {
  it("separa dados revistos, política aprovada e cálculo reproduzível", () => {
    const prepared = plan(offerInput({ review: { reviewedAt: "2026-08-31" } }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    const { provenance } = prepared.result;
    expect(provenance.userReviewedInputs).toBe(true);
    expect(provenance.policyApproved).toBe(false);
    expect(provenance.calculationReproducible).toBe(true);
  });
});

// ─── MOT-P0-003/004/017: modelo temporal ───────────────────────────────────

describe("MOT-P0-003 e MOT-P0-017 — datas explícitas e falha segura", () => {
  it("uma data de entrada inválida é `needs_input`, não 1 de janeiro", () => {
    const prepared = plan(offerInput({ context: { contractStart: "2026-02-31" as never } }));
    expect(prepared.kind).toBe("needs_input");
    if (prepared.kind !== "needs_input") return;
    expect(prepared.missing.some((item) => item.path === "context.contractStart")).toBe(true);
  });

  it("sem release para 2027 devolve `stale_policy` em vez de reutilizar 2026", () => {
    const selection = selectEmploymentPolicy({
      simulationAsOf: "2027-01-15",
      workPeriod: "2027-01",
      payDate: "2027-01-31",
      jurisdiction: "PT-CONTINENTE",
      withholding: withholding10,
    });
    expect(selection.kind).toBe("stale_policy");
    if (selection.kind !== "stale_policy") return;
    expect(selection.lastPublished?.releaseId).toBe(PT_EMPLOYER_2026.releaseId);
  });

  it("período de trabalho e data de pagamento são factos distintos", () => {
    const prepared = plan(offerInput({
      context: { workPeriod: "2026-09", payDate: "2026-09-30", contractStart: "2026-09-01" },
    }));
    expect(prepared.kind).toBe("ready");
  });
});

// ─── MOT-P0-005/006/011: piso remuneratório ────────────────────────────────

describe("MOT-P0-005 e MOT-P0-011 — RMMG regional e gate do piso", () => {
  const floorFor = (jurisdiction: "PT-CONTINENTE" | "PT-MADEIRA" | "PT-ACORES", offered: number) =>
    assessMinimumWage({
      policy: PT_EMPLOYER_2026.minimumWage,
      jurisdiction,
      onDate: "2026-03-01",
      offered: eurCents(offered),
      workingTime,
      collectiveAgreement: { status: "none" },
    });

  it("resolve 920 € no Continente, 966 € nos Açores e 980 € na Madeira", () => {
    const statutory = (verdict: MinimumWageVerdict) => verdict.statutoryFloor.cents;
    expect(statutory(floorFor("PT-CONTINENTE", 100_000))).toBe(92_000);
    expect(statutory(floorFor("PT-ACORES", 100_000))).toBe(96_600);
    expect(statutory(floorFor("PT-MADEIRA", 100_000))).toBe(98_000);
  });

  it("920 € cumprem no Continente e ficam abaixo do piso nas ilhas", () => {
    expect(floorFor("PT-CONTINENTE", 92_000).kind).toBe("meets_floor");
    expect(floorFor("PT-ACORES", 92_000).kind).toBe("below_floor");
    expect(floorFor("PT-MADEIRA", 92_000).kind).toBe("below_floor");
  });

  it("um cêntimo abaixo do piso é conflito, não um aviso", () => {
    expect(floorFor("PT-CONTINENTE", 91_999).kind).toBe("below_floor");
    const prepared = plan(offerInput({
      package: { baseSalaryMonthly: eurCents(91_999) },
    }));
    expect(prepared.kind).toBe("conflict");
  });

  it("o tempo parcial usa o piso proporcional ao período normal", () => {
    const meio = assessMinimumWage({
      policy: PT_EMPLOYER_2026.minimumWage,
      jurisdiction: "PT-CONTINENTE",
      onDate: "2026-03-01",
      offered: eurCents(46_000),
      workingTime: {
        paidWeeklyHoursHundredths: 2_000,
        averageWeeklyHoursHundredths: 2_000,
        partTime: true,
        fullTimeFraction: ratePpm(500_000),
        citations: [],
      },
      collectiveAgreement: { status: "none" },
    });
    expect(meio.kind).toBe("meets_floor");
    if (meio.kind !== "meets_floor") return;
    expect(meio.floor.cents).toBe(46_000);
  });

  it("o mínimo do IRCT acima da RMMG passa a ser o piso", () => {
    const verdict = assessMinimumWage({
      policy: PT_EMPLOYER_2026.minimumWage,
      jurisdiction: "PT-CONTINENTE",
      onDate: "2026-03-01",
      offered: eurCents(100_000),
      workingTime,
      collectiveAgreement: {
        status: "declared",
        name: "CCT do setor",
        minimumMonthly: eurCents(110_000),
      },
    });
    expect(verdict.kind).toBe("below_floor");
  });
});

describe("MOT-P0-006 — IRCT desconhecido bloqueia a conformidade", () => {
  it("cumprir a RMMG com IRCT desconhecido não afirma conformidade", () => {
    const verdict = assessMinimumWage({
      policy: PT_EMPLOYER_2026.minimumWage,
      jurisdiction: "PT-CONTINENTE",
      onDate: "2026-03-01",
      offered: eurCents(150_000),
      workingTime,
      collectiveAgreement: { status: "unknown" },
    });
    expect(verdict.kind).toBe("legal_floor_unconfirmed");
  });

  it("o piso por confirmar impede o veredicto no resultado", () => {
    const prepared = plan(offerInput({
      role: { collectiveAgreement: { status: "unknown" } },
    }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.minimumWage.kind).toBe("legal_floor_unconfirmed");
    expect(prepared.result.status.verdictAllowed).toBe(false);
    expect(
      prepared.result.status.blockingFacts.some(
        (fact) => fact.path === "role.collectiveAgreement",
      ),
    ).toBe(true);
  });
});

// ─── MOT-P0-008: férias de admissão ────────────────────────────────────────

describe("MOT-P0-008 — férias adquiridas, gozáveis e transportadas", () => {
  const policy = PT_EMPLOYER_2026.vacation;

  it("entrada em setembro não gera férias dentro do ano da admissão", () => {
    const entitlement = assessVacation({
      policy,
      contractStart: "2026-09-01",
      completeContractMonthsInAdmissionYear: 4,
    });
    expect(entitlement.admissionYearAccruedWorkdays).toBe(8);
    expect(entitlement.earliestLeaveDate).toBe("2027-03-01");
    expect(entitlement.admissionYearUsableWorkdays).toBe(0);
    expect(entitlement.carriedOverWorkdays).toBe(8);
    expect(entitlement.carryOverDeadline).toBe("2027-06-30");
  });

  it("o calendário do ano da admissão deixa de retirar dias que não podem ser gozados", () => {
    const prepared = plan(offerInput({
      context: { contractStart: "2026-09-01", workPeriod: "2026-09", payDate: "2026-09-30" },
    }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.result.vacation.admissionYearUsableWorkdays).toBe(0);
    expect(prepared.result.vacation.carriedOverWorkdays).toBe(8);
  });

  it("entrada em janeiro atinge os seis meses dentro do ano e goza no próprio ano", () => {
    const entitlement = assessVacation({
      policy,
      contractStart: "2026-01-01",
      completeContractMonthsInAdmissionYear: 12,
    });
    expect(entitlement.admissionYearAccruedWorkdays).toBe(20);
    expect(entitlement.admissionYearUsableWorkdays).toBe(20);
    expect(entitlement.carriedOverWorkdays).toBe(0);
  });

  it("o ano seguinte soma o saldo, com o teto do gozo conjunto", () => {
    const entitlement = assessVacation({
      policy,
      contractStart: "2026-11-01",
      completeContractMonthsInAdmissionYear: 2,
    });
    expect(entitlement.carriedOverWorkdays).toBe(4);
    expect(entitlement.secondYearWorkdays).toBe(26);

    const cheio = assessVacation({
      policy,
      contractStart: "2026-08-01",
      completeContractMonthsInAdmissionYear: 5,
    });
    expect(cheio.carriedOverWorkdays).toBe(10);
    expect(cheio.secondYearWorkdays).toBe(30);
  });

  it("contrato que cessa antes dos seis meses goza antes da cessação", () => {
    const entitlement = assessVacation({
      policy,
      contractStart: "2026-01-01",
      contractEnd: "2026-04-30",
      completeContractMonthsInAdmissionYear: 4,
    });
    expect(entitlement.admissionYearUsableWorkdays).toBe(8);
    expect(entitlement.carriedOverWorkdays).toBe(0);
  });
});

// ─── MOT-P0-009: base do subsídio de férias ────────────────────────────────

describe("MOT-P0-009 — o subsídio de férias não é só o salário base", () => {
  it("um complemento mensal fixo entra na base dos subsídios", () => {
    const semComplemento = plan(offerInput());
    const comComplemento = plan(offerInput({
      package: { fixedMonthlyBonus: eurCents(20_000) },
    }));
    expect(semComplemento.kind).toBe("ready");
    expect(comComplemento.kind).toBe("ready");
    if (semComplemento.kind !== "ready" || comComplemento.kind !== "ready") return;

    const base = semComplemento.result.employerCost.annualStabilized.cents;
    const com = comComplemento.result.employerCost.annualStabilized.cents;
    // 14 meses do complemento (12 + dois subsídios), não 12: se a base dos
    // subsídios ignorasse o complemento, a diferença seria de 12 meses.
    const doze = 12 * 20_000;
    expect(com - base).toBeGreaterThan(doze);
  });
});

// ─── MOT-P0-010/011: apoios do IEFP ────────────────────────────────────────

describe("MOT-P0-010 — triagem declarativa das medidas do IEFP", () => {
  const completo: SupportFactSheet = {
    registeredUnemployed: true,
    permanentContract: true,
    fullTime: true,
    jobOfferRegisteredBeforeContract: true,
    applicationWithinWindowOfOffer: true,
    netJobCreation: true,
    regularisedStanding: true,
    recentDismissals: false,
    candidateAge: 30,
    qualificationLevel: 6,
    monthlyBaseSalary: eurFromDecimal(1_600),
  };
  const triar = (facts: SupportFactSheet, asOf = "2026-08-31") =>
    assessHiringSupports({ catalogue: PT_EMPLOYER_2026.supports, asOf, facts });

  it("as duas medidas exigem tempo completo", () => {
    const meio = triar({ ...completo, fullTime: false });
    expect(meio.every((support) => support.status === "not_applicable")).toBe(true);
  });

  it("o facto certo é o registo da oferta antes do contrato", () => {
    const tarde = triar({ ...completo, jobOfferRegisteredBeforeContract: false });
    expect(tarde.every((support) => support.status === "not_applicable")).toBe(true);
    // O contrato assinado ANTES da candidatura, mas depois do registo da
    // oferta, continua elegível — era aqui que o motor dava falsos negativos.
    const valido = triar(completo);
    expect(valido.every((support) => support.status === "potential")).toBe(true);
  });

  it("o +Talento tem piso remuneratório próprio de 1.499,15 €", () => {
    expect(TALENT_MINIMUM_MONTHLY_SALARY.cents).toBe(149_915);
    const abaixo = triar({ ...completo, monthlyBaseSalary: eurFromDecimal(1_400) });
    const talento = abaixo.find((support) => support.id === "iefp-emprego-mais-talento-2026")!;
    const emprego = abaixo.find((support) => support.id === "iefp-mais-emprego-2026")!;
    expect(talento.status).toBe("not_applicable");
    // A mesma proposta continua compatível com o +Emprego, que não tem piso.
    expect(emprego.status).toBe("potential");
  });

  it("fora da janela devolve `window_closed` sem perguntar factos", () => {
    const antes = triar(completo, "2026-05-01");
    expect(antes.every((support) => support.status === "window_closed")).toBe(true);
    const depois = triar(completo, "2026-12-16");
    expect(depois.every((support) => support.status === "window_closed")).toBe(true);
  });

  it("factos em falta produzem perguntas, não um potencial otimista", () => {
    const vazio = triar({});
    expect(vazio.every((support) => support.status === "needs_input")).toBe(true);
    expect(vazio[0]!.missingFacts.length).toBeGreaterThan(0);
  });

  it("os montantes são os publicados: 12 e 18 IAS, com quatro majorações de 35%", () => {
    const [emprego, talento] = PT_EMPLOYER_2026.supports.programs;
    expect(emprego!.baseAmount.cents).toBe(644_556);
    expect(talento!.baseAmount.cents).toBe(966_834);
    expect(supportAmountWithMajorations(emprego!, ["interior"]).cents).toBe(870_151);
    expect(
      supportAmountWithMajorations(emprego!, emprego!.majorations.map((m) => m.id)).cents,
    ).toBe(1_546_934);
    expect(
      supportAmountWithMajorations(talento!, talento!.majorations.map((m) => m.id)).cents,
    ).toBe(2_320_402);
  });

  it("a dotação nunca é dada por disponível", () => {
    for (const program of PT_EMPLOYER_2026.supports.programs) {
      expect(program.budgetStatus).toBe("unknown");
      expect(program.maintenanceMonths).toBe(24);
    }
  });

  it("um apoio potencial nunca abate ao custo", () => {
    const prepared = plan(offerInput({ supportFacts: completo }));
    if (prepared.kind !== "ready") throw new Error("esperava um resultado");
    for (const support of prepared.result.supports) {
      expect(support.conditionalOnly).toBe(true);
    }
    const semApoios = plan(offerInput());
    if (semApoios.kind !== "ready") throw new Error("esperava um resultado");
    expect(prepared.result.employerCost.annualStabilized.cents).toBe(
      semApoios.result.employerCost.annualStabilized.cents,
    );
  });
});

// ─── MOT-P0-012: fontes e localizadores ────────────────────────────────────

describe("MOT-P0-012 — cada citação resolve numa fonte com localizador", () => {
  it("todas as citações do resultado resolvem no catálogo legal", () => {
    const prepared = plan(offerInput());
    if (prepared.kind !== "ready") throw new Error("esperava um resultado");
    for (const citation of prepared.result.citations) {
      expect(resolveCitation(citation), `citação por resolver: ${citation}`).toBeDefined();
    }
  });

  it("todas as citações dos passos da memória de cálculo resolvem", () => {
    const prepared = plan(offerInput());
    if (prepared.kind !== "ready") throw new Error("esperava um resultado");
    for (const step of prepared.result.trace) {
      for (const citation of step.citations) {
        expect(resolveCitation(citation), `citação por resolver: ${citation}`).toBeDefined();
      }
    }
  });

  it("cada localizador aponta para uma fonte existente e traz artigo", () => {
    for (const locator of LEGAL_LOCATORS) {
      const resolved = resolveCitation(locator.id);
      expect(resolved, locator.id).toBeDefined();
      expect(locator.article.length).toBeGreaterThan(0);
    }
  });

  it("todas as fontes declaradas pelo release existem no catálogo", () => {
    for (const sourceId of PT_EMPLOYER_2026.sourceIds) {
      expect(resolveCitation(sourceId), sourceId).toBeDefined();
    }
  });
});

// ─── MOT-P0-015: cenário de demonstração partilhado ────────────────────────

describe("MOT-P0-015 — o cenário de demonstração vive no release", () => {
  it("o release publica o cenário que as superfícies resolvem por ID", () => {
    const demo = PT_EMPLOYER_2026.demoScenarios.find(
      (scenario) => scenario.id === "pt-employer-2026.demo.primeira-contratacao",
    );
    expect(demo).toBeDefined();
    expect(demo!.annualBudget.cents).toBeGreaterThan(0);
    expect(demo!.mealDaily.cents).toBeGreaterThan(0);
  });
});

// ─── MOT-P0-018: privacidade ───────────────────────────────────────────────

describe("MOT-P0-018 — o motor não sai do dispositivo", () => {
  it("resolver um release e calcular não toca na rede", () => {
    const original = globalThis.fetch;
    let chamadas = 0;
    globalThis.fetch = (() => {
      chamadas += 1;
      throw new Error("o motor não pode ir à rede");
    }) as typeof fetch;
    try {
      const prepared = plan(offerInput());
      expect(prepared.kind).toBe("ready");
    } finally {
      globalThis.fetch = original;
    }
    expect(chamadas).toBe(0);
  });
});
